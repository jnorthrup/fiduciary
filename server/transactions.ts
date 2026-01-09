import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticator } from 'otplib';
import { query, execute } from './db';
import { authenticateToken, AuthRequest } from './middleware';

const router = Router();

// Initiate Transaction
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
    const { amount, description } = req.body;
    const userId = req.user?.userId;

    if (!amount || isNaN(amount)) {
        return res.status(400).json({ error: 'bad_request', reason: 'Valid amount required' });
    }

    try {
        const id = uuidv4();
        await execute(`INSERT INTO transactions (id, user_id, amount, description) VALUES ('${id}', '${userId}', ${amount}, '${description || ''}')`);
        res.status(201).json({ ok: true, transactionId: id });
    } catch (err: any) {
        res.status(500).json({ error: 'internal_error', reason: err.message });
    }
});

// Clear Transaction (Requires 2FA)
router.post('/:id/clear', authenticateToken, async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { token } = req.body;
    const userId = req.user?.userId;

    try {
        const transactions = await query('SELECT * FROM transactions WHERE id = ? AND user_id = ?', [id, userId]);
        if (transactions.length === 0) {
            return res.status(404).json({ error: 'not_found', reason: 'Transaction not found' });
        }

        const transaction = transactions[0];
        if (transaction.status !== 'pending') {
            return res.status(400).json({ error: 'bad_request', reason: 'Transaction already processed' });
        }

        const users = await query('SELECT * FROM users WHERE id = ?', [userId]);
        const user = users[0];

        if (user.two_factor_enabled) {
            if (!token) {
                return res.status(401).json({ error: 'unauthorized', reason: '2FA token required' });
            }

            const isValid = authenticator.check(token, user.two_factor_secret);
            if (!isValid) {
                return res.status(401).json({ error: 'unauthorized', reason: 'Invalid 2FA token' });
            }
        }

        await execute(`UPDATE transactions SET status = 'cleared', cleared_at = current_timestamp WHERE id = '${id}'`);
        res.json({ ok: true });
    } catch (err: any) {
        res.status(500).json({ error: 'internal_error', reason: err.message });
    }
});

// List Transactions
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    try {
        const transactions = await query('SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC', [userId]);
        res.json({ ok: true, transactions });
    } catch (err: any) {
        res.status(500).json({ error: 'internal_error', reason: err.message });
    }
});

export default router;
