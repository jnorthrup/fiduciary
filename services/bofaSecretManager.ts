/**
 * BOFA Secret Manager Integration
 *
 * Provides interface to Google Secret Manager for BOFA OAuth credentials.
 * Implements secure credential retrieval for Bank of America CashPro API integration.
 *
 * Track: bofa_cashpro_20260123
 * Phase: 1.2 Google Secret Manager Setup
 *
 * Secrets stored in GCP Secret Manager:
 * - bofa-client-id: BOFA OAuth client ID
 * - bofa-client-secret: BOFA OAuth client secret
 * - bofa-tenant-id: BOFA tenant ID for API access
 *
 * @module bofaSecretManager
 */

import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import type { BOFAAuthConfig } from './bofaCashProService';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Secret payload response from Secret Manager
 */
interface SecretPayload {
  /** Secret data as buffer */
  data: Buffer;
}

/**
 * Secret version response from Secret Manager API
 */
interface SecretVersionResponse {
  /** Secret payload containing the secret value */
  payload?: SecretPayload;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Secret names in GCP Secret Manager
 */
export const BOFA_SECRET_NAMES = {
  /** OAuth client ID secret name */
  CLIENT_ID: 'bofa-client-id',
  /** OAuth client secret name */
  CLIENT_SECRET: 'bofa-client-secret',
  /** Tenant ID secret name */
  TENANT_ID: 'bofa-tenant-id',
} as const;

/**
 * BOFA OAuth token endpoint URL
 */
const BOFA_TOKEN_URL = 'https://api.bankofamerica.com/auth/oauth/v2/token';

// ============================================================================
// SECRET MANAGER CLIENT
// ============================================================================

/**
 * Gets or creates the Secret Manager client instance
 *
 * @returns Secret Manager Service Client
 *
 * @example
 * ```typescript
 * const client = getSecretManagerClient();
 * const [version] = await client.accessSecretVersion({ name: '...' });
 * ```
 */
function getSecretManagerClient(): SecretManagerServiceClient {
  return new SecretManagerServiceClient();
}

/**
 * Gets the GCP project ID from environment variable
 *
 * @returns Project ID string
 * @throws Error if GOOGLE_CLOUD_PROJECT env var is not set
 *
 * @example
 * ```typescript
 * const projectId = getProjectId(); // 'fiduciary-prod'
 * ```
 */
function getProjectId(): string {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT;

  if (!projectId) {
    throw new Error('GOOGLE_CLOUD_PROJECT environment variable is not set');
  }

  return projectId;
}

/**
 * Builds the full secret name path for Secret Manager API
 *
 * @param projectId - GCP project ID
 * @param secretName - Short name of the secret
 * @param version - Secret version (default: 'latest')
 * @returns Full secret resource path
 *
 * @example
 * ```typescript
 * const path = buildSecretPath('fiduciary-prod', 'bofa-client-id');
 * // 'projects/fiduciary-prod/secrets/bofa-client-id/versions/latest'
 * ```
 */
function buildSecretPath(
  projectId: string,
  secretName: string,
  version: string = 'latest'
): string {
  return `projects/${projectId}/secrets/${secretName}/versions/${version}`;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Retrieves a secret from Google Secret Manager
 *
 * @param name - Secret name (short form, e.g., 'bofa-client-id')
 * @returns Promise resolving to secret value as string
 * @throws Error if:
 *   - GOOGLE_CLOUD_PROJECT env var is not set
 *   - Secret does not exist (404)
 *   - Secret payload is missing or malformed
 *
 * @example
 * ```typescript
 * const clientId = await getSecret('bofa-client-id');
 * console.log(`Client ID: ${clientId}`);
 * ```
 */
export async function getSecret(name: string): Promise<string> {
  const projectId = getProjectId();
  const client = getSecretManagerClient();
  const secretPath = buildSecretPath(projectId, name);

  try {
    const [response] = await client.accessSecretVersion({
      name: secretPath,
    });

    if (!response.payload) {
      throw new Error(`Secret payload is missing for: ${name}`);
    }

    if (!response.payload.data) {
      throw new Error(`Secret payload data is missing for: ${name}`);
    }

    return response.payload.data.toString('utf-8');
  } catch (error) {
    if (error instanceof Error) {
      // Enhance error message with context
      throw new Error(`Failed to retrieve secret '${name}': ${error.message}`);
    }
    throw error;
  }
}

/**
 * Retrieves all BOFA credentials from Secret Manager
 *
 * Retrieves three secrets in order:
 * 1. bofa-client-id - OAuth client ID
 * 2. bofa-client-secret - OAuth client secret
 * 3. bofa-tenant-id - Tenant ID for multi-tenant API access
 *
 * @returns Promise resolving to BOFA authentication configuration
 * @throws Error if:
 *   - GOOGLE_CLOUD_PROJECT env var is not set
 *   - Any of the three secrets are missing (404)
 *
 * @example
 * ```typescript
 * const credentials = await getBofaCredentials();
 *
 * // Use credentials for OAuth flow
 * const token = await getAuthToken(credentials);
 * ```
 */
export async function getBofaCredentials(): Promise<BOFAAuthConfig> {
  // Retrieve all three secrets sequentially
  // Using sequential calls to avoid partial credential issues
  const clientId = await getSecret(BOFA_SECRET_NAMES.CLIENT_ID);
  const clientSecret = await getSecret(BOFA_SECRET_NAMES.CLIENT_SECRET);
  const tenantId = await getSecret(BOFA_SECRET_NAMES.TENANT_ID);

  return {
    clientId,
    clientSecret,
    tenantId,
    tokenUrl: BOFA_TOKEN_URL,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Constants
  secretNames: BOFA_SECRET_NAMES,
  // Functions
  getSecret,
  getBofaCredentials,
};
