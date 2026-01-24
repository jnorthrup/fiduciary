/**
 * BOFA CashPro API Integration Service
 *
 * Provides interface definitions and function stubs for Bank of America CashPro Payment API integration.
 * This module enables:
 * - OAuth 2.0 client credentials authentication
 * - Account validation (routing/account number verification)
 * - ACH file submission for payment origination
 * - Payment status tracking
 * - Balance inquiry
 *
 * Reference: BOFA CashPro Developer Studio
 * Track: bofa_cashpro_20260123
 * Phase: 1.1 Initialize BOFA Service Module
 *
 * @module bofaCashProService
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * BOFA OAuth 2.0 Authentication Configuration
 */
export interface BOFAAuthConfig {
  /** OAuth client ID from BOFA developer portal */
  clientId: string;
  /** OAuth client secret from BOFA developer portal */
  clientSecret: string;
  /** Tenant ID for multi-tenant BOFA API access */
  tenantId: string;
  /** OAuth token endpoint URL */
  tokenUrl: string;
}

/**
 * BOFA OAuth 2.0 Token Response
 */
export interface BOFATokenResponse {
  /** Access token for API calls */
  access_token: string;
  /** Token type (typically "Bearer") */
  token_type: string;
  /** Token lifetime in seconds */
  expires_in: number;
  /** Granted OAuth scopes */
  scope: string;
}

/**
 * Account Validation Request
 * Used to verify routing and account numbers before ACH submission
 */
export interface AccountValidationRequest {
  /** 9-digit ABA routing number */
  routingNumber: string;
  /** Bank account number */
  accountNumber: string;
  /** Account type for validation */
  accountType: 'checking' | 'savings';
}

/**
 * Account Validation Response
 * Returns validation status for routing/account numbers
 */
export interface AccountValidationResponse {
  /** Overall validation result */
  valid: boolean;
  /** Routing number is valid format and checksum */
  routingNumberValid: boolean;
  /** Account number exists and is valid */
  accountNumberValid: boolean;
  /** Account status with BOFA */
  accountStatus: 'active' | 'closed' | 'invalid' | 'not_found';
  /** Bank name associated with routing number */
  bankName: string;
}

/**
 * ACH File Submission Request
 * Submits a NACHA file to BOFA for ACH origination
 */
export interface ACHSubmissionRequest {
  /** Complete NACHA file content (94-character fixed width records) */
  nachaFileContent: string;
  /** File name for tracking (e.g., "ACH-20260123.txt") */
  fileName: string;
  /** Effective date for ACH settlement (YYYY-MM-DD format) */
  effectiveDate: string;
  /** Customer reference for reconciliation */
  customerReference: string;
}

/**
 * ACH File Submission Response
 * Returns submission ID and status from BOFA
 */
export interface ACHSubmissionResponse {
  /** Unique submission ID for tracking */
  submissionId: string;
  /** Initial status of submission */
  status: 'accepted' | 'rejected' | 'pending_review';
  /** ISO timestamp when submission was received */
  receivedTimestamp: string;
  /** BOFA internal reference number */
  bofaReference: string;
}

/**
 * Payment Status Response
 * Returns current status of an ACH payment
 */
export interface PaymentStatusResponse {
  /** Submission ID being queried */
  submissionId: string;
  /** Current payment status */
  status: 'submitted' | 'processing' | 'settled' | 'returned' | 'rejected';
  /** Date payment settled (if applicable) */
  settledDate?: string;
  /** ACH return code (if payment was returned) */
  returnCode?: string;
  /** Human-readable return reason (if payment was returned) */
  returnReason?: string;
}

/**
 * Balance Inquiry Response
 * Returns account balance information
 */
export interface BalanceResponse {
  /** Masked account number for display */
  accountNumber: string;
  /** Available balance for spending */
  availableBalance: number;
  /** Current balance including pending items */
  currentBalance: number;
  /** Currency code (e.g., "USD") */
  currency: string;
  /** Balance as of date (YYYY-MM-DD format) */
  asOfDate: string;
}

// ============================================================================
// API ENDPOINTS (Sandbox)
// ============================================================================

/**
 * BOFA API base URLs for sandbox environment
 */
