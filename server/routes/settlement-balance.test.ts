/**
 * Tests for BOFA Balance API Route
 *
 * Test file for GET /api/settlement/bofa/balance endpoint
 * Phase 6.2 - Dashboard Integration
 * Track: bofa_cashpro_20260123
 */

import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { createServer, type Server } from 'http';
import { request as httpRequest } from 'node:http';
import express from 'express';
import settlementRouter from './settlement.js';

const TEST_PORT = 30107;

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
    loadData: vi.fn(() => Promise.resolve({ paymentOrders: {} })),
    saveData: vi.fn(() => Promise.resolve()),
    saveNachaSubmission: vi.fn(() => Promise.resolve({ submissionId: 'test-sub-id' }))
  }
}));

// Mock nacha generator
vi.mock('../lib/nacha-generator.js', () => ({
  generateNachaFile: vi.fn(() => Buffer.from('test nacha content'))
}));

// Mock sponsors config
vi.mock('../config/sponsors.js', () => ({
  getSponsor: vi.fn(() => ({
    odfiRouting: '021000021',
    immediateOriginName: 'TEST SPONSOR',
    name: 'Test Company',
    companyId: 'TESTCOMPANY'
  }))
}));

import { getBalance } from '../services/bofaCashProService.js';

describe('BOFA Balance API Route', () => {
  let server: Server;
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    // Mock auth middleware
    app.use((req, res, next) => {
      req.user = { uid: 'test-user-123' };
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

  describe('GET /api/settlement/bofa/balance', () => {
    it('should return balance information', async () => {
      const mockBalance = {
        accountNumber: '****1234',
        availableBalance: 50000.00,
        currentBalance: 52500.00,
        currency: 'USD',
        asOfDate: '2026-01-24'
      };

      vi.mocked(getBalance).mockResolvedValue(mockBalance);

      const response = await get('/bofa/balance');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockBalance);
      expect(getBalance).toHaveBeenCalledWith('DEFAULT');
    });

    it('should use custom accountId from query params', async () => {
      const mockBalance = {
        accountNumber: '****5678',
        availableBalance: 100000.00,
        currentBalance: 100000.00,
        currency: 'USD',
        asOfDate: '2026-01-24'
      };

      vi.mocked(getBalance).mockResolvedValue(mockBalance);

      const response = await get('/bofa/balance?accountId=CUSTOM-ACCT-123');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockBalance);
      expect(getBalance).toHaveBeenCalledWith('CUSTOM-ACCT-123');
    });

    it('should use environment variable for default account ID', async () => {
      const originalEnv = process.env.BOFA_SETTLEMENT_ACCOUNT_ID;
      process.env.BOFA_SETTLEMENT_ACCOUNT_ID = 'ENV-ACCT-456';

      const mockBalance = {
        accountNumber: '****9999',
        availableBalance: 75000.00,
        currentBalance: 75000.00,
        currency: 'USD',
        asOfDate: '2026-01-24'
      };

      vi.mocked(getBalance).mockResolvedValue(mockBalance);

      const response = await get('/bofa/balance');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockBalance);
      expect(getBalance).toHaveBeenCalledWith('ENV-ACCT-456');

      // Restore original env
      if (originalEnv === undefined) {
        delete process.env.BOFA_SETTLEMENT_ACCOUNT_ID;
      } else {
        process.env.BOFA_SETTLEMENT_ACCOUNT_ID = originalEnv;
      }
    });

    it('should return 500 error when getBalance throws', async () => {
      vi.mocked(getBalance).mockRejectedValue(new Error('Network error'));

      const response = await get('/bofa/balance');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'Balance Inquiry Failed',
        message: 'Network error'
      });
    });

    it('should return 500 error for authentication failures', async () => {
      vi.mocked(getBalance).mockRejectedValue(new Error('Unauthorized: Invalid token'));

      const response = await get('/bofa/balance');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Balance Inquiry Failed');
      expect(response.body.message).toContain('Unauthorized');
    });

    it('should handle zero balance correctly', async () => {
      const mockBalance = {
        accountNumber: '****0000',
        availableBalance: 0,
        currentBalance: 0,
        currency: 'USD',
        asOfDate: '2026-01-24'
      };

      vi.mocked(getBalance).mockResolvedValue(mockBalance);

      const response = await get('/bofa/balance');

      expect(response.status).toBe(200);
      expect(response.body.availableBalance).toBe(0);
      expect(response.body.currentBalance).toBe(0);
    });

    it('should handle large balances', async () => {
      const mockBalance = {
        accountNumber: '****8888',
        availableBalance: 9999999.99,
        currentBalance: 10000000.00,
        currency: 'USD',
        asOfDate: '2026-01-24'
      };

      vi.mocked(getBalance).mockResolvedValue(mockBalance);

      const response = await get('/bofa/balance');

      expect(response.status).toBe(200);
      expect(response.body.availableBalance).toBe(9999999.99);
      expect(response.body.currentBalance).toBe(10000000.00);
    });
  });
});
