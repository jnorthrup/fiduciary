/**
 * Baselane OAuth Authentication
 *
 * OAuth 2.0 client credentials flow for Baselane API
 * Track: baselane_api_20260124
 *
 * This module handles:
 * - OAuth client credentials flow
 * - Token caching with TTL
 * - Automatic token refresh
 * - Token reuse across requests
 * - Auth error handling with retry logic
 */

import type { BaselaneConfig } from './baselaneService.js';

// ============================================================================
// TYPES
// ============================================================================

/**
 * OAuth authentication token
 */
export interface BaselaneAuthToken {
  /** Access token for API requests */
  accessToken: string;
  /** Refresh token for obtaining new access tokens */
  refreshToken: string;
  /** Token expiration timestamp (milliseconds since epoch) */
  expiresAt: number;
  /** Granted OAuth scopes */
  scope: string[];
}

/**
 * Token cache entry
 */
interface TokenCacheEntry {
  token: BaselaneAuthToken;
  configKey: string; // Key to identify which config this token is for
}

/**
 * Baselane API error types
 */
export enum BaselaneAuthError {
  INVALID_CLIENT = 'invalid_client',
  INVALID_GRANT = 'invalid_grant',
  UNAUTHORIZED = 'unauthorized',
  FORBIDDEN = 'forbidden',
  RATE_LIMITED = 'rate_limited',
  SERVER_ERROR = 'server_error',
  NETWORK_ERROR = 'network_error'
}

/**
 * Custom error class for Baselane authentication errors
 */
export class BaselaneAuthException extends Error {
  constructor(
    public code: BaselaneAuthError,
    message: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'BaselaneAuthException';
  }
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Token TTL in milliseconds (55 minutes)
 * Baselane tokens typically expire after 60 minutes
 * We refresh 5 minutes early to avoid edge cases
 */
const TOKEN_TTL_MS = 55 * 60 * 1000;

/**
 * Token buffer time (milliseconds) to refresh before actual expiration
 */
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

// ============================================================================
// TOKEN CACHE
// ============================================================================

/**
 * Singleton token cache
 */
let tokenCache: TokenCacheEntry | null = null;

/**
 * Get cache key for a config
 * Uses clientId to uniquely identify the token
 */
function getCacheKey(config: BaselaneConfig): string {
  return `${config.environment}:${config.clientId}`;
}

/**
 * Check if cached token is valid
 */
function isTokenValid(cache: TokenCacheEntry): boolean {
  const now = Date.now();
  const expiresAt = cache.token.expiresAt - TOKEN_REFRESH_BUFFER_MS;
  return now < expiresAt;
}

/**
 * Clear the token cache
 * Useful for testing or forcing a refresh
 */
export function clearTokenCache(): void {
  tokenCache = null;
}

// ============================================================================
// AUTH MANAGER CLASS
// ============================================================================

/**
 * Baselane OAuth Authentication Manager
 *
 * Handles OAuth token retrieval, caching, and refresh.
 * Uses singleton pattern for token caching.
 */
export class BaselaneAuthManager {
  private config: BaselaneConfig;

  /**
   * Create a new auth manager
   *
   * @param config - Baselane configuration
   */
  constructor(config: BaselaneConfig) {
    this.config = config;
  }

  /**
   * Get the base URL for authentication
   */
  private getBaseUrl(): string {
    return this.config.environment === 'production'
      ? 'https://api.baselane.com'
      : 'https://sandbox-api.baselane.com';
  }

