
import express from 'express';
import { randomUUID } from 'crypto';
import { authenticateToken } from './iris-oauth.js';
import persistence from '../lib/gcs-persistence.js';

const router = express.Router();

// Relaxed auth for testing/demo if token matches 'test-token'
const bsoAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader === 'Bearer test-token') {
        req.token = 'test-token';
        req.tokenData = { userPayload: { sub: 'test-user' }, clientPayload: { iss: 'test-client' } };
        req.user = { uid: 'test-user' }; // Added for GCS partitioning
        return next();
    }
    return authenticateToken(req, res, next);
};

/**
 * POST /api/bso/register
 * Step 1 of BSO enrollment - register new user
 */
router.post('/register', bsoAuth, async (req, res) => {
    try {
        const { username, email, password, securityQuestions } = req.body;
        const uid = req.user.uid;
        const bsoMode = process.env.BSO_MODE || 'mock';

        if (bsoMode === 'mock') {
            const userId = `BSO-USER-${randomUUID().slice(0, 8).toUpperCase()}`;

            // Save registration state
            const state = await persistence.loadData(uid, 'bso') || { submissions: {}, registrations: [] };
            state.registrations.push({ userId, username, email, status: 'Active', createdAt: new Date().toISOString() });
            await persistence.saveData(uid, 'bso', state);

            return res.json({
                userId,
                status: 'Active',
                activationCode: 'MOCK-ACT-1234'
            });
        }

        // Real mode logic would go here (e.g. proxying to actual BSO API)
        res.status(501).json({ error: 'not_implemented', message: 'Real mode BSO registration not yet implemented' });

    } catch (error) {
        console.error('[BSO] Registration error:', error);
        res.status(500).json({ error: 'server_error', message: error.message });
    }
});

/**
 * POST /api/bso/w2/submit
 * Upload and submit EFW2 format W-2 file
 */
router.post('/w2/submit', bsoAuth, async (req, res) => {
    try {
        const { ein, taxYear } = req.body;
        const uid = req.user.uid;
        const bsoMode = process.env.BSO_MODE || 'mock';

        if (bsoMode === 'mock') {
            const batchId = `BSO-W2-${randomUUID().slice(0, 8).toUpperCase()}`;
            const submission = {
                batchId,
                ein,
                taxYear,
                status: 'Processing',
                accuWageStatus: 'Pending',
                submittedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            const state = await persistence.loadData(uid, 'bso') || { submissions: {}, registrations: [] };
            state.submissions[batchId] = submission;
            await persistence.saveData(uid, 'bso', state);

            return res.json({
                batchId,
                status: 'Processing'
            });
        }

        res.status(501).json({ error: 'not_implemented', message: 'Real mode BSO submission not yet implemented' });

    } catch (error) {
        console.error('[BSO] Submission error:', error);
        res.status(500).json({ error: 'server_error', message: error.message });
    }
});

/**
 * GET /api/bso/submissions/:batchId
 * Retrieve AccuWage validation results
 */
router.get('/submissions/:batchId', bsoAuth, async (req, res) => {
    try {
        const { batchId } = req.params;
        const uid = req.user.uid;
        const bsoMode = process.env.BSO_MODE || 'mock';

        if (bsoMode === 'mock') {
            const state = await persistence.loadData(uid, 'bso');
            const submission = state?.submissions?.[batchId];

            if (!submission) {
                return res.status(404).json({ error: 'not_found', message: 'Batch ID not found' });
            }

            // Simulate processing: if age > 10s, mark as Pass (usually success)
            const ageMs = Date.now() - new Date(submission.submittedAt).getTime();
            if (ageMs > 10000 && submission.status === 'Processing') {
                submission.status = 'Pass';
                submission.accuWageStatus = 'Pass';
                submission.updatedAt = new Date().toISOString();

                state.submissions[batchId] = submission;
                await persistence.saveData(uid, 'bso', state);
            }

            return res.json(submission);
        }

        res.status(501).json({ error: 'not_implemented', message: 'Real mode BSO status check not yet implemented' });

    } catch (error) {
        console.error('[BSO] Status error:', error);
        res.status(500).json({ error: 'server_error', message: error.message });
    }
});

// Helper for UI to query mode
router.get('/config', (req, res) => {
    res.json({
        bsoMode: process.env.BSO_MODE || 'mock'
    });
});

export default router;
