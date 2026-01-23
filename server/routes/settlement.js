import express from 'express';
import { randomUUID } from 'crypto';
import persistence from '../lib/gcs-persistence.js';
import { generateNachaFile } from '../lib/nacha-generator.js';
import { getSponsor } from '../config/sponsors.js';

const router = express.Router();

/**
 * Payment Order Status Enum & State Machine
 */
const STATUS = {
    INITIATED: 'initiated',
    APPROVED: 'approved',
    DISPATCHED: 'dispatched', // Maps to 'sent' in spec, genericized here
    EXECUTED: 'executed',
    RECONCILED: 'reconciled',
    FAILED: 'failed'
};

const ALLOWED_TRANSITIONS = {
    [STATUS.INITIATED]: [STATUS.APPROVED, STATUS.FAILED],
    [STATUS.APPROVED]: [STATUS.DISPATCHED, STATUS.FAILED], // Dispatch triggers execution
    [STATUS.DISPATCHED]: [STATUS.EXECUTED, STATUS.FAILED],
    [STATUS.EXECUTED]: [STATUS.RECONCILED, STATUS.FAILED],
    [STATUS.RECONCILED]: [], // Terminal state
    [STATUS.FAILED]: []      // Terminal state
};

/**
 * Helper: Load Settlement State
 */
async function getSettlementState(uid) {
    return await persistence.loadData(uid, 'settlement') || { paymentOrders: {} };
}

/**
 * Helper: Save Settlement State
 */
async function saveSettlementState(uid, state) {
    await persistence.saveData(uid, 'settlement', state);
}

/**
 * Helper: Validate Status Transition
 */
function isValidTransition(currentStatus, newStatus) {
    const allowed = ALLOWED_TRANSITIONS[currentStatus];
    return allowed && allowed.includes(newStatus);
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /api/settlement/payment-orders
 * Create a payment order
 */
router.post('/payment-orders', async (req, res) => {
    try {
        const uid = req.user.uid;
        const { amount, payee, method } = req.body;

        // Validation
        if (!amount || !payee) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'amount and payee are required'
            });
        }

        const state = await getSettlementState(uid);
        const paymentOrderId = randomUUID();

        // Default to CHECK if not provided, or validate against enum ifstrict
        const validMethods = ['WIRE', 'ACH', 'CHECK', 'LEDGER_ONLY'];
        const methodToUse = method && validMethods.includes(method) ? method : 'CHECK';

        const newOrder = {
            paymentOrderId,
            amount,
            payee,
            method: methodToUse,
            status: 'created', // Spec uses 'created', 'executed', 'failed'
            createdAt: new Date().toISOString()
        };

        state.paymentOrders[paymentOrderId] = newOrder;
        await saveSettlementState(uid, state);

        res.status(201).json(newOrder);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/settlement/payment-orders/:paymentOrderId/execute
 * Execute Payment Order
 */
router.post('/payment-orders/:paymentOrderId/execute', async (req, res) => {
    try {
        const uid = req.user.uid;
        const { paymentOrderId } = req.params;
        const { transactionRef, executedAt } = req.body;

        const state = await getSettlementState(uid);
        const order = state.paymentOrders[paymentOrderId];

        if (!order) {
            return res.status(404).json({ error: 'Not Found', message: 'Payment Order not found' });
        }

        if (order.status === 'executed') {
            // Idempotency: if already executed, check if refs match?
            // For now just return success but maybe with 200 vs 201?
            return res.json(order);
        }

        if (order.status === 'failed') {
            return res.status(409).json({ error: 'Conflict', message: 'Payment Order is in failed state' });
        }

        const executionTimestamp = executedAt || new Date().toISOString();

        // Handle ACH payment orders - generate NACHA file
        if (order.method === 'ACH') {
            const sponsor = getSponsor();

            // Parse payee details for NACHA entry
            const payeeRouting = order.payee?.routingNumber || order.payee?.rdfiRouting;
            const payeeAccount = order.payee?.accountNumber || order.payee?.dfiAccount;
            const payeeId = order.payee?.id || order.payee?.individualId || order.paymentOrderId;
            const payeeName = order.payee?.name || order.payee?.individualName || 'UNKNOWN PAYEE';

            if (!payeeRouting || !payeeAccount) {
                return res.status(400).json({
                    error: 'Validation Error',
                    message: 'ACH payment orders require payee.routingNumber and payee.accountNumber'
                });
            }

            // NACHA file configuration
            const now = new Date();
            const fileDate = now.toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD
            const fileTime = now.toTimeString().slice(0, 5).replace(/:/g, ''); // HHMM
            const effectiveDate = new Date(now.getTime() + 24 * 60 * 60 * 1000)
                .toISOString().slice(2, 10).replace(/-/g, ''); // Tomorrow

            const nachaConfig = {
                immediateDestination: payeeRouting,
                immediateDestinationName: payeeName.substring(0, 23),
                immediateOrigin: sponsor.odfiRouting,
                immediateOriginName: sponsor.immediateOriginName.substring(0, 23),
                fileDate,
                fileTime,
                companyName: sponsor.name.substring(0, 16),
                companyId: sponsor.companyId,
                secCode: 'PPD',
                companyEntryDescription: 'PAYMENT',
                effectiveDate,
                odfiRouting: sponsor.odfiRouting
            };

            // Create NACHA entry
            const amountCents = Math.round(order.amount * 100);
            const entries = [{
                transactionCode: '22', // Credit to checking account
                rdfiRouting: payeeRouting,
                dfiAccount: payeeAccount,
                amount: amountCents,
                individualId: payeeId.substring(0, 15),
                individualName: payeeName.substring(0, 22)
            }];

            // Generate NACHA file
            const nachaBuffer = generateNachaFile(nachaConfig, entries);

            // Calculate entry hash (first 8 digits of RDFI routing)
            const entryHash = payeeRouting.substring(0, 8);

            // Save NACHA submission
            const submission = await persistence.saveNachaSubmission(uid, {
                fileContent: nachaBuffer.toString('base64'),
                filename: `nacha-${paymentOrderId}-${Date.now()}.ach`,
                batchCount: 1,
                entryCount: 1,
                totalDebit: 0,
                totalCredit: amountCents,
                hash: entryHash
            });

            // Update order with NACHA submission details
            order.nachaSubmissionId = submission.submissionId;
        }

        // Update State
        order.status = 'executed';
        order.executionDetails = {
            transactionRef,
            executedAt: executionTimestamp
        };
        order.updatedAt = new Date().toISOString();

        state.paymentOrders[paymentOrderId] = order;
        await saveSettlementState(uid, state);

        res.json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;