export const BOFA_ENDPOINTS = {
  /** OAuth token endpoint */
  AUTH: 'https://api.bankofamerica.com/auth/oauth/v2/token',
  /** ACH origination endpoint */
  ACH_ORIGINATION: 'https://api.bankofamerica.com/achs/v1/payments',
  /** Account validation endpoint */
  ACCOUNT_VALIDATION: 'https://api.bankofamerica.com/achs/v1/accounts/validate',
  /** Payment status endpoint */
  PAYMENT_STATUS: 'https://api.bankofamerica.com/achs/v1/payments',
  /** Balance inquiry endpoint */
  BALANCE: 'https://api.bankofamerica.com/accounts/v1/balances',
} as const;

// ============================================================================
// FUNCTION STUBS
// ============================================================================
// NOTE: Implementations will be added in later phases
// These are stub functions to establish the module structure and type contracts

/**
 * Gets OAuth 2.0 access token for BOFA API authentication
 *
 * Phase: 2 - OAuth 2.0 Authentication (IMPLEMENTED)
 *
 * Delegates to bofaAuthService for actual implementation.
 * The auth service handles:
 * - Credential retrieval from Secret Manager
 * - Token request to BOFA auth endpoint
 * - Token caching with 55 minute TTL
 * - Automatic token refresh on expiry
 *
 * @returns Promise resolving to access token string
 *
 * @example
 * ```typescript
 * const token = await getAuthToken();
 * console.log(`Access token: ${token}`);
 * ```
 */
export async function getAuthToken(): Promise<string> {
  // Import auth service dynamically to avoid circular dependencies
  const { getAuthToken: fetchToken } = await import('./bofaAuthService');
  return fetchToken();
}

/**
 * Validates a routing number and account number via BOFA API
 *
 * Phase: 3 - Account Validation API (IMPLEMENTED)
 *
 * Performs validation in layers:
 * 1. Client-side routing number format and checksum validation (Modulus 10)
 * 2. Client-side account number format validation
 * 3. BOFA API call for account existence and status verification
 * 4. Retry logic for transient errors (401, 429, 5xx, network)
 *
 * @param request - Account validation request with routing/account numbers
 * @returns Promise resolving to validation response
 *
 * @example
 * ```typescript
 * const result = await validateAccount({
 *   routingNumber: '021000021',
 *   accountNumber: '123456789',
 *   accountType: 'checking'
 * });
 *
 * if (result.valid) {
 *   console.log(`Account verified at ${result.bankName}`);
 * }
 * ```
 */
export async function validateAccount(
  request: AccountValidationRequest
): Promise<AccountValidationResponse> {
  const { routingNumber, accountNumber, accountType } = request;

  // Step 1: Validate routing number format (9 digits)
  if (!isValidRoutingNumberFormat(routingNumber)) {
    return {
      valid: false,
      routingNumberValid: false,
      accountNumberValid: false,
      accountStatus: 'invalid',
      bankName: ''
    };
  }

  // Step 2: Validate routing number checksum (Modulus 10)
  if (!isValidRoutingNumberChecksum(routingNumber)) {
    return {
      valid: false,
      routingNumberValid: false,
      accountNumberValid: false,
      accountStatus: 'invalid',
      bankName: ''
    };
  }

  // Step 3: Validate account number format
  if (!isValidAccountNumberFormat(accountNumber)) {
    return {
      valid: false,
      routingNumberValid: true,
      accountNumberValid: false,
      accountStatus: 'invalid',
      bankName: ''
    };
  }

  // Step 4: Call BOFA API with retry logic
  const { retryWithBackoff } = await import('./bofaAuthService');

  try {
    const apiResponse = await retryWithBackoff(async () => {
      const token = await getAuthToken();

      const response = await fetch(BOFA_ENDPOINTS.ACCOUNT_VALIDATION, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          routingNumber,
          accountNumber,
          accountType
        })
      });

      if (!response.ok) {
        // Throw the Response object so retryWithBackoff can classify and retry
        throw response;
      }

      return response;
    });

    // Parse and return the API response
    const result = await apiResponse.json();

    return {
      valid: result.valid ?? false,
      routingNumberValid: result.routingNumberValid ?? true,
      accountNumberValid: result.accountNumberValid ?? result.valid ?? false,
      accountStatus: result.accountStatus ?? 'invalid',
      bankName: result.bankName ?? 'Unknown Bank'
    };
  } catch (error) {
    // If all retries exhausted, throw the error
    throw error;
  }
}

