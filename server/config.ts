/**
 * Server Configuration
 *
 * Central configuration for environment variables and service endpoints.
 * Validates required environment variables at startup and exports typed config.
 *
 * @module config
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * BOFA configuration from environment
 */
interface BOFAConfig {
  /** OAuth token endpoint URL */
  tokenUrl: string;
  /** Egress IP range for Cloud NAT whitelisting */
  egressIpRange: string;
}

/**
 * GCP configuration from environment
 */
interface GCPConfig {
  /** Project ID for Secret Manager and other GCP services */
  projectId: string;
}

/**
 * Complete application configuration
 */
interface AppConfig {
  /** Google Cloud Platform settings */
  gcp: GCPConfig;
  /** Bank of America CashPro settings */
  bofa: BOFAConfig;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validates required environment variable is set
 *
 * @param name - Environment variable name
 * @param value - Environment variable value
 * @throws Error if value is missing
 */
function requireEnv(name: string, value?: string): string {
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
}

/**
 * Validates IP CIDR range format
 *
 * @param cidr - CIDR notation string (e.g., "35.190.0.0/18")
 * @throws Error if CIDR format is invalid
 */
function validateCidr(cidr: string): void {
  const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
  if (!cidrRegex.test(cidr)) {
    throw new Error(`Invalid CIDR format: ${cidr}`);
  }

  const [ipPart, prefixPart] = cidr.split('/');
  const prefix = parseInt(prefixPart, 10);

  if (prefix < 0 || prefix > 32) {
    throw new Error(`Invalid CIDR prefix length: ${prefix} (must be 0-32)`);
  }

  const octets = ipPart.split('.');
  for (const octet of octets) {
    const value = parseInt(octet, 10);
    if (value < 0 || value > 255) {
      throw new Error(`Invalid IP address octet: ${octet} (must be 0-255)`);
    }
  }
}

// ============================================================================
// BOFA ENDPOINTS
// ============================================================================

/**
 * BOFA CashPro API endpoints
 *
 * NOTE: Bank of America requires static IP whitelisting for API access.
 * The application must use Cloud NAT with the egress IP range below.
 * Add this range to your BOFA developer portal IP whitelist before going to production.
 *
 * Egress IP Range: 35.190.0.0/18
 * - This is the us-central1 region Cloud NAT IP range
 * - BOFA will reject requests from non-whitelisted IPs
 * - For production, work with BOFA to add your specific static IPs
 *
 * Documentation: https://developer.bankofamerica.com/docs/ip-whitelisting
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
// CONFIGURATION
// ============================================================================

/**
 * Loads and validates configuration from environment
 *
 * @throws Error if required environment variables are missing
 * @returns Validated application configuration
 *
 * @example
 * ```typescript
 * import { config } from './config';
 *
 * console.log(`GCP Project: ${config.gcp.projectId}`);
 * console.log(`BOFA Token URL: ${config.bofa.tokenUrl}`);
 * ```
 */
function loadConfig(): AppConfig {
  // Validate GCP configuration
  const gcp: GCPConfig = {
    projectId: requireEnv('GOOGLE_CLOUD_PROJECT', process.env.GOOGLE_CLOUD_PROJECT),
  };

  // Validate BOFA configuration
  const tokenUrl = process.env.BOFA_TOKEN_URL || BOFA_ENDPOINTS.AUTH;
  const egressIpRange = requireEnv('BOFA_EGRESS_IP_RANGE', process.env.BOFA_EGRESS_IP_RANGE);

  // Validate CIDR format
  validateCidr(egressIpRange);

  const bofa: BOFAConfig = {
    tokenUrl,
    egressIpRange,
  };

  return { gcp, bofa };
}

/**
 * Application configuration singleton
 *
 * Initialized at server startup. Throws error if environment is invalid.
 */
export const config = loadConfig();

// ============================================================================
// EXPORTS
// ============================================================================

export default config;
