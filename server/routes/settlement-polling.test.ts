/**
 * Tests for Settlement Polling and Webhook Endpoints
 *
 * Tests background polling for payment status updates from BOFA
 * and webhook support for future BOFA webhook integration.
 *
 * Track: bofa_cashpro_20260123
 * Phase: 5.2 Status Polling Service
 */

import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { createServer, type Server } from 'http';
import { request as httpRequest } from 'node:http';
import express from 'express';
import settlementRouter from './settlement.js';

const TEST_PORT = 30106;

// Mock Persistence
const mockStore = new Map();
vi.mock('../lib/gcs-persistence.js', () => {
  return {
    default: {
      loadData: vi.fn(async (uid: string, component: string) => {
        const key = `${uid}/${component}`;
        return mockStore.get(key) || { paymentOrders: {} };
      }),
      saveData: vi.fn(async (uid: string, component: string, data: any) => {
        const key = `${uid}/${component}`;
        mockStore.set(key, data);
      }),
      saveNachaSubmission: vi.fn(async (uid: string, submission: any) => {
        const submissionId = `nacha-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        return {
          submissionId,
          filename: submission.filename,
          checksum: 'test-checksum',
          timestamp: new Date().toISOString(),
          ...submission
        };
      })
    }
  };
});

// Mock BOFA service
vi.mock('../services/bofaCashProService.js', () => ({
  validateAccount: vi.fn(),
  submitACHFile: vi.fn(),
  getPaymentStatus: vi.fn()
}));

// Mock NACHA generator (not used in polling but imported by settlement.js)
vi.mock('../lib/nacha-generator.js', () => ({
  generateNachaFile: vi.fn(() => Buffer.from('mock nacha content'))
}));

// Mock sponsors
vi.mock('../config/sponsors.js', () => ({
  getSponsor: vi.fn(() => ({
    id: 'test-sponsor',
    name: 'TEST SPONSOR',
    odfiRouting: '091000019',
    companyId: '1234567890',
    immediateOriginName: 'TEST SPONSOR'
  }))
}));

import persistence from '../lib/gcs-persistence.js';
import { getPaymentStatus } from '../services/bofaCashProService.js';

describe('Settlement Polling and Webhook', () => {
  let server: Server;
  let app: express.Application;

  const mockUser = { uid: 'polling-test-user' };

  beforeAll(() => {
    app = express();
    app.use(express.json());

    // Mock auth middleware
    app.use((req, res, next) => {
      req.user = mockUser;
      next();
    });

    app.use('/api/settlement', settlementRouter);

    server = createServer(app).listen(TEST_PORT);
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
  });

  const get = (path: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: TEST_PORT,
        path: `/api/settlement${path}`,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      };

      const req = httpRequest(options, (res) => {
        let data = '';
        res.on('data', (c: any) => data += c);
        res.on('end', () => {
          try {
            resolve({
              status: res.statusCode,
              body: JSON.parse(data)
            });
          } catch {
            resolve({ status: res.statusCode, body: data });
          }
        });
      });
      req.on('error', reject);
      req.end();
    });
  };

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
        res.on('data', (c: any) => data += c);
        res.on('end', () => {
          try {
            resolve({
              status: res.statusCode,
              body: JSON.parse(data)
            });
          } catch {
            resolve({ status: res.statusCode, body: data });
          }
        });
      });
      req.on('error', reject);
      req.write(JSON.stringify(body));
      req.end();
    });
  };

  describe('GET /api/settlement/poll - Background polling endpoint', () => {
    it('should retrieve pending payments with bofaSubmissionId', async () => {
      const orderId1 = 'poll-order-1';
      const orderId2 = 'poll-order-2';

      const state = {
        paymentOrders: {
          [orderId1]: {
            paymentOrderId: orderId1,
            status: 'executed',
            method: 'ACH',
            amount: 100.00,
            bofaSubmissionId: 'bofa-sub-1',
            createdAt: new Date().toISOString()
          },
          [orderId2]: {
            paymentOrderId: orderId2,
            status: 'executed',
            method: 'ACH',
            amount: 200.00,
            bofaSubmissionId: 'bofa-sub-2',
            createdAt: new Date().toISOString()
          },
          'no-bofa-id': {
            paymentOrderId: 'no-bofa-id',
            status: 'created',
            method: 'ACH',
            amount: 50.00
            // No bofaSubmissionId - should be skipped
          }
        }
      };

      mockStore.set(`${mockUser.uid}/settlement`, state);

      const response = await get('/poll');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('processed');
      expect(response.body).toHaveProperty('updated');
      expect(response.body.processed).toBe(2); // Only orders with bofaSubmissionId
    });

    it('should call getPaymentStatus for each payment with bofaSubmissionId', async () => {
      const orderId = 'poll-order-status-check';
      const bofaSubmissionId = 'bofa-status-check-123';

      const state = {
        paymentOrders: {
          [orderId]: {
            paymentOrderId: orderId,
            status: 'executed',
            method: 'ACH',
            amount: 150.00,
            bofaSubmissionId,
            createdAt: new Date().toISOString()
          }
        }
      };

      mockStore.set(`${mockUser.uid}/settlement`, state);

      (getPaymentStatus as any).mockResolvedValue({
        submissionId: bofaSubmissionId,
        status: 'processing'
      });

      await get('/poll');

      expect(getPaymentStatus).toHaveBeenCalledWith(bofaSubmissionId);
    });

    it('should update payment order status when BOFA status changes to settled', async () => {
      const orderId = 'poll-order-settled';
      const bofaSubmissionId = 'bofa-settled-123';
      const settledDate = new Date().toISOString();

      const state = {
        paymentOrders: {
          [orderId]: {
            paymentOrderId: orderId,
            status: 'executed',
            method: 'ACH',
            amount: 300.00,
            bofaSubmissionId,
            createdAt: new Date().toISOString()
          }
        }
      };

      mockStore.set(`${mockUser.uid}/settlement`, state);

      (getPaymentStatus as any).mockResolvedValue({
        submissionId: bofaSubmissionId,
        status: 'settled',
        settledDate
      });

      const response = await get('/poll');

      expect(response.status).toBe(200);
      expect(response.body.updated).toBe(1);

      // Verify the payment order was updated with new status
      expect(persistence.saveData).toHaveBeenCalled();
      const saveCall = (persistence.saveData as any).mock.calls[0];
      const updatedOrder = saveCall[2].paymentOrders[orderId];

      expect(updatedOrder.status).toBe('reconciled');
      expect(updatedOrder.settledDate).toBe(settledDate);
      expect(updatedOrder.bofaStatus).toBe('settled');
    });

    it('should update payment order to failed when BOFA returns returned', async () => {
      const orderId = 'poll-order-returned';
      const bofaSubmissionId = 'bofa-returned-123';

      const state = {
        paymentOrders: {
          [orderId]: {
            paymentOrderId: orderId,
            status: 'executed',
            method: 'ACH',
            amount: 400.00,
            bofaSubmissionId,
            createdAt: new Date().toISOString()
          }
        }
      };

      mockStore.set(`${mockUser.uid}/settlement`, state);

      (getPaymentStatus as any).mockResolvedValue({
        submissionId: bofaSubmissionId,
        status: 'returned',
        returnCode: 'R01',
        returnReason: 'Insufficient Funds'
      });

      const response = await get('/poll');

      expect(response.status).toBe(200);
      expect(response.body.updated).toBe(1);

      const saveCall = (persistence.saveData as any).mock.calls[0];
      const updatedOrder = saveCall[2].paymentOrders[orderId];

      expect(updatedOrder.status).toBe('failed');
      expect(updatedOrder.returnCode).toBe('R01');
      expect(updatedOrder.returnReason).toBe('Insufficient Funds');
      expect(updatedOrder.bofaStatus).toBe('returned');
    });

    it('should update payment order to failed when BOFA returns rejected', async () => {
      const orderId = 'poll-order-rejected';
      const bofaSubmissionId = 'bofa-rejected-123';

      const state = {
        paymentOrders: {
          [orderId]: {
            paymentOrderId: orderId,
            status: 'executed',
            method: 'ACH',
            amount: 500.00,
            bofaSubmissionId,
            createdAt: new Date().toISOString()
          }
        }
      };

      mockStore.set(`${mockUser.uid}/settlement`, state);

      (getPaymentStatus as any).mockResolvedValue({
        submissionId: bofaSubmissionId,
        status: 'rejected',
        returnReason: 'Invalid account number'
      });

      const response = await get('/poll');

      expect(response.status).toBe(200);

      const saveCall = (persistence.saveData as any).mock.calls[0];
      const updatedOrder = saveCall[2].paymentOrders[orderId];

      expect(updatedOrder.status).toBe('failed');
      expect(updatedOrder.bofaStatus).toBe('rejected');
      expect(updatedOrder.returnReason).toBe('Invalid account number');
    });

    it('should keep executed status when BOFA status is processing', async () => {
      const orderId = 'poll-order-processing';
      const bofaSubmissionId = 'bofa-processing-123';

      const state = {
        paymentOrders: {
          [orderId]: {
            paymentOrderId: orderId,
            status: 'executed',
            method: 'ACH',
            amount: 600.00,
            bofaSubmissionId,
            createdAt: new Date().toISOString()
          }
        }
      };

      mockStore.set(`${mockUser.uid}/settlement`, state);

      (getPaymentStatus as any).mockResolvedValue({
        submissionId: bofaSubmissionId,
        status: 'processing'
      });

      const response = await get('/poll');

      expect(response.status).toBe(200);
      expect(response.body.updated).toBe(0); // No status change

      const saveCall = (persistence.saveData as any).mock.calls[0];
      const updatedOrder = saveCall[2].paymentOrders[orderId];

      expect(updatedOrder.status).toBe('executed');
      expect(updatedOrder.bofaStatus).toBe('processing');
    });

    it('should handle multiple payments with different statuses', async () => {
      const state = {
        paymentOrders: {
          'poll-1': {
            paymentOrderId: 'poll-1',
            status: 'executed',
            method: 'ACH',
            amount: 100.00,
            bofaSubmissionId: 'bofa-1',
            createdAt: new Date().toISOString()
          },
          'poll-2': {
            paymentOrderId: 'poll-2',
            status: 'executed',
            method: 'ACH',
            amount: 200.00,
            bofaSubmissionId: 'bofa-2',
            createdAt: new Date().toISOString()
          },
          'poll-3': {
            paymentOrderId: 'poll-3',
            status: 'executed',
            method: 'ACH',
            amount: 300.00,
            bofaSubmissionId: 'bofa-3',
            createdAt: new Date().toISOString()
          }
        }
      };

      mockStore.set(`${mockUser.uid}/settlement`, state);

      (getPaymentStatus as any)
        .mockResolvedValueOnce({ submissionId: 'bofa-1', status: 'settled', settledDate: new Date().toISOString() })
        .mockResolvedValueOnce({ submissionId: 'bofa-2', status: 'processing' })
        .mockResolvedValueOnce({ submissionId: 'bofa-3', status: 'returned', returnCode: 'R02', returnReason: 'Account closed' });

      const response = await get('/poll');

      expect(response.status).toBe(200);
      expect(response.body.processed).toBe(3);
      expect(response.body.updated).toBe(2); // settled and returned

      const saveCall = (persistence.saveData as any).mock.calls[0];
      const orders = saveCall[2].paymentOrders;

      expect(orders['poll-1'].status).toBe('reconciled');
      expect(orders['poll-2'].status).toBe('executed');
      expect(orders['poll-3'].status).toBe('failed');
    });

    it('should continue processing other payments when one fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const state = {
        paymentOrders: {
          'poll-fail-1': {
            paymentOrderId: 'poll-fail-1',
            status: 'executed',
            method: 'ACH',
            amount: 100.00,
            bofaSubmissionId: 'bofa-fail-1',
            createdAt: new Date().toISOString()
          },
          'poll-fail-2': {
            paymentOrderId: 'poll-fail-2',
            status: 'executed',
            method: 'ACH',
            amount: 200.00,
            bofaSubmissionId: 'bofa-fail-2',
            createdAt: new Date().toISOString()
          }
        }
      };

      mockStore.set(`${mockUser.uid}/settlement`, state);

      (getPaymentStatus as any)
        .mockRejectedValueOnce(new Error('BOFA API timeout'))
        .mockResolvedValueOnce({ submissionId: 'bofa-fail-2', status: 'settled', settledDate: new Date().toISOString() });

      const response = await get('/poll');

      expect(response.status).toBe(200);
      expect(response.body.processed).toBe(2);
      expect(response.body.errors).toBe(1);
      expect(response.body.updated).toBe(1);

      // Error should be logged
      expect(consoleErrorSpy).toHaveBeenCalled();

      // Second payment should still be processed
      const saveCall = (persistence.saveData as any).mock.calls[0];
      expect(saveCall[2].paymentOrders['poll-fail-2'].status).toBe('reconciled');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('POST /api/settlement/bofa/webhook - Webhook endpoint', () => {
    it('should accept webhook payloads from BOFA', async () => {
      const webhookPayload = {
        submissionId: 'webhook-sub-123',
        status: 'settled',
        settledDate: new Date().toISOString(),
        timestamp: new Date().toISOString()
      };

      const orderId = 'webhook-order-1';
      const state = {
        paymentOrders: {
          [orderId]: {
            paymentOrderId: orderId,
            status: 'executed',
            method: 'ACH',
            amount: 700.00,
            bofaSubmissionId: 'webhook-sub-123',
            createdAt: new Date().toISOString()
          }
        }
      };

      mockStore.set(`${mockUser.uid}/settlement`, state);

      const response = await post('/bofa/webhook', webhookPayload);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('received');
    });

    it('should update payment order status from webhook data', async () => {
      const webhookPayload = {
        submissionId: 'webhook-update-123',
        status: 'settled',
        settledDate: new Date().toISOString()
      };

      const orderId = 'webhook-update-order';
      const state = {
        paymentOrders: {
          [orderId]: {
            paymentOrderId: orderId,
            status: 'executed',
            method: 'ACH',
            amount: 800.00,
            bofaSubmissionId: 'webhook-update-123',
            createdAt: new Date().toISOString()
          }
        }
      };

      mockStore.set(`${mockUser.uid}/settlement`, state);

      const response = await post('/bofa/webhook', webhookPayload);

      expect(response.status).toBe(200);

      const saveCall = (persistence.saveData as any).mock.calls[0];
      const updatedOrder = saveCall[2].paymentOrders[orderId];

      expect(updatedOrder.status).toBe('reconciled');
      expect(updatedOrder.settledDate).toBe(webhookPayload.settledDate);
      expect(updatedOrder.bofaStatus).toBe('settled');
    });

    it('should handle returned status from webhook', async () => {
      const webhookPayload = {
        submissionId: 'webhook-return-123',
        status: 'returned',
        returnCode: 'R03',
        returnReason: 'No account'
      };

      const orderId = 'webhook-return-order';
      const state = {
        paymentOrders: {
          [orderId]: {
            paymentOrderId: orderId,
            status: 'executed',
            method: 'ACH',
            amount: 900.00,
            bofaSubmissionId: 'webhook-return-123',
            createdAt: new Date().toISOString()
          }
        }
      };

      mockStore.set(`${mockUser.uid}/settlement`, state);

      const response = await post('/bofa/webhook', webhookPayload);

      expect(response.status).toBe(200);

      const saveCall = (persistence.saveData as any).mock.calls[0];
      const updatedOrder = saveCall[2].paymentOrders[orderId];

      expect(updatedOrder.status).toBe('failed');
      expect(updatedOrder.returnCode).toBe('R03');
      expect(updatedOrder.returnReason).toBe('No account');
    });

    it('should return 404 if payment order not found for submissionId', async () => {
      const webhookPayload = {
        submissionId: 'non-existent-submission',
        status: 'settled'
      };

      mockStore.set(`${mockUser.uid}/settlement`, { paymentOrders: {} });

      const response = await post('/bofa/webhook', webhookPayload);

      expect(response.status).toBe(404);
      expect(response.body.error).toMatch(/not found/i);
    });

    it('should validate required webhook payload fields', async () => {
      const invalidPayload = {
        status: 'settled'
        // missing submissionId
      };

      const response = await post('/bofa/webhook', invalidPayload);

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/submissionId/i);
    });
  });

  describe('Status mapping', () => {
    it('should map BOFA settled to payment order reconciled', async () => {
      const orderId = 'map-settled';
      const state = {
        paymentOrders: {
          [orderId]: {
            paymentOrderId: orderId,
            status: 'executed',
            bofaSubmissionId: 'map-settled-123',
            method: 'ACH',
            amount: 100.00
          }
        }
      };

      mockStore.set(`${mockUser.uid}/settlement`, state);

      (getPaymentStatus as any).mockResolvedValue({
        submissionId: 'map-settled-123',
        status: 'settled',
        settledDate: new Date().toISOString()
      });

      await get('/poll');

      const saveCall = (persistence.saveData as any).mock.calls[0];
      expect(saveCall[2].paymentOrders[orderId].status).toBe('reconciled');
    });

    it('should map BOFA returned to payment order failed', async () => {
      const orderId = 'map-returned';
      const state = {
        paymentOrders: {
          [orderId]: {
            paymentOrderId: orderId,
            status: 'executed',
            bofaSubmissionId: 'map-returned-123',
            method: 'ACH',
            amount: 100.00
          }
        }
      };

      mockStore.set(`${mockUser.uid}/settlement`, state);

      (getPaymentStatus as any).mockResolvedValue({
        submissionId: 'map-returned-123',
        status: 'returned',
        returnCode: 'R01',
        returnReason: 'Insufficient funds'
      });

      await get('/poll');

      const saveCall = (persistence.saveData as any).mock.calls[0];
      const order = saveCall[2].paymentOrders[orderId];
      expect(order.status).toBe('failed');
      expect(order.returnCode).toBe('R01');
      expect(order.returnReason).toBe('Insufficient funds');
    });

    it('should map BOFA rejected to payment order failed', async () => {
      const orderId = 'map-rejected';
      const state = {
        paymentOrders: {
          [orderId]: {
            paymentOrderId: orderId,
            status: 'executed',
            bofaSubmissionId: 'map-rejected-123',
            method: 'ACH',
            amount: 100.00
          }
        }
      };

      mockStore.set(`${mockUser.uid}/settlement`, state);

      (getPaymentStatus as any).mockResolvedValue({
        submissionId: 'map-rejected-123',
        status: 'rejected',
        returnReason: 'Invalid account'
      });

      await get('/poll');

      const saveCall = (persistence.saveData as any).mock.calls[0];
      const order = saveCall[2].paymentOrders[orderId];
      expect(order.status).toBe('failed');
      expect(order.returnReason).toBe('Invalid account');
    });

    it('should keep executed for BOFA processing and submitted', async () => {
      const state = {
        paymentOrders: {
          'map-processing': {
            paymentOrderId: 'map-processing',
            status: 'executed',
            bofaSubmissionId: 'map-processing-123',
            method: 'ACH',
            amount: 100.00
          },
          'map-submitted': {
            paymentOrderId: 'map-submitted',
            status: 'executed',
            bofaSubmissionId: 'map-submitted-123',
            method: 'ACH',
            amount: 100.00
          }
        }
      };

      mockStore.set(`${mockUser.uid}/settlement`, state);

      (getPaymentStatus as any)
        .mockResolvedValueOnce({ submissionId: 'map-processing-123', status: 'processing' })
        .mockResolvedValueOnce({ submissionId: 'map-submitted-123', status: 'submitted' });

      await get('/poll');

      const saveCall = (persistence.saveData as any).mock.calls[0];
      expect(saveCall[2].paymentOrders['map-processing'].status).toBe('executed');
      expect(saveCall[2].paymentOrders['map-submitted'].status).toBe('executed');
    });
  });
});
