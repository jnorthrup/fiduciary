import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import settlementRouter from './settlement.js';

// Mock GCS persistence
vi.mock('../lib/gcs-persistence.js', () => ({
    default: {
        loadData: vi.fn(),
        saveData: vi.fn()
    }
}));

import persistence from '../lib/gcs-persistence.js';

/**
 * Fuzz Testing for Settlement State Machine
 * 
 * Property-based tests for Payment Order state transitions
 * Tests invariants that should hold for all valid inputs
 */

const createApp = () => {
    const app = express();
    app.use(express.json());
    app.use((req, res, next) => {
        req.user = { uid: 'test-user-123' };
        next();
    });
    app.use('/api/settlement', settlementRouter);
    return app;
};

// Random value generators
const randomAmount = () => Math.floor(Math.random() * 1000000) / 100;
const randomPayee = () => ['Acme Corp', 'Test Vendor', 'Company XYZ', 'Random Payee'][Math.floor(Math.random() * 4)];
const randomMethod = () => ['WIRE', 'ACH', 'CHECK', 'LEDGER_ONLY'][Math.floor(Math.random() * 4)];
const randomTransactionRef = () => `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

describe('Settlement State Machine - Fuzz Tests', () => {
    let app;

    beforeEach(() => {
        app = createApp();
        vi.clearAllMocks();
        persistence.loadData.mockResolvedValue({ paymentOrders: {} });
        persistence.saveData.mockResolvedValue(undefined);
    });

    describe('Property: Valid State Transitions', () => {
        it('should always transition from created → executed on valid execute request', async () => {
            // Run 10 iterations with random inputs
            for (let i = 0; i < 10; i++) {
                vi.clearAllMocks();

                const amount = randomAmount();
                const payee = randomPayee();
                const method = randomMethod();

                // Create payment order
                persistence.loadData.mockResolvedValue({ paymentOrders: {} });
                const createRes = await request(app)
                    .post('/api/settlement/payment-orders')
                    .send({ amount, payee, method });

                expect(createRes.status).toBe(201);
                expect(createRes.body.status).toBe('created');
                const paymentOrderId = createRes.body.paymentOrderId;

                // Execute it
                const mockState = {
                    paymentOrders: {
                        [paymentOrderId]: {
                            paymentOrderId,
                            amount,
                            payee,
                            method,
                            status: 'created'
                        }
                    }
                };
                persistence.loadData.mockResolvedValue(mockState);

                const executeRes = await request(app)
                    .post(`/api/settlement/payment-orders/${paymentOrderId}/execute`)
                    .send({ transactionRef: randomTransactionRef() });

                expect(executeRes.status).toBe(200);
                expect(executeRes.body.status).toBe('executed');
            }
        });
    });

    describe('Property: Idempotency', () => {
        it('should be safe to execute the same payment order multiple times', async () => {
            const paymentOrderId = 'po-idempotent';
            const transactionRef = 'TXN-SAME';

            // First execution
            const mockState1 = {
                paymentOrders: {
                    [paymentOrderId]: {
                        paymentOrderId,
                        amount: 1000,
                        payee: 'Test',
                        status: 'created'
                    }
                }
            };
            persistence.loadData.mockResolvedValue(mockState1);

            const res1 = await request(app)
                .post(`/api/settlement/payment-orders/${paymentOrderId}/execute`)
                .send({ transactionRef });

            expect(res1.status).toBe(200);
            expect(res1.body.status).toBe('executed');

            // Second execution (idempotent)
            const mockState2 = {
                paymentOrders: {
                    [paymentOrderId]: {
                        paymentOrderId,
                        amount: 1000,
                        payee: 'Test',
                        status: 'executed',
                        executionDetails: { transactionRef }
                    }
                }
            };
            persistence.loadData.mockResolvedValue(mockState2);

            const res2 = await request(app)
                .post(`/api/settlement/payment-orders/${paymentOrderId}/execute`)
                .send({ transactionRef });

            expect(res2.status).toBe(200);
            expect(res2.body.status).toBe('executed');
        });

        it('should handle concurrent execution attempts gracefully', async () => {
            const paymentOrderId = 'po-concurrent';
            const mockState = {
                paymentOrders: {
                    [paymentOrderId]: {
                        paymentOrderId,
                        amount: 1000,
                        payee: 'Test',
                        status: 'created'
                    }
                }
            };

            // Simulate multiple concurrent requests
            persistence.loadData.mockResolvedValue(mockState);

            const requests = Array(5).fill(null).map(() =>
                request(app)
                    .post(`/api/settlement/payment-orders/${paymentOrderId}/execute`)
                    .send({ transactionRef: 'TXN-CONCURRENT' })
            );

            const results = await Promise.all(requests);

            // All should succeed (200) due to idempotency
            results.forEach(res => {
                expect([200]).toContain(res.status);
                expect(res.body.status).toBe('executed');
            });
        });
    });

    describe('Property: Monotonic Timestamps', () => {
        it('should never have executedAt before createdAt', async () => {
            for (let i = 0; i < 5; i++) {
                vi.clearAllMocks();

                const now = new Date();
                const createdAt = now.toISOString();
                const executedAt = new Date(now.getTime() + 1000).toISOString(); // 1 second later

                const paymentOrderId = `po-${i}`;
                const mockState = {
                    paymentOrders: {
                        [paymentOrderId]: {
                            paymentOrderId,
                            amount: randomAmount(),
                            payee: randomPayee(),
                            status: 'created',
                            createdAt
                        }
                    }
                };
                persistence.loadData.mockResolvedValue(mockState);

                const res = await request(app)
                    .post(`/api/settlement/payment-orders/${paymentOrderId}/execute`)
                    .send({ transactionRef: randomTransactionRef(), executedAt });

                expect(res.status).toBe(200);
                expect(res.body.executionDetails.executedAt).toBeDefined();

                // Verify executedAt >= createdAt
                const execTime = new Date(res.body.executionDetails.executedAt).getTime();
                const createTime = new Date(createdAt).getTime();
                expect(execTime).toBeGreaterThanOrEqual(createTime);
            }
        });
    });

    describe('Property: Invalid Transitions Should Fail', () => {
        it('should reject execution of failed payment orders', async () => {
            const paymentOrderId = 'po-failed';
            const mockState = {
                paymentOrders: {
                    [paymentOrderId]: {
                        paymentOrderId,
                        amount: 1000,
                        payee: 'Test',
                        status: 'failed'
                    }
                }
            };
            persistence.loadData.mockResolvedValue(mockState);

            const res = await request(app)
                .post(`/api/settlement/payment-orders/${paymentOrderId}/execute`)
                .send({ transactionRef: 'TXN-SHOULD-FAIL' });

            expect(res.status).toBe(409);
            expect(res.body.error).toBe('Conflict');
        });

        it('should reject execution of non-existent payment orders', async () => {
            for (let i = 0; i < 5; i++) {
                vi.clearAllMocks();
                persistence.loadData.mockResolvedValue({ paymentOrders: {} });

                const res = await request(app)
                    .post(`/api/settlement/payment-orders/nonexistent-${i}/execute`)
                    .send({ transactionRef: randomTransactionRef() });

                expect(res.status).toBe(404);
            }
        });
    });

    describe('Property: Boundary Value Testing', () => {
        it('should handle edge case amounts correctly', async () => {
            const edgeCaseAmounts = [
                0.01,           // Minimum amount
                999999999.99,   // Maximum amount
                0.001,          // Sub-cent precision
                123.456         // High precision
            ];

            for (const amount of edgeCaseAmounts) {
                vi.clearAllMocks();
                persistence.loadData.mockResolvedValue({ paymentOrders: {} });

                const res = await request(app)
                    .post('/api/settlement/payment-orders')
                    .send({ amount, payee: 'Test Payee', method: 'WIRE' });

                expect(res.status).toBe(201);
                expect(res.body.amount).toBe(amount);
            }
        });

        it('should handle very long payee names', async () => {
            const longPayee = 'A'.repeat(1000);
            persistence.loadData.mockResolvedValue({ paymentOrders: {} });

            const res = await request(app)
                .post('/api/settlement/payment-orders')
                .send({ amount: 100, payee: longPayee, method: 'WIRE' });

            expect(res.status).toBe(201);
            expect(res.body.payee).toBe(longPayee);
        });

        it('should handle empty optional fields gracefully', async () => {
            persistence.loadData.mockResolvedValue({ paymentOrders: {} });

            // Without method (should default to CHECK)
            const res = await request(app)
                .post('/api/settlement/payment-orders')
                .send({ amount: 100, payee: 'Test' });

            expect(res.status).toBe(201);
            expect(res.body.method).toBe('CHECK'); // Default per implementation
        });
    });

    describe('Property: State Immutability After Terminal States', () => {
        it('should not modify failed orders on subsequent operations', async () => {
            const paymentOrderId = 'po-terminal-failed';
            const mockState = {
                paymentOrders: {
                    [paymentOrderId]: {
                        paymentOrderId,
                        amount: 1000,
                        payee: 'Test',
                        status: 'failed',
                        failedAt: '2024-01-15T10:00:00Z'
                    }
                }
            };
            persistence.loadData.mockResolvedValue(mockState);

            const res = await request(app)
                .post(`/api/settlement/payment-orders/${paymentOrderId}/execute`)
                .send({ transactionRef: 'TXN-ATTEMPT' });

            // Should reject and not call saveData
            expect(res.status).toBe(409);
            expect(persistence.saveData).not.toHaveBeenCalled();
        });
    });

    describe('Property: Data Integrity', () => {
        it('should preserve all original payment order fields during execution', async () => {
            const originalOrder = {
                paymentOrderId: 'po-preserve',
                amount: 1234.56,
                payee: 'Original Payee',
                method: 'ACH',
                status: 'created',
                createdAt: '2024-01-15T09:00:00Z',
                customField: 'should-preserve' // Extra field not in spec
            };

            const mockState = {
                paymentOrders: {
                    [originalOrder.paymentOrderId]: originalOrder
                }
            };
            persistence.loadData.mockResolvedValue(mockState);

            const res = await request(app)
                .post(`/api/settlement/payment-orders/${originalOrder.paymentOrderId}/execute`)
                .send({ transactionRef: 'TXN-123' });

            expect(res.status).toBe(200);
            expect(res.body.amount).toBe(originalOrder.amount);
            expect(res.body.payee).toBe(originalOrder.payee);
            expect(res.body.method).toBe(originalOrder.method);
            // Status should change to executed
            expect(res.body.status).toBe('executed');
        });
    });
});