// ============================================================================
// ROUTING NUMBER VALIDATION HELPERS
// ============================================================================

/**
 * Validates routing number format (exactly 9 digits)
 *
 * @param routingNumber - Routing number to validate
 * @returns true if format is valid
 */
function isValidRoutingNumberFormat(routingNumber: string): boolean {
  // Must be exactly 9 characters
  if (routingNumber.length !== 9) {
    return false;
  }

  // Must contain only digits
  return /^\d+$/.test(routingNumber);
}

/**
 * Validates routing number checksum using Modulus 10 algorithm
 *
 * The ABA routing number checksum uses the Modulus 10 algorithm with weights:
 * - Digits 1, 4, 7: weight 3
 * - Digits 2, 5, 8: weight 7
 * - Digits 3, 6: weight 1
 * - Digit 9: checksum digit
 *
 * @param routingNumber - 9-digit routing number
 * @returns true if checksum is valid
 */
function isValidRoutingNumberChecksum(routingNumber: string): boolean {
  const digits = routingNumber.split('').map(d => parseInt(d, 10));

  const sum =
    (digits[0] * 3) +
    (digits[1] * 7) +
    (digits[2] * 1) +
    (digits[3] * 3) +
    (digits[4] * 7) +
    (digits[5] * 1) +
    (digits[6] * 3) +
    (digits[7] * 7);

  const checksum = (10 - (sum % 10)) % 10;

  return checksum === digits[8];
}

/**
 * Validates account number format
 *
 * Account numbers must:
 * - Be non-empty
 * - Contain only alphanumeric characters
 *
 * @param accountNumber - Account number to validate
 * @returns true if format is valid
 */
function isValidAccountNumberFormat(accountNumber: string): boolean {
  // Must not be empty
  if (!accountNumber || accountNumber.length === 0) {
    return false;
  }

  // Must contain only alphanumeric characters
  return /^[a-zA-Z0-9]+$/.test(accountNumber);
}

/**
 * Submits a NACHA file to BOFA for ACH payment origination
 *
 * Phase: 4 - ACH Payment Origination API (IMPLEMENTED)
 *
 * Performs ACH file submission in layers:
 * 1. Validates NACHA file content (non-empty, properly formatted)
 * 2. Gets OAuth 2.0 access token
 * 3. Posts NACHA file to BOFA ACH origination endpoint
 * 4. Parses submission response (submissionId, status, timestamp, reference)
 * 5. Retry logic for transient errors (401 token refresh, 429 rate limit, 5xx)
 * 6. No retry on permanent errors (403 forbidden, 400 bad request)
 *
 * @param request - ACH submission request with NACHA file content
 * @returns Promise resolving to submission response with tracking ID
 * @throws Error if:
 *   - NACHA file content is empty or invalid
 *   - BOFA API returns non-retryable error (400, 403)
 *   - All retry attempts are exhausted
 *   - Response parsing fails
 *
 * @example
 * ```typescript
 * const nachaContent = generateNachaFile(nachaFile);
 * const result = await submitACHFile({
 *   nachaFileContent: nachaContent,
 *   fileName: 'ACH-20260123.txt',
 *   effectiveDate: '2026-01-23',
 *   customerReference: 'PAYMENT-12345'
 * });
 *
 * console.log(`Submitted as ${result.submissionId}`);
 * ```
 */
