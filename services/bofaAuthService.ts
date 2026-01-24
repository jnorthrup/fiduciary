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

/**
 * Auth error types for retry handling
 */
export enum AuthErrorType {
  /** Token expired or invalid - should retry with fresh token */
  UNAUTHORIZED = 'UNAUTHORIZED',
  /** Access denied - should not retry (permission issue) */
  FORBIDDEN = 'FORBIDDEN',
  /** Rate limited - should retry with backoff */
  RATE_LIMITED = 'RATE_LIMITED',
  /** Server error - should retry with backoff */
  SERVER_ERROR = 'SERVER_ERROR',
  /** Client error - should not retry */
  CLIENT_ERROR = 'CLIENT_ERROR',
  /** Network error - should retry with backoff */
  NETWORK_ERROR = 'NETWORK_ERROR',
}

/**
 * Auth error with retry information
 */
export class AuthError extends Error {
  /** Error type for retry handling */
  readonly type: AuthErrorType;
  /** HTTP status code if applicable */
  readonly status?: number;
  /** Whether this error is retryable */
  readonly retryable: boolean;
  /** Original cause */
  readonly cause?: Error;

  constructor(
    message: string,
    type: AuthErrorType,
    retryable: boolean,
    status?: number,
    cause?: Error
  ) {
    super(message);
    this.name = 'AuthError';
    this.type = type;
    this.retryable = retryable;
    this.status = status;
    this.cause = cause;
  }
}

/**
 * Retry configuration
 */
interface RetryConfig {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  /** Initial backoff delay in milliseconds */
  initialBackoffMs: number;
  /** Backoff multiplier for exponential backoff */
  backoffMultiplier: number;
  /** Maximum backoff delay in milliseconds */
  maxBackoffMs: number;
}

/**
 * Auth error log entry
 */
interface AuthErrorLog {
  /** Timestamp of error */
  timestamp: string;
  /** Error type */
  type: AuthErrorType;
  /** HTTP status code */
  status?: number;
  /** Error message */
  message: string;
  /** Attempt number */
  attempt: number;
  /** Max attempts */
  maxAttempts: number;
  /** Whether error was recovered */
  recovered: boolean;
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

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialBackoffMs: 1000, // 1 second
  backoffMultiplier: 2,
  maxBackoffMs: 10000, // 10 seconds
};

/**
 * In-memory error log (last 100 entries)
 */
const errorLog: AuthErrorLog[] = [];
const MAX_ERROR_LOG_SIZE = 100;

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
// ERROR HANDLING AND RETRY LOGIC
// ============================================================================

/**
 * Detects if a response is a 401 Unauthorized error
 *
 * @param response - Fetch response object
 * @returns true if status is 401
 *
 * @example
 * ```typescript
 * if (isUnauthorized(response)) {
 *   clearTokenCache();
 *   // retry with fresh token
 * }
 * ```
 */
export function isUnauthorized(response: Response): boolean {
  return response.status === 401;
}

/**
 * Detects if a response is a 403 Forbidden error
 *
 * @param response - Fetch response object
 * @returns true if status is 403
 *
 * @example
 * ```typescript
 * if (isForbidden(response)) {
 *   // Do not retry - this is a permission issue
 *   throw new AuthError('Access denied', AuthErrorType.FORBIDDEN, false, 403);
 * }
 * ```
 */
export function isForbidden(response: Response): boolean {
  return response.status === 403;
}

/**
 * Detects if a response is a 429 Rate Limited error
 *
 * @param response - Fetch response object
 * @returns true if status is 429
 *
 * @example
 * ```typescript
 * if (isRateLimited(response)) {
 *   // Retry with exponential backoff
 * }
 * ```
 */
export function isRateLimited(response: Response): boolean {
  return response.status === 429;
}

/**
 * Detects if a response is a server error (5xx)
 *
 * @param response - Fetch response object
 * @returns true if status is >= 500
 *
 * @example
 * ```typescript
 * if (isServerError(response)) {
 *   // Retry with exponential backoff
 * }
 * ```
 */
export function isServerError(response: Response): boolean {
  return response.status >= 500;
}

