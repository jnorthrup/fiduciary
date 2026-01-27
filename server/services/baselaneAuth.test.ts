/**
 * Tests for Baselane OAuth Authentication
 *
 * Test file for OAuth token management and caching
 * Phase: OAuth 2.0 Authentication
 * Track: baselane_api_20260124
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  BaselaneAuthManager,
  getAuthToken,
  clearTokenCache
} from './baselaneAuth.js';
import { BaselaneConfig } from './baselaneService.js';

describe('BaselaneAuthManager - Module Structure', () => {
  it('should export BaselaneAuthManager class', () => {
    expect(BaselaneAuthManager).toBeDefined();
    expect(typeof BaselaneAuthManager).toBe('function');
  });

  it('should export getAuthToken function', () => {
    expect(typeof getAuthToken).toBe('function');
  });

  it('should export clearTokenCache function', () => {
    expect(typeof clearTokenCache).toBe('function');
  });
});

describe('BaselaneAuthManager - Token Management', () => {
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

  describe('Token Cache', () => {
    it('should cache token after retrieval', async () => {
      // Mock fetch for token request
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          expires_in: 3600,
          scope: ['read', 'write']
        })
      });

      const token1 = await authManager.getAuthToken();
      const token2 = await authManager.getAuthToken();

      expect(token1.accessToken).toBe('test-access-token');
      expect(token2.accessToken).toBe('test-access-token');
      // Should use cached token - only one fetch call
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should refresh expired token', async () => {
      const now = Date.now();
      let callCount = 0;

      global.fetch = vi.fn().mockImplementation(() => ({
        ok: true,
        json: async () => ({
          access_token: `token-${callCount++}`,
          refresh_token: 'refresh-token',
          expires_in: 1, // 1 second TTL for testing
          scope: ['read']
        })
      }));

      const token1 = await authManager.getAuthToken();
      expect(token1.accessToken).toBe('token-0');

      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      const token2 = await authManager.getAuthToken();
      expect(token2.accessToken).toBe('token-1');
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Token Request', () => {
    it('should request token with correct credentials', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'test-token',
          refresh_token: 'test-refresh',
          expires_in: 3600,
          scope: ['read']
        })
      });

      global.fetch = mockFetch;

      await authManager.getAuthToken();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('sandbox-api.baselane.com/v1/oauth/token'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded'
          }),
          body: expect.stringContaining('grant_type=client_credentials')
        })
      );
    });

    it('should handle token request errors', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: 'invalid_client',
          error_description: 'Invalid client credentials'
        })
      });

      await expect(authManager.getAuthToken()).rejects.toThrow();
    });
  });
});

describe('getAuthToken - Standalone Function', () => {
  afterEach(() => {
    clearTokenCache();
  });

  it('should return auth token', async () => {
    const config: BaselaneConfig = {
      clientId: 'test-client',
      clientSecret: 'test-secret',
      environment: 'sandbox'
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: 'standalone-token',
        refresh_token: 'standalone-refresh',
        expires_in: 3600,
        scope: ['read']
      })
    });

    const token = await getAuthToken(config);
    expect(token.accessToken).toBe('standalone-token');
  });
});

describe('clearTokenCache', () => {
  it('should clear the token cache', async () => {
    const config: BaselaneConfig = {
      clientId: 'test-client',
      clientSecret: 'test-secret',
      environment: 'sandbox'
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'test-token',
        refresh_token: 'test-refresh',
        expires_in: 3600,
        scope: ['read']
      })
    });

    // Get token (caches it)
    await getAuthToken(config);
    expect(fetch).toHaveBeenCalledTimes(1);

    // Clear cache
    clearTokenCache();

    // Get token again (should fetch new)
    await getAuthToken(config);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
