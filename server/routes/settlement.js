import express from 'express';
import { randomUUID } from 'crypto';
import persistence from '../lib/gcs-persistence.js';

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
        const { payableId, amount, method, fundingSourceType, supportingDocIds } = req.body;

        // Validation
        if (!payableId || !amount || !method || !fundingSourceType) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'Missing required fields: payableId, amount, method, fundingSourceType'
            });
        }

        const state = await getSettlementState(uid);
        const paymentOrderId = randomUUID();

        const newOrder = {
            paymentOrderId,
            trustId: req.body.trustId || 'default-trust', // Should come from context or body
            payableId,
            amount,
            method,
            fundingSourceType,
            supportingDocIds: supportingDocIds || [],
            status: STATUS.INITIATED,
            history: [{ status: STATUS.INITIATED, timestamp: new Date().toISOString(), actor: uid }],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        state.paymentOrders[paymentOrderId] = newOrder;
        await saveSettlementState(uid, state);

        res.status(201).json(newOrder);
    } catch (error) {
        console.error('Create PaymentOrder Error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/settlement/payment-orders
 * List payment orders
 */
router.get('/payment-orders', async (req, res) => {
    try {
        const uid = req.user.uid;
        const { status, limit = 50, offset = 0 } = req.query;

        const state = await getSettlementState(uid);
        let orders = Object.values(state.paymentOrders);

        if (status) {
            orders = orders.filter(o => o.status === status);
        }

        // Sort by Date Descending
        orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const paginated = orders.slice(Number(offset), Number(offset) + Number(limit));

        res.json({
            items: paginated,
            total: orders.length,
            limit: Number(limit),
            offset: Number(offset)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/settlement/payment-orders/:id
 * Get single payment order
 */
router.get('/payment-orders/:id', async (req, res) => {
    try {
        const uid = req.user.uid;
        const { id } = req.params;

        const state = await getSettlementState(uid);
        const order = state.paymentOrders[id];

        if (!order) {
            return res.status(404).json({ error: 'Not Found', message: 'Payment Order not found' });
        }

        res.json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/settlement/payment-orders/:id/approve
 * Approve a payment order
 */
router.post('/payment-orders/:id/approve', async (req, res) => {
    try {
        const uid = req.user.uid;
        const { id } = req.params;
        const { reason, mfaVerified } = req.body;

        // Spec requires reason and mfaVerified
        if (!reason || mfaVerified === undefined) {
            return res.status(400).json({ error: 'Validation Error', message: 'Reason and mfaVerified are required' });
        }

        const state = await getSettlementState(uid);
        const order = state.paymentOrders[id];

        if (!order) {
            return res.status(404).json({ error: 'Not Found', message: 'Payment Order not found' });
        }

        if (!isValidTransition(order.status, STATUS.APPROVED)) {
            return res.status(409).json({
                error: 'Invalid State Transition',
                message: `Cannot transition from ${order.status} to ${STATUS.APPROVED}`
            });
        }

        // Update State
        order.status = STATUS.APPROVED;
        order.approvalDetails = { reason, mfaVerified, approvedAt: new Date().toISOString() };
        order.history.push({ status: STATUS.APPROVED, timestamp: new Date().toISOString(), actor: uid, reason });
        order.updatedAt = new Date().toISOString();

        state.paymentOrders[id] = order;
        await saveSettlementState(uid, state);

        res.json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/settlement/payment-orders/:id/dispatch
 * Dispatch payment (Send to Bank/Adapter)
 */
router.post('/payment-orders/:id/dispatch', async (req, res) => {
    try {
        const uid = req.user.uid;
        const { id } = req.params;
        const { adapterConfig, notes } = req.body;

        const state = await getSettlementState(uid);
        const order = state.paymentOrders[id];

        if (!order) return res.status(404).json({ error: 'Not Found' });

        if (!isValidTransition(order.status, STATUS.DISPATCHED)) {
            return res.status(409).json({
                error: 'Invalid State Transition',
                message: `Cannot transition from ${order.status} to ${STATUS.DISPATCHED}`
            });
        }

        // Update State
        order.status = STATUS.DISPATCHED; // Spec calls this 'sent' in one place, using DISPATCHED for clarity
        order.dispatchDetails = { adapterConfig, notes, dispatchedAt: new Date().toISOString() };
        order.history.push({ status: STATUS.DISPATCHED, timestamp: new Date().toISOString(), actor: uid });
        order.updatedAt = new Date().toISOString();

        state.paymentOrders[id] = order;
        await saveSettlementState(uid, state);

        res.json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/settlement/payment-orders/:id/mark-executed
 * Confirm Execution (e.g. Bank confirms money moved)
 */
router.post('/payment-orders/:id/mark-executed', async (req, res) => {
    try {
        const uid = req.user.uid;
        const { id } = req.params;
        const { executedAt, confirmationRef, attachmentDocIds } = req.body;

        if (!executedAt) {
            return res.status(400).json({ error: 'Validation Error', message: 'executedAt is required' });
        }

        const state = await getSettlementState(uid);
        const order = state.paymentOrders[id];

        if (!order) return res.status(404).json({ error: 'Not Found' });

        if (!isValidTransition(order.status, STATUS.EXECUTED)) {
            return res.status(409).json({
                error: 'Invalid State Transition',
                message: `Cannot transition from ${order.status} to ${STATUS.EXECUTED}`
            });
        }

        // Update State
        order.status = STATUS.EXECUTED;
        order.executionDetails = { executedAt, confirmationRef, attachmentDocIds };
        order.history.push({ status: STATUS.EXECUTED, timestamp: new Date().toISOString(), actor: uid });
        order.updatedAt = new Date().toISOString();

        state.paymentOrders[id] = order;
        await saveSettlementState(uid, state);

        res.json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/settlement/payment-orders/:id/reconcile
 * Reconcile (Accounting closure)
 */
router.post('/payment-orders/:id/reconcile', async (req, res) => {
    try {
        const uid = req.user.uid;
        const { id } = req.params;
        const { reconciledAt, dischargeRecordedInstrumentNo } = req.body;

        if (!reconciledAt) {
            return res.status(400).json({ error: 'Validation Error', message: 'reconciledAt is required' });
        }

        const state = await getSettlementState(uid);
        const order = state.paymentOrders[id];

        if (!order) return res.status(404).json({ error: 'Not Found' });

        if (!isValidTransition(order.status, STATUS.RECONCILED)) {
            return res.status(409).json({
                error: 'Invalid State Transition',
                message: `Cannot transition from ${order.status} to ${STATUS.RECONCILED}`
            });
        }

        // Update State
        order.status = STATUS.RECONCILED;
        order.reconciliationDetails = { reconciledAt, dischargeRecordedInstrumentNo };
        order.history.push({ status: STATUS.RECONCILED, timestamp: new Date().toISOString(), actor: uid });
        order.updatedAt = new Date().toISOString();

        state.paymentOrders[id] = order;
        await saveSettlementState(uid, state);

        res.json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