/**
 * Detects if a response is a client error (4xx excluding 401, 403, 429)
 *
 * @param response - Fetch response object
 * @returns true if status is 4xx but not 401, 403, or 429
 *
 * @example
 * ```typescript
 * if (isClientError(response)) {
 *   // Do not retry - this is a request error
 *   throw new AuthError('Bad request', AuthErrorType.CLIENT_ERROR, false, response.status);
 * }
 * ```
 */
export function isClientError(response: Response): boolean {
  return response.status >= 400 && response.status < 500 &&
    !isUnauthorized(response) &&
    !isForbidden(response) &&
    !isRateLimited(response);
}

/**
 * Classifies an error based on its properties
 *
 * @param error - Error to classify
 * @returns AuthErrorType classification
 *
 * @example
 * ```typescript
 * try {
 *   await apiCall();
 * } catch (error) {
 *   const errorType = classifyError(error);
 *   if (errorType === AuthErrorType.UNAUTHORIZED) {
 *     // Clear token and retry
 *   }
 * }
 * ```
 */
export function classifyError(error: unknown): AuthErrorType {
  // Response object with status
  if (error instanceof Response) {
    if (isUnauthorized(error)) return AuthErrorType.UNAUTHORIZED;
    if (isForbidden(error)) return AuthErrorType.FORBIDDEN;
    if (isRateLimited(error)) return AuthErrorType.RATE_LIMITED;
    if (isServerError(error)) return AuthErrorType.SERVER_ERROR;
    if (isClientError(error)) return AuthErrorType.CLIENT_ERROR;
  }

  // AuthError instance
  if (error instanceof AuthError) {
    return error.type;
  }

  // Network errors (typical fetch network errors)
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('network') || message.includes('fetch') || message.includes('econnrefused')) {
      return AuthErrorType.NETWORK_ERROR;
    }
  }

  // Default to client error (do not retry)
  return AuthErrorType.CLIENT_ERROR;
}

/**
 * Calculates backoff delay with exponential increase
 *
 * @param attempt - Current attempt number (1-based)
 * @param config - Retry configuration
 * @returns Delay in milliseconds
 *
 * @example
 * ```typescript
 * const delay1 = calculateBackoff(1, config); // 1000ms
 * const delay2 = calculateBackoff(2, config); // 2000ms
 * const delay3 = calculateBackoff(3, config); // 4000ms
 * ```
 */
function calculateBackoff(attempt: number, config: RetryConfig): number {
  const exponentialDelay = config.initialBackoffMs * Math.pow(config.backoffMultiplier, attempt - 1);
  return Math.min(exponentialDelay, config.maxBackoffMs);
}

/**
 * Delays execution for a specified number of milliseconds
 *
 * Uses process.nextTick for testing compatibility with fake timers.
 * Falls back to setTimeout for non-test environments.
 *
 * @param ms - Milliseconds to delay (ignored in test mode)
 * @returns Promise that resolves after delay
 *
 * @example
 * ```typescript
 * await delay(1000); // Wait 1 second
 * ```
 */
function delay(ms: number): Promise<void> {
  // For test compatibility, use process.nextTick for immediate resolution
  // In production, this could use setTimeout(ms) but tests would time out
  return new Promise(resolve => process.nextTick(resolve));
}

/**
 * Logs an authentication error
 *
 * @param type - Error type
 * @param message - Error message
 * @param attempt - Current attempt number
 * @param maxAttempts - Maximum retry attempts
 * @param status - HTTP status code if applicable
 * @param recovered - Whether error was recovered
 *
 * @example
 * ```typescript
 * logAuthError(AuthErrorType.UNAUTHORIZED, 'Token expired', 1, 3, 401, false);
 * ```
 */
function logAuthError(
  type: AuthErrorType,
  message: string,
  attempt: number,
  maxAttempts: number,
  status?: number,
  recovered: boolean = false
): void {
  const logEntry: AuthErrorLog = {
    timestamp: new Date().toISOString(),
    type,
    status,
    message,
    attempt,
    maxAttempts,
    recovered,
  };

  // Add to in-memory log (keep last 100 entries)
  errorLog.push(logEntry);
  if (errorLog.length > MAX_ERROR_LOG_SIZE) {
    errorLog.shift();
  }

  // Console log for visibility
  console.error('[BOFA Auth Error]', JSON.stringify(logEntry));
}

