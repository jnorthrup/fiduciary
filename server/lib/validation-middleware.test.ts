/**
 * Tests for OpenAPI Validation Middleware
 * Tests request validation against the LAS Trust ERP OpenAPI spec
 */

import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { createServer, type Server } from 'http';
import { request as httpRequest } from 'node:http';
import express from 'express';
import { createValidationMiddleware } from './validation-middleware.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test server port
const TEST_PORT = 30104;

describe('OpenAPI Validation Middleware', () => {
    let server: Server;
    let app: express.Application;

    // Mock user for auth
    const mockUser = { uid: 'test-user-validation' };

    beforeAll(async () => {
        app = express();
        app.use(express.json());

        // Mock Auth Middleware
        app.use((req, res, next) => {
            req.user = mockUser;
            next();
        });

        // Apply validation middleware
        const specPath = path.join(__dirname, '../../docs/openapi/las-trust-api-spec.yaml');
        const validationMiddleware = await createValidationMiddleware(specPath);
        app.use(validationMiddleware);

        // Define test routes matching OpenAPI spec
        app.post('/api/trusts', (req, res) => {
            res.status(201).json({ trustId: 'test-trust-id', ...req.body });
        });

        app.get('/api/trusts/:trustId', (req, res) => {
            res.json({ trustId: req.params.trustId, legalName: 'Test Trust' });
        });

        app.patch('/api/trusts/:trustId', (req, res) => {
            res.json({ trustId: req.params.trustId, ...req.body });
        });

        app.post('/api/ledger/accounts', (req, res) => {
            res.status(201).json({ accountId: 'test-account-id', ...req.body });
        });

        app.post('/api/ledger/journal-entries', (req, res) => {
            res.status(201).json({ jeId: 'test-je-id', ...req.body, status: 'draft' });
        });

        app.post('/api/settlement/payment-orders', (req, res) => {
            res.status(201).json({ paymentOrderId: 'test-po-id', ...req.body, status: 'created' });
        });

        app.post('/api/settlement/payment-orders/:paymentOrderId/execute', (req, res) => {
            res.json({ paymentOrderId: req.params.paymentOrderId, status: 'executed', ...req.body });
        });

        server = createServer(app).listen(TEST_PORT);
    });

    afterAll(() => {
        server.close();
    });

    const post = (path: string, body: any): Promise<any> => {
        return new Promise((resolve, reject) => {
            const bodyStr = JSON.stringify(body);
            const options = {
                hostname: 'localhost',
                port: TEST_PORT,
                path,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(bodyStr),
                },
            };

            const req = httpRequest(options, (res) => {
                let data = '';
                res.on('data', c => data += c);
                res.on('end', () => {
                    try {
                        resolve({ status: res.statusCode, body: JSON.parse(data) });
                    } catch (e) {
                        resolve({ status: res.statusCode, body: data });
                    }
                });
            });
            req.on('error', reject);
            req.write(bodyStr);
            req.end();
        });
    };

    const get = (path: string): Promise<any> => {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'localhost',
                port: TEST_PORT,
                path,
                method: 'GET',
            };
            const req = httpRequest(options, (res) => {
                let data = '';
                res.on('data', c => data += c);
                res.on('end', () => {
                    try {
                        resolve({ status: res.statusCode, body: JSON.parse(data) });
                    } catch (e) {
                        resolve({ status: res.statusCode, body: data });
                    }
                });
            });
            req.on('error', reject);
            req.end();
        });
    };

    const patch = (path: string, body: any): Promise<any> => {
        return new Promise((resolve, reject) => {
            const bodyStr = JSON.stringify(body);
            const options = {
                hostname: 'localhost',
                port: TEST_PORT,
                path,
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(bodyStr),
                },
            };

            const req = httpRequest(options, (res) => {
                let data = '';
                res.on('data', c => data += c);
                res.on('end', () => {
                    try {
                        resolve({ status: res.statusCode, body: JSON.parse(data) });
                    } catch (e) {
                        resolve({ status: res.statusCode, body: data });
                    }
                });
            });
            req.on('error', reject);
            req.write(bodyStr);
            req.end();
        });
    };

    describe('Trust Domain Validation', () => {
        it('should accept valid TrustCreate request', async () => {
            const validTrust = {
                legalName: 'The Smith Family Trust',
                ein: '12-3456789',
                dateOfTrust: '2024-01-15',
                situsState: 'CA',
                mailingAddress: '123 Main St, Anytown, CA 90210'
            };

            const { status, body } = await post('/api/trusts', validTrust);
            expect(status).toBe(201);
            expect(body.trustId).toBeDefined();
        });

        it('should reject TrustCreate missing required legalName', async () => {
            const invalidTrust = {
                ein: '12-3456789',
                dateOfTrust: '2024-01-15'
            };

            const { status, body } = await post('/api/trusts', invalidTrust);
            expect(status).toBe(400);
            expect(body.error).toBeDefined();
            expect(JSON.stringify(body)).toContain('legalName');
        });

        it('should accept valid TrustUpdate with status enum', async () => {
            const validUpdate = {
                status: 'active',
                mailingAddress: '456 Oak Ave'
            };

            const { status } = await patch('/api/trusts/550e8400-e29b-41d4-a716-446655440000', validUpdate);
            expect(status).toBe(200);
        });

        it('should reject TrustUpdate with invalid status enum', async () => {
            const invalidUpdate = {
                status: 'invalid_status'
            };

            const { status, body } = await patch('/api/trusts/550e8400-e29b-41d4-a716-446655440000', invalidUpdate);
            expect(status).toBe(400);
            expect(body.error).toBeDefined();
        });

        it('should reject invalid UUID in path parameter', async () => {
            const { status, body } = await get('/api/trusts/not-a-uuid');
            expect(status).toBe(400);
            expect(body.error).toBeDefined();
        });

        it('should accept valid UUID in path parameter', async () => {
            const { status, body } = await get('/api/trusts/550e8400-e29b-41d4-a716-446655440000');
            if (status !== 200) {
                console.log('GET Valid UUID Error:', JSON.stringify(body, null, 2));
            }
            expect(status).toBe(200);
        });
    });

    describe('Ledger Domain Validation', () => {
        it('should accept valid AccountCreate request', async () => {
            const validAccount = {
                code: '1000',
                name: 'Cash in Bank',
                type: 'asset'
            };

            const { status, body } = await post('/api/ledger/accounts?trustId=550e8400-e29b-41d4-a716-446655440000', validAccount);
            expect(status).toBe(201);
            expect(body.accountId).toBeDefined();
        });

        it('should reject AccountCreate with invalid type enum', async () => {
            const invalidAccount = {
                code: '1000',
                name: 'Cash in Bank',
                type: 'invalid_type'
            };

            const { status, body } = await post('/api/ledger/accounts?trustId=550e8400-e29b-41d4-a716-446655440000', invalidAccount);
            expect(status).toBe(400);
            expect(body.error).toBeDefined();
        });

        it('should reject AccountCreate missing required trustId query param', async () => {
            const validAccount = {
                code: '1000',
                name: 'Cash in Bank',
                type: 'asset'
            };

            const { status, body } = await post('/api/ledger/accounts', validAccount);
            expect(status).toBe(400);
            expect(body.error).toBeDefined();
            expect(JSON.stringify(body)).toContain('trustId');
        });

        it('should accept valid JournalEntryCreate request', async () => {
            const validJE = {
                date: '2024-01-15',
                memo: 'Test entry',
                lines: [
                    { accountId: '1000', debit: 100, credit: 0 },
                    { accountId: '2000', debit: 0, credit: 100 }
                ]
            };

            const { status, body } = await post('/api/ledger/journal-entries?trustId=550e8400-e29b-41d4-a716-446655440000', validJE);
            expect(status).toBe(201);
            expect(body.jeId).toBeDefined();
        });

        it('should reject JournalEntryCreate with invalid date format', async () => {
            const invalidJE = {
                date: 'not-a-date',
                lines: [
                    { accountId: '1000', debit: 100 }
                ]
            };

            const { status, body } = await post('/api/ledger/journal-entries?trustId=550e8400-e29b-41d4-a716-446655440000', invalidJE);
            expect(status).toBe(400);
            expect(body.error).toBeDefined();
        });
    });

    describe('Settlement Domain Validation', () => {
        it('should accept valid PaymentOrderCreate request', async () => {
            const validPO = {
                amount: 5000.00,
                payee: 'John Doe',
                method: 'ACH'
            };

            const { status, body } = await post('/api/settlement/payment-orders?trustId=550e8400-e29b-41d4-a716-446655440000', validPO);
            expect(status).toBe(201);
            expect(body.paymentOrderId).toBeDefined();
        });

        it('should reject PaymentOrderCreate missing required amount', async () => {
            const invalidPO = {
                payee: 'John Doe',
                method: 'ACH'
            };

            const { status, body } = await post('/api/settlement/payment-orders?trustId=550e8400-e29b-41d4-a716-446655440000', invalidPO);
            expect(status).toBe(400);
            expect(body.error).toBeDefined();
            expect(JSON.stringify(body)).toContain('amount');
        });

        it('should reject PaymentOrderCreate with invalid method enum', async () => {
            const invalidPO = {
                amount: 5000.00,
                payee: 'John Doe',
                method: 'INVALID_METHOD'
            };

            const { status, body } = await post('/api/settlement/payment-orders?trustId=550e8400-e29b-41d4-a716-446655440000', invalidPO);
            expect(status).toBe(400);
            expect(body.error).toBeDefined();
        });

        it('should accept valid ExecutionConfirmRequest', async () => {
            const validExecution = {
                transactionRef: 'ref-12345',
                executedAt: '2024-01-15T10:30:00Z'
            };

            const { status } = await post('/api/settlement/payment-orders/550e8400-e29b-41d4-a716-446655440000/execute', validExecution);
            expect(status).toBe(200);
        });

        it('should reject ExecutionConfirmRequest with invalid datetime format', async () => {
            const invalidExecution = {
                transactionRef: 'ref-12345',
                executedAt: 'not-a-datetime'
            };

            const { status, body } = await post('/api/settlement/payment-orders/550e8400-e29b-41d4-a716-446655440000/execute', invalidExecution);
            expect(status).toBe(400);
            expect(body.error).toBeDefined();
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty request body', async () => {
            const { status, body } = await post('/api/trusts', {});
            expect(status).toBe(400);
            expect(body.error).toBeDefined();
        });

        it('should handle null values in required fields', async () => {
            const invalidTrust = {
                legalName: null,
                ein: '12-3456789'
            };

            const { status, body } = await post('/api/trusts', invalidTrust);
            expect(status).toBe(400);
            expect(body.error).toBeDefined();
        });

        it('should handle wrong type for number field', async () => {
            const invalidPO = {
                amount: 'not-a-number',
                payee: 'John Doe',
                method: 'ACH'
            };

            const { status, body } = await post('/api/settlement/payment-orders?trustId=550e8400-e29b-41d4-a716-446655440000', invalidPO);
            expect(status).toBe(400);
            expect(body.error).toBeDefined();
        });
    });
});