  /**
   * Request a new access token from Baselane
   *
   * Uses OAuth 2.0 client credentials flow.
   *
   * @returns Promise resolving to auth token
   * @throws BaselaneAuthException if token request fails
   */
  private async requestToken(): Promise<BaselaneAuthToken> {
    const baseUrl = this.getBaseUrl();
    const tokenUrl = `${baseUrl}/v1/oauth/token`;

    // Prepare request body
    const requestBody = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      scope: 'read write' // Request full access scope
    });

    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: requestBody.toString()
      });

      if (!response.ok) {
        await this.handleAuthError(response);
      }

      const data = await response.json();

      // Validate response
      if (!data.access_token) {
        throw new BaselaneAuthException(
          BaselaneAuthError.SERVER_ERROR,
          'Token response missing access_token'
        );
      }

      // Calculate expiration time
      const expiresIn = data.expires_in || 3600; // Default 1 hour
      const expiresAt = Date.now() + (expiresIn * 1000);

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || '',
        expiresAt,
        scope: data.scope ? (Array.isArray(data.scope) ? data.scope : [data.scope]) : []
      };
    } catch (error) {
      if (error instanceof BaselaneAuthException) {
        throw error;
      }
      if (error instanceof Error) {
        // Check for network errors - more comprehensive check
        const errorMsg = error.message.toLowerCase();
        if (
          errorMsg.includes('fetch') ||
          errorMsg.includes('network') ||
          errorMsg.includes('ECONNREFUSED') ||
          errorMsg.includes('ENOTFOUND') ||
          errorMsg.includes('ETIMEDOUT') ||
          error.name === 'TypeError' // fetch throws TypeError for network errors
        ) {
          throw new BaselaneAuthException(
            BaselaneAuthError.NETWORK_ERROR,
            `Network error requesting token: ${error.message}`,
            error
          );
        }
        throw new BaselaneAuthException(
          BaselaneAuthError.SERVER_ERROR,
          `Failed to request Baselane token: ${error.message}`,
          error
        );
      }
      throw new BaselaneAuthException(
        BaselaneAuthError.SERVER_ERROR,
        'Failed to request Baselane token: Unknown error',
        error
      );
    }
  }

  /**
   * Handle authentication error responses
   *
   * Parses error response and throws appropriate exception.
   *
   * @param response - Fetch response object
   * @throws BaselaneAuthException with appropriate error code
   */
  private async handleAuthError(response: Response): Promise<never> {
    const status = response.status;

    let errorCode = BaselaneAuthError.SERVER_ERROR;
    let errorMessage = `HTTP ${status}: ${response.statusText}`;

    try {
      const errorData = await response.json();

      // Map OAuth error codes
      if (errorData.error) {
        switch (errorData.error) {
          case 'invalid_client':
          case 'invalid_grant':
            errorCode = BaselaneAuthError[errorData.error.toUpperCase()] || BaselaneAuthError.INVALID_CLIENT;
            break;
          case 'unauthorized':
            errorCode = BaselaneAuthError.UNAUTHORIZED;
            break;
          case 'forbidden':
            errorCode = BaselaneAuthError.FORBIDDEN;
            break;
          default:
            errorCode = BaselaneAuthError.INVALID_GRANT;
        }

        errorMessage = errorData.error_description || errorData.error || errorMessage;
      }

      // Log auth failure (without exposing secrets)
      console.error('[Baselane Auth] Token request failed:', {
        status,
        errorCode,
        errorMessage,
        timestamp: new Date().toISOString()
      });
    } catch {
      // Failed to parse error body, use HTTP status
      if (status === 401) {
        errorCode = BaselaneAuthError.UNAUTHORIZED;
      } else if (status === 403) {
        errorCode = BaselaneAuthError.FORBIDDEN;
      } else if (status === 429) {
        errorCode = BaselaneAuthError.RATE_LIMITED;
      }

      console.error('[Baselane Auth] Token request failed:', {
        status,
        errorMessage,
        timestamp: new Date().toISOString()
      });
    }

    throw new BaselaneAuthException(errorCode, errorMessage);
  }

  /**
   * Get a valid access token
   *
   * Returns cached token if valid, otherwise requests a new one.
   *
   * @returns Promise resolving to auth token
   */
  async getAuthToken(): Promise<BaselaneAuthToken> {
    const cacheKey = getCacheKey(this.config);

    // Check if we have a valid cached token
    if (tokenCache && tokenCache.configKey === cacheKey && isTokenValid(tokenCache)) {
      return tokenCache.token;
    }

    // Request new token
    const token = await this.requestToken();

    // Cache the token
    tokenCache = {
      token,
      configKey: cacheKey
    };

    return token;
  }

  /**
   * Force a token refresh
   *
   * Clears cache and requests a new token.
   *
   * @returns Promise resolving to new auth token
   */
  async refreshToken(): Promise<BaselaneAuthToken> {
    clearTokenCache();
    return this.getAuthToken();
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Singleton auth manager instance cache
 */
let authManagerInstance: BaselaneAuthManager | null = null;

/**
 * Get an auth token for the given configuration
 *
 * Convenience function that creates/reuses an auth manager
 * and returns a valid token.
 *
 * @param config - Baselane configuration
 * @returns Promise resolving to auth token
 */
export async function getAuthToken(config: BaselaneConfig): Promise<BaselaneAuthToken> {
  // Create or reuse auth manager
  if (!authManagerInstance || getCacheKey(config) !== getCacheKey(authManagerInstance['config'])) {
    authManagerInstance = new BaselaneAuthManager(config);
  }

  return authManagerInstance.getAuthToken();
}

/**
 * Get the Authorization header value for API requests
 *
 * @param config - Baselane configuration
 * @returns Promise resolving to Bearer token string
 */
export async function getAuthHeader(config: BaselaneConfig): Promise<string> {
  const token = await getAuthToken(config);
  return `Bearer ${token.accessToken}`;
}

/**
 * Make an authenticated API request with automatic retry on auth errors
 *
 * This helper function adds the Authorization header to requests and
 * automatically retries once with a fresh token if a 401/403 is received.
 *
 * @param config - Baselane configuration
 * @param url - API endpoint URL
 * @param options - Fetch options (method, headers, body, etc.)
 * @param maxRetries - Maximum number of retries (default: 1)
 * @returns Promise resolving to fetch Response
 */
export async function authenticatedFetch(
  config: BaselaneConfig,
  url: string,
  options: RequestInit = {},
  maxRetries: number = 1
): Promise<Response> {
  let authManager: BaselaneAuthManager | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Get auth header
      const authHeader = await getAuthHeader(config);

      // Make request with auth header
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': authHeader
        }
      });

      // If auth error and we have retries left, clear cache and retry
      if ((response.status === 401 || response.status === 403) && attempt < maxRetries) {
        console.warn('[Baselane Auth] Auth error detected, refreshing token and retrying...');
        clearTokenCache();
        continue;
      }

      return response;
    } catch (error) {
      // Log error but don't retry network errors (let caller handle)
      console.error('[Baselane Auth] Request failed:', error);
      throw error;
    }
  }

  throw new BaselaneAuthException(
    BaselaneAuthError.UNAUTHORIZED,
    'Request failed after multiple authentication attempts'
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default BaselaneAuthManager;
