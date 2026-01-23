import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import trustsRouter from './trusts.js';
import ledgerRouter from './ledger.js';
import settlementRouter from './settlement.js';

// Mock GCS persistence
vi.mock('../lib/gcs-persistence.js', () => ({
    default: {
        loadData: vi.fn(),
        saveData: vi.fn()
    }
}));

// Mock event bus
vi.mock('../lib/event-bus.js', () => ({
    publish: vi.fn()
}));

import persistence from '../lib/gcs-persistence.js';

/**
 * Contract Tests for LAS Trust ERP API
 * 
 * Verifies compliance with OpenAPI spec: docs/openapi/las-trust-api-spec.yaml
 * 
 * Tests verify:
 * - All endpoints are implemented
 * - Request/response schemas match spec
 * - HTTP status codes are correct
 * - Error responses follow spec format
 */

const createApp = () => {
    const app = express();
    app.use(express.json());

    // Mock Firebase auth middleware
    app.use((req, res, next) => {
        req.user = { uid: 'test-user-123' };
        next();
    });

    app.use('/api/trusts', trustsRouter);
    app.use('/api/ledger', ledgerRouter);
    app.use('/api/settlement', settlementRouter);

    return app;
};

describe('Contract Tests - LAS Trust ERP API v0.2.0', () => {
    let app;

    beforeEach(() => {
        app = createApp();
        vi.clearAllMocks();
        persistence.loadData.mockResolvedValue({});
        persistence.saveData.mockResolvedValue(undefined);
    });

    describe('Trusts Domain - Contract Compliance', () => {
        describe('POST /api/trusts - createTrust', () => {
            it('returns 201 with Trust schema on valid request', async () => {
                persistence.loadData.mockResolvedValue({ trusts: {}, trustees: {} });

                const trustCreate = {
                    legalNameFull: 'Smith Family Trust',
                    dateOfTrust: '2020-01-15',
                    ein: '12-3456789',
                    situsState: 'TX'
                };

                const res = await request(app)
                    .post('/api/trusts')
                    .send(trustCreate);

                expect(res.status).toBe(201);
                expect(res.body).toMatchObject({
                    trustId: expect.any(String),
                    legalNameFull: expect.any(String)
                });
                // OpenAPI spec shows trustId should be uuid format
                expect(res.body.trustId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
            });

            it('returns 400 on missing required field (legalNameFull)', async () => {
                const res = await request(app)
                    .post('/api/trusts')
                    .send({ ein: '12-3456789' });

                expect(res.status).toBe(400);
                expect(res.body.error).toBeDefined();
            });
        });

        describe('GET /api/trusts - listTrusts', () => {
            it('returns 200 with array of Trust objects', async () => {
                const mockTrusts = {
                    't1': { trustId: 't1', legalName: 'Trust 1', createdAt: '2020-01-01T00:00:00Z' }
                };
                persistence.loadData.mockResolvedValue({ trusts: mockTrusts });

                const res = await request(app).get('/api/trusts');

                expect(res.status).toBe(200);
                expect(Array.isArray(res.body.items)).toBe(true);
            });
        });

        describe('GET /api/trusts/:trustId - getTrust', () => {
            it('returns 200 with Trust schema', async () => {
                const mockTrusts = {
                    't1': { trustId: 't1', legalName: 'Test Trust', ein: '12-3456789' }
                };
                persistence.loadData.mockResolvedValue({ trusts: mockTrusts });

                const res = await request(app).get('/api/trusts/t1');

                expect(res.status).toBe(200);
                expect(res.body.trustId).toBeDefined();
                expect(res.body.legalName).toBeDefined();
            });

            it('returns 404 when trust not found', async () => {
                persistence.loadData.mockResolvedValue({ trusts: {}, trustees: {} });

                const res = await request(app).get('/api/trusts/nonexistent');

                expect(res.status).toBe(404);
                expect(res.body.error).toBe('Not Found');
            });
        });

        describe('PATCH /api/trusts/:trustId - updateTrust', () => {
            it('returns 200 with updated Trust schema', async () => {
                const mockTrusts = {
                    't1': { trustId: 't1', legalName: 'Test Trust', status: 'active' }
                };
                persistence.loadData.mockResolvedValue({ trusts: mockTrusts });

                const res = await request(app)
                    .patch('/api/trusts/t1')
                    .send({ status: 'inactive' });

                expect(res.status).toBe(200);
                expect(res.body.status).toBe('inactive');
            });
        });

        describe('POST /api/trusts/:trustId/trustees - addTrustee', () => {
            it('returns 201 with Trustee schema', async () => {
                const mockTrusts = {
                    't1': { trustId: 't1', legalName: 'Test Trust' }
                };
                persistence.loadData.mockResolvedValue({ trusts: mockTrusts, trustees: {} });

                const trusteeCreate = {
                    fullName: 'Jane Doe',
                    role: 'co_trustee'
                };

                const res = await request(app)
                    .post('/api/trusts/t1/trustees')
                    .send(trusteeCreate);

                expect(res.status).toBe(201);
                expect(res.body).toMatchObject({
                    trusteeId: expect.any(String),
                    fullName: 'Jane Doe',
                    role: 'co_trustee'
                });
            });

            it('returns 400 on missing required field (fullName)', async () => {
                const mockTrusts = {
                    't1': { trustId: 't1' }
                };
                persistence.loadData.mockResolvedValue({ trusts: mockTrusts });

                const res = await request(app)
                    .post('/api/trusts/t1/trustees')
                    .send({ role: 'co_trustee' });

                expect(res.status).toBe(400);
            });
        });

        describe('GET /api/trusts/:trustId/trustees - listTrustees', () => {
            it('returns 200 with array of Trustee objects', async () => {
                const mockState = {
                    trusts: { 't1': { trustId: 't1' } },
                    trustees: {
                        't1': {
                            'tr1': { trusteeId: 'tr1', fullName: 'John Doe', role: 'co_trustee', createdAt: '2020-01-01T00:00:00Z' }
                        }
                    }
                };
                persistence.loadData.mockResolvedValue(mockState);

                const res = await request(app).get('/api/trusts/t1/trustees');

                expect(res.status).toBe(200);
                expect(Array.isArray(res.body.items)).toBe(true);
            });
        });

        describe('PATCH /trusts/trustees/:trusteeId - updateTrustee', () => {
            it('returns 200 with updated Trustee schema', async () => {
                const mockState = {
                    trusts: { 't1': { trustId: 't1' } },
                    trustees: {
                        't1': {
                            'tr1': { trusteeId: 'tr1', fullName: 'John Doe', role: 'co_trustee', status: 'active' }
                        }
                    }
                };
                persistence.loadData.mockResolvedValue(mockState);

                const res = await request(app)
                    .patch('/api/trusts/trustees/tr1')
                    .send({ status: 'inactive' });

                expect(res.status).toBe(200);
                expect(res.body.status).toBe('inactive');
            });
        });
    });

    describe('Ledger Domain - Contract Compliance', () => {
        describe('GET /api/ledger/accounts - listAccounts', () => {
            it('returns 200 with array of Account objects when trustId provided', async () => {
                const mockLedger = {
                    accounts: {
                        'trust-1': [
                            { accountId: 'a1', code: '1000', name: 'Cash', type: 'asset', balance: 1000 }
                        ]
                    }
                };
                persistence.loadData.mockResolvedValue(mockLedger);

                const res = await request(app)
                    .get('/api/ledger/accounts')
                    .query({ trustId: 'trust-1' });

                expect(res.status).toBe(200);
                expect(Array.isArray(res.body)).toBe(true);
            });

            it('returns 400 when trustId query param is missing', async () => {
                const res = await request(app).get('/api/ledger/accounts');

                expect(res.status).toBe(400);
                expect(res.body.error).toBe('Validation Error');
            });
        });

        describe('POST /api/ledger/accounts - createAccount', () => {
            it('returns 201 with Account schema', async () => {
                persistence.loadData.mockResolvedValue({ accounts: {}, journalEntries: {} });

                const accountCreate = {
                    code: '1000',
                    name: 'Cash',
                    type: 'asset'
                };

                const res = await request(app)
                    .post('/api/ledger/accounts')
                    .query({ trustId: 'trust-1' })
                    .send(accountCreate);

                expect(res.status).toBe(201);
                expect(res.body).toMatchObject({
                    accountId: expect.any(String),
                    code: '1000',
                    name: 'Cash',
                    type: 'asset',
                    balance: 0
                });
            });

            it('returns 400 on missing required fields', async () => {
                const res = await request(app)
                    .post('/api/ledger/accounts')
                    .query({ trustId: 'trust-1' })
                    .send({ code: '1000' });

                expect(res.status).toBe(400);
            });
        });

        describe('POST /api/ledger/journal-entries - createJournalEntry', () => {
            it('returns 201 with JournalEntry schema in draft status', async () => {
                const mockLedger = {
                    accounts: {
                        'trust-1': [
                            { accountId: 'a1', code: '1000', type: 'asset' },
                            { accountId: 'a2', code: '2000', type: 'liability' }
                        ]
                    },
                    journalEntries: {}
                };
                persistence.loadData.mockResolvedValue(mockLedger);

                const jeCreate = {
                    date: '2024-01-15',
                    memo: 'Test entry',
                    lines: [
                        { accountId: 'a1', debit: 100, credit: 0 },
                        { accountId: 'a2', debit: 0, credit: 100 }
                    ]
                };

                const res = await request(app)
                    .post('/api/ledger/journal-entries')
                    .query({ trustId: 'trust-1' })
                    .send(jeCreate);

                expect(res.status).toBe(201);
                expect(res.body).toMatchObject({
                    jeId: expect.any(String),
                    status: 'draft',
                    date: '2024-01-15'
                });
            });
        });

        describe('POST /api/ledger/journal-entries/:jeId/post - postJournalEntry', () => {
            it('returns 200 with JournalEntry in posted status', async () => {
                const mockLedger = {
                    accounts: {
                        'trust-1': [
                            { accountId: 'a1', code: '1000', type: 'asset', balance: 0 },
                            { accountId: 'a2', code: '2000', type: 'liability', balance: 0 }
                        ]
                    },
                    journalEntries: {
                        'trust-1': [
                            {
                                jeId: 'je1',
                                status: 'draft',
                                date: '2024-01-15',
                                lines: [
                                    { accountId: 'a1', debit: 100, credit: 0 },
                                    { accountId: 'a2', debit: 0, credit: 100 }
                                ]
                            }
                        ]
                    }
                };
                persistence.loadData.mockResolvedValue(mockLedger);

                const res = await request(app)
                    .post('/api/ledger/journal-entries/je1/post');

                expect(res.status).toBe(200);
                expect(res.body.status).toBe('posted');
                expect(res.body.postedAt).toBeDefined();
            });

            it('returns 404 when journal entry not found', async () => {
                persistence.loadData.mockResolvedValue({ accounts: {}, journalEntries: {} });

                const res = await request(app)
                    .post('/api/ledger/journal-entries/nonexistent/post');

                expect(res.status).toBe(404);
            });
        });
    });

    describe('Settlement Domain - Contract Compliance', () => {
        describe('POST /api/settlement/payment-orders - createPaymentOrder', () => {
            it('returns 201 with PaymentOrder schema in created status', async () => {
                persistence.loadData.mockResolvedValue({ paymentOrders: {} });

                const paymentOrderCreate = {
                    amount: 1000.00,
                    payee: 'Acme Corp',
                    method: 'WIRE'
                };

                const res = await request(app)
                    .post('/api/settlement/payment-orders')
                    .send(paymentOrderCreate);

                expect(res.status).toBe(201);
                expect(res.body).toMatchObject({
                    paymentOrderId: expect.any(String),
                    amount: 1000.00,
                    payee: 'Acme Corp',
                    method: 'WIRE',
                    status: 'created'
                });
            });

            it('returns 400 on missing required field (amount)', async () => {
                const res = await request(app)
                    .post('/api/settlement/payment-orders')
                    .send({ payee: 'Acme Corp' });

                expect(res.status).toBe(400);
            });

            it('returns 400 on missing required field (payee)', async () => {
                const res = await request(app)
                    .post('/api/settlement/payment-orders')
                    .send({ amount: 1000 });

                expect(res.status).toBe(400);
            });
        });

        describe('POST /api/settlement/payment-orders/:paymentOrderId/execute - executePaymentOrder', () => {
            it('returns 200 with PaymentOrder in executed status', async () => {
                const mockState = {
                    paymentOrders: {
                        'po1': {
                            paymentOrderId: 'po1',
                            amount: 1000,
                            payee: 'Acme Corp',
                            status: 'created'
                        }
                    }
                };
                persistence.loadData.mockResolvedValue(mockState);

                const res = await request(app)
                    .post('/api/settlement/payment-orders/po1/execute')
                    .send({
                        transactionRef: 'TXN-12345',
                        executedAt: '2024-01-15T10:00:00Z'
                    });

                expect(res.status).toBe(200);
                expect(res.body.status).toBe('executed');
                expect(res.body.executionDetails).toBeDefined();
            });

            it('returns 404 when payment order not found', async () => {
                persistence.loadData.mockResolvedValue({ paymentOrders: {} });

                const res = await request(app)
                    .post('/api/settlement/payment-orders/nonexistent/execute')
                    .send({ transactionRef: 'TXN-12345' });

                expect(res.status).toBe(404);
            });

            it('supports idempotent execution (returns 200 if already executed)', async () => {
                const mockState = {
                    paymentOrders: {
                        'po1': {
                            paymentOrderId: 'po1',
                            amount: 1000,
                            payee: 'Acme Corp',
                            status: 'executed',
                            executionDetails: { transactionRef: 'TXN-12345' }
                        }
                    }
                };
                persistence.loadData.mockResolvedValue(mockState);

                const res = await request(app)
                    .post('/api/settlement/payment-orders/po1/execute')
                    .send({ transactionRef: 'TXN-12345' });

                expect(res.status).toBe(200);
                expect(res.body.status).toBe('executed');
            });
        });
    });
});
