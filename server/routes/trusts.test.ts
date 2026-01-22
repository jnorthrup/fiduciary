import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import trustsRouter from './trusts.js';

// Mock GCS persistence
vi.mock('../lib/gcs-persistence.js', () => ({
    default: {
        loadData: vi.fn(),
        saveData: vi.fn()
    }
}));

import persistence from '../lib/gcs-persistence.js';

// Create test app with mocked auth
const createApp = () => {
    const app = express();
    app.use(express.json());
    // Mock Firebase auth middleware
    app.use((req, res, next) => {
        req.user = { uid: 'test-user-123' };
        next();
    });
    app.use('/api/trusts', trustsRouter);
    return app;
};

describe('Trusts API', () => {
    let app;

    beforeEach(() => {
        app = createApp();
        vi.clearAllMocks();
        // Default mock: empty state
        persistence.loadData.mockResolvedValue({ trusts: {}, trustees: {} });
        persistence.saveData.mockResolvedValue(undefined);
    });

    describe('POST /api/trusts - Create Trust', () => {
        it('should create a trust with valid data', async () => {
            const trustData = {
                legalNameFull: 'Test Family Trust',
                dateOfTrust: '2020-01-15',
                ein: '12-3456789',
                situsState: 'TX'
            };

            const res = await request(app)
                .post('/api/trusts')
                .send(trustData);

            expect(res.status).toBe(201);
            expect(res.body.trustId).toBeDefined();
            expect(res.body.legalNameFull).toBe('Test Family Trust');
            expect(res.body.status).toBe('active');
            expect(res.body.createdAt).toBeDefined();
            expect(persistence.saveData).toHaveBeenCalled();
        });

        it('should reject missing legalNameFull', async () => {
            const res = await request(app)
                .post('/api/trusts')
                .send({
                    dateOfTrust: '2020-01-15',
                    ein: '12-3456789',
                    situsState: 'TX'
                });

            expect(res.status).toBe(400);
            expect(res.body.errors).toContainEqual(
                expect.objectContaining({ field: 'legalNameFull' })
            );
        });

        it('should reject invalid EIN format', async () => {
            const res = await request(app)
                .post('/api/trusts')
                .send({
                    legalNameFull: 'Test Trust',
                    dateOfTrust: '2020-01-15',
                    ein: '123456789', // Missing hyphen
                    situsState: 'TX'
                });

            expect(res.status).toBe(400);
            expect(res.body.errors).toContainEqual(
                expect.objectContaining({ field: 'ein' })
            );
        });

        it('should reject invalid situsState format', async () => {
            const res = await request(app)
                .post('/api/trusts')
                .send({
                    legalNameFull: 'Test Trust',
                    dateOfTrust: '2020-01-15',
                    ein: '12-3456789',
                    situsState: 'Texas' // Should be 2-letter code
                });

            expect(res.status).toBe(400);
            expect(res.body.errors).toContainEqual(
                expect.objectContaining({ field: 'situsState' })
            );
        });
    });

    describe('GET /api/trusts - List Trusts', () => {
        it('should return empty list when no trusts exist', async () => {
            const res = await request(app).get('/api/trusts');

            expect(res.status).toBe(200);
            expect(res.body.items).toEqual([]);
            expect(res.body.pagination).toBeDefined();
        });

        it('should return trusts with pagination', async () => {
            const mockTrusts = {
                't1': { trustId: 't1', legalNameFull: 'Trust 1', createdAt: '2020-01-01T00:00:00Z' },
                't2': { trustId: 't2', legalNameFull: 'Trust 2', createdAt: '2020-01-02T00:00:00Z' }
            };
            persistence.loadData.mockResolvedValue({ trusts: mockTrusts, trustees: {} });

            const res = await request(app).get('/api/trusts');

            expect(res.status).toBe(200);
            expect(res.body.items).toHaveLength(2);
        });

        it('should support cursor-based pagination', async () => {
            const mockTrusts = {
                't1': { trustId: 't1', legalNameFull: 'Trust 1', createdAt: '2020-01-01T00:00:00Z' },
                't2': { trustId: 't2', legalNameFull: 'Trust 2', createdAt: '2020-01-02T00:00:00Z' }
            };
            persistence.loadData.mockResolvedValue({ trusts: mockTrusts, trustees: {} });

            const res = await request(app)
                .get('/api/trusts')
                .query({ cursor: 't2', limit: 10 });

            expect(res.status).toBe(200);
            // After cursor t2, should return t1 (sorted desc by createdAt)
            expect(res.body.items.length).toBeLessThanOrEqual(10);
        });

        it('should support sparse fieldsets', async () => {
            const mockTrusts = {
                't1': { trustId: 't1', legalNameFull: 'Trust 1', ein: '12-3456789', createdAt: '2020-01-01T00:00:00Z' }
            };
            persistence.loadData.mockResolvedValue({ trusts: mockTrusts, trustees: {} });

            const res = await request(app)
                .get('/api/trusts')
                .query({ fields: 'trustId,legalNameFull' });

            expect(res.status).toBe(200);
            expect(res.body.items[0]).toHaveProperty('trustId');
            expect(res.body.items[0]).toHaveProperty('legalNameFull');
            expect(res.body.items[0]).not.toHaveProperty('ein');
        });
    });

    describe('GET /api/trusts/:trustId - Get Trust', () => {
        it('should return trust by ID', async () => {
            const mockTrusts = {
                't1': { trustId: 't1', legalNameFull: 'Test Trust', status: 'active' }
            };
            persistence.loadData.mockResolvedValue({ trusts: mockTrusts, trustees: {} });

            const res = await request(app).get('/api/trusts/t1');

            expect(res.status).toBe(200);
            expect(res.body.trustId).toBe('t1');
            expect(res.body.legalNameFull).toBe('Test Trust');
        });

        it('should return 404 for non-existent trust', async () => {
            const res = await request(app).get('/api/trusts/nonexistent');

            expect(res.status).toBe(404);
            expect(res.body.error).toBe('Not Found');
        });
    });

    describe('PATCH /api/trusts/:trustId - Update Trust', () => {
        it('should update trust mailingAddress', async () => {
            const mockTrusts = {
                't1': { trustId: 't1', legalNameFull: 'Test Trust', status: 'active' }
            };
            persistence.loadData.mockResolvedValue({ trusts: mockTrusts, trustees: {} });

            const res = await request(app)
                .patch('/api/trusts/t1')
                .send({ mailingAddress: { street: '123 Main St', city: 'Austin', state: 'TX' } });

            expect(res.status).toBe(200);
            expect(res.body.mailingAddress).toEqual({ street: '123 Main St', city: 'Austin', state: 'TX' });
            expect(persistence.saveData).toHaveBeenCalled();
        });

        it('should reject invalid status value', async () => {
            const mockTrusts = {
                't1': { trustId: 't1', legalNameFull: 'Test Trust', status: 'active' }
            };
            persistence.loadData.mockResolvedValue({ trusts: mockTrusts, trustees: {} });

            const res = await request(app)
                .patch('/api/trusts/t1')
                .send({ status: 'invalid_status' });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Validation Error');
        });
    });

    describe('POST /api/trusts/:trustId/trustees - Add Trustee', () => {
        it('should add a trustee to a trust', async () => {
            const mockTrusts = {
                't1': { trustId: 't1', legalNameFull: 'Test Trust' }
            };
            persistence.loadData.mockResolvedValue({ trusts: mockTrusts, trustees: {} });

            const res = await request(app)
                .post('/api/trusts/t1/trustees')
                .send({
                    fullName: 'John Doe',
                    role: 'co_trustee'
                });

            expect(res.status).toBe(201);
            expect(res.body.trusteeId).toBeDefined();
            expect(res.body.fullName).toBe('John Doe');
            expect(res.body.role).toBe('co_trustee');
            expect(res.body.trustId).toBe('t1');
        });

        it('should reject invalid role', async () => {
            const mockTrusts = {
                't1': { trustId: 't1' }
            };
            persistence.loadData.mockResolvedValue({ trusts: mockTrusts, trustees: {} });

            const res = await request(app)
                .post('/api/trusts/t1/trustees')
                .send({
                    fullName: 'John Doe',
                    role: 'invalid_role'
                });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Validation Error');
        });

        it('should reject adding trustee to non-existent trust', async () => {
            const res = await request(app)
                .post('/api/trusts/nonexistent/trustees')
                .send({
                    fullName: 'John Doe',
                    role: 'co_trustee'
                });

            expect(res.status).toBe(404);
        });
    });

    describe('GET /api/trusts/:trustId/trustees - List Trustees', () => {
        it('should list trustees for a trust', async () => {
            const mockState = {
                trusts: { 't1': { trustId: 't1' } },
                trustees: {
                    't1': {
                        'tr1': { trusteeId: 'tr1', fullName: 'Jane Doe', role: 'co_trustee', createdAt: '2020-01-01T00:00:00Z' }
                    }
                }
            };
            persistence.loadData.mockResolvedValue(mockState);

            const res = await request(app).get('/api/trusts/t1/trustees');

            expect(res.status).toBe(200);
            expect(res.body.items).toHaveLength(1);
            expect(res.body.items[0].fullName).toBe('Jane Doe');
        });

        it('should return 404 for non-existent trust', async () => {
            const res = await request(app).get('/api/trusts/nonexistent/trustees');

            expect(res.status).toBe(404);
        });
    });
});
