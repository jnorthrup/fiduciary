/**
 * Settlement Event Consumer
 *
 * Listens for journal.entry_posted events and auto-creates payment orders
 * for Accounts Payable (liability) debits, which represent payments to vendors.
 */

import { subscribe } from './event-bus.js';
import persistence from './gcs-persistence.js';
import { randomUUID } from 'crypto';

const logger = {
    info: (msg, ...args) => console.info(`[SettlementEvents] ${msg}`, ...args),
    error: (msg, ...args) => console.error(`[SettlementEvents] ${msg}`, ...args),
    debug: (msg, ...args) => {
        if (process.env.NODE_ENV !== 'production') {
            console.debug(`[SettlementEvents] ${msg}`, ...args);
        }
    }
};

/**
 * Check if an account type represents Accounts Payable (AP)
 * AP is typically a liability account that tracks amounts owed to vendors
 * @param {string} accountType - The account type
 * @returns {boolean} True if this is an AP account
 */
function isAccountsPayableAccount(accountType) {
    // AP is a liability account
    // In accounting systems, AP accounts may be tagged with 'liab' type
    // or specifically named 'accounts_payable', 'trade_payables', etc.
    return accountType === 'liab';
}

/**
 * Check if a journal entry line represents a payment to a vendor
 * A payment is a DEBIT to an AP (liability) account, which decreases the liability
 * @param {Object} line - Journal entry line
 * @param {Object} account - Account details
 * @returns {boolean} True if this is a payment transaction
 */
function isPaymentTransaction(line, account) {
    // Payment = Debit to AP (liability) account decreases the amount owed
    return line.debit && line.debit > 0 && isAccountsPayableAccount(account?.type);
}

/**
 * Extract payee information from journal entry line
 * Looks for payee details in line.notes, line.description, or line.reference
 * @param {Object} line - Journal entry line
 * @returns {Object|null} Payee details or null
 */
function extractPayeeDetails(line) {
    // Try to find payee info in various fields
    const notes = line.notes || line.description || line.reference || '';

    // Common patterns: "Payee: Vendor Name", "To: ACME Corp", etc.
    const payeeMatch = notes.match(/(?:payee|to|vendor)[:\s]+([^\n,]+)/i);
    const payeeName = payeeMatch ? payeeMatch[1].trim() : notes.substring(0, 50).trim();

    return {
        name: payeeName || 'Unknown Payee',
        // Additional payee details would come from account/vendor master data
        // For now, we require these to be provided in the journal entry
        routingNumber: line.routingNumber,
        accountNumber: line.accountNumber,
        id: line.vendorId || line.payeeId || line.accountId
    };
}

/**
 * Create a payment order from a journal entry
 * @param {string} uid - User ID
 * @param {Object} journalEntry - Posted journal entry
 * @param {Object} line - Journal entry line representing payment
 * @param {Object} account - Account details
 * @returns {Promise<Object>} Created payment order
 */
async function createPaymentOrderFromJournalEntry(uid, journalEntry, line, account) {
    const state = await persistence.loadData(uid, 'settlement') || { paymentOrders: {} };

    const paymentOrderId = randomUUID();
    const payee = extractPayeeDetails(line);

    // Default to ACH method if banking details provided, otherwise CHECK
    const method = (payee.routingNumber && payee.accountNumber) ? 'ACH' : 'CHECK';

    const newOrder = {
        paymentOrderId,
        amount: line.debit,
        payee,
        method,
        status: 'created',
        createdAt: new Date().toISOString(),
        journalEntryId: journalEntry.journalEntryId,
        journalEntryLineId: line.lineId,
        accountId: account.accountId
    };

    state.paymentOrders[paymentOrderId] = newOrder;
    await persistence.saveData(uid, 'settlement', state);

    logger.info(`Created payment order ${paymentOrderId} from journal entry ${journalEntry.journalEntryId}`);

    return newOrder;
}

/**
 * Process a journal.entry_posted event
 * @param {Object} event - Event payload containing journal entry data
 */
async function handleJournalEntryPosted(event) {
    try {
        const { journalEntryId, trustId, lines = [] } = event;
        const uid = event.uid || 'dev-user-local'; // In production, extract from auth context

        logger.debug(`Processing journal entry ${journalEntryId} for trust ${trustId}`);

        // Load ledger to get account details
        const ledger = await persistence.loadData(uid, 'ledger');
        if (!ledger || !ledger.accounts || !ledger.accounts[trustId]) {
            logger.debug(`No ledger data found for trust ${trustId}`);
            return;
        }

        const accounts = ledger.accounts[trustId];
        const accountMap = new Map(accounts.map(a => [a.accountId, a]));

        // Process each line to find payment transactions
        const paymentOrders = [];

        for (const line of lines) {
            const account = accountMap.get(line.accountId);
            if (!account) {
                logger.debug(`Account ${line.accountId} not found, skipping line`);
                continue;
            }

            if (isPaymentTransaction(line, account)) {
                logger.info(`Found payment transaction: ${line.debit} debit to ${account.name} (${account.type})`);

                // Check if payment order already exists for this journal entry line
                const state = await persistence.loadData(uid, 'settlement') || { paymentOrders: {} };
                const existingOrder = Object.values(state.paymentOrders).find(
                    po => po.journalEntryId === journalEntryId && po.journalEntryLineId === line.lineId
                );

                if (existingOrder) {
                    logger.debug(`Payment order already exists for ${journalEntryId}:${line.lineId}`);
                    continue;
                }

                const paymentOrder = await createPaymentOrderFromJournalEntry(
                    uid, event, line, account
                );
                paymentOrders.push(paymentOrder);
            }
        }

        if (paymentOrders.length > 0) {
            logger.info(`Created ${paymentOrders.length} payment order(s) from journal entry ${journalEntryId}`);
        }

    } catch (error) {
        logger.error(`Error processing journal entry event:`, error);
    }
}

/**
 * Initialize the settlement event consumer
 * Subscribes to journal.entry_posted events
 */
export async function initializeSettlementConsumer() {
    try {
        // Check if RabbitMQ is configured
        if (!process.env.RABBITMQ_HOST && process.env.NODE_ENV === 'production') {
            logger.info('RabbitMQ not configured, skipping settlement event consumer');
            return;
        }

        // Subscribe to journal entry posted events
        await subscribe('journal.entry_posted', handleJournalEntryPosted, 'settlement_payment_orders');

        logger.info('Settlement event consumer initialized');
    } catch (error) {
        logger.error('Failed to initialize settlement event consumer:', error);
        // Don't throw - allow server to start even if event consumer fails
    }
}

export default {
    initializeSettlementConsumer,
    handleJournalEntryPosted
};

// Also export named exports for easier testing
export { handleJournalEntryPosted };
