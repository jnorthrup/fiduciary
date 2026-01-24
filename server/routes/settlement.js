import express from 'express';
import { randomUUID } from 'crypto';
import persistence from '../lib/gcs-persistence.js';
import { generateNachaFile } from '../lib/nacha-generator.js';
import { getSponsor } from '../config/sponsors.js';
import { validateAccount, submitACHFile, getPaymentStatus } from '../services/bofaCashProService.js';

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
 * POST /api/settlement/validate-account
 * Validate routing number and account number via BOFA API
 */
router.post('/validate-account', async (req, res) => {
    try {
        const { routingNumber, accountNumber, accountType } = req.body;

        // Validation
        if (!routingNumber || !accountNumber || !accountType) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'routingNumber, accountNumber, and accountType are required'
            });
        }

        // Validate accountType
        if (accountType !== 'checking' && accountType !== 'savings') {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'accountType must be "checking" or "savings"'
            });
        }

        const result = await validateAccount({
            routingNumber,
            accountNumber,
            accountType
        });

        res.json(result);
    } catch (error) {
        console.error('Account validation error:', error);
        res.status(500).json({
            error: 'Validation Failed',
            message: error.message || 'Failed to validate account'
        });
    }
});

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

            // Auto-post to BOFA: Submit NACHA file to Bank of America
            // Fire-and-forget pattern: Try to submit and store ID, but log errors without blocking
            try {
                const nachaContent = nachaBuffer.toString('ascii');
                const effectiveDateIso = new Date(now.getTime() + 24 * 60 * 60 * 1000)
                    .toISOString().slice(0, 10); // YYYY-MM-DD

                const bofaSubmission = await submitACHFile({
                    nachaFileContent: nachaContent,
                    fileName: `payment-${paymentOrderId}.ach`,
                    effectiveDate: effectiveDateIso,
                    customerReference: paymentOrderId
                });

                // Store BOFA submission ID with the payment order
                order.bofaSubmissionId = bofaSubmission.submissionId;
            } catch (error) {
                // Log error but don't fail the payment order execution
                // The payment order can still be executed even if BOFA submission fails
                console.error('[BOFA Auto-posting] Failed to submit payment order:', paymentOrderId, error);
            }
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

/**
 * GET /api/settlement/poll
 * Background polling endpoint for payment status updates
 *
 * This endpoint is designed to be called by Cloud Scheduler cron every 5 minutes.
 * It polls BOFA for status updates on all payments that have been submitted.
 */
router.get('/poll', async (req, res) => {
    try {
        const uid = req.user.uid;

        // Load all payment orders
        const state = await getSettlementState(uid);
        const paymentOrders = state.paymentOrders || {};

        // Filter for payments that have been submitted to BOFA
        const submittedPayments = Object.values(paymentOrders).filter(
            order => order.bofaSubmissionId && order.status === 'executed'
        );

        if (submittedPayments.length === 0) {
            return res.json({
                processed: 0,
                updated: 0,
                errors: 0
            });
        }

        let updatedCount = 0;
        let errorCount = 0;

        // Poll each payment for status updates
        for (const order of submittedPayments) {
            try {
                const status = await getPaymentStatus(order.bofaSubmissionId);

                // Store BOFA status for tracking
                order.bofaStatus = status.status;

                // Map BOFA status to payment order status
                const previousStatus = order.status;

                switch (status.status) {
                    case 'settled':
                        order.status = 'reconciled';
                        order.settledDate = status.settledDate;
                        break;
                    case 'returned':
                        order.status = 'failed';
                        order.returnCode = status.returnCode;
                        order.returnReason = status.returnReason;
                        break;
                    case 'rejected':
                        order.status = 'failed';
                        order.returnReason = status.returnReason;
                        break;
                    case 'processing':
                    case 'submitted':
                        // Keep 'executed' status - still in flight
                        break;
                }

                // Only count as updated if status actually changed
                if (order.status !== previousStatus) {
                    updatedCount++;
                }

                order.updatedAt = new Date().toISOString();
            } catch (error) {
                // Log error but continue processing other payments
                console.error('[Polling] Error checking payment status:', order.paymentOrderId, error.message);
                errorCount++;
            }
        }

        // Save updated state
        await saveSettlementState(uid, state);

        res.json({
            processed: submittedPayments.length,
            updated: updatedCount,
            errors: errorCount
        });
    } catch (error) {
        console.error('Polling error:', error);
        res.status(500).json({
            error: 'Polling Failed',
            message: error.message
        });
    }
});

/**
 * POST /api/settlement/bofa/webhook
 * Webhook endpoint for BOFA payment status notifications
 *
 * This endpoint accepts webhook payloads from BOFA for real-time status updates.
 * It validates the payload and updates payment orders accordingly.
 *
 * Future enhancement: Add webhook signature validation for security.
 */
router.post('/bofa/webhook', async (req, res) => {
    try {
        const { submissionId, status, settledDate, returnCode, returnReason } = req.body;

        // Validate required fields
        if (!submissionId) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'submissionId is required'
            });
        }

        if (!status) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'status is required'
            });
        }

        const uid = req.user.uid;
        const state = await getSettlementState(uid);
        const paymentOrders = state.paymentOrders || {};

        // Find payment order by BOFA submission ID
        const order = Object.values(paymentOrders).find(
            o => o.bofaSubmissionId === submissionId
        );

        if (!order) {
            return res.status(404).json({
                error: 'Not Found',
                message: `Payment order with submissionId ${submissionId} not found`
            });
        }

        // Store BOFA status
        order.bofaStatus = status;

        // Map BOFA status to payment order status
        switch (status) {
            case 'settled':
                order.status = 'reconciled';
                order.settledDate = settledDate;
                break;
            case 'returned':
                order.status = 'failed';
                order.returnCode = returnCode;
                order.returnReason = returnReason;
                break;
            case 'rejected':
                order.status = 'failed';
                order.returnReason = returnReason;
                break;
            case 'processing':
            case 'submitted':
                // Keep current status
                break;
        }

        order.updatedAt = new Date().toISOString();

        // Save updated state
        await saveSettlementState(uid, state);

        res.json({
            received: true,
            paymentOrderId: order.paymentOrderId,
            status: order.status
        });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({
            error: 'Webhook Processing Failed',
            message: error.message
        });
    }
});

export default router;

