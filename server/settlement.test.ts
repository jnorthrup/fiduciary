/**
 * Tests for Settlement API (server/routes/settlement.js)
 * Verifies Payment Order logic and State Machine transitions.
 */

import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { createServer, type Server } from 'http';
import { request as httpRequest } from 'node:http';
import express from 'express';
import settlementRouter from './routes/settlement.js';

// Test server port
const TEST_PORT = 30103;

// Mock Persistence
vi.mock('./lib/gcs-persistence.js', () => ({
    default: {
        loadData: vi.fn(),
        saveData: vi.fn(),
    }
}));

import persistence from './lib/gcs-persistence.js';

describe('Settlement API (settlement.js)', () => {
    let server: Server;
    let app: express.Application;

    // Mock User
    const mockUser = { uid: 'test-user-123' };

    // Store state in memory for mocks
    let mockStore: any = { paymentOrders: {} };

    beforeAll(() => {
        app = express();
        app.use(express.json()); // Body parser

        // Mock Auth Middleware
        app.use((req, res, next) => {
            req.user = mockUser;
            next();
        });

        // Mount Router
        app.use('/api/settlement', settlementRouter);

        server = createServer(app).listen(TEST_PORT);
    });

    afterAll(() => {
        server.close();
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockStore = { paymentOrders: {} };
        // Mock Persistence Implementation
        (persistence.loadData as any).mockImplementation(async () => mockStore);
        (persistence.saveData as any).mockImplementation(async (uid, key, data) => {
            mockStore = data;
        });
    });

    const post = (path: string, body: any): Promise<any> => {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'localhost',
                port: TEST_PORT,
                path: `/api/settlement${path}`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(JSON.stringify(body)),
                },
            };

            const req = httpRequest(options, (res) => {
                let data = '';
                res.on('data', c => data += c);
                res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
            });
            req.on('error', reject);
            req.write(JSON.stringify(body));
            req.end();
        });
    };

    const get = (path: string): Promise<any> => {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'localhost',
                port: TEST_PORT,
                path: `/api/settlement${path}`,
                method: 'GET',
            };
            const req = httpRequest(options, (res) => {
                let data = '';
                res.on('data', c => data += c);
                res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
            });
            req.on('error', reject);
            req.end();
        });
    };

    describe('Payment Order State Machine', () => {

        it('should create a payment order in INITIATED state', async () => {
            const payload = {
                payableId: 'pay-123',
                amount: 5000,
                method: 'SPONSORED_ACH',
                fundingSourceType: 'clearing_agent'
            };

            const { status, body } = await post('/payment-orders', payload);
            expect(status).toBe(201);
            expect(body.status).toBe('initiated');
            expect(body.paymentOrderId).toBeDefined();
            expect(mockStore.paymentOrders[body.paymentOrderId]).toBeDefined();
        });

        it('should approve an INITIATED order', async () => {
            // Setup: Create order manually in store
            const orderId = 'order-1';
            mockStore.paymentOrders[orderId] = {
                paymentOrderId: orderId,
                status: 'initiated',
                history: [],
            };

            const { status, body } = await post(`/payment-orders/${orderId}/approve`, {
                reason: 'Looks good',
                mfaVerified: true
            });

            expect(status).toBe(200);
            expect(body.status).toBe('approved');
            expect(body.approvalDetails.reason).toBe('Looks good');
        });

        it('should NOT approve if missing mfaVerified', async () => {
            const orderId = 'order-1';
            mockStore.paymentOrders[orderId] = { paymentOrderId: orderId, status: 'initiated', history: [] };

            const { status } = await post(`/payment-orders/${orderId}/approve`, { reason: 'No MFA' });
            expect(status).toBe(400); // Validation error
        });

        it('should dispatch an APPROVED order', async () => {
            const orderId = 'order-2';
            mockStore.paymentOrders[orderId] = { paymentOrderId: orderId, status: 'approved', history: [] };

            const { status, body } = await post(`/payment-orders/${orderId}/dispatch`, {
                adapterConfig: { destination: 'bank-x' }
            });

            expect(status).toBe(200);
            expect(body.status).toBe('dispatched');
        });

        it('should NOT dispatch an INITIATED order (skip approval)', async () => {
            const orderId = 'order-3';
            mockStore.paymentOrders[orderId] = { paymentOrderId: orderId, status: 'initiated', history: [] };

            const { status, body } = await post(`/payment-orders/${orderId}/dispatch`, {});
            expect(status).toBe(409); // Conflict / Invalid Transition
            expect(body.message).toContain('Cannot transition');
        });

        it('should execute a DISPATCHED order', async () => {
            const orderId = 'order-4';
            mockStore.paymentOrders[orderId] = { paymentOrderId: orderId, status: 'dispatched', history: [] };

            const { status, body } = await post(`/payment-orders/${orderId}/mark-executed`, {
                executedAt: new Date().toISOString()
            });

            expect(status).toBe(200);
            expect(body.status).toBe('executed');
        });

        it('should reconcile an EXECUTED order', async () => {
            const orderId = 'order-5';
            mockStore.paymentOrders[orderId] = { paymentOrderId: orderId, status: 'executed', history: [] };

            const { status, body } = await post(`/payment-orders/${orderId}/reconcile`, {
                reconciledAt: new Date().toISOString()
            });

            expect(status).toBe(200);
            expect(body.status).toBe('reconciled');
        });

        it('should prevent invalid backward transitions (Reconciled -> Approved)', async () => {
            const orderId = 'order-6';
            mockStore.paymentOrders[orderId] = { paymentOrderId: orderId, status: 'reconciled', history: [] };

            const { status, body } = await post(`/payment-orders/${orderId}/approve`, {
                reason: 'Hacking attempt',
                mfaVerified: true
            });

            expect(status).toBe(409);
            expect(body.message).toContain('Cannot transition');
        });
    });
});