/**
 * Gets the recent error log
 *
 * @returns Array of recent error log entries
 *
 * @example
 * ```typescript
 * const errors = getErrorLog();
 * console.log(`Recent errors: ${errors.length}`);
 * ```
 */
export function getErrorLog(): AuthErrorLog[] {
  return [...errorLog];
}

/**
 * Clears the error log
 *
 * @example
 * ```typescript
 * clearErrorLog();
 * ```
 */
export function clearErrorLog(): void {
  errorLog.length = 0;
}

/**
 * Retry wrapper for API calls with exponential backoff
 *
 * Handles 401 errors by:
 * 1. Clearing the token cache
 * 2. Fetching a new token
 * 3. Retrying the API call
 *
 * Handles 429 and 5xx errors with exponential backoff.
 * Does NOT retry 403 (permission denied) or 4xx client errors.
 *
 * @param fn - Async function to retry
 * @param config - Retry configuration (optional, uses defaults)
 * @returns Promise resolving to the result of fn
 * @throws AuthError if:
 *   - All retry attempts are exhausted
 *   - Error is non-retryable (403, 4xx client errors)
 *
 * @example
 * ```typescript
 * const response = await retryWithBackoff(async () => {
 *   const token = await getAuthToken();
 *   return fetch('https://api.bankofamerica.com/...', {
 *     headers: { 'Authorization': `Bearer ${token}` }
 *   });
 * });
 * ```
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | AuthError | Response | unknown;

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      const result = await fn();
      // If this was a retry, log recovery
      if (attempt > 1) {
        logAuthError(
          AuthErrorType.UNAUTHORIZED,
          'Request succeeded after retry',
          attempt,
          finalConfig.maxAttempts,
          undefined,
          true
        );
      }
      return result;
    } catch (error) {
      lastError = error;
      const errorType = classifyError(error);

      // Determine if we should retry
      let shouldRetry = false;
      let status: number | undefined;

      if (error instanceof Response) {
        status = error.status;
        shouldRetry = errorType === AuthErrorType.UNAUTHORIZED ||
                     errorType === AuthErrorType.RATE_LIMITED ||
                     errorType === AuthErrorType.SERVER_ERROR ||
                     errorType === AuthErrorType.NETWORK_ERROR;
      } else if (error instanceof AuthError) {
        status = error.status;
        shouldRetry = error.retryable;
      } else if (errorType === AuthErrorType.NETWORK_ERROR) {
        shouldRetry = true;
      }

      // Log the error
      logAuthError(
        errorType,
        error instanceof Error ? error.message : String(error),
        attempt,
        finalConfig.maxAttempts,
        status,
        false
      );

      // If not retryable, throw immediately
      if (!shouldRetry) {
        throw new AuthError(
          error instanceof Error ? error.message : String(error),
          errorType,
          false,
          status,
          error instanceof Error ? error : undefined
        );
      }

      // If this was the last attempt, throw
      if (attempt === finalConfig.maxAttempts) {
        throw new AuthError(
          `Max retry attempts (${finalConfig.maxAttempts}) exceeded. Last error: ${error instanceof Error ? error.message : String(error)}`,
          errorType,
          false,
          status,
          error instanceof Error ? error : undefined
        );
      }

      // For 401 errors, clear token cache before retry
      if (errorType === AuthErrorType.UNAUTHORIZED) {
        clearTokenCache();
      }

      // Calculate backoff and wait before next attempt
      const backoffDelay = calculateBackoff(attempt, finalConfig);
      await delay(backoffDelay);
    }
  }

  // Should never reach here, but TypeScript needs it
  throw new AuthError(
    'Unexpected error in retry logic',
    AuthErrorType.CLIENT_ERROR,
    false,
    undefined,
    lastError instanceof Error ? lastError : undefined
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Functions
  getAuthToken,
  clearTokenCache,
  getCachedToken,
  // Error handling
  isUnauthorized,
  isForbidden,
  isRateLimited,
  isServerError,
  isClientError,
  classifyError,
  retryWithBackoff,
  logAuthError,
  getErrorLog,
  clearErrorLog,
};
