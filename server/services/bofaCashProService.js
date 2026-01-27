var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// services/bofaSecretManager.ts
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
function getSecretManagerClient() {
  return new SecretManagerServiceClient();
}
function getProjectId() {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT;
  if (!projectId) {
    throw new Error("GOOGLE_CLOUD_PROJECT environment variable is not set");
  }
  return projectId;
}
function buildSecretPath(projectId, secretName, version = "latest") {
  return `projects/${projectId}/secrets/${secretName}/versions/${version}`;
}
async function getSecret(name) {
  const projectId = getProjectId();
  const client = getSecretManagerClient();
  const secretPath = buildSecretPath(projectId, name);
  try {
    const [response] = await client.accessSecretVersion({
      name: secretPath
    });
    if (!response.payload) {
      throw new Error(`Secret payload is missing for: ${name}`);
    }
    if (!response.payload.data) {
      throw new Error(`Secret payload data is missing for: ${name}`);
    }
    return response.payload.data.toString("utf-8");
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to retrieve secret '${name}': ${error.message}`);
    }
    throw error;
  }
}
async function getBofaCredentials() {
  const clientId = await getSecret(BOFA_SECRET_NAMES.CLIENT_ID);
  const clientSecret = await getSecret(BOFA_SECRET_NAMES.CLIENT_SECRET);
  const tenantId = await getSecret(BOFA_SECRET_NAMES.TENANT_ID);
  return {
    clientId,
    clientSecret,
    tenantId,
    tokenUrl: BOFA_TOKEN_URL
  };
}
var BOFA_SECRET_NAMES, BOFA_TOKEN_URL;
var init_bofaSecretManager = __esm({
  "services/bofaSecretManager.ts"() {
    BOFA_SECRET_NAMES = {
      /** OAuth client ID secret name */
      CLIENT_ID: "bofa-client-id",
      /** OAuth client secret name */
      CLIENT_SECRET: "bofa-client-secret",
      /** Tenant ID secret name */
      TENANT_ID: "bofa-tenant-id"
    };
    BOFA_TOKEN_URL = "https://api.bankofamerica.com/auth/oauth/v2/token";
  }
});

// services/bofaAuthService.ts
var bofaAuthService_exports = {};
__export(bofaAuthService_exports, {
  AuthError: () => AuthError,
  AuthErrorType: () => AuthErrorType,
  classifyError: () => classifyError,
  clearErrorLog: () => clearErrorLog,
  clearTokenCache: () => clearTokenCache,
  default: () => bofaAuthService_default,
  getAuthToken: () => getAuthToken,
  getCachedToken: () => getCachedToken,
  getErrorLog: () => getErrorLog,
  isClientError: () => isClientError,
  isForbidden: () => isForbidden,
  isRateLimited: () => isRateLimited,
  isServerError: () => isServerError,
  isUnauthorized: () => isUnauthorized,
  retryWithBackoff: () => retryWithBackoff
});
async function getAuthToken() {
  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token;
  }
  if (tokenRequestPromise) {
    return tokenRequestPromise;
  }
  tokenRequestPromise = fetchNewToken();
  try {
    const token = await tokenRequestPromise;
    return token;
  } finally {
    tokenRequestPromise = null;
  }
}
async function fetchNewToken() {
  const credentials = await getBofaCredentials();
  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret
  });
  if (credentials.tenantId) {
    params.append("tenant_id", credentials.tenantId);
  }
  const response = await fetch(credentials.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json"
    },
    body: params.toString()
  });
  if (!response.ok) {
    throw new Error(
      `BOFA auth request failed: ${response.status} ${response.statusText}`
    );
  }
  let tokenResponse;
  try {
    tokenResponse = await response.json();
  } catch (error) {
    throw new Error("Failed to parse BOFA token response as JSON");
  }
  if (!tokenResponse.access_token) {
    throw new Error("BOFA token response missing access_token field");
  }
  const cacheExpirySeconds = Math.min(
    tokenResponse.expires_in || TOKEN_CACHE_TTL_SECONDS,
    TOKEN_CACHE_TTL_SECONDS
  );
  tokenCache = {
    token: tokenResponse.access_token,
    expiresAt: Date.now() + cacheExpirySeconds * 1e3
  };
  return tokenCache.token;
}
function clearTokenCache() {
  tokenCache = null;
}
function getCachedToken() {
  return tokenCache;
}
function isUnauthorized(response) {
  return response.status === 401;
}
function isForbidden(response) {
  return response.status === 403;
}
function isRateLimited(response) {
  return response.status === 429;
}
function isServerError(response) {
  return response.status >= 500;
}
function isClientError(response) {
  return response.status >= 400 && response.status < 500 && !isUnauthorized(response) && !isForbidden(response) && !isRateLimited(response);
}
function classifyError(error) {
  if (error instanceof Response) {
    if (isUnauthorized(error)) return "UNAUTHORIZED" /* UNAUTHORIZED */;
    if (isForbidden(error)) return "FORBIDDEN" /* FORBIDDEN */;
    if (isRateLimited(error)) return "RATE_LIMITED" /* RATE_LIMITED */;
    if (isServerError(error)) return "SERVER_ERROR" /* SERVER_ERROR */;
    if (isClientError(error)) return "CLIENT_ERROR" /* CLIENT_ERROR */;
  }
  if (error instanceof AuthError) {
    return error.type;
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes("network") || message.includes("fetch") || message.includes("econnrefused")) {
      return "NETWORK_ERROR" /* NETWORK_ERROR */;
    }
  }
  return "CLIENT_ERROR" /* CLIENT_ERROR */;
}
function calculateBackoff(attempt, config) {
  const exponentialDelay = config.initialBackoffMs * Math.pow(config.backoffMultiplier, attempt - 1);
  return Math.min(exponentialDelay, config.maxBackoffMs);
}
function delay(ms) {
  return new Promise((resolve) => process.nextTick(resolve));
}
function logAuthError(type, message, attempt, maxAttempts, status, recovered = false) {
  const logEntry = {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    type,
    status,
    message,
    attempt,
    maxAttempts,
    recovered
  };
  errorLog.push(logEntry);
  if (errorLog.length > MAX_ERROR_LOG_SIZE) {
    errorLog.shift();
  }
  console.error("[BOFA Auth Error]", JSON.stringify(logEntry));
}
function getErrorLog() {
  return [...errorLog];
}
function clearErrorLog() {
  errorLog.length = 0;
}
async function retryWithBackoff(fn, config = {}) {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError;
  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      const result = await fn();
      if (attempt > 1) {
        logAuthError(
          "UNAUTHORIZED" /* UNAUTHORIZED */,
          "Request succeeded after retry",
          attempt,
          finalConfig.maxAttempts,
          void 0,
          true
        );
      }
      return result;
    } catch (error) {
      lastError = error;
      const errorType = classifyError(error);
      let shouldRetry = false;
      let status;
      if (error instanceof Response) {
        status = error.status;
        shouldRetry = errorType === "UNAUTHORIZED" /* UNAUTHORIZED */ || errorType === "RATE_LIMITED" /* RATE_LIMITED */ || errorType === "SERVER_ERROR" /* SERVER_ERROR */ || errorType === "NETWORK_ERROR" /* NETWORK_ERROR */;
      } else if (error instanceof AuthError) {
        status = error.status;
        shouldRetry = error.retryable;
      } else if (errorType === "NETWORK_ERROR" /* NETWORK_ERROR */) {
        shouldRetry = true;
      }
      logAuthError(
        errorType,
        error instanceof Error ? error.message : String(error),
        attempt,
        finalConfig.maxAttempts,
        status,
        false
      );
      if (!shouldRetry) {
        throw new AuthError(
          error instanceof Error ? error.message : String(error),
          errorType,
          false,
          status,
          error instanceof Error ? error : void 0
        );
      }
      if (attempt === finalConfig.maxAttempts) {
        throw new AuthError(
          `Max retry attempts (${finalConfig.maxAttempts}) exceeded. Last error: ${error instanceof Error ? error.message : String(error)}`,
          errorType,
          false,
          status,
          error instanceof Error ? error : void 0
        );
      }
      if (errorType === "UNAUTHORIZED" /* UNAUTHORIZED */) {
        clearTokenCache();
      }
      const backoffDelay = calculateBackoff(attempt, finalConfig);
      await delay(backoffDelay);
    }
  }
  throw new AuthError(
    "Unexpected error in retry logic",
    "CLIENT_ERROR" /* CLIENT_ERROR */,
    false,
    void 0,
    lastError instanceof Error ? lastError : void 0
  );
}
var AuthErrorType, AuthError, TOKEN_CACHE_TTL_SECONDS, TOKEN_CACHE_TTL_MS, DEFAULT_RETRY_CONFIG, errorLog, MAX_ERROR_LOG_SIZE, tokenCache, tokenRequestPromise, bofaAuthService_default;
var init_bofaAuthService = __esm({
  "services/bofaAuthService.ts"() {
    init_bofaSecretManager();
    AuthErrorType = /* @__PURE__ */ ((AuthErrorType2) => {
      AuthErrorType2["UNAUTHORIZED"] = "UNAUTHORIZED";
      AuthErrorType2["FORBIDDEN"] = "FORBIDDEN";
      AuthErrorType2["RATE_LIMITED"] = "RATE_LIMITED";
      AuthErrorType2["SERVER_ERROR"] = "SERVER_ERROR";
      AuthErrorType2["CLIENT_ERROR"] = "CLIENT_ERROR";
      AuthErrorType2["NETWORK_ERROR"] = "NETWORK_ERROR";
      return AuthErrorType2;
    })(AuthErrorType || {});
    AuthError = class extends Error {
      constructor(message, type, retryable, status, cause) {
        super(message);
        this.name = "AuthError";
        this.type = type;
        this.retryable = retryable;
        this.status = status;
        this.cause = cause;
      }
    };
    TOKEN_CACHE_TTL_SECONDS = 3300;
    TOKEN_CACHE_TTL_MS = TOKEN_CACHE_TTL_SECONDS * 1e3;
    DEFAULT_RETRY_CONFIG = {
      maxAttempts: 3,
      initialBackoffMs: 1e3,
      // 1 second
      backoffMultiplier: 2,
      maxBackoffMs: 1e4
      // 10 seconds
    };
    errorLog = [];
    MAX_ERROR_LOG_SIZE = 100;
    tokenCache = null;
    tokenRequestPromise = null;
    bofaAuthService_default = {
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
      clearErrorLog
    };
  }
});

// services/bofaCashProService.ts
var BOFA_ENDPOINTS = {
  /** OAuth token endpoint */
  AUTH: "https://api.bankofamerica.com/auth/oauth/v2/token",
  /** ACH origination endpoint */
  ACH_ORIGINATION: "https://api.bankofamerica.com/achs/v1/payments",
  /** Account validation endpoint */
  ACCOUNT_VALIDATION: "https://api.bankofamerica.com/achs/v1/accounts/validate",
  /** Payment status endpoint */
  PAYMENT_STATUS: "https://api.bankofamerica.com/achs/v1/payments",
  /** Balance inquiry endpoint */
  BALANCE: "https://api.bankofamerica.com/accounts/v1/balances"
};
async function getAuthToken2() {
  const { getAuthToken: fetchToken } = await Promise.resolve().then(() => (init_bofaAuthService(), bofaAuthService_exports));
  return fetchToken();
}
async function validateAccount(request) {
  const { routingNumber, accountNumber, accountType } = request;
  if (!isValidRoutingNumberFormat(routingNumber)) {
    return {
      valid: false,
      routingNumberValid: false,
      accountNumberValid: false,
      accountStatus: "invalid",
      bankName: ""
    };
  }
  if (!isValidRoutingNumberChecksum(routingNumber)) {
    return {
      valid: false,
      routingNumberValid: false,
      accountNumberValid: false,
      accountStatus: "invalid",
      bankName: ""
    };
  }
  if (!isValidAccountNumberFormat(accountNumber)) {
    return {
      valid: false,
      routingNumberValid: true,
      accountNumberValid: false,
      accountStatus: "invalid",
      bankName: ""
    };
  }
  const { retryWithBackoff: retryWithBackoff2 } = await Promise.resolve().then(() => (init_bofaAuthService(), bofaAuthService_exports));
  try {
    const apiResponse = await retryWithBackoff2(async () => {
      const token = await getAuthToken2();
      const response = await fetch(BOFA_ENDPOINTS.ACCOUNT_VALIDATION, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          routingNumber,
          accountNumber,
          accountType
        })
      });
      if (!response.ok) {
        throw response;
      }
      return response;
    });
    const result = await apiResponse.json();
    return {
      valid: result.valid ?? false,
      routingNumberValid: result.routingNumberValid ?? true,
      accountNumberValid: result.accountNumberValid ?? result.valid ?? false,
      accountStatus: result.accountStatus ?? "invalid",
      bankName: result.bankName ?? "Unknown Bank"
    };
  } catch (error) {
    throw error;
  }
}
function isValidRoutingNumberFormat(routingNumber) {
  if (routingNumber.length !== 9) {
    return false;
  }
  return /^\d+$/.test(routingNumber);
}
function isValidRoutingNumberChecksum(routingNumber) {
  const digits = routingNumber.split("").map((d) => parseInt(d, 10));
  const sum = digits[0] * 3 + digits[1] * 7 + digits[2] * 1 + digits[3] * 3 + digits[4] * 7 + digits[5] * 1 + digits[6] * 3 + digits[7] * 7;
  const checksum = (10 - sum % 10) % 10;
  return checksum === digits[8];
}
function isValidAccountNumberFormat(accountNumber) {
  if (!accountNumber || accountNumber.length === 0) {
    return false;
  }
  return /^[a-zA-Z0-9]+$/.test(accountNumber);
}
async function submitACHFile(request) {
  const { nachaFileContent, fileName, effectiveDate, customerReference } = request;
  if (!nachaFileContent || nachaFileContent.length === 0) {
    throw new Error("NACHA file content is empty");
  }
  const lines = nachaFileContent.split(/\r?\n/).filter((line) => line.length > 0);
  const hasValidRecordLength = lines.some((line) => line.length === 94);
  if (!hasValidRecordLength && lines.length > 0) {
    console.warn("[submitACHFile] NACHA file may have non-standard record lengths");
  }
  const { retryWithBackoff: retryWithBackoff2 } = await Promise.resolve().then(() => (init_bofaAuthService(), bofaAuthService_exports));
  try {
    const apiResponse = await retryWithBackoff2(async () => {
      const token = await getAuthToken2();
      const response = await fetch(BOFA_ENDPOINTS.ACH_ORIGINATION, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          nachaFileContent,
          fileName,
          effectiveDate,
          customerReference
        })
      });
      if (!response.ok) {
        throw response;
      }
      return response;
    });
    const result = await apiResponse.json();
    return {
      submissionId: result.submissionId || "",
      status: result.status || "pending_review",
      receivedTimestamp: result.receivedTimestamp || (/* @__PURE__ */ new Date()).toISOString(),
      bofaReference: result.bofaReference || ""
    };
  } catch (error) {
    throw error;
  }
}
async function getPaymentStatus(submissionId) {
  throw new Error("getPaymentStatus: Not implemented yet - scheduled for Phase 5");
}
async function getBalance(accountId) {
  throw new Error("getBalance: Not implemented yet - scheduled for Phase 6");
}
var bofaCashProService_default = {
  // Constants
  endpoints: BOFA_ENDPOINTS,
  // Functions
  getAuthToken: getAuthToken2,
  validateAccount,
  submitACHFile,
  getPaymentStatus,
  getBalance
};
export {
  BOFA_ENDPOINTS,
  bofaCashProService_default as default,
  getAuthToken2 as getAuthToken,
  getBalance,
  getPaymentStatus,
  submitACHFile,
  validateAccount
};
