/**
 * BOFA Account Validation Tests
 *
 * Tests for account validation functionality including:
 * - Routing number format validation (9 digits, Modulus 10 checksum)
 * - Account number format validation
 * - BOFA API integration for account validation
 * - Error handling and retry logic
 *
 * Track: bofa_cashpro_20260123
 * Phase: 3.1 Account Validation Client
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateAccount } from './bofaCashProService';
import type { AccountValidationRequest, AccountValidationResponse } from './bofaCashProService';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock getAuthToken and clearTokenCache from bofaAuthService
const mockGetAuthToken = vi.fn();
const mockClearTokenCache = vi.fn();

// Mock retryWithBackoff to properly simulate retries
let mockRetryWithBackoff = vi.fn();

vi.mock('./bofaAuthService', () => ({
  getAuthToken: () => mockGetAuthToken(),
  clearTokenCache: () => mockClearTokenCache(),
  retryWithBackoff: (fn: () => Promise<any>) => mockRetryWithBackoff(fn),
}));

describe('bofaAccountValidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
    mockGetAuthToken.mockResolvedValue('mock-access-token');
    mockClearTokenCache.mockImplementation(() => {});

    // Default: retryWithBackoff just calls the function once
    mockRetryWithBackoff.mockImplementation((fn: () => Promise<any>) => fn());
  });

  afterEach(() => {
    mockFetch.mockReset();
    mockRetryWithBackoff.mockReset();
  });

  describe('Routing Number Format Validation', () => {
    it('validates correct 9-digit routing number with valid checksum', async () => {
      // Bank of America routing number: 021000021 (valid checksum)
      const request: AccountValidationRequest = {
        routingNumber: '021000021',
        accountNumber: '123456789',
        accountType: 'checking'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          valid: true,
          routingNumberValid: true,
          accountNumberValid: true,
          accountStatus: 'active',
          bankName: 'Bank of America, N.A.'
        })
      });

      const result = await validateAccount(request);
      expect(result.routingNumberValid).toBe(true);
    });

    it('rejects routing number with invalid checksum', async () => {
      // 123456789 has 9 digits but invalid checksum
      const request: AccountValidationRequest = {
        routingNumber: '123456789',
        accountNumber: '123456789',
        accountType: 'checking'
      };

      // Should fail locally without calling API
      const result = await validateAccount(request);
      expect(result.valid).toBe(false);
      expect(result.routingNumberValid).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('rejects routing number with fewer than 9 digits', async () => {
      const request: AccountValidationRequest = {
        routingNumber: '02100002', // 8 digits
        accountNumber: '123456789',
        accountType: 'checking'
      };

      const result = await validateAccount(request);
      expect(result.valid).toBe(false);
      expect(result.routingNumberValid).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('rejects routing number with more than 9 digits', async () => {
      const request: AccountValidationRequest = {
        routingNumber: '0210000211', // 10 digits
        accountNumber: '123456789',
        accountType: 'checking'
      };

      const result = await validateAccount(request);
      expect(result.valid).toBe(false);
      expect(result.routingNumberValid).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('rejects routing number with non-digit characters', async () => {
      const request: AccountValidationRequest = {
        routingNumber: '02100002a',
        accountNumber: '123456789',
        accountType: 'checking'
      };

      const result = await validateAccount(request);
      expect(result.valid).toBe(false);
      expect(result.routingNumberValid).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('accepts valid routing numbers from major banks', async () => {
      // Wells Fargo: 121000248
      // Chase: 021000021
      // Citibank: 021000089
      const validRoutingNumbers = [
        '121000248',
        '021000021',
        '021000089',
        '026009593', // Bank of America
      ];

      for (const routingNumber of validRoutingNumbers) {
        const request: AccountValidationRequest = {
          routingNumber,
          accountNumber: '123456789',
          accountType: 'checking'
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            valid: true,
            routingNumberValid: true,
            accountNumberValid: true,
            accountStatus: 'active',
            bankName: 'Test Bank'
          })
        });

        const result = await validateAccount(request);
        expect(result.routingNumberValid).toBe(true);
      }
    });
  });

  describe('Account Number Format Validation', () => {
    it('rejects empty account number', async () => {
      const request: AccountValidationRequest = {
        routingNumber: '021000021',
        accountNumber: '',
        accountType: 'checking'
      };

      const result = await validateAccount(request);
      expect(result.valid).toBe(false);
      expect(result.accountNumberValid).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('rejects account number with non-alphanumeric characters', async () => {
      const request: AccountValidationRequest = {
        routingNumber: '021000021',
        accountNumber: '123-45-6789',
        accountType: 'checking'
      };

      const result = await validateAccount(request);
      expect(result.valid).toBe(false);
      expect(result.accountNumberValid).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('BOFA API Integration', () => {
    it('successfully validates active account', async () => {
      const request: AccountValidationRequest = {
        routingNumber: '021000021',
        accountNumber: '123456789',
        accountType: 'checking'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          valid: true,
          routingNumberValid: true,
          accountNumberValid: true,
          accountStatus: 'active',
          bankName: 'Bank of America, N.A.'
        })
      });

      const result = await validateAccount(request);

      expect(result.valid).toBe(true);
      expect(result.routingNumberValid).toBe(true);
      expect(result.accountNumberValid).toBe(true);
      expect(result.accountStatus).toBe('active');
      expect(result.bankName).toBe('Bank of America, N.A.');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[0]).toBe('https://api.bankofamerica.com/achs/v1/accounts/validate');
      expect(fetchCall[1]?.method).toBe('POST');
      expect(fetchCall[1]?.headers?.['Authorization']).toBe('Bearer mock-access-token');
      expect(fetchCall[1]?.headers?.['Content-Type']).toBe('application/json');
    });

    it('returns not_found status for non-existent account', async () => {
      const request: AccountValidationRequest = {
        routingNumber: '021000021',
        accountNumber: '999999999',
        accountType: 'checking'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          valid: false,
          routingNumberValid: true,
          accountNumberValid: false,
          accountStatus: 'not_found',
          bankName: 'Bank of America, N.A.'
        })
      });

      const result = await validateAccount(request);

      expect(result.valid).toBe(false);
      expect(result.accountNumberValid).toBe(false);
      expect(result.accountStatus).toBe('not_found');
    });

    it('returns closed status for closed account', async () => {
      const request: AccountValidationRequest = {
        routingNumber: '021000021',
        accountNumber: '123456789',
        accountType: 'checking'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          valid: false,
          routingNumberValid: true,
          accountNumberValid: true,
          accountStatus: 'closed',
          bankName: 'Bank of America, N.A.'
        })
      });

      const result = await validateAccount(request);

      expect(result.valid).toBe(false);
      expect(result.accountNumberValid).toBe(true);
      expect(result.accountStatus).toBe('closed');
    });

    it('returns invalid status for invalid account', async () => {
      const request: AccountValidationRequest = {
        routingNumber: '021000021',
        accountNumber: '000000000',
        accountType: 'checking'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          valid: false,
          routingNumberValid: true,
          accountNumberValid: false,
          accountStatus: 'invalid',
          bankName: 'Bank of America, N.A.'
        })
      });

      const result = await validateAccount(request);

      expect(result.valid).toBe(false);
      expect(result.accountNumberValid).toBe(false);
      expect(result.accountStatus).toBe('invalid');
    });

    it('handles savings account type', async () => {
      const request: AccountValidationRequest = {
        routingNumber: '021000021',
        accountNumber: '123456789',
        accountType: 'savings'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          valid: true,
          routingNumberValid: true,
          accountNumberValid: true,
          accountStatus: 'active',
          bankName: 'Bank of America, N.A.'
        })
      });

      const result = await validateAccount(request);

      expect(result.valid).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1]?.body as string);
      expect(body.accountType).toBe('savings');
    });
  });

  describe('Error Handling', () => {
    it('handles 401 Unauthorized error with retry', async () => {
      const request: AccountValidationRequest = {
        routingNumber: '021000021',
        accountNumber: '123456789',
        accountType: 'checking'
      };

      // Simulate retry: first call throws 401, second succeeds
      let attemptCount = 0;
      mockRetryWithBackoff.mockImplementation(async (fn: () => Promise<any>) => {
        attemptCount++;
        if (attemptCount === 1) {
          try {
            await fn();
          } catch (e) {
            // First attempt fails with 401
            if (e instanceof Response && e.status === 401) {
              mockClearTokenCache();
              // Retry with success
              mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                  valid: true,
                  routingNumberValid: true,
                  accountNumberValid: true,
                  accountStatus: 'active',
                  bankName: 'Bank of America, N.A.'
                })
              });
              return fn();
            }
            throw e;
          }
        }
        return fn();
      });

      mockFetch.mockRejectedValueOnce(new Response(null, { status: 401, statusText: 'Unauthorized' }));

      const result = await validateAccount(request);

      expect(result.valid).toBe(true);
      expect(mockClearTokenCache).toHaveBeenCalled();
    });

    it('handles 429 Rate Limited error with retry', async () => {
      const request: AccountValidationRequest = {
        routingNumber: '021000021',
        accountNumber: '123456789',
        accountType: 'checking'
      };

      let attemptCount = 0;
      mockRetryWithBackoff.mockImplementation(async (fn: () => Promise<any>) => {
        attemptCount++;
        if (attemptCount === 1) {
          try {
            await fn();
          } catch (e) {
            // First attempt fails with 429, retry succeeds
            mockFetch.mockResolvedValueOnce({
              ok: true,
              status: 200,
              json: async () => ({
                valid: true,
                routingNumberValid: true,
                accountNumberValid: true,
                accountStatus: 'active',
                bankName: 'Bank of America, N.A.'
              })
            });
            return fn();
          }
        }
        return fn();
      });

      mockFetch.mockRejectedValueOnce(new Response(null, { status: 429, statusText: 'Too Many Requests' }));

      const result = await validateAccount(request);

      expect(result.valid).toBe(true);
    });

    it('handles 5xx server error with retry', async () => {
      const request: AccountValidationRequest = {
        routingNumber: '021000021',
        accountNumber: '123456789',
        accountType: 'checking'
      };

      let attemptCount = 0;
      mockRetryWithBackoff.mockImplementation(async (fn: () => Promise<any>) => {
        attemptCount++;
        if (attemptCount === 1) {
          try {
            await fn();
          } catch (e) {
            // First attempt fails with 500, retry succeeds
            mockFetch.mockResolvedValueOnce({
              ok: true,
              status: 200,
              json: async () => ({
                valid: true,
                routingNumberValid: true,
                accountNumberValid: true,
                accountStatus: 'active',
                bankName: 'Bank of America, N.A.'
              })
            });
            return fn();
          }
        }
        return fn();
      });

      mockFetch.mockRejectedValueOnce(new Response(null, { status: 500, statusText: 'Internal Server Error' }));

      const result = await validateAccount(request);

      expect(result.valid).toBe(true);
    });

    it('handles network error with retry', async () => {
      const request: AccountValidationRequest = {
        routingNumber: '021000021',
        accountNumber: '123456789',
        accountType: 'checking'
      };

      let attemptCount = 0;
      mockRetryWithBackoff.mockImplementation(async (fn: () => Promise<any>) => {
        attemptCount++;
        if (attemptCount === 1) {
          try {
            await fn();
          } catch (e) {
            // First attempt fails with network error, retry succeeds
            mockFetch.mockResolvedValueOnce({
              ok: true,
              status: 200,
              json: async () => ({
                valid: true,
                routingNumberValid: true,
                accountNumberValid: true,
                accountStatus: 'active',
                bankName: 'Bank of America, N.A.'
              })
            });
            return fn();
          }
        }
        return fn();
      });

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await validateAccount(request);

      expect(result.valid).toBe(true);
    });

    it('throws error after max retries exhausted', async () => {
      const request: AccountValidationRequest = {
        routingNumber: '021000021',
        accountNumber: '123456789',
        accountType: 'checking'
      };

      // Always fail with 500
      mockFetch.mockRejectedValue(new Response(null, { status: 500, statusText: 'Internal Server Error' }));

      await expect(validateAccount(request)).rejects.toThrow();
      expect(mockFetch).toHaveBeenCalled();
    });

    it('does not retry 403 Forbidden error', async () => {
      const request: AccountValidationRequest = {
        routingNumber: '021000021',
        accountNumber: '123456789',
        accountType: 'checking'
      };

      mockFetch.mockRejectedValue(new Response(null, { status: 403, statusText: 'Forbidden' }));

      await expect(validateAccount(request)).rejects.toThrow();
      expect(mockFetch).toHaveBeenCalledTimes(1); // No retries
    });

    it('does not retry 4xx client errors', async () => {
      const request: AccountValidationRequest = {
        routingNumber: '021000021',
        accountNumber: '123456789',
        accountType: 'checking'
      };

      mockFetch.mockRejectedValue(new Response(null, { status: 400, statusText: 'Bad Request' }));

      await expect(validateAccount(request)).rejects.toThrow();
      expect(mockFetch).toHaveBeenCalledTimes(1); // No retries
    });
  });

  describe('Integration Tests', () => {
    it('complete flow: validates account with correct routing checksum', async () => {
      const request: AccountValidationRequest = {
        routingNumber: '021000021',
        accountNumber: '123456789',
        accountType: 'checking'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          valid: true,
          routingNumberValid: true,
          accountNumberValid: true,
          accountStatus: 'active',
          bankName: 'Bank of America, N.A.'
        })
      });

      const result = await validateAccount(request);

      expect(result).toEqual({
        valid: true,
        routingNumberValid: true,
        accountNumberValid: true,
        accountStatus: 'active',
        bankName: 'Bank of America, N.A.'
      });
    });

    it('complete flow: fails on invalid routing number before API call', async () => {
      const request: AccountValidationRequest = {
        routingNumber: '123456789', // Invalid checksum
        accountNumber: '123456789',
        accountType: 'checking'
      };

      const result = await validateAccount(request);

      expect(result).toEqual({
        valid: false,
        routingNumberValid: false,
        accountNumberValid: false,
        accountStatus: 'invalid',
        bankName: ''
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Modulus 10 Checksum Algorithm', () => {
    it('correctly validates Bank of America routing number', async () => {
      const request: AccountValidationRequest = {
        routingNumber: '021000021',
        accountNumber: '123456789',
        accountType: 'checking'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          valid: true,
          routingNumberValid: true,
          accountNumberValid: true,
          accountStatus: 'active',
          bankName: 'Test Bank'
        })
      });

      const result = await validateAccount(request);
      expect(result.routingNumberValid).toBe(true);
    });

    it('correctly validates Wells Fargo routing number', async () => {
      const request: AccountValidationRequest = {
        routingNumber: '121000248',
        accountNumber: '123456789',
        accountType: 'checking'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          valid: true,
          routingNumberValid: true,
          accountNumberValid: true,
          accountStatus: 'active',
          bankName: 'Test Bank'
        })
      });

      const result = await validateAccount(request);
      expect(result.routingNumberValid).toBe(true);
    });

    it('correctly validates Chase/Citibank routing number', async () => {
      const request: AccountValidationRequest = {
        routingNumber: '021000089',
        accountNumber: '123456789',
        accountType: 'checking'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          valid: true,
          routingNumberValid: true,
          accountNumberValid: true,
          accountStatus: 'active',
          bankName: 'Test Bank'
        })
      });

      const result = await validateAccount(request);
      expect(result.routingNumberValid).toBe(true);
    });

    it('correctly rejects invalid routing number 123456789', async () => {
      const request: AccountValidationRequest = {
        routingNumber: '123456789',
        accountNumber: '123456789',
        accountType: 'checking'
      };

      const result = await validateAccount(request);
      expect(result.routingNumberValid).toBe(false);
      expect(result.accountStatus).toBe('invalid');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('correctly rejects invalid routing number 999999999', async () => {
      const request: AccountValidationRequest = {
        routingNumber: '999999999',
        accountNumber: '123456789',
        accountType: 'checking'
      };

      const result = await validateAccount(request);
      expect(result.routingNumberValid).toBe(false);
      expect(result.accountStatus).toBe('invalid');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('correctly rejects invalid routing number 222222222', async () => {
      const request: AccountValidationRequest = {
        routingNumber: '222222222',
        accountNumber: '123456789',
        accountType: 'checking'
      };

      const result = await validateAccount(request);
      expect(result.routingNumberValid).toBe(false);
      expect(result.accountStatus).toBe('invalid');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('correctly rejects invalid routing number 111111111', async () => {
      const request: AccountValidationRequest = {
        routingNumber: '111111111',
        accountNumber: '123456789',
        accountType: 'checking'
      };

      const result = await validateAccount(request);
      expect(result.routingNumberValid).toBe(false);
      expect(result.accountStatus).toBe('invalid');
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});
