/**
 * BOFA Auth Service
 *
 * Implements OAuth 2.0 client credentials flow for Bank of America CashPro API.
 * Handles token retrieval, caching with TTL, and automatic refresh.
 *
 * Track: bofa_cashpro_20260123
 * Phase: 2.1 Token Management
 *
 * @module bofaAuthService
 */

import { getBofaCredentials } from './bofaSecretManager';
import type { BOFAAuthConfig, BOFATokenResponse } from './bofaCashProService';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Cached token with expiry timestamp
 */
interface CachedToken {
  /** Access token string */
  token: string;
  /** Token expiration timestamp (milliseconds since epoch) */
  expiresAt: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Token cache TTL in seconds (55 minutes)
 * BOFA tokens typically expire after 60 minutes, so we cache for 55 minutes
 * to ensure we refresh before actual expiration
 */
const TOKEN_CACHE_TTL_SECONDS = 3300; // 55 minutes

/**
 * Token cache TTL in milliseconds for timer calculations
 */
const TOKEN_CACHE_TTL_MS = TOKEN_CACHE_TTL_SECONDS * 1000;

// ============================================================================
// TOKEN CACHE
// ============================================================================

/**
 * In-memory token cache
 * Stores the current valid token with its expiration time
 */
let tokenCache: CachedToken | null = null;

/**
 * Flag to prevent concurrent token requests
 * When a token request is in flight, subsequent calls wait for the same promise
 */
let tokenRequestPromise: Promise<string> | null = null;

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Gets OAuth 2.0 access token for BOFA API authentication
 *
 * Implements client credentials flow with caching:
 * - Retrieves credentials from Google Secret Manager
 * - Posts to BOFA auth endpoint with client credentials
 * - Caches token with 55 minute TTL
 * - Returns cached token if not expired
 * - Automatically refreshes when token expires
 *
 * @returns Promise resolving to access token string
 * @throws Error if:
 *   - Credential retrieval fails
 *   - BOFA auth endpoint returns error (401, 500, etc.)
 *   - Network request fails
 *   - Response is missing access_token
 *
 * @example
 * ```typescript
 * const token = await getAuthToken();
 * console.log(`Access token: ${token}`);
 *
 * // Use token for API calls
 * const response = await fetch('https://api.bankofamerica.com/...', {
 *   headers: {
 *     'Authorization': `Bearer ${token}`
 *   }
 * });
 * ```
 */
export async function getAuthToken(): Promise<string> {
  // Check if we have a valid cached token
  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token;
  }

  // If a token request is already in flight, return that promise
  // This prevents multiple concurrent requests when the token is expired
  if (tokenRequestPromise) {
    return tokenRequestPromise;
  }

  // Create the token request promise
  tokenRequestPromise = fetchNewToken();

  try {
    const token = await tokenRequestPromise;
    return token;
  } finally {
    // Clear the promise once complete (success or failure)
    tokenRequestPromise = null;
  }
}

/**
 * Fetches a new access token from BOFA auth endpoint
 *
 * Internal function that:
 * 1. Retrieves credentials from Secret Manager
 * 2. Posts to BOFA OAuth token endpoint
 * 3. Caches the response with TTL
 * 4. Returns the access token
 *
 * @returns Promise resolving to access token string
 * @throws Error if credential retrieval or token request fails
 */
async function fetchNewToken(): Promise<string> {
  // Retrieve credentials from Secret Manager
  const credentials: BOFAAuthConfig = await getBofaCredentials();

  // Build OAuth 2.0 client credentials request
  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
  });

  // Add tenant_id if provided
  if (credentials.tenantId) {
    params.append('tenant_id', credentials.tenantId);
  }

  // Request token from BOFA auth endpoint
  const response = await fetch(credentials.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: params.toString(),
  });

  // Check for HTTP errors
  if (!response.ok) {
    throw new Error(
      `BOFA auth request failed: ${response.status} ${response.statusText}`
    );
  }

  // Parse token response
  let tokenResponse: BOFATokenResponse;
  try {
    tokenResponse = await response.json();
  } catch (error) {
    throw new Error('Failed to parse BOFA token response as JSON');
  }

  // Validate response contains access_token
  if (!tokenResponse.access_token) {
    throw new Error('BOFA token response missing access_token field');
  }

  // Determine cache expiry time
  // Use the minimum of:
  // 1. BOFA's expires_in (if provided)
  // 2. Our configured TTL (55 minutes)
  // This ensures we refresh before the token actually expires
  const cacheExpirySeconds = Math.min(
    tokenResponse.expires_in || TOKEN_CACHE_TTL_SECONDS,
    TOKEN_CACHE_TTL_SECONDS
  );

  // Cache the token with expiry timestamp
  tokenCache = {
    token: tokenResponse.access_token,
    expiresAt: Date.now() + (cacheExpirySeconds * 1000),
  };

  return tokenCache.token;
}

/**
 * Clears the cached token (for testing and error recovery)
 *
 * Forces the next getAuthToken() call to fetch a new token.
 * Useful when a 401 error indicates the current token is invalid.
 *
 * @example
 * ```typescript
 * // After receiving 401 from API
 * clearTokenCache();
 * const newToken = await getAuthToken();
 * ```
 */
export function clearTokenCache(): void {
  tokenCache = null;
}

/**
 * Gets the current cached token without checking expiry
 *
 * Returns the cached token if present, regardless of expiration.
 * Useful for debugging and testing.
 *
 * @returns Cached token object or null if no token is cached
 *
 * @example
 * ```typescript
 * const cached = getCachedToken();
 * if (cached) {
 *   console.log(`Token expires at ${new Date(cached.expiresAt)}`);
 * }
 * ```
 */
export function getCachedToken(): CachedToken | null {
  return tokenCache;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Functions
  getAuthToken,
  clearTokenCache,
  getCachedToken,
};
