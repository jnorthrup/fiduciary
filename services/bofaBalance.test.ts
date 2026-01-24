/**
 * BOFA Balance Inquiry Tests
 * Tests for account balance queries via BOFA CashPro API
 *
 * Track: bofa_cashpro_20260123
 * Phase: 6.1 Balance Check Implementation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the auth service before importing the service under test
vi.mock('./bofaAuthService', () => ({
  getAuthToken: vi.fn(() => Promise.resolve('fake-test-token')),
  retryWithBackoff: vi.fn((fn: any) => fn()),
  clearTokenCache: vi.fn(),
  getCachedToken: vi.fn(),
  isUnauthorized: vi.fn(),
  isForbidden: vi.fn(),
  isRateLimited: vi.fn(),
  isServerError: vi.fn(),
  isClientError: vi.fn(),
  classifyError: vi.fn(),
  logAuthError: vi.fn(),
  getErrorLog: vi.fn(),
  clearErrorLog: vi.fn()
}));

import { getBalance } from './bofaCashProService';
import type { BalanceResponse } from './bofaCashProService';
import * as bofaAuthService from './bofaAuthService';

describe('bofaBalance', () => {
  let fetchMock: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup fetch mock
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getBalance - successful balance query', () => {
    it('queries account balance by account ID', async () => {
      const accountId = 'ACCT-12345';

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => fn());

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          accountNumber: '****5678',
          availableBalance: 50000.00,
          currentBalance: 55000.00,
          currency: 'USD',
          asOfDate: '2026-01-23'
        })
      });

      const result = await getBalance(accountId);

      expect(result.accountNumber).toBe('****5678');
      expect(result.availableBalance).toBe(50000.00);
      expect(result.currentBalance).toBe(55000.00);
      expect(result.currency).toBe('USD');
      expect(result.asOfDate).toBe('2026-01-23');
    });

    it('includes authorization header with bearer token', async () => {
      const accountId = 'ACCT-99999';

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => fn());
      vi.spyOn(bofaAuthService, 'getAuthToken').mockResolvedValue('test-bearer-token');

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          accountNumber: '****1234',
          availableBalance: 1000.00,
          currentBalance: 1200.00,
          currency: 'USD',
          asOfDate: '2026-01-23'
        })
      });

      await getBalance(accountId);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('balances'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-bearer-token'
          })
        })
      );
    });

    it('sets correct accept header', async () => {
      const accountId = 'ACCT-11111';

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => fn());

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          accountNumber: '****5678',
          availableBalance: 2500.00,
          currentBalance: 3000.00,
          currency: 'USD',
          asOfDate: '2026-01-23'
        })
      });

      await getBalance(accountId);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Accept': 'application/json'
          })
        })
      );
    });

    it('uses GET method', async () => {
      const accountId = 'ACCT-22222';

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => fn());

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          accountNumber: '****9012',
          availableBalance: 7500.00,
          currentBalance: 8000.00,
          currency: 'USD',
          asOfDate: '2026-01-23'
        })
      });

      await getBalance(accountId);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'GET'
        })
      );
    });

    it('queries correct BOFA endpoint URL with account ID', async () => {
      const accountId = 'ACCT-33333';

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => fn());

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          accountNumber: '****3456',
          availableBalance: 10000.00,
          currentBalance: 10500.00,
          currency: 'USD',
          asOfDate: '2026-01-23'
        })
      });

      await getBalance(accountId);

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.bankofamerica.com/accounts/v1/balances?accountId=ACCT-33333',
        expect.anything()
      );
    });
  });

  describe('getBalance - response parsing with all fields', () => {
    it('parses masked account number', async () => {
      const accountId = 'ACCT-MASK-TEST';

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => fn());

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          accountNumber: '****1234',
          availableBalance: 1000.00,
          currentBalance: 1500.00,
          currency: 'USD',
          asOfDate: '2026-01-23'
        })
      });

      const result = await getBalance(accountId);

      expect(result.accountNumber).toBe('****1234');
    });

    it('parses available balance', async () => {
      const accountId = 'ACCT-AVAIL-TEST';

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => fn());

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          accountNumber: '****5678',
          availableBalance: 25000.50,
          currentBalance: 30000.00,
          currency: 'USD',
          asOfDate: '2026-01-23'
        })
      });

      const result = await getBalance(accountId);

      expect(result.availableBalance).toBe(25000.50);
    });

    it('parses current balance', async () => {
      const accountId = 'ACCT-CURRENT-TEST';

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => fn());

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          accountNumber: '****9012',
          availableBalance: 45000.00,
          currentBalance: 50000.75,
          currency: 'USD',
          asOfDate: '2026-01-23'
        })
      });

      const result = await getBalance(accountId);

      expect(result.currentBalance).toBe(50000.75);
    });

    it('parses currency code', async () => {
      const accountId = 'ACCT-CURRENCY-TEST';

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => fn());

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          accountNumber: '****3456',
          availableBalance: 5000.00,
          currentBalance: 5500.00,
          currency: 'USD',
          asOfDate: '2026-01-23'
        })
      });

      const result = await getBalance(accountId);

      expect(result.currency).toBe('USD');
    });

    it('parses as-of-date', async () => {
      const accountId = 'ACCT-DATE-TEST';

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => fn());

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          accountNumber: '****7890',
          availableBalance: 15000.00,
          currentBalance: 16000.00,
          currency: 'USD',
          asOfDate: '2026-01-23'
        })
      });

      const result = await getBalance(accountId);

      expect(result.asOfDate).toBe('2026-01-23');
    });

    it('handles zero balances', async () => {
      const accountId = 'ACCT-ZERO-TEST';

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => fn());

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          accountNumber: '****0000',
          availableBalance: 0.00,
          currentBalance: 0.00,
          currency: 'USD',
          asOfDate: '2026-01-23'
        })
      });

      const result = await getBalance(accountId);

      expect(result.availableBalance).toBe(0.00);
      expect(result.currentBalance).toBe(0.00);
    });

    it('handles negative balances (overdraft)', async () => {
      const accountId = 'ACCT-NEG-TEST';

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => fn());

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          accountNumber: '****1111',
          availableBalance: -100.00,
          currentBalance: -50.00,
          currency: 'USD',
          asOfDate: '2026-01-23'
        })
      });

      const result = await getBalance(accountId);

      expect(result.availableBalance).toBe(-100.00);
      expect(result.currentBalance).toBe(-50.00);
    });

    it('handles large balance amounts', async () => {
      const accountId = 'ACCT-LARGE-TEST';

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => fn());

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          accountNumber: '****9999',
          availableBalance: 9999999.99,
          currentBalance: 10000000.00,
          currency: 'USD',
          asOfDate: '2026-01-23'
        })
      });

      const result = await getBalance(accountId);

      expect(result.availableBalance).toBe(9999999.99);
      expect(result.currentBalance).toBe(10000000.00);
    });
  });

  describe('getBalance - account number masking', () => {
    it('returns masked account number from BOFA API', async () => {
      const accountId = 'ACCT-MASK-API';

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => fn());

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          accountNumber: '****5678',
          availableBalance: 3000.00,
          currentBalance: 3500.00,
          currency: 'USD',
          asOfDate: '2026-01-23'
        })
      });

      const result = await getBalance(accountId);

      // Account number should be masked showing only last 4 digits
      expect(result.accountNumber).toMatch(/^\*{4,}\d{4}$/);
      expect(result.accountNumber).toBe('****5678');
    });

    it('handles different masking formats from BOFA', async () => {
      const accountId = 'ACCT-MASK-VAR';

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => fn());

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          accountNumber: '******7890',
          availableBalance: 4000.00,
          currentBalance: 4500.00,
          currency: 'USD',
          asOfDate: '2026-01-23'
        })
      });

      const result = await getBalance(accountId);

      expect(result.accountNumber).toBe('******7890');
    });

    it('ensures account number ends with last 4 digits', async () => {
      const accountId = 'ACCT-LAST4';

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => fn());

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          accountNumber: '****4321',
          availableBalance: 6000.00,
          currentBalance: 6500.00,
          currency: 'USD',
          asOfDate: '2026-01-23'
        })
      });

      const result = await getBalance(accountId);

      expect(result.accountNumber.slice(-4)).toBe('4321');
    });
  });

  describe('getBalance - retry on 401', () => {
    it('retries with fresh token on 401 response', async () => {
      const accountId = 'ACCT-401-RETRY';
      let authCallCount = 0;

      vi.spyOn(bofaAuthService, 'getAuthToken').mockImplementation(async () => {
        authCallCount++;
        return `token-${authCallCount}`;
      });

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => {
        try {
          return await fn();
        } catch (error) {
          if (error instanceof Response && error.status === 401) {
            await bofaAuthService.clearTokenCache();
            return await fn();
          }
          throw error;
        }
      });

      fetchMock
        .mockRejectedValueOnce(new Response(null, { status: 401, statusText: 'Unauthorized' }))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            accountNumber: '****1111',
            availableBalance: 7000.00,
            currentBalance: 7500.00,
            currency: 'USD',
            asOfDate: '2026-01-23'
          })
        });

      const result = await getBalance(accountId);

      expect(result.availableBalance).toBe(7000.00);
      expect(authCallCount).toBeGreaterThan(1);
    });

    it('clears token cache on 401 before retry', async () => {
      const accountId = 'ACCT-401-CLEAR';

      const clearCacheSpy = vi.spyOn(bofaAuthService, 'clearTokenCache');

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => {
        try {
          return await fn();
        } catch (error) {
          if (error instanceof Response && error.status === 401) {
            await bofaAuthService.clearTokenCache();
            return await fn();
          }
          throw error;
        }
      });

      fetchMock
        .mockRejectedValueOnce(new Response(null, { status: 401, statusText: 'Unauthorized' }))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            accountNumber: '****2222',
            availableBalance: 8000.00,
            currentBalance: 8500.00,
            currency: 'USD',
            asOfDate: '2026-01-23'
          })
        });

      await getBalance(accountId);

      expect(clearCacheSpy).toHaveBeenCalled();
    });
  });

  describe('getBalance - retry on 429', () => {
    it('retries with exponential backoff on 429 response', async () => {
      const accountId = 'ACCT-429-RETRY';

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => {
        try {
          return await fn();
        } catch (error) {
          if (error instanceof Response && error.status === 429) {
            return await fn();
          }
          throw error;
        }
      });

      fetchMock
        .mockRejectedValueOnce(new Response(null, { status: 429, statusText: 'Too Many Requests' }))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            accountNumber: '****3333',
            availableBalance: 9000.00,
            currentBalance: 9500.00,
            currency: 'USD',
            asOfDate: '2026-01-23'
          })
        });

      const result = await getBalance(accountId);

      expect(result.availableBalance).toBe(9000.00);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('getBalance - retry on 5xx', () => {
    it('retries with exponential backoff on 500 response', async () => {
      const accountId = 'ACCT-500-RETRY';

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => {
        try {
          return await fn();
        } catch (error) {
          if (error instanceof Response && error.status === 500) {
            return await fn();
          }
          throw error;
        }
      });

      fetchMock
        .mockRejectedValueOnce(new Response(null, { status: 500, statusText: 'Internal Server Error' }))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            accountNumber: '****4444',
            availableBalance: 11000.00,
            currentBalance: 11500.00,
            currency: 'USD',
            asOfDate: '2026-01-23'
          })
        });

      const result = await getBalance(accountId);

      expect(result.availableBalance).toBe(11000.00);
    });

    it('retries with exponential backoff on 502 response', async () => {
      const accountId = 'ACCT-502-RETRY';

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => {
        try {
          return await fn();
        } catch (error) {
          if (error instanceof Response && error.status === 502) {
            return await fn();
          }
          throw error;
        }
      });

      fetchMock
        .mockRejectedValueOnce(new Response(null, { status: 502, statusText: 'Bad Gateway' }))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            accountNumber: '****5555',
            availableBalance: 12000.00,
            currentBalance: 12500.00,
            currency: 'USD',
            asOfDate: '2026-01-23'
          })
        });

      const result = await getBalance(accountId);

      expect(result.availableBalance).toBe(12000.00);
    });

    it('retries with exponential backoff on 503 response', async () => {
      const accountId = 'ACCT-503-RETRY';

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => {
        try {
          return await fn();
        } catch (error) {
          if (error instanceof Response && error.status === 503) {
            return await fn();
          }
          throw error;
        }
      });

      fetchMock
        .mockRejectedValueOnce(new Response(null, { status: 503, statusText: 'Service Unavailable' }))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            accountNumber: '****6666',
            availableBalance: 13000.00,
            currentBalance: 13500.00,
            currency: 'USD',
            asOfDate: '2026-01-23'
          })
        });

      const result = await getBalance(accountId);

      expect(result.availableBalance).toBe(13000.00);
    });
  });

  describe('getBalance - no retry on 403', () => {
    it('does not retry and throws on 403 Forbidden', async () => {
      const accountId = 'ACCT-403-NO-RETRY';

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => {
        try {
          return await fn();
        } catch (error) {
          if (error instanceof Response && error.status === 403) {
            throw error;
          }
          throw error;
        }
      });

      fetchMock.mockRejectedValue(
        new Response(null, { status: 403, statusText: 'Forbidden' })
      );

      await expect(getBalance(accountId)).rejects.toThrow();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('getBalance - no retry on 400', () => {
    it('does not retry and throws on 400 Bad Request', async () => {
      const accountId = 'ACCT-400-NO-RETRY';

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => {
        try {
          return await fn();
        } catch (error) {
          if (error instanceof Response && error.status === 400) {
            throw error;
          }
          throw error;
        }
      });

      fetchMock.mockRejectedValue(
        new Response(null, { status: 400, statusText: 'Bad Request' })
      );

      await expect(getBalance(accountId)).rejects.toThrow();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('getBalance - no retry on 404', () => {
    it('does not retry and throws on 404 Not Found', async () => {
      const accountId = 'ACCT-404-NO-RETRY';

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => {
        try {
          return await fn();
        } catch (error) {
          if (error instanceof Response && error.status === 404) {
            throw error;
          }
          throw error;
        }
      });

      fetchMock.mockRejectedValue(
        new Response(null, { status: 404, statusText: 'Not Found' })
      );

      await expect(getBalance(accountId)).rejects.toThrow();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('getBalance - error handling', () => {
    it('throws error when all retry attempts are exhausted', async () => {
      const accountId = 'ACCT-EXHAUSTED';

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockRejectedValue(
        new Error('Max retry attempts (3) exceeded. Last error: 500 Internal Server Error')
      );

      await expect(getBalance(accountId)).rejects.toThrow('Max retry attempts');
    });

    it('handles network errors with retry', async () => {
      const accountId = 'ACCT-NETWORK-ERROR';

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => {
        try {
          return await fn();
        } catch (error) {
          if (error instanceof Error && error.message.includes('Network')) {
            return await fn();
          }
          throw error;
        }
      });

      fetchMock
        .mockImplementationOnce(() => {
          throw new Error('Network error');
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            accountNumber: '****7777',
            availableBalance: 14000.00,
            currentBalance: 14500.00,
            currency: 'USD',
            asOfDate: '2026-01-23'
          })
        });

      const result = await getBalance(accountId);
      expect(result.accountNumber).toBe('****7777');
    });

    it('handles missing optional fields in BOFA response with defaults', async () => {
      const accountId = 'ACCT-MISSING-FIELDS';

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => fn());

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          accountNumber: '****8888',
          availableBalance: 15000.00,
          currentBalance: 15500.00,
          currency: 'USD'
          // Missing asOfDate
        })
      });

      const result = await getBalance(accountId);

      expect(result.accountNumber).toBe('****8888');
      expect(result.availableBalance).toBe(15000.00);
      expect(result.currentBalance).toBe(15500.00);
      expect(result.currency).toBe('USD');
      expect(result.asOfDate).toBeDefined();
    });

    it('validates account ID is required', async () => {
      const accountId = '';

      await expect(getBalance(accountId)).rejects.toThrow('Account ID is required');
    });

    it('validates account ID is not empty whitespace', async () => {
      const accountId = '   ';

      await expect(getBalance(accountId)).rejects.toThrow('Account ID is required');
    });
  });

  describe('getBalance - sufficient funds validation', () => {
    it('enables pre-transaction validation with available balance', async () => {
      const accountId = 'ACCT-FUND-CHECK';
      const paymentAmount = 5000.00;

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => fn());

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          accountNumber: '****9999',
          availableBalance: 10000.00,
          currentBalance: 11000.00,
          currency: 'USD',
          asOfDate: '2026-01-23'
        })
      });

      const result = await getBalance(accountId);

      // Pre-transaction validation: sufficient funds
      expect(result.availableBalance).toBeGreaterThanOrEqual(paymentAmount);
    });

    it('identifies insufficient funds for transaction', async () => {
      const accountId = 'ACCT-INSUFF-FUNDS';
      const paymentAmount = 20000.00;

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => fn());

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          accountNumber: '****0000',
          availableBalance: 5000.00,
          currentBalance: 6000.00,
          currency: 'USD',
          asOfDate: '2026-01-23'
        })
      });

      const result = await getBalance(accountId);

      // Pre-transaction validation: insufficient funds
      expect(result.availableBalance).toBeLessThan(paymentAmount);
    });
  });
});
