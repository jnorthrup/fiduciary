
import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import bsoRouter from './bso.js';

// Mock iris-oauth authenticateToken to bypass Firebase in tests
vi.mock('./iris-oauth.js', () => ({
    authenticateToken: (req, res, next) => {
        req.token = 'test-token';
        req.tokenData = { userPayload: { sub: 'test-user' }, clientPayload: { iss: 'test-client' } };
        next();
    }
}));

// Mock GCS persistence
vi.mock('../lib/gcs-persistence.js', () => {
    const store = new Map();
    return {
        default: {
            saveData: vi.fn(async (uid, component, data) => {
                store.set(`${uid}:${component}`, JSON.parse(JSON.stringify(data)));
                return true;
            }),
            loadData: vi.fn(async (uid, component) => {
                return store.get(`${uid}:${component}`) || null;
            }),
            ensureBucket: vi.fn(async () => true),
            listComponents: vi.fn(async (uid) => {
                return Array.from(store.keys())
                    .filter(k => k.startsWith(`${uid}:`))
                    .map(k => k.split(':')[1]);
            })
        }
    };
});

// Create isolated test app (not the main server which uses verifyFirebaseToken)
const app = express();
app.use(express.json());
app.use('/api/bso', bsoRouter);

describe('BSO Proxy API', () => {
    let authToken = 'test-token'; // Assuming mock auth accepts this

    it('GET /api/bso/config should return mock mode by default', async () => {
        const res = await request(app).get('/api/bso/config');
        expect(res.status).toBe(200);
        expect(res.body.bsoMode).toBe('mock');
    });

    it('POST /api/bso/register should return mock user and status', async () => {
        const res = await request(app)
            .post('/api/bso/register')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123',
                securityQuestions: []
            });

        expect(res.status).toBe(200);
        expect(res.body.userId).toContain('BSO-USER-');
        expect(res.body.status).toBe('Active');
    });

    it('POST /api/bso/w2/submit should return batchId and Processing status', async () => {
        const res = await request(app)
            .post('/api/bso/w2/submit')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                ein: '123456789',
                taxYear: '2025'
            });

        expect(res.status).toBe(200);
        expect(res.body.batchId).toContain('BSO-W2-');
        expect(res.body.status).toBe('Processing');
    });

    it('GET /api/bso/submissions/:batchId should return submission details', async () => {
        // First submit one
        const subRes = await request(app)
            .post('/api/bso/w2/submit')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ ein: '123456789', taxYear: '2025' });

        const batchId = subRes.body.batchId;

        const res = await request(app)
            .get(`/api/bso/submissions/${batchId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
        expect(res.body.batchId).toBe(batchId);
        expect(res.body.status).toBe('Processing');
    });
});
