import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { authenticator } from 'otplib';
import qrcode from 'qrcode';
import { query, execute } from './db';
import { authenticateToken, AuthRequest } from './middleware';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Register
router.post('/register', async (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'bad_request', reason: 'Email and password required' });
    }

    try {
        const existing = await query('SELECT * FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(409).json({ error: 'conflict', reason: 'Email already registered' });
        }

        const id = uuidv4();
        const hash = await bcrypt.hash(password, 10);
        await execute(`INSERT INTO users (id, email, password_hash) VALUES ('${id}', '${email}', '${hash}')`);

        res.status(201).json({ ok: true, userId: id });
    } catch (err: any) {
        res.status(500).json({ error: 'internal_error', reason: err.message });
    }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
    const { email, password } = req.body;
    try {
        const users = await query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ error: 'unauthorized', reason: 'Invalid email or password' });
        }

        const user = users[0];
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.status(401).json({ error: 'unauthorized', reason: 'Invalid email or password' });
        }

        const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ ok: true, token, twoFactorEnabled: !!user.two_factor_enabled });
    } catch (err: any) {
        res.status(500).json({ error: 'internal_error', reason: err.message });
    }
});

// Setup 2FA
router.post('/2fa/setup', authenticateToken, async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    const email = req.user?.email;

    try {
        const secret = authenticator.generateSecret();
        const otpauth = authenticator.keyuri(email!, 'FiduciaryApp', secret);
        const qrCodeUrl = await qrcode.toDataURL(otpauth);

        await execute(`UPDATE users SET two_factor_secret = '${secret}' WHERE id = '${userId}'`);
        res.json({ ok: true, secret, qrCodeUrl });
    } catch (err: any) {
        res.status(500).json({ error: 'internal_error', reason: err.message });
    }
});

// Verify 2FA and Enable
router.post('/2fa/verify', authenticateToken, async (req: AuthRequest, res: Response) => {
    const { token } = req.body;
    const userId = req.user?.userId;

    try {
        const users = await query('SELECT * FROM users WHERE id = ?', [userId]);
        const user = users[0];

        if (!user.two_factor_secret) {
            return res.status(400).json({ error: 'bad_request', reason: '2FA not set up' });
        }

        const isValid = authenticator.check(token, user.two_factor_secret);
        if (isValid) {
            await execute(`UPDATE users SET two_factor_enabled = true WHERE id = '${userId}'`);
            res.json({ ok: true });
        } else {
            res.status(400).json({ error: 'bad_request', reason: 'Invalid 2FA token' });
        }
    } catch (err: any) {
        res.status(500).json({ error: 'internal_error', reason: err.message });
    }
});

export default router;
