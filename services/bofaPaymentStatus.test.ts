/**
 * BOFA Payment Status Tests
 * Tests for payment status tracking via BOFA CashPro API
 *
 * Track: bofa_cashpro_20260123
 * Phase: 5.1 Payment Status Tracking
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

import { getPaymentStatus } from './bofaCashProService';
import type { PaymentStatusResponse } from './bofaCashProService';
import * as bofaAuthService from './bofaAuthService';

describe('bofaPaymentStatus', () => {
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

  describe('getPaymentStatus - successful status query', () => {
    it('queries payment status by submission ID', async () => {
      const submissionId = 'SUB-12345';

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => fn());

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          submissionId: 'SUB-12345',
          status: 'submitted',
          settledDate: undefined,
          returnCode: undefined,
          returnReason: undefined
        })
      });

      const result = await getPaymentStatus(submissionId);

      expect(result.submissionId).toBe('SUB-12345');
      expect(result.status).toBe('submitted');
    });

    it('includes authorization header with bearer token', async () => {
      const submissionId = 'SUB-99999';

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => fn());
      vi.spyOn(bofaAuthService, 'getAuthToken').mockResolvedValue('test-bearer-token');

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          submissionId,
          status: 'processing'
        })
      });

      await getPaymentStatus(submissionId);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('SUB-99999'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-bearer-token'
          })
        })
      );
    });

    it('sets correct accept header', async () => {
      const submissionId = 'SUB-11111';

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => fn());

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          submissionId,
          status: 'submitted'
        })
      });

      await getPaymentStatus(submissionId);

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
      const submissionId = 'SUB-22222';

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => fn());

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          submissionId,
          status: 'submitted'
        })
      });

      await getPaymentStatus(submissionId);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'GET'
        })
      );
    });

    it('queries correct BOFA endpoint URL', async () => {
      const submissionId = 'SUB-33333';

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => fn());

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          submissionId,
          status: 'submitted'
        })
      });

      await getPaymentStatus(submissionId);

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.bankofamerica.com/achs/v1/payments/SUB-33333',
        expect.anything()
      );
    });
  });

  describe('getPaymentStatus - lifecycle states', () => {
    it('parses submitted status', async () => {
      const submissionId = 'SUB-SUBMITTED';

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => fn());

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          submissionId,
          status: 'submitted'
        })
      });

      const result = await getPaymentStatus(submissionId);

      expect(result.status).toBe('submitted');
      expect(result.submissionId).toBe(submissionId);
    });

    it('parses processing status', async () => {
      const submissionId = 'SUB-PROCESSING';

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => fn());

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          submissionId,
          status: 'processing'
        })
      });

      const result = await getPaymentStatus(submissionId);

      expect(result.status).toBe('processing');
    });

    it('parses settled status with settledDate', async () => {
      const submissionId = 'SUB-SETTLED';
      const settledDate = '2026-01-23T10:00:00Z';

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => fn());

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          submissionId,
          status: 'settled',
          settledDate
        })
      });

      const result = await getPaymentStatus(submissionId);

      expect(result.status).toBe('settled');
      expect(result.settledDate).toBe(settledDate);
    });

    it('parses returned status with return code and reason', async () => {
      const submissionId = 'SUB-RETURNED';
      const returnCode = 'R01';
      const returnReason = 'Insufficient Funds';

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => fn());

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          submissionId,
          status: 'returned',
          returnCode,
          returnReason
        })
      });

      const result = await getPaymentStatus(submissionId);

      expect(result.status).toBe('returned');
      expect(result.returnCode).toBe(returnCode);
      expect(result.returnReason).toBe(returnReason);
    });

    it('parses rejected status', async () => {
      const submissionId = 'SUB-REJECTED';

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => fn());

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          submissionId,
          status: 'rejected'
        })
      });

      const result = await getPaymentStatus(submissionId);

      expect(result.status).toBe('rejected');
    });
  });

  describe('getPaymentStatus - ACH return code parsing', () => {
    it('parses R01 - Insufficient Funds', async () => {
      const submissionId = 'SUB-R01';

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => fn());

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          submissionId,
          status: 'returned',
          returnCode: 'R01',
          returnReason: 'Insufficient Funds'
        })
      });

      const result = await getPaymentStatus(submissionId);

      expect(result.returnCode).toBe('R01');
      expect(result.returnReason).toBe('Insufficient Funds');
    });

    it('parses R02 - Account Closed', async () => {
      const submissionId = 'SUB-R02';

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => fn());

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          submissionId,
          status: 'returned',
          returnCode: 'R02',
          returnReason: 'Account Closed'
        })
      });

      const result = await getPaymentStatus(submissionId);

      expect(result.returnCode).toBe('R02');
      expect(result.returnReason).toBe('Account Closed');
    });

    it('parses R03 - No Account', async () => {
      const submissionId = 'SUB-R03';

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => fn());

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          submissionId,
          status: 'returned',
          returnCode: 'R03',
          returnReason: 'No Account/Unable to Locate Account'
        })
      });

      const result = await getPaymentStatus(submissionId);

      expect(result.returnCode).toBe('R03');
      expect(result.returnReason).toBe('No Account/Unable to Locate Account');
    });

    it('parses R04 - Invalid Account Number', async () => {
      const submissionId = 'SUB-R04';

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => fn());

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          submissionId,
          status: 'returned',
          returnCode: 'R04',
          returnReason: 'Invalid Account Number'
        })
      });

      const result = await getPaymentStatus(submissionId);

      expect(result.returnCode).toBe('R04');
      expect(result.returnReason).toBe('Invalid Account Number');
    });

    it('parses R05 - Unauthorized Debit', async () => {
      const submissionId = 'SUB-R05';

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => fn());

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          submissionId,
          status: 'returned',
          returnCode: 'R05',
          returnReason: 'Unauthorized Debit to Account'
        })
      });

      const result = await getPaymentStatus(submissionId);

      expect(result.returnCode).toBe('R05');
      expect(result.returnReason).toBe('Unauthorized Debit to Account');
    });

    it('handles return codes without return reason', async () => {
      const submissionId = 'SUB-RXX';

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => fn());

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          submissionId,
          status: 'returned',
          returnCode: 'R10'
          // No returnReason provided
        })
      });

      const result = await getPaymentStatus(submissionId);

      expect(result.returnCode).toBe('R10');
      expect(result.returnReason).toBeUndefined();
    });
  });

  describe('getPaymentStatus - retry on 401', () => {
    it('retries with fresh token on 401 response', async () => {
      const submissionId = 'SUB-401-RETRY';
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
            submissionId,
            status: 'settled',
            settledDate: '2026-01-23T12:00:00Z'
          })
        });

      const result = await getPaymentStatus(submissionId);

      expect(result.status).toBe('settled');
      expect(authCallCount).toBeGreaterThan(1);
    });

    it('clears token cache on 401 before retry', async () => {
      const submissionId = 'SUB-401-CLEAR';

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
            submissionId,
            status: 'submitted'
          })
        });

      await getPaymentStatus(submissionId);

      expect(clearCacheSpy).toHaveBeenCalled();
    });
  });

  describe('getPaymentStatus - retry on 429', () => {
    it('retries with exponential backoff on 429 response', async () => {
      const submissionId = 'SUB-429-RETRY';

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
            submissionId,
            status: 'processing'
          })
        });

      const result = await getPaymentStatus(submissionId);

      expect(result.status).toBe('processing');
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('getPaymentStatus - retry on 5xx', () => {
    it('retries with exponential backoff on 500 response', async () => {
      const submissionId = 'SUB-500-RETRY';

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
            submissionId,
            status: 'settled',
            settledDate: '2026-01-23T14:00:00Z'
          })
        });

      const result = await getPaymentStatus(submissionId);

      expect(result.status).toBe('settled');
    });

    it('retries with exponential backoff on 502 response', async () => {
      const submissionId = 'SUB-502-RETRY';

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
            submissionId,
            status: 'processing'
          })
        });

      const result = await getPaymentStatus(submissionId);

      expect(result.status).toBe('processing');
    });

    it('retries with exponential backoff on 503 response', async () => {
      const submissionId = 'SUB-503-RETRY';

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
            submissionId,
            status: 'submitted'
          })
        });

      const result = await getPaymentStatus(submissionId);

      expect(result.status).toBe('submitted');
    });
  });

  describe('getPaymentStatus - no retry on 403', () => {
    it('does not retry and throws on 403 Forbidden', async () => {
      const submissionId = 'SUB-403-NO-RETRY';

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

      await expect(getPaymentStatus(submissionId)).rejects.toThrow();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('getPaymentStatus - no retry on 400', () => {
    it('does not retry and throws on 400 Bad Request', async () => {
      const submissionId = 'SUB-400-NO-RETRY';

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

      await expect(getPaymentStatus(submissionId)).rejects.toThrow();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('getPaymentStatus - no retry on 404', () => {
    it('does not retry and throws on 404 Not Found', async () => {
      const submissionId = 'SUB-404-NO-RETRY';

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

      await expect(getPaymentStatus(submissionId)).rejects.toThrow();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('getPaymentStatus - error handling', () => {
    it('throws error when all retry attempts are exhausted', async () => {
      const submissionId = 'SUB-EXHAUSTED';

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockRejectedValue(
        new Error('Max retry attempts (3) exceeded. Last error: 500 Internal Server Error')
      );

      await expect(getPaymentStatus(submissionId)).rejects.toThrow('Max retry attempts');
    });

    it('handles network errors with retry', async () => {
      const submissionId = 'SUB-NETWORK-ERROR';

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
            submissionId,
            status: 'submitted'
          })
        });

      const result = await getPaymentStatus(submissionId);
      expect(result.submissionId).toBe(submissionId);
    });

    it('handles missing optional fields in BOFA response', async () => {
      const submissionId = 'SUB-MISSING-FIELDS';

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => fn());

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          submissionId,
          status: 'submitted'
          // Missing settledDate, returnCode, returnReason
        })
      });

      const result = await getPaymentStatus(submissionId);

      expect(result.submissionId).toBe(submissionId);
      expect(result.status).toBe('submitted');
      expect(result.settledDate).toBeUndefined();
      expect(result.returnCode).toBeUndefined();
      expect(result.returnReason).toBeUndefined();
    });

    it('returns submissionId from BOFA response', async () => {
      const submissionId = 'SUB-ID-TEST';

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => fn());

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          submissionId,
          status: 'processing'
        })
      });

      const result = await getPaymentStatus(submissionId);

      expect(result.submissionId).toBe(submissionId);
    });
  });

  describe('getPaymentStatus - response parsing', () => {
    it('extracts status from BOFA response', async () => {
      const submissionId = 'SUB-STATUS-TEST';

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => fn());

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          submissionId,
          status: 'returned',
          returnCode: 'R07',
          returnReason: 'Authorization Revoked'
        })
      });

      const result = await getPaymentStatus(submissionId);

      expect(result.status).toBe('returned');
      expect(result.returnCode).toBe('R07');
      expect(result.returnReason).toBe('Authorization Revoked');
    });

    it('handles empty returnReason', async () => {
      const submissionId = 'SUB-EMPTY-REASON';

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => fn());

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          submissionId,
          status: 'returned',
          returnCode: 'R08',
          returnReason: ''
        })
      });

      const result = await getPaymentStatus(submissionId);

      expect(result.returnReason).toBe('');
    });

    it('handles null settledDate for non-settled payments', async () => {
      const submissionId = 'SUB-NULL-DATE';

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => fn());

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          submissionId,
          status: 'processing'
        })
      });

      const result = await getPaymentStatus(submissionId);

      expect(result.settledDate).toBeUndefined();
    });

    it('handles ISO 8601 timestamp for settledDate', async () => {
      const submissionId = 'SUB-ISO-DATE';
      const timestamp = '2026-01-23T15:30:45.123Z';

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => fn());

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          submissionId,
          status: 'settled',
          settledDate: timestamp
        })
      });

      const result = await getPaymentStatus(submissionId);

      expect(result.settledDate).toBe(timestamp);
    });
  });
});
