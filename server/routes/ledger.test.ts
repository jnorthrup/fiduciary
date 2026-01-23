import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import ledgerRouter from './ledger.js';

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
import { publish } from '../lib/event-bus.js';

const createApp = () => {
    const app = express();
    app.use(express.json());
    app.use((req, res, next) => {
        req.user = { uid: 'test-user-123' };
        next();
    });
    app.use('/api/ledger', ledgerRouter);
    return app;
};

describe('Ledger API', () => {
    let app;

    beforeEach(() => {
        app = createApp();
        vi.clearAllMocks();
        persistence.loadData.mockResolvedValue({ accounts: {}, journalEntries: {} });
        persistence.saveData.mockResolvedValue(undefined);
    });

    describe('GET /api/ledger/accounts - List Accounts', () => {
        it('should return empty array when no accounts exist', async () => {
            const res = await request(app)
                .get('/api/ledger/accounts')
                .query({ trustId: 'trust-1' });

            expect(res.status).toBe(200);
            expect(res.body).toEqual([]);
        });

        it('should return accounts for specific trust', async () => {
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
            expect(res.body).toHaveLength(1);
            expect(res.body[0].code).toBe('1000');
        });

        it('should require trustId query parameter', async () => {
            const res = await request(app).get('/api/ledger/accounts');

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Validation Error');
        });
    });

    describe('POST /api/ledger/accounts - Create Account', () => {
        it('should create account with valid data', async () => {
            const accountData = {
                code: '1000',
                name: 'Cash',
                type: 'asset'
            };

            const res = await request(app)
                .post('/api/ledger/accounts')
                .query({ trustId: 'trust-1' })
                .send(accountData);

            expect(res.status).toBe(201);
            expect(res.body.accountId).toBeDefined();
            expect(res.body.code).toBe('1000');
            expect(res.body.balance).toBe(0);
            expect(persistence.saveData).toHaveBeenCalled();
        });

        it('should reject missing required fields', async () => {
            const res = await request(app)
                .post('/api/ledger/accounts')
                .query({ trustId: 'trust-1' })
                .send({ code: '1000' });

            expect(res.status).toBe(400);
        });

        it('should prevent duplicate account codes', async () => {
            const mockLedger = {
                accounts: {
                    'trust-1': [
                        { accountId: 'a1', code: '1000', name: 'Cash', type: 'asset' }
                    ]
                }
            };
            persistence.loadData.mockResolvedValue(mockLedger);

            const res = await request(app)
                .post('/api/ledger/accounts')
                .query({ trustId: 'trust-1' })
                .send({ code: '1000', name: 'Duplicate', type: 'asset' });

            expect(res.status).toBe(409);
            expect(res.body.error).toBe('Conflict');
        });

        it('should require trustId query parameter', async () => {
            const res = await request(app)
                .post('/api/ledger/accounts')
                .send({ code: '1000', name: 'Cash', type: 'asset' });

            expect(res.status).toBe(400);
        });
    });

    describe('POST /api/ledger/journal-entries - Create Journal Entry', () => {
        it('should create journal entry in draft status', async () => {
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

            const jeData = {
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
                .send(jeData);

            expect(res.status).toBe(201);
            expect(res.body.jeId).toBeDefined();
            expect(res.body.status).toBe('draft');
            expect(res.body.createdAt).toBeDefined();
        });

        it('should reject entries with invalid account IDs', async () => {
            const mockLedger = {
                accounts: { 'trust-1': [{ accountId: 'a1', code: '1000' }] },
                journalEntries: {}
            };
            persistence.loadData.mockResolvedValue(mockLedger);

            const res = await request(app)
                .post('/api/ledger/journal-entries')
                .query({ trustId: 'trust-1' })
                .send({
                    date: '2024-01-15',
                    lines: [{ accountId: 'invalid', debit: 100 }]
                });

            expect(res.status).toBe(400);
            expect(res.body.message).toContain('not found');
        });

        it('should require date and lines', async () => {
            const res = await request(app)
                .post('/api/ledger/journal-entries')
                .query({ trustId: 'trust-1' })
                .send({});

            expect(res.status).toBe(400);
        });
    });

    describe('POST /api/ledger/journal-entries/:jeId/post - Post Journal Entry', () => {
        it('should post valid journal entry and update account balances', async () => {
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
            expect(persistence.saveData).toHaveBeenCalled();
            expect(publish).toHaveBeenCalledWith('journal.entry_posted', expect.any(Object));
        });

        it('should reject posting already posted entry', async () => {
            const mockLedger = {
                accounts: { 'trust-1': [] },
                journalEntries: {
                    'trust-1': [
                        {
                            jeId: 'je1',
                            status: 'posted',
                            date: '2024-01-15',
                            lines: []
                        }
                    ]
                }
            };
            persistence.loadData.mockResolvedValue(mockLedger);

            const res = await request(app)
                .post('/api/ledger/journal-entries/je1/post');

            expect(res.status).toBe(400);
            expect(res.body.message).toContain('already posted');
        });

        it('should reject unbalanced journal entries', async () => {
            const mockLedger = {
                accounts: {
                    'trust-1': [
                        { accountId: 'a1', code: '1000', type: 'asset' },
                        { accountId: 'a2', code: '2000', type: 'liability' }
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
                                { accountId: 'a2', debit: 0, credit: 50 } // Unbalanced
                            ]
                        }
                    ]
                }
            };
            persistence.loadData.mockResolvedValue(mockLedger);

            const res = await request(app)
                .post('/api/ledger/journal-entries/je1/post');

            expect(res.status).toBe(400);
            expect(res.body.message).toContain('not balanced');
        });

        it('should return 404 for non-existent journal entry', async () => {
            const res = await request(app)
                .post('/api/ledger/journal-entries/nonexistent/post');

            expect(res.status).toBe(404);
        });
    });
});