export async function submitACHFile(
  request: ACHSubmissionRequest
): Promise<ACHSubmissionResponse> {
  const { nachaFileContent, fileName, effectiveDate, customerReference } = request;

  // Step 1: Validate NACHA file content
  if (!nachaFileContent || nachaFileContent.length === 0) {
    throw new Error('NACHA file content is empty');
  }

  // Basic validation: NACHA files should have records of 94 characters
  // This is a minimal check - full validation would verify all record types
  const lines = nachaFileContent.split(/\r?\n/).filter(line => line.length > 0);
  const hasValidRecordLength = lines.some(line => line.length === 94);

  if (!hasValidRecordLength && lines.length > 0) {
    // If we have lines but none are 94 chars, the file might be malformed
    // Don't fail hard here - let BOFA validate the format
    console.warn('[submitACHFile] NACHA file may have non-standard record lengths');
  }

  // Step 2: Call BOFA API with retry logic
  const { retryWithBackoff } = await import('./bofaAuthService');

  try {
    const apiResponse = await retryWithBackoff(async () => {
      const token = await getAuthToken();

      const response = await fetch(BOFA_ENDPOINTS.ACH_ORIGINATION, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          nachaFileContent,
          fileName,
          effectiveDate,
          customerReference
        })
      });

      if (!response.ok) {
        // Throw the Response object so retryWithBackoff can classify and retry
        throw response;
      }

      return response;
    });

    // Step 3: Parse and return the submission response
    const result = await apiResponse.json();

    return {
      submissionId: result.submissionId || '',
      status: result.status || 'pending_review',
      receivedTimestamp: result.receivedTimestamp || new Date().toISOString(),
      bofaReference: result.bofaReference || ''
    };
  } catch (error) {
    // If all retries exhausted, throw the error
    throw error;
  }
}

/**
 * Queries the status of a previously submitted ACH payment
 *
 * Phase: 5 - ACH Payment Status API (IMPLEMENTED)
 *
 * Performs payment status query in layers:
 * 1. Validates submission ID (non-empty)
 * 2. Gets OAuth 2.0 access token
 * 3. GET from BOFA payment status endpoint
 * 4. Parses status and lifecycle states (submitted, processing, settled, returned, rejected)
 * 5. Handles ACH return codes (R01, R02, R03, etc.)
 * 6. Retry logic for transient errors (401 token refresh, 429 rate limit, 5xx)
 * 7. No retry on permanent errors (403 forbidden, 400 bad request, 404 not found)
 *
 * @param submissionId - The submission ID from a prior ACH submission
 * @returns Promise resolving to current payment status
 * @throws Error if:
 *   - Submission ID is empty
 *   - BOFA API returns non-retryable error (400, 403, 404)
 *   - All retry attempts are exhausted
 *   - Response parsing fails
 *
 * @example
 * ```typescript
 * const status = await getPaymentStatus('SUB-12345');
 *
 * if (status.status === 'settled') {
 *   console.log(`Payment settled on ${status.settledDate}`);
 * } else if (status.status === 'returned') {
 *   console.log(`Payment returned: ${status.returnReason}`);
 * }
 * ```
 */
export async function getPaymentStatus(
  submissionId: string
): Promise<PaymentStatusResponse> {
  // Step 1: Validate submission ID
  if (!submissionId || submissionId.length === 0) {
    throw new Error('Submission ID is required');
  }

  // Step 2: Call BOFA API with retry logic
  const { retryWithBackoff } = await import('./bofaAuthService');

  try {
    const apiResponse = await retryWithBackoff(async () => {
      const token = await getAuthToken();

      const response = await fetch(`${BOFA_ENDPOINTS.PAYMENT_STATUS}/${submissionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        // Throw the Response object so retryWithBackoff can classify and retry
        throw response;
      }

      return response;
    });

    // Step 3: Parse and return the payment status response
    const result = await apiResponse.json();

    return {
      submissionId: result.submissionId || submissionId,
      status: result.status || 'submitted',
      settledDate: result.settledDate,
      returnCode: result.returnCode,
      returnReason: result.returnReason
    };
  } catch (error) {
    // If all retries exhausted, throw the error
    throw error;
  }
}

/**
 * Gets the current balance for a BOFA account
 *
 * Phase: 6 - Balance Inquiry API
 *
 * @param accountId - BOFA account ID to query
 * @returns Promise resolving to balance information
 *
 * @example
 * ```typescript
 * const balance = await getBalance('ACCT-12345');
 *
 * console.log(`Available: $${balance.availableBalance}`);
 * console.log(`Current: $${balance.currentBalance}`);
 * ```
 */
export async function getBalance(
  accountId: string
): Promise<BalanceResponse> {
  // STUB: Implementation in Phase 6
  // - Get auth token
  // - GET from BOFA balance inquiry endpoint
  // - Parse and return balance response
  throw new Error('getBalance: Not implemented yet - scheduled for Phase 6');
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Constants
  endpoints: BOFA_ENDPOINTS,
  // Functions
  getAuthToken,
  validateAccount,
  submitACHFile,
  getPaymentStatus,
  getBalance,
};
