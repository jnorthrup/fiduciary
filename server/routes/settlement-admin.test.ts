/**
 * Tests for BOFA Admin API Routes
 *
 * Test file for manual BOFA operations endpoints
 * Phase: Manual BOFA CRUD Operations
 * Track: bofa_cashpro_20260123
 */

import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { createServer, type Server } from 'http';
import { request as httpRequest } from 'node:http';
import express from 'express';
import settlementRouter from './settlement.js';

const TEST_PORT = 30108;

// Mock BOFA service
vi.mock('../services/bofaCashProService.js', () => ({
  validateAccount: vi.fn(),
  submitACHFile: vi.fn(),
  getPaymentStatus: vi.fn(),
  getBalance: vi.fn()
}));

// Mock persistence
vi.mock('../lib/gcs-persistence.js', () => ({
  default: {
    loadData: vi.fn(async (uid: string, component: string) => {
      return { paymentOrders: {} };
    }),
    saveData: vi.fn(async (uid: string, component: string, data: any) => {
      // Mock save
    }),
    saveNachaSubmission: vi.fn(async (uid: string, submission: any) => {
      return {
        submissionId: `nacha-${Date.now()}`,
        filename: submission.filename,
        timestamp: new Date().toISOString()
      };
    })
  }
}));

// Mock nacha generator
vi.mock('../lib/nacha-generator.js', () => ({
  generateNachaFile: vi.fn(() => Buffer.from('mock nacha content'))
}));

// Mock sponsors
vi.mock('../config/sponsors.js', () => ({
  getSponsor: vi.fn(() => ({
    odfiRouting: '021000021',
    immediateOriginName: 'TEST SPONSOR',
    name: 'Test Company',
    companyId: 'TESTCOMPANY'
  }))
}));

import { submitACHFile, getPaymentStatus } from '../services/bofaCashProService.js';

describe('BOFA Admin API Routes', () => {
  let server: Server;
  let app: express.Application;

  const mockUser = { uid: 'admin-test-user' };

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

  describe('POST /api/settlement/bofa/ach/submit - Manual ACH Submission', () => {
    it('should submit ACH file manually', async () => {
      const mockSubmission = {
        submissionId: 'manual-sub-123',
        status: 'accepted',
        receivedTimestamp: new Date().toISOString(),
        bofaReference: 'BOFA-MANUAL-REF'
      };

      vi.mocked(submitACHFile).mockResolvedValueOnce(mockSubmission);

      const response = await post('/bofa/ach/submit', {
        nachaFileContent: '101 021000021 ...',
        fileName: 'manual-test.ach',
        effectiveDate: '2026-01-25',
        customerReference: 'MANUAL-TEST'
      });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockSubmission);
      expect(submitACHFile).toHaveBeenCalledWith({
        nachaFileContent: '101 021000021 ...',
        fileName: 'manual-test.ach',
        effectiveDate: '2026-01-25',
        customerReference: 'MANUAL-TEST'
      });
    });

    it('should require nachaFileContent', async () => {
      const response = await post('/bofa/ach/submit', {
        fileName: 'test.ach',
        effectiveDate: '2026-01-25',
        customerReference: 'TEST'
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation Error');
    });

    it('should require fileName', async () => {
      const response = await post('/bofa/ach/submit', {
        nachaFileContent: 'test content',
        effectiveDate: '2026-01-25',
        customerReference: 'TEST'
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation Error');
    });

    it('should require effectiveDate', async () => {
      const response = await post('/bofa/ach/submit', {
        nachaFileContent: 'test content',
        fileName: 'test.ach',
        customerReference: 'TEST'
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation Error');
    });

    it('should use default customerReference if not provided', async () => {
      const mockSubmission = {
        submissionId: 'manual-sub-456',
        status: 'accepted',
        receivedTimestamp: new Date().toISOString(),
        bofaReference: 'BOFA-REF'
      };

      vi.mocked(submitACHFile).mockResolvedValueOnce(mockSubmission);

      const response = await post('/bofa/ach/submit', {
        nachaFileContent: 'test content',
        fileName: 'test.ach',
        effectiveDate: '2026-01-25'
      });

      expect(response.status).toBe(201);
      expect(submitACHFile).toHaveBeenCalledWith(expect.objectContaining({
        customerReference: 'MANUAL-ADMIN'
      }));
    });

    it('should handle submission errors gracefully', async () => {
      vi.mocked(submitACHFile).mockRejectedValueOnce(new Error('BOFA API unavailable'));

      const response = await post('/bofa/ach/submit', {
        nachaFileContent: 'test content',
        fileName: 'test.ach',
        effectiveDate: '2026-01-25',
        customerReference: 'TEST'
      });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('ACH Submission Failed');
    });
  });

  describe('GET /api/settlement/bofa/status/:submissionId - Manual Status Check', () => {
    it('should return payment status for any submission ID', async () => {
      const mockStatus = {
        submissionId: 'bofa-sub-status-789',
        status: 'settled',
        settledDate: new Date().toISOString()
      };

      vi.mocked(getPaymentStatus).mockResolvedValueOnce(mockStatus);

      const response = await get('/bofa/status/bofa-sub-status-789');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockStatus);
      expect(getPaymentStatus).toHaveBeenCalledWith('bofa-sub-status-789');
    });

    it('should return 404 when submissionId is empty', async () => {
      const response = await get('/bofa/status/');

      expect(response.status).toBe(404);
    });

    it('should handle not found submission errors', async () => {
      vi.mocked(getPaymentStatus).mockRejectedValueOnce(new Error('Submission not found'));

      const response = await get('/bofa/status/non-existent-sub');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Status Check Failed');
    });

    it('should return returned payment status', async () => {
      const mockStatus = {
        submissionId: 'bofa-sub-returned',
        status: 'returned',
        returnCode: 'R01',
        returnReason: 'Insufficient Funds'
      };

      vi.mocked(getPaymentStatus).mockResolvedValueOnce(mockStatus);

      const response = await get('/bofa/status/bofa-sub-returned');

      expect(response.status).toBe(200);
      expect(response.body.returnCode).toBe('R01');
      expect(response.body.returnReason).toBe('Insufficient Funds');
    });

    it('should return processing payment status', async () => {
      const mockStatus = {
        submissionId: 'bofa-sub-processing',
        status: 'processing'
      };

      vi.mocked(getPaymentStatus).mockResolvedValueOnce(mockStatus);

      const response = await get('/bofa/status/bofa-sub-processing');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('processing');
    });
  });

  describe('Audit Trail', () => {
    it('should log manual ACH submissions', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      vi.mocked(submitACHFile).mockResolvedValueOnce({
        submissionId: 'audit-test-sub',
        status: 'accepted',
        receivedTimestamp: new Date().toISOString(),
        bofaReference: 'AUDIT-REF'
      });

      await post('/bofa/ach/submit', {
        nachaFileContent: 'audit test',
        fileName: 'audit.ach',
        effectiveDate: '2026-01-25',
        customerReference: 'AUDIT-TEST'
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[BOFA Admin] Manual ACH submission:',
        expect.objectContaining({
          fileName: 'audit.ach',
          customerReference: 'AUDIT-TEST'
        })
      );

      consoleLogSpy.mockRestore();
    });

    it('should log manual status checks', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      vi.mocked(getPaymentStatus).mockResolvedValueOnce({
        submissionId: 'audit-status-sub',
        status: 'settled'
      });

      await get('/bofa/status/audit-status-sub');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[BOFA Admin] Manual status check:',
        expect.objectContaining({
          submissionId: 'audit-status-sub'
        })
      );

      consoleLogSpy.mockRestore();
    });
  });
});
