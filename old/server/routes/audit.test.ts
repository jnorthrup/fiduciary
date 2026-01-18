
import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import auditRouter from './audit.js';

// Mock dependencies
vi.mock('../../services/auditService.ts', () => ({
    listAuditEvents: vi.fn(() => ({
        items: [
            {
                eventId: 'e1',
                trustId: 't1',
                entityType: 'Trust',
                entityId: 'id1',
                eventType: 'LOGIN',
                actorId: 'a1',
                occurredAt: '2026-01-15T12:00:00Z'
            }
        ],
        limit: 50,
        offset: 0
    })),
    logAuditEvent: vi.fn()
}));

vi.mock('./iris-oauth.js', () => ({
    authenticateToken: (req, res, next) => {
        req.tokenData = { sub: 'test-user' };
        next();
    }
}));

const app = express();
app.use(express.json());
app.use('/api/audit', auditRouter);

describe('Audit API', () => {
    it('GET /api/audit/events should return audit logs', async () => {
        const res = await request(app)
            .get('/api/audit/events')
            .query({ trustId: 't1' });

        expect(res.status).toBe(200);
        expect(res.body.items).toHaveLength(1);
        expect(res.body.items[0].trustId).toBe('t1');
    });

    it('GET /api/audit/events should fail without trustId', async () => {
        const res = await request(app).get('/api/audit/events');
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('missing_parameter');
    });
});
