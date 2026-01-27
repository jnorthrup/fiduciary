/**
 * Tests for Baselane Auth Error Handling
 *
 * Test file for authentication error handling and retry logic
 * Phase: OAuth 2.0 Authentication
 * Track: baselane_api_20260124
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  BaselaneAuthManager,
  BaselaneAuthException,
  BaselaneAuthError,
  authenticatedFetch,
  clearTokenCache
} from './baselaneAuth.js';
import type { BaselaneConfig } from './baselaneService.js';

describe('BaselaneAuthException', () => {
  it('should export BaselaneAuthException class', () => {
    expect(BaselaneAuthException).toBeDefined();
    expect(typeof BaselaneAuthException).toBe('function');
  });

  it('should create error with code and message', () => {
    const error = new BaselaneAuthException(
      BaselaneAuthError.INVALID_CLIENT,
      'Invalid credentials'
    );

    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe(BaselaneAuthError.INVALID_CLIENT);
    expect(error.message).toBe('Invalid credentials');
    expect(error.name).toBe('BaselaneAuthException');
  });
});

describe('BaselaneAuthError enum', () => {
  it('should export all error codes', () => {
    expect(BaselaneAuthError.INVALID_CLIENT).toBe('invalid_client');
    expect(BaselaneAuthError.INVALID_GRANT).toBe('invalid_grant');
    expect(BaselaneAuthError.UNAUTHORIZED).toBe('unauthorized');
    expect(BaselaneAuthError.FORBIDDEN).toBe('forbidden');
    expect(BaselaneAuthError.RATE_LIMITED).toBe('rate_limited');
    expect(BaselaneAuthError.SERVER_ERROR).toBe('server_error');
    expect(BaselaneAuthError.NETWORK_ERROR).toBe('network_error');
  });
});

describe('Auth Error Handling', () => {
  let authManager: BaselaneAuthManager;
  const mockConfig: BaselaneConfig = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    environment: 'sandbox'
  };

  beforeEach(() => {
    authManager = new BaselaneAuthManager(mockConfig);
    vi.clearAllMocks();
  });

  afterEach(() => {
    clearTokenCache();
  });

  describe('401 Unauthorized Error', () => {
    it('should throw BaselaneAuthException for 401 response', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({
          error: 'unauthorized',
          error_description: 'Invalid credentials'
        })
      });

      await expect(authManager.getAuthToken()).rejects.toThrow(BaselaneAuthException);
    });

    it('should set correct error code for 401', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: 'invalid_client',
          error_description: 'Client authentication failed'
        })
      });

      try {
        await authManager.getAuthToken();
        throw new Error('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(BaselaneAuthException);
        if (error instanceof BaselaneAuthException) {
          expect(error.code).toBe(BaselaneAuthError.INVALID_CLIENT);
        }
      }
    });
  });

  describe('403 Forbidden Error', () => {
    it('should throw BaselaneAuthException for 403 response', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({
          error: 'forbidden',
          error_description: 'Access denied'
        })
      });

      await expect(authManager.getAuthToken()).rejects.toThrow(BaselaneAuthException);
    });
  });

  describe('Network Error', () => {
    it('should handle network errors', async () => {
      const networkError = new TypeError('Failed to fetch');
      networkError.name = 'TypeError';

      global.fetch = vi.fn().mockRejectedValueOnce(networkError);

      try {
        await authManager.getAuthToken();
        throw new Error('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(BaselaneAuthException);
        if (error instanceof BaselaneAuthException) {
          expect(error.code).toBe(BaselaneAuthError.NETWORK_ERROR);
          expect(error.message).toContain('Network error');
        }
      }
    });
  });
});

describe('authenticatedFetch - Retry Logic', () => {
  const mockConfig: BaselaneConfig = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    environment: 'sandbox'
  };

  afterEach(() => {
    clearTokenCache();
  });

  it('should retry on 401 with fresh token', async () => {
    let callCount = 0;
    let tokenCallCount = 0;

    // Mock fetch to track calls
    global.fetch = vi.fn().mockImplementation((url: string) => {
      callCount++;

      // Token endpoint calls
      if (url.includes('/oauth/token')) {
        tokenCallCount++;
        return Promise.resolve({
          ok: true,
          json: async () => ({
            access_token: `token-${tokenCallCount}`,
            refresh_token: 'refresh-token',
            expires_in: 3600,
            scope: ['read']
          })
        });
      }

      // API calls
      if (callCount === 2) {
        // First API call: return 401
        return Promise.resolve({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          json: async () => ({ error: 'unauthorized' })
        });
      } else {
        // Second API call: success
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: 'success' })
        });
      }
    });

    const response = await authenticatedFetch(mockConfig, 'https://api.example.com/test');
    expect(response.ok).toBe(true);
    expect(callCount).toBeGreaterThanOrEqual(3); // token, API 401, token refresh, API success
  });

  it('should add Authorization header', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: 'test-token',
        refresh_token: 'test-refresh',
        expires_in: 3600,
        scope: ['read']
      })
    }).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: 'success' })
    });

    await authenticatedFetch(mockConfig, 'https://api.example.com/test');

    // Check that second call (API request) has Authorization header
    expect(fetch).toHaveBeenCalledTimes(2);
    const apiCall = (fetch as any).mock.calls[1];
    expect(apiCall[1]).toBeDefined();
    expect(apiCall[1].headers.Authorization).toBe('Bearer test-token');
  });
});
