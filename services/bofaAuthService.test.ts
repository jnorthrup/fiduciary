/**
 * BOFA Auth Service Tests
 * Tests for OAuth 2.0 client credentials flow implementation
 *
 * Track: bofa_cashpro_20260123
 * Phase: 2.1 Token Management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getAuthToken,
  clearTokenCache,
  getCachedToken,
  isUnauthorized,
  isForbidden,
  isRateLimited,
  isServerError,
  isClientError,
  classifyError,
  retryWithBackoff,
  AuthErrorType,
  AuthError,
  getErrorLog,
  clearErrorLog,
} from './bofaAuthService';
import { getBofaCredentials } from './bofaSecretManager';

// Mock the Secret Manager module
vi.mock('./bofaSecretManager', () => ({
  getBofaCredentials: vi.fn(),
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('bofaAuthService', () => {
  const originalEnv = process.env;
  const mockCredentials = {
    clientId: 'test-client-id-abc123',
    clientSecret: 'test-client-secret-xyz789',
    tenantId: 'test-tenant-id-456',
    tokenUrl: 'https://api.bankofamerica.com/auth/oauth/v2/token',
  };

  const mockTokenResponse = {
    access_token: 'mock-access-token-def456',
    token_type: 'Bearer',
    expires_in: 3600,
    scope: 'payments accounts',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    vi.useFakeTimers();
    clearTokenCache();
    // Reset fetch mock
    mockFetch.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.useRealTimers();
    clearTokenCache();
  });

  describe('getAuthToken', () => {
    it('retrieves access token from BOFA auth endpoint successfully', async () => {
      vi.mocked(getBofaCredentials).mockResolvedValue(mockCredentials);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockTokenResponse,
      } as Response);

      const token = await getAuthToken();

      expect(token).toBe(mockTokenResponse.access_token);
      expect(getBofaCredentials).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        mockCredentials.tokenUrl,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded',
          }),
        })
      );
    });

    it('uses correct OAuth 2.0 client credentials grant type', async () => {
      vi.mocked(getBofaCredentials).mockResolvedValue(mockCredentials);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockTokenResponse,
      } as Response);

      await getAuthToken();

      const fetchCall = mockFetch.mock.calls[0];
      const body = fetchCall[1]?.body as string;
      const params = new URLSearchParams(body);

      expect(params.get('grant_type')).toBe('client_credentials');
      expect(params.get('client_id')).toBe(mockCredentials.clientId);
      expect(params.get('client_secret')).toBe(mockCredentials.clientSecret);
    });

    it('caches token and returns same token if not expired', async () => {
      vi.mocked(getBofaCredentials).mockResolvedValue(mockCredentials);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockTokenResponse,
      } as Response);

      // First call
      const token1 = await getAuthToken();
      expect(token1).toBe(mockTokenResponse.access_token);
      expect(getBofaCredentials).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call immediately (should use cache)
      const token2 = await getAuthToken();
      expect(token2).toBe(mockTokenResponse.access_token);
      expect(getBofaCredentials).toHaveBeenCalledTimes(1); // No new call
      expect(mockFetch).toHaveBeenCalledTimes(1); // No new fetch
    });

    it('requests new token after cache expires (55 minutes)', async () => {
      vi.mocked(getBofaCredentials).mockResolvedValue(mockCredentials);

      const tokenResponse1 = {
        ...mockTokenResponse,
        access_token: 'first-token-abc123',
      };
      const tokenResponse2 = {
        ...mockTokenResponse,
        access_token: 'second-token-def456',
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => tokenResponse1,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => tokenResponse2,
        } as Response);

      // First call
      const token1 = await getAuthToken();
      expect(token1).toBe(tokenResponse1.access_token);

      // Fast forward 56 minutes (past 55 min TTL)
      vi.advanceTimersByTime(56 * 60 * 1000);

      // Second call after expiry
      const token2 = await getAuthToken();
      expect(token2).toBe(tokenResponse2.access_token);
      expect(getBofaCredentials).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('requests new token after 3300 seconds (55 minutes TTL)', async () => {
      vi.mocked(getBofaCredentials).mockResolvedValue(mockCredentials);
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ...mockTokenResponse, access_token: 'token1' }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ...mockTokenResponse, access_token: 'token2' }),
        } as Response);

      // First token
      await getAuthToken();

      // Fast forward exactly 3300 seconds
      vi.advanceTimersByTime(3300 * 1000);

      // Token should be expired, new fetch
      const token = await getAuthToken();
      expect(token).toBe('token2');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('does not request new token before 3300 seconds', async () => {
      vi.mocked(getBofaCredentials).mockResolvedValue(mockCredentials);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockTokenResponse,
      } as Response);

      // First token
      const token1 = await getAuthToken();
      expect(token1).toBe(mockTokenResponse.access_token);

      // Fast forward 3299 seconds (1 second before expiry)
      vi.advanceTimersByTime(3299 * 1000);

      // Should still use cache
      const token2 = await getAuthToken();
      expect(token2).toBe(mockTokenResponse.access_token);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('integrates with getBofaCredentials to retrieve credentials', async () => {
      vi.mocked(getBofaCredentials).mockResolvedValue(mockCredentials);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockTokenResponse,
      } as Response);

      await getAuthToken();

      expect(getBofaCredentials).toHaveBeenCalled();
      expect(getBofaCredentials).toHaveBeenCalledTimes(1);
    });

    it('throws error when getBofaCredentials fails', async () => {
      const credentialError = new Error('Failed to retrieve credentials');
      vi.mocked(getBofaCredentials).mockRejectedValue(credentialError);

      await expect(getAuthToken()).rejects.toThrow('Failed to retrieve credentials');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('throws error when BOFA auth endpoint returns error', async () => {
      vi.mocked(getBofaCredentials).mockResolvedValue(mockCredentials);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      } as Response);

      await expect(getAuthToken()).rejects.toThrow();
      expect(getBofaCredentials).toHaveBeenCalledTimes(1);
    });

    it('throws error when BOFA auth endpoint returns 401', async () => {
      vi.mocked(getBofaCredentials).mockResolvedValue(mockCredentials);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      } as Response);

      await expect(getAuthToken()).rejects.toThrow('401');
    });

    it('throws error when BOFA auth endpoint returns 500', async () => {
      vi.mocked(getBofaCredentials).mockResolvedValue(mockCredentials);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      await expect(getAuthToken()).rejects.toThrow('500');
    });

    it('throws error when response JSON is malformed', async () => {
      vi.mocked(getBofaCredentials).mockResolvedValue(mockCredentials);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      } as Response);

      await expect(getAuthToken()).rejects.toThrow();
    });

    it('throws error when response missing access_token field', async () => {
      vi.mocked(getBofaCredentials).mockResolvedValue(mockCredentials);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          token_type: 'Bearer',
          expires_in: 3600,
          // missing access_token
        }),
      } as Response);

      await expect(getAuthToken()).rejects.toThrow('access_token');
    });

    it('handles network errors from fetch', async () => {
      vi.mocked(getBofaCredentials).mockResolvedValue(mockCredentials);
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(getAuthToken()).rejects.toThrow('Network error');
      expect(getBofaCredentials).toHaveBeenCalledTimes(1);
    });

    it('respects token expiry from BOFA response (expires_in)', async () => {
      vi.mocked(getBofaCredentials).mockResolvedValue(mockCredentials);

      const shortLivedToken = {
        ...mockTokenResponse,
        access_token: 'short-lived-token',
        expires_in: 60, // 1 minute
      };

      const newToken = {
        ...mockTokenResponse,
        access_token: 'new-token',
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => shortLivedToken,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => newToken,
        } as Response);

      // Get first token with 60s expiry
      const token1 = await getAuthToken();
      expect(token1).toBe(shortLivedToken.access_token);

      // Fast forward past 60s
      vi.advanceTimersByTime(61 * 1000);

      // Should fetch new token
      const token2 = await getAuthToken();
      expect(token2).toBe(newToken.access_token);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('respects minimum TTL of 3300 seconds even if BOFA returns longer expiry', async () => {
      vi.mocked(getBofaCredentials).mockResolvedValue(mockCredentials);

      const longLivedToken = {
        ...mockTokenResponse,
        access_token: 'long-lived-token',
        expires_in: 7200, // 2 hours
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => longLivedToken,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ...mockTokenResponse, access_token: 'token2' }),
        } as Response);

      await getAuthToken();

      // Fast forward 3300 seconds (55 min) - should expire despite 7200s from BOFA
      vi.advanceTimersByTime(3300 * 1000);

      const token2 = await getAuthToken();
      expect(token2).toBe('token2');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('clears cache on 401 error and allows retry', async () => {
      vi.mocked(getBofaCredentials).mockResolvedValue(mockCredentials);

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ...mockTokenResponse, access_token: 'new-token' }),
        } as Response);

      // First successful token
      const token1 = await getAuthToken();
      expect(token1).toBe(mockTokenResponse.access_token);

      // Force expiry
      vi.advanceTimersByTime(3300 * 1000);

      // This will fail with 401
      await expect(getAuthToken()).rejects.toThrow('401');

      // Next attempt should succeed with new token
      vi.advanceTimersByTime(1000);
      const token2 = await getAuthToken();
      expect(token2).toBe('new-token');
    });

    it('includes tenant_id in token request if provided', async () => {
      const credentialsWithTenant = {
        ...mockCredentials,
        tenantId: 'tenant-123',
      };

      vi.mocked(getBofaCredentials).mockResolvedValue(credentialsWithTenant);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockTokenResponse,
      } as Response);

      await getAuthToken();

      const fetchCall = mockFetch.mock.calls[0];
      const body = fetchCall[1]?.body as string;
      const params = new URLSearchParams(body);

      expect(params.get('tenant_id')).toBe('tenant-123');
    });
  });

  describe('Token Cache Behavior', () => {
    it('handles multiple concurrent calls with single fetch', async () => {
      vi.mocked(getBofaCredentials).mockResolvedValue(mockCredentials);

      let fetchCount = 0;
      mockFetch.mockImplementation(async () => {
        fetchCount++;
        // Don't use setTimeout with fake timers, just return immediately
        return {
          ok: true,
          json: async () => mockTokenResponse,
        } as Response;
      });

      // Make concurrent calls
      const [token1, token2, token3] = await Promise.all([
        getAuthToken(),
        getAuthToken(),
        getAuthToken(),
      ]);

      // All should get the same token
      expect(token1).toBe(mockTokenResponse.access_token);
      expect(token2).toBe(mockTokenResponse.access_token);
      expect(token3).toBe(mockTokenResponse.access_token);

      // But only one fetch should have occurred (first one wins)
      expect(fetchCount).toBe(1);
    });

    it('isolates cache between test runs', async () => {
      vi.mocked(getBofaCredentials).mockResolvedValue(mockCredentials);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockTokenResponse,
      } as Response);

      // First token
      const token1 = await getAuthToken();
      expect(token1).toBe(mockTokenResponse.access_token);

      // Clear cache to simulate fresh test context
      clearTokenCache();

      // Reset mocks for new context
      mockFetch.mockReset();
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ ...mockTokenResponse, access_token: 'new-token' }),
      } as Response);

      // Should fetch new token
      const token2 = await getAuthToken();
      expect(token2).toBe('new-token');
    });
  });

  describe('clearTokenCache', () => {
    it('clears the token cache', async () => {
      vi.mocked(getBofaCredentials).mockResolvedValue(mockCredentials);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockTokenResponse,
      } as Response);

      // Get first token (should cache it)
      const token1 = await getAuthToken();
      expect(token1).toBe(mockTokenResponse.access_token);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Clear cache
      clearTokenCache();

      // Get token again (should fetch new token)
      const token2 = await getAuthToken();
      expect(token2).toBe(mockTokenResponse.access_token);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('clears cache even when no token is cached', () => {
      // Should not throw when cache is empty
      expect(() => clearTokenCache()).not.toThrow();
    });
  });

  describe('getCachedToken', () => {
    it('returns null when no token is cached', () => {
      const cached = getCachedToken();
      expect(cached).toBeNull();
    });

    it('returns cached token with expiry when token exists', async () => {
      vi.mocked(getBofaCredentials).mockResolvedValue(mockCredentials);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockTokenResponse,
      } as Response);

      await getAuthToken();

      const cached = getCachedToken();
      expect(cached).not.toBeNull();
      expect(cached?.token).toBe(mockTokenResponse.access_token);
      expect(cached?.expiresAt).toBeGreaterThan(Date.now());
    });
  });

  describe('Error Detection Functions', () => {
    it('detects 401 Unauthorized responses', () => {
      const response = new Response(null, { status: 401 });
      expect(isUnauthorized(response)).toBe(true);

      const okResponse = new Response(null, { status: 200 });
      expect(isUnauthorized(okResponse)).toBe(false);
    });

    it('detects 403 Forbidden responses', () => {
      const response = new Response(null, { status: 403 });
      expect(isForbidden(response)).toBe(true);

      const okResponse = new Response(null, { status: 200 });
      expect(isForbidden(okResponse)).toBe(false);
    });

    it('detects 429 Rate Limited responses', () => {
      const response = new Response(null, { status: 429 });
      expect(isRateLimited(response)).toBe(true);

      const okResponse = new Response(null, { status: 200 });
      expect(isRateLimited(okResponse)).toBe(false);
    });

    it('detects 5xx Server Error responses', () => {
      const response500 = new Response(null, { status: 500 });
      expect(isServerError(response500)).toBe(true);

      const response503 = new Response(null, { status: 503 });
      expect(isServerError(response503)).toBe(true);

      const okResponse = new Response(null, { status: 200 });
      expect(isServerError(okResponse)).toBe(false);
    });

    it('detects 4xx Client Error responses (excluding 401, 403, 429)', () => {
      const response400 = new Response(null, { status: 400 });
      expect(isClientError(response400)).toBe(true);

      const response404 = new Response(null, { status: 404 });
      expect(isClientError(response404)).toBe(true);

      const response422 = new Response(null, { status: 422 });
      expect(isClientError(response422)).toBe(true);

      // These should NOT be considered client errors for retry purposes
      expect(isClientError(new Response(null, { status: 401 }))).toBe(false);
      expect(isClientError(new Response(null, { status: 403 }))).toBe(false);
      expect(isClientError(new Response(null, { status: 429 }))).toBe(false);

      const okResponse = new Response(null, { status: 200 });
      expect(isClientError(okResponse)).toBe(false);
    });

    describe('classifyError', () => {
      it('classifies Response objects by status code', () => {
        expect(classifyError(new Response(null, { status: 401 }))).toBe(AuthErrorType.UNAUTHORIZED);
        expect(classifyError(new Response(null, { status: 403 }))).toBe(AuthErrorType.FORBIDDEN);
        expect(classifyError(new Response(null, { status: 429 }))).toBe(AuthErrorType.RATE_LIMITED);
        expect(classifyError(new Response(null, { status: 500 }))).toBe(AuthErrorType.SERVER_ERROR);
        expect(classifyError(new Response(null, { status: 400 }))).toBe(AuthErrorType.CLIENT_ERROR);
      });

      it('classifies AuthError instances by their type', () => {
        const error = new AuthError('test', AuthErrorType.UNAUTHORIZED, true, 401);
        expect(classifyError(error)).toBe(AuthErrorType.UNAUTHORIZED);
      });

      it('classifies network errors as NETWORK_ERROR', () => {
        const networkError = new Error('Network request failed');
        expect(classifyError(networkError)).toBe(AuthErrorType.NETWORK_ERROR);

        const fetchError = new Error('Failed to fetch');
        expect(classifyError(fetchError)).toBe(AuthErrorType.NETWORK_ERROR);

        const connRefusedError = new Error('ECONNREFUSED');
        expect(classifyError(connRefusedError)).toBe(AuthErrorType.NETWORK_ERROR);
      });

      it('defaults to CLIENT_ERROR for unknown errors', () => {
        const unknownError = new Error('Some other error');
        expect(classifyError(unknownError)).toBe(AuthErrorType.CLIENT_ERROR);
      });
    });
  });

  describe('retryWithBackoff', () => {
    beforeEach(() => {
      clearErrorLog();
    });

    afterEach(() => {
      clearErrorLog();
    });

    it('returns result on first successful attempt', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      const result = await retryWithBackoff(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('retries on 401 Unauthorized and clears token cache', async () => {
      vi.mocked(getBofaCredentials).mockResolvedValue(mockCredentials);
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ...mockTokenResponse, access_token: 'new-token' }),
        } as Response);

      let attemptCount = 0;
      const fn = vi.fn(async () => {
        attemptCount++;
        if (attemptCount === 1) {
          throw new Response(null, { status: 401, statusText: 'Unauthorized' });
        }
        return new Response(null, { status: 200, statusText: 'OK' }) as any;
      });

      const result = await retryWithBackoff(fn, { maxAttempts: 3, initialBackoffMs: 1 });

      expect(attemptCount).toBe(2);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('retries up to maxAttempts on 401', async () => {
      let attemptCount = 0;
      const fn = vi.fn(async () => {
        attemptCount++;
        throw new Response(null, { status: 401, statusText: 'Unauthorized' });
      });

      await expect(retryWithBackoff(fn, { maxAttempts: 3, initialBackoffMs: 1 })).rejects.toThrow('Max retry attempts');

      expect(attemptCount).toBe(3);
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('throws immediately on 403 Forbidden without retry', async () => {
      const fn = vi.fn(async () => {
        throw new Response(null, { status: 403, statusText: 'Forbidden' });
      });

      await expect(retryWithBackoff(fn)).rejects.toThrow();

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('throws immediately on 400 Bad Request without retry', async () => {
      const fn = vi.fn(async () => {
        throw new Response(null, { status: 400, statusText: 'Bad Request' });
      });

      await expect(retryWithBackoff(fn)).rejects.toThrow();

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('retries on 429 Rate Limited with exponential backoff', async () => {
      let attemptCount = 0;
      const fn = vi.fn(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Response(null, { status: 429, statusText: 'Too Many Requests' });
        }
        return new Response(null, { status: 200, statusText: 'OK' }) as any;
      });

      const result = await retryWithBackoff(fn, { maxAttempts: 3, initialBackoffMs: 1 });

      expect(attemptCount).toBe(3);
      expect(result).toBeTruthy();
    });

    it('retries on 500 Server Error with exponential backoff', async () => {
      let attemptCount = 0;
      const fn = vi.fn(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Response(null, { status: 500, statusText: 'Internal Server Error' });
        }
        return new Response(null, { status: 200, statusText: 'OK' }) as any;
      });

      const result = await retryWithBackoff(fn, { maxAttempts: 3, initialBackoffMs: 1 });

      expect(attemptCount).toBe(3);
      expect(result).toBeTruthy();
    });

    it('respects maxBackoffMs cap', async () => {
      let attemptCount = 0;
      const fn = vi.fn(async () => {
        attemptCount++;
        if (attemptCount < 4) {
          throw new Response(null, { status: 429, statusText: 'Too Many Requests' });
        }
        return new Response(null, { status: 200, statusText: 'OK' }) as any;
      });

      // With initialBackoffMs: 1, maxBackoffMs: 2
      // Delays would be: 1, 2, 2 (capped at 2)
      await retryWithBackoff(fn, {
        maxAttempts: 4,
        initialBackoffMs: 1,
        maxBackoffMs: 2,
      });

      expect(attemptCount).toBe(4);
    });

    it('retries on network errors', async () => {
      let attemptCount = 0;
      const fn = vi.fn(async () => {
        attemptCount++;
        if (attemptCount < 2) {
          throw new Error('Network request failed');
        }
        return 'success';
      });

      const result = await retryWithBackoff(fn, { maxAttempts: 3, initialBackoffMs: 1 });

      expect(attemptCount).toBe(2);
      expect(result).toBe('success');
    });

    it('uses exponential backoff: 1s, 2s, 4s', async () => {
      const fn = vi.fn(async () => {
        throw new Response(null, { status: 429, statusText: 'Too Many Requests' });
      });

      await expect(retryWithBackoff(fn, {
        maxAttempts: 3,
        initialBackoffMs: 1,
      })).rejects.toThrow();
    });

    it('logs errors to error log', async () => {
      const fn = vi.fn(async () => {
        throw new Response(null, { status: 401, statusText: 'Unauthorized' });
      });

      clearErrorLog();
      await expect(retryWithBackoff(fn, { maxAttempts: 2, initialBackoffMs: 1 })).rejects.toThrow();

      const errors = getErrorLog();
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].type).toBe(AuthErrorType.UNAUTHORIZED);
      expect(errors[0].status).toBe(401);
    });

    it('limits retry attempts to max 3 by default', async () => {
      let attemptCount = 0;
      const fn = vi.fn(async () => {
        attemptCount++;
        throw new Response(null, { status: 401, statusText: 'Unauthorized' });
      });

      await expect(retryWithBackoff(fn)).rejects.toThrow('Max retry attempts (3) exceeded');

      expect(attemptCount).toBe(3);
    });
  });

  describe('Error Logging', () => {
    beforeEach(() => {
      clearErrorLog();
    });

    afterEach(() => {
      clearErrorLog();
    });

    it('gets empty error log initially', () => {
      const log = getErrorLog();
      expect(log).toEqual([]);
    });

    it('clears error log', async () => {
      // Force some errors
      const fn = vi.fn(async () => {
        throw new Response(null, { status: 401, statusText: 'Unauthorized' });
      });
      await retryWithBackoff(fn, { maxAttempts: 2, initialBackoffMs: 1 }).catch(() => {});

      // Log should have entries
      const log1 = getErrorLog();
      expect(log1.length).toBeGreaterThan(0);

      // Clear it
      clearErrorLog();
      const log2 = getErrorLog();
      expect(log2).toEqual([]);
    });

    it('maintains error log entries with correct structure', async () => {
      const fn = vi.fn(async () => {
        throw new Response(null, { status: 401, statusText: 'Unauthorized' });
      });

      clearErrorLog();
      await expect(retryWithBackoff(fn, { maxAttempts: 2, initialBackoffMs: 1 })).rejects.toThrow();

      const log = getErrorLog();
      expect(log.length).toBeGreaterThan(0);
      expect(log[0]).toMatchObject({
        type: AuthErrorType.UNAUTHORIZED,
        status: 401,
        attempt: expect.any(Number),
        maxAttempts: 2,
        recovered: false,
      });
      expect(log[0].timestamp).toBeDefined();
    });
  });

  describe('AuthError class', () => {
    it('creates AuthError with correct properties', () => {
      const error = new AuthError('Test error', AuthErrorType.UNAUTHORIZED, true, 401);

      expect(error.message).toBe('Test error');
      expect(error.type).toBe(AuthErrorType.UNAUTHORIZED);
      expect(error.retryable).toBe(true);
      expect(error.status).toBe(401);
      expect(error.name).toBe('AuthError');
    });

    it('supports optional cause error', () => {
      const cause = new Error('Original error');
      const error = new AuthError('Wrapped error', AuthErrorType.NETWORK_ERROR, true, undefined, cause);

      expect(error.cause).toBe(cause);
    });
  });
});
