/**
 * Tests for Settlement Auto-Posting to BOFA
 *
 * Tests the integration where payment order approval (execution) automatically
 * triggers NACHA generation and BOFA ACH submission.
 *
 * Track: bofa_cashpro_20260123
 * Phase: 4.2 Automatic Posting Integration
 */

import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { createServer, type Server } from 'http';
import { request as httpRequest } from 'node:http';
import express from 'express';
import settlementRouter from './settlement.js';

const TEST_PORT = 30105;

// Mock Persistence
vi.mock('../lib/gcs-persistence.js', () => {
  const store = new Map();
  return {
    default: {
      loadData: vi.fn(async (uid: string, component: string) => {
        const key = `${uid}/${component}`;
        return store.get(key) || { paymentOrders: {} };
      }),
      saveData: vi.fn(async (uid: string, component: string, data: any) => {
        const key = `${uid}/${component}`;
        store.set(key, data);
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

// Mock NACHA generator
vi.mock('../lib/nacha-generator.js', () => ({
  generateNachaFile: vi.fn((config: any, entries: any[]) => {
    // Return a valid-looking NACHA file with CRLF line endings
    const lines = [
      '1'.padEnd(94, ' '),  // File Header
      '5'.padEnd(94, ' '),  // Batch Header
      '6'.padEnd(94, ' '),  // Entry Detail
      '8'.padEnd(94, ' '),  // Batch Control
      '9'.padEnd(94, ' '),  // File Control
    ];
    // Add 5 padding records to fill the 10-record block
    for (let i = 0; i < 5; i++) {
      lines.push('9'.repeat(94));
    }
    return Buffer.from(lines.join('\r\n') + '\r\n', 'ascii');
  })
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

// Mock BOFA service
vi.mock('../services/bofaCashProService.js', () => ({
  validateAccount: vi.fn(),
  submitACHFile: vi.fn(async (request: any) => ({
    submissionId: `bofa-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    status: 'accepted',
    receivedTimestamp: new Date().toISOString(),
    bofaReference: 'REF-' + Date.now()
  }))
}));

import persistence from '../lib/gcs-persistence.js';
import { generateNachaFile } from '../lib/nacha-generator.js';
import { submitACHFile } from '../services/bofaCashProService.js';

describe('Settlement Auto-Posting to BOFA', () => {
  let server: Server;
  let app: express.Application;

  const mockUser = { uid: 'autopost-test-user' };

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
    // Reset store
    (persistence.loadData as any).mockResolvedValue({ paymentOrders: {} });
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

  describe('Auto-posting triggers on payment order execution', () => {
    it('should automatically submit to BOFA when ACH payment order is executed', async () => {
      const orderId = 'autopost-order-1';
      const mockPaymentOrder = {
        paymentOrderId: orderId,
        status: 'created',
        method: 'ACH',
        amount: 500.00,
        payee: {
          name: 'AUTO TEST PAYEE',
          routingNumber: '021000021',
          accountNumber: '9876543210',
          id: 'PAYEE-123'
        }
      };

      // Setup mock store to return our order
      (persistence.loadData as any).mockResolvedValue({
        paymentOrders: {
          [orderId]: mockPaymentOrder
        }
      });

      const executeResponse = await post(`/payment-orders/${orderId}/execute`, {
        transactionRef: 'ref-autopost-001'
      });

      expect(executeResponse.status).toBe(200);
      expect(executeResponse.body.status).toBe('executed');

      // Verify BOFA submission was called
      expect(submitACHFile).toHaveBeenCalledWith(
        expect.objectContaining({
          nachaFileContent: expect.any(String),
          fileName: expect.stringMatching(/payment-.*\.ach/),
          effectiveDate: expect.any(String),
          customerReference: orderId
        })
      );

      // Verify submission ID is stored with payment order
      expect(executeResponse.body.bofaSubmissionId).toBeDefined();
      expect(executeResponse.body.bofaSubmissionId).toMatch(/^bofa-/);
    });

    it('should store BOFA submission ID with payment order', async () => {
      const orderId = 'autopost-order-2';
      const expectedSubmissionId = 'bofa-test-submission-id-12345';

      (submitACHFile as any).mockResolvedValue({
        submissionId: expectedSubmissionId,
        status: 'accepted',
        receivedTimestamp: new Date().toISOString(),
        bofaReference: 'REF-123'
      });

      const mockPaymentOrder = {
        paymentOrderId: orderId,
        status: 'created',
        method: 'ACH',
        amount: 250.50,
        payee: {
          name: 'SUBMISSION ID TEST',
          routingNumber: '026009593',
          accountNumber: '1234567890'
        }
      };

      (persistence.loadData as any).mockResolvedValue({
        paymentOrders: {
          [orderId]: mockPaymentOrder
        }
      });

      const executeResponse = await post(`/payment-orders/${orderId}/execute`, {});

      expect(executeResponse.status).toBe(200);
      expect(executeResponse.body.bofaSubmissionId).toBe(expectedSubmissionId);

      // Verify the order was saved with the submission ID
      expect(persistence.saveData).toHaveBeenCalled();
      const saveCall = (persistence.saveData as any).mock.calls[0];
      const savedOrder = saveCall[2].paymentOrders[orderId];
      expect(savedOrder.bofaSubmissionId).toBe(expectedSubmissionId);
    });

    it('should generate correct NACHA file for BOFA submission', async () => {
      const orderId = 'autopost-order-3';
      const paymentOrder = {
        paymentOrderId: orderId,
        status: 'created',
        method: 'ACH',
        amount: 1234.56,
        payee: {
          name: 'NACHA CONTENT TEST',
          routingNumber: '031000021',
          accountNumber: '5555555555',
          id: 'VENDOR-999'
        }
      };

      (persistence.loadData as any).mockResolvedValue({
        paymentOrders: {
          [orderId]: paymentOrder
        }
      });

      await post(`/payment-orders/${orderId}/execute`, {});

      // Verify NACHA generator was called
      expect(generateNachaFile).toHaveBeenCalled();

      const [config, entries] = (generateNachaFile as any).mock.calls[0];

      // Verify config has sponsor details
      expect(config.immediateOrigin).toBe('091000019');
      expect(config.companyName).toBe('TEST SPONSOR');
      expect(config.companyId).toBe('1234567890');

      // Verify entry has payee details
      expect(entries).toHaveLength(1);
      expect(entries[0].rdfiRouting).toBe('031000021');
      expect(entries[0].dfiAccount).toBe('5555555555');
      expect(entries[0].amount).toBe(123456); // Amount in cents
      expect(entries[0].individualName).toBe('NACHA CONTENT TEST');

      // Verify submitACHFile received the NACHA content
      expect(submitACHFile).toHaveBeenCalled();
      const submitCall = (submitACHFile as any).mock.calls[0][0];
      expect(submitCall.nachaFileContent).toBeDefined();
      expect(submitCall.fileName).toMatch(/payment-.*\.ach/);
      expect(submitCall.customerReference).toBe(orderId);
    });
  });

  describe('Error handling - fire-and-forget pattern', () => {
    it('should log BOFA submission error but not block payment order execution', async () => {
      const orderId = 'autopost-error-order';
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock BOFA submission failure
      (submitACHFile as any).mockRejectedValue(
        new Error('BOFA API unavailable - timeout')
      );

      const mockPaymentOrder = {
        paymentOrderId: orderId,
        status: 'created',
        method: 'ACH',
        amount: 100.00,
        payee: {
          name: 'ERROR TEST PAYEE',
          routingNumber: '021000021',
          accountNumber: '123456789'
        }
      };

      (persistence.loadData as any).mockResolvedValue({
        paymentOrders: {
          [orderId]: mockPaymentOrder
        }
      });

      const executeResponse = await post(`/payment-orders/${orderId}/execute`, {});

      // Execution should still succeed (fire-and-forget)
      expect(executeResponse.status).toBe(200);
      expect(executeResponse.body.status).toBe('executed');

      // Error should be logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[BOFA Auto-posting] Failed to submit payment order:',
        orderId,
        expect.any(Error)
      );

      // Submission ID should not be stored
      expect(executeResponse.body.bofaSubmissionId).toBeUndefined();

      consoleErrorSpy.mockRestore();
    });

    it('should handle network errors gracefully', async () => {
      const orderId = 'autopost-network-error';
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock network error
      (submitACHFile as any).mockRejectedValue(
        new Error('fetch failed - ECONNREFUSED')
      );

      const mockPaymentOrder = {
        paymentOrderId: orderId,
        status: 'created',
        method: 'ACH',
        amount: 75.25,
        payee: {
          name: 'NETWORK ERROR PAYEE',
          routingNumber: '041000014',
          accountNumber: '987654321'
        }
      };

      (persistence.loadData as any).mockResolvedValue({
        paymentOrders: {
          [orderId]: mockPaymentOrder
        }
      });

      const executeResponse = await post(`/payment-orders/${orderId}/execute`, {});

      // Should not block execution
      expect(executeResponse.status).toBe(200);
      expect(executeResponse.body.status).toBe('executed');

      // Should log the error
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should not submit to BOFA for non-ACH payment methods', async () => {
      const orderId = 'autopost-wire-order';
      const mockPaymentOrder = {
        paymentOrderId: orderId,
        status: 'created',
        method: 'WIRE', // Not ACH
        amount: 5000.00,
        payee: {
          name: 'WIRE PAYEE',
          routingNumber: '021000021',
          accountNumber: '123456789'
        }
      };

      (persistence.loadData as any).mockResolvedValue({
        paymentOrders: {
          [orderId]: mockPaymentOrder
        }
      });

      const executeResponse = await post(`/payment-orders/${orderId}/execute`, {});

      expect(executeResponse.status).toBe(200);
      expect(executeResponse.body.status).toBe('executed');

      // BOFA submission should NOT be called for WIRE
      expect(submitACHFile).not.toHaveBeenCalled();

      // No BOFA submission ID should be stored
      expect(executeResponse.body.bofaSubmissionId).toBeUndefined();
    });
  });

  describe('Integration with existing NACHA generation', () => {
    it('should preserve existing nachaSubmissionId and add bofaSubmissionId', async () => {
      const orderId = 'autopost-both-ids';
      const mockNachaSubmissionId = 'nacha-existing-123';
      const mockBofaSubmissionId = 'bofa-new-456';

      // Mock NACHA submission to return an ID
      (persistence.saveNachaSubmission as any).mockResolvedValue({
        submissionId: mockNachaSubmissionId,
        filename: 'test.ach',
        checksum: 'abc',
        timestamp: new Date().toISOString()
      });

      // Mock BOFA submission
      (submitACHFile as any).mockResolvedValue({
        submissionId: mockBofaSubmissionId,
        status: 'accepted',
        receivedTimestamp: new Date().toISOString(),
        bofaReference: 'REF-123'
      });

      const mockPaymentOrder = {
        paymentOrderId: orderId,
        status: 'created',
        method: 'ACH',
        amount: 333.33,
        payee: {
          name: 'BOTH IDs TEST',
          routingNumber: '021000021',
          accountNumber: '123456789'
        }
      };

      (persistence.loadData as any).mockResolvedValue({
        paymentOrders: {
          [orderId]: mockPaymentOrder
        }
      });

      const executeResponse = await post(`/payment-orders/${orderId}/execute`, {});

      expect(executeResponse.status).toBe(200);

      // Should have both IDs
      expect(executeResponse.body.nachaSubmissionId).toBe(mockNachaSubmissionId);
      expect(executeResponse.body.bofaSubmissionId).toBe(mockBofaSubmissionId);
    });
  });
});
