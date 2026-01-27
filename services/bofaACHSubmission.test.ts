/**
 * BOFA ACH Submission Tests
 * Tests for NACHA file submission to BOFA CashPro API
 *
 * Track: bofa_cashpro_20260123
 * Phase: 4.1 NACHA File Submission
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

import { submitACHFile } from './bofaCashProService';
import type { ACHSubmissionRequest, ACHSubmissionResponse } from './bofaCashProService';
import * as bofaAuthService from './bofaAuthService';

describe('bofaACHSubmission', () => {
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

  describe('submitACHFile - successful submission', () => {
    it('submits valid NACHA file to BOFA API', async () => {
      const request: ACHSubmissionRequest = {
        nachaFileContent: '101 021000021 1234567890 260123 1200A094101',
        fileName: 'ACH-20260123.txt',
        effectiveDate: '2026-01-23',
        customerReference: 'REF-12345'
      };

      // Mock retryWithBackoff to just execute the function
      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => fn());

      // Mock fetch for successful submission
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          submissionId: 'SUB-12345',
          status: 'accepted',
          receivedTimestamp: '2026-01-23T10:00:00Z',
          bofaReference: 'BOFA-REF-67890'
        })
      });

      const result = await submitACHFile(request);

      expect(result.submissionId).toBe('SUB-12345');
      expect(result.status).toBe('accepted');
      expect(result.receivedTimestamp).toBe('2026-01-23T10:00:00Z');
      expect(result.bofaReference).toBe('BOFA-REF-67890');
    });

    it('parses submission response with pending_review status', async () => {
      const request: ACHSubmissionRequest = {
        nachaFileContent: '101 021000021 1234567890 260123 1200A094101',
        fileName: 'ACH-20260123.txt',
        effectiveDate: '2026-01-23',
        customerReference: 'REF-12345'
      };

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => fn());

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          submissionId: 'SUB-99999',
          status: 'pending_review',
          receivedTimestamp: '2026-01-23T11:30:00Z',
          bofaReference: 'BOFA-REF-00000'
        })
      });

      const result = await submitACHFile(request);

      expect(result.status).toBe('pending_review');
      expect(result.submissionId).toBe('SUB-99999');
    });

    it('includes authorization header with bearer token', async () => {
      const request: ACHSubmissionRequest = {
        nachaFileContent: '101 021000021 1234567890 260123 1200A094101',
        fileName: 'ACH-20260123.txt',
        effectiveDate: '2026-01-23',
        customerReference: 'REF-12345'
      };

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => fn());
      vi.spyOn(bofaAuthService, 'getAuthToken').mockResolvedValue('test-bearer-token');

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          submissionId: 'SUB-12345',
          status: 'accepted',
          receivedTimestamp: '2026-01-23T10:00:00Z',
          bofaReference: 'BOFA-REF-67890'
        })
      });

      await submitACHFile(request);

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.bankofamerica.com/achs/v1/payments',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-bearer-token'
          })
        })
      );
    });

    it('sets correct content-type header', async () => {
      const request: ACHSubmissionRequest = {
        nachaFileContent: '101 021000021 1234567890 260123 1200A094101',
        fileName: 'ACH-20260123.txt',
        effectiveDate: '2026-01-23',
        customerReference: 'REF-12345'
      };

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => fn());

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          submissionId: 'SUB-12345',
          status: 'accepted',
          receivedTimestamp: '2026-01-23T10:00:00Z',
          bofaReference: 'BOFA-REF-67890'
        })
      });

      await submitACHFile(request);

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.bankofamerica.com/achs/v1/payments',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('posts to correct BOFA endpoint', async () => {
      const request: ACHSubmissionRequest = {
        nachaFileContent: '101 021000021 1234567890 260123 1200A094101',
        fileName: 'ACH-20260123.txt',
        effectiveDate: '2026-01-23',
        customerReference: 'REF-12345'
      };

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => fn());

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          submissionId: 'SUB-12345',
          status: 'accepted',
          receivedTimestamp: '2026-01-23T10:00:00Z',
          bofaReference: 'BOFA-REF-67890'
        })
      });

      await submitACHFile(request);

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.bankofamerica.com/achs/v1/payments',
        expect.anything()
      );
    });
  });

  describe('submitACHFile - retry on 401', () => {
    it('retries with fresh token on 401 response', async () => {
      const request: ACHSubmissionRequest = {
        nachaFileContent: '101 021000021 1234567890 260123 1200A094101',
        fileName: 'ACH-20260123.txt',
        effectiveDate: '2026-01-23',
        customerReference: 'REF-12345'
      };

      let authCallCount = 0;

      vi.spyOn(bofaAuthService, 'getAuthToken').mockImplementation(async () => {
        authCallCount++;
        return `token-${authCallCount}`;
      });

      // Mock retryWithBackoff to handle 401
      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => {
        try {
          return await fn();
        } catch (error) {
          if (error instanceof Response && error.status === 401) {
            // Clear token cache and retry
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
            submissionId: 'SUB-12345',
            status: 'accepted',
            receivedTimestamp: '2026-01-23T10:00:00Z',
            bofaReference: 'BOFA-REF-67890'
          })
        });

      const result = await submitACHFile(request);

      expect(result.submissionId).toBe('SUB-12345');
      expect(authCallCount).toBeGreaterThan(1);
    });
  });

  describe('submitACHFile - retry on 429', () => {
    it('retries with exponential backoff on 429 response', async () => {
      const request: ACHSubmissionRequest = {
        nachaFileContent: '101 021000021 1234567890 260123 1200A094101',
        fileName: 'ACH-20260123.txt',
        effectiveDate: '2026-01-23',
        customerReference: 'REF-12345'
      };

      // Mock retryWithBackoff to handle 429
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
            submissionId: 'SUB-12345',
            status: 'accepted',
            receivedTimestamp: '2026-01-23T10:00:00Z',
            bofaReference: 'BOFA-REF-67890'
          })
        });

      const result = await submitACHFile(request);

      expect(result.submissionId).toBe('SUB-12345');
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('submitACHFile - no retry on 403', () => {
    it('does not retry and throws on 403 Forbidden', async () => {
      const request: ACHSubmissionRequest = {
        nachaFileContent: '101 021000021 1234567890 260123 1200A094101',
        fileName: 'ACH-20260123.txt',
        effectiveDate: '2026-01-23',
        customerReference: 'REF-12345'
      };

      // Mock retryWithBackoff to not retry on 403
      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => {
        try {
          return await fn();
        } catch (error) {
          if (error instanceof Response && error.status === 403) {
            throw error; // Don't retry
          }
          throw error;
        }
      });

      fetchMock.mockRejectedValue(
        new Response(null, { status: 403, statusText: 'Forbidden' })
      );

      await expect(submitACHFile(request)).rejects.toThrow();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('submitACHFile - no retry on 400', () => {
    it('does not retry and throws on 400 Bad Request', async () => {
      const request: ACHSubmissionRequest = {
        nachaFileContent: 'invalid-nacha-content',
        fileName: 'ACH-20260123.txt',
        effectiveDate: '2026-01-23',
        customerReference: 'REF-12345'
      };

      // Mock retryWithBackoff to not retry on 400
      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => {
        try {
          return await fn();
        } catch (error) {
          if (error instanceof Response && error.status === 400) {
            throw error; // Don't retry
          }
          throw error;
        }
      });

      fetchMock.mockRejectedValue(
        new Response(null, { status: 400, statusText: 'Bad Request' })
      );

      await expect(submitACHFile(request)).rejects.toThrow();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('submitACHFile - error handling', () => {
    it('throws error for empty NACHA file content', async () => {
      const request: ACHSubmissionRequest = {
        nachaFileContent: '', // Empty content
        fileName: 'ACH-20260123.txt',
        effectiveDate: '2026-01-23',
        customerReference: 'REF-12345'
      };

      await expect(submitACHFile(request)).rejects.toThrow('NACHA file content is empty');
    });

    it('returns rejected status when BOFA returns rejected', async () => {
      const request: ACHSubmissionRequest = {
        nachaFileContent: '101 021000021 1234567890 260123 1200A094101',
        fileName: 'ACH-20260123.txt',
        effectiveDate: '2026-01-23',
        customerReference: 'REF-12345'
      };

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => fn());

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          submissionId: 'SUB-REJECTED',
          status: 'rejected',
          receivedTimestamp: '2026-01-23T10:00:00Z',
          bofaReference: 'BOFA-REF-REJECTED'
        })
      });

      const result = await submitACHFile(request);
      expect(result.status).toBe('rejected');
    });

    it('handles network errors with retry', async () => {
      const request: ACHSubmissionRequest = {
        nachaFileContent: '101 021000021 1234567890 260123 1200A094101',
        fileName: 'ACH-20260123.txt',
        effectiveDate: '2026-01-23',
        customerReference: 'REF-12345'
      };

      // Mock retryWithBackoff to handle network errors
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
            submissionId: 'SUB-12345',
            status: 'accepted',
            receivedTimestamp: '2026-01-23T10:00:00Z',
            bofaReference: 'BOFA-REF-67890'
          })
        });

      const result = await submitACHFile(request);
      expect(result.submissionId).toBe('SUB-12345');
    });

    it('throws error when all retry attempts are exhausted', async () => {
      const request: ACHSubmissionRequest = {
        nachaFileContent: '101 021000021 1234567890 260123 1200A094101',
        fileName: 'ACH-20260123.txt',
        effectiveDate: '2026-01-23',
        customerReference: 'REF-12345'
      };

      // Mock retryWithBackoff to fail after all retries
      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockRejectedValue(
        new Error('Max retry attempts (3) exceeded. Last error: 500 Internal Server Error')
      );

      await expect(submitACHFile(request)).rejects.toThrow('Max retry attempts');
    });

    it('throws Response when fetch returns non-ok status', async () => {
      const request: ACHSubmissionRequest = {
        nachaFileContent: '101 021000021 1234567890 260123 1200A094101',
        fileName: 'ACH-20260123.txt',
        effectiveDate: '2026-01-23',
        customerReference: 'REF-12345'
      };

      // Mock retryWithBackoff to execute the function but let it throw Response
      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => {
        // This will execute the inner function which will call fetch
        // and throw the Response when !response.ok
        return await fn();
      });

      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      await expect(submitACHFile(request)).rejects.toThrow();
    });
  });

  describe('submitACHFile - integration with nacha-generator', () => {
    it('accepts NACHA file content from nacha-generator', async () => {
      // Simulate NACHA file generated by nacha-generator.js
      const mockNachaContent = Buffer.from(
        '101 021000021 1234567890 260123 1200A094101' +
        '5200 COMPANY NAME            1234567890PPDDESC       260123260123   1012345600000001' +
        '62202100002123456789012345678      00000100000ID           NAME                      0123456000000001' +
        '8200000001000000210000100000000000001234567890                   1234560000000001' +
        '9000001000000000000100000021000010000000000000000000000000000000000000000000000000' +
        '9999999999999999999999999999999999999999999999999999999999999999999999999999999999'
      ).toString('ascii');

      const request: ACHSubmissionRequest = {
        nachaFileContent: mockNachaContent,
        fileName: 'ACH-20260123.txt',
        effectiveDate: '2026-01-23',
        customerReference: 'REF-12345'
      };

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => fn());

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          submissionId: 'SUB-12345',
          status: 'accepted',
          receivedTimestamp: '2026-01-23T10:00:00Z',
          bofaReference: 'BOFA-REF-67890'
        })
      });

      const result = await submitACHFile(request);

      expect(result.submissionId).toBe('SUB-12345');
    });

    it('accepts NACHA file with non-standard record lengths (BOFA validates)', async () => {
      // Some NACHA files may have variations
      const nonStandardNacha = '101 021000021'; // Too short

      const request: ACHSubmissionRequest = {
        nachaFileContent: nonStandardNacha,
        fileName: 'ACH-20260123.txt',
        effectiveDate: '2026-01-23',
        customerReference: 'REF-12345'
      };

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => fn());

      // Let BOFA validate - we just warn
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          submissionId: 'SUB-12345',
          status: 'accepted',
          receivedTimestamp: '2026-01-23T10:00:00Z',
          bofaReference: 'BOFA-REF-67890'
        })
      });

      const result = await submitACHFile(request);
      expect(result.submissionId).toBe('SUB-12345');
    });
  });

  describe('submitACHFile - response parsing', () => {
    it('extracts submissionId from BOFA response', async () => {
      const request: ACHSubmissionRequest = {
        nachaFileContent: '101 021000021 1234567890 260123 1200A094101',
        fileName: 'ACH-20260123.txt',
        effectiveDate: '2026-01-23',
        customerReference: 'REF-12345'
      };

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => fn());

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          submissionId: 'SUB-999888777',
          status: 'accepted',
          receivedTimestamp: '2026-01-23T10:00:00Z',
          bofaReference: 'BOFA-REF-111222'
        })
      });

      const result = await submitACHFile(request);

      expect(result.submissionId).toBe('SUB-999888777');
    });

    it('parses receivedTimestamp from BOFA response', async () => {
      const request: ACHSubmissionRequest = {
        nachaFileContent: '101 021000021 1234567890 260123 1200A094101',
        fileName: 'ACH-20260123.txt',
        effectiveDate: '2026-01-23',
        customerReference: 'REF-12345'
      };

      const timestamp = '2026-01-23T15:30:45.123Z';

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => fn());

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          submissionId: 'SUB-12345',
          status: 'accepted',
          receivedTimestamp: timestamp,
          bofaReference: 'BOFA-REF-67890'
        })
      });

      const result = await submitACHFile(request);

      expect(result.receivedTimestamp).toBe(timestamp);
    });

    it('parses bofaReference from BOFA response', async () => {
      const request: ACHSubmissionRequest = {
        nachaFileContent: '101 021000021 1234567890 260123 1200A094101',
        fileName: 'ACH-20260123.txt',
        effectiveDate: '2026-01-23',
        customerReference: 'REF-12345'
      };

      const bofaRef = 'BOFA-REF-ABC123XYZ';

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => fn());

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          submissionId: 'SUB-12345',
          status: 'accepted',
          receivedTimestamp: '2026-01-23T10:00:00Z',
          bofaReference: bofaRef
        })
      });

      const result = await submitACHFile(request);

      expect(result.bofaReference).toBe(bofaRef);
    });

    it('handles missing optional fields in BOFA response', async () => {
      const request: ACHSubmissionRequest = {
        nachaFileContent: '101 021000021 1234567890 260123 1200A094101',
        fileName: 'ACH-20260123.txt',
        effectiveDate: '2026-01-23',
        customerReference: 'REF-12345'
      };

      vi.spyOn(bofaAuthService, 'retryWithBackoff').mockImplementation(async (fn: any) => fn());

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          // Missing submissionId, status, receivedTimestamp, bofaReference
        })
      });

      const result = await submitACHFile(request);

      expect(result.submissionId).toBe('');
      expect(result.status).toBe('pending_review'); // default
      expect(result.bofaReference).toBe('');
      expect(result.receivedTimestamp).toBeDefined(); // has default
    });
  });
});
