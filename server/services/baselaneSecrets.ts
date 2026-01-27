/**
 * Baselane Secret Manager Integration
 *
 * Google Secret Manager client for Baselane credentials
 * Track: baselane_api_20260124
 *
 * This module provides functions to retrieve Baselane API credentials
 * from Google Cloud Secret Manager.
 */

import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Baselane credentials from Secret Manager
 */
export interface BaselaneCredentials {
  clientId: string;
  clientSecret: string;
  environment: 'sandbox' | 'production';
}

// ============================================================================
// SECRET NAMES
// ============================================================================

/**
 * Secret names in Google Secret Manager
 */
const SECRET_NAMES = {
  CLIENT_ID: 'baselane-client-id',
  CLIENT_SECRET: 'baselane-client-secret',
  ENVIRONMENT: 'baselane-environment',
  WEBHOOK_SECRET: 'baselane-webhook-secret'
} as const;

// ============================================================================
// SECRET MANAGER CLIENT
// ============================================================================

/**
 * Get the Secret Manager client instance
 *
 * Creates a singleton client for Secret Manager operations.
 * Client is initialized on first use.
 */
let secretManagerClient: SecretManagerServiceClient | null = null;

function getClient(): SecretManagerServiceClient {
  if (!secretManagerClient) {
    secretManagerClient = new SecretManagerServiceClient();
  }
  return secretManagerClient;
}

/**
 * Get the full secret name path for Google Secret Manager
 *
 * @param secretName - The short name of the secret
 * @param projectId - The Google Cloud project ID
 * @returns Full secret name path
 */
function getSecretPath(secretName: string, projectId: string): string {
  return `projects/${projectId}/secrets/${secretName}/versions/latest`;
}

// ============================================================================
// SECRET RETRIEVAL FUNCTIONS
// ============================================================================

/**
 * Retrieve a secret value from Google Secret Manager
 *
 * @param secretName - The short name of the secret (e.g., 'baselane-client-id')
 * @param projectId - The Google Cloud project ID (defaults to process.env.GOOGLE_CLOUD_PROJECT)
 * @returns Promise resolving to the secret value as a string
 * @throws Error if secret retrieval fails
 */
export async function getSecret(
  secretName: string,
  projectId?: string
): Promise<string> {
  const client = getClient();
  const project = projectId || process.env.GOOGLE_CLOUD_PROJECT;

  if (!project) {
    throw new Error('Google Cloud project ID not configured. Set GOOGLE_CLOUD_PROJECT environment variable.');
  }

  const name = getSecretPath(secretName, project);

  try {
    const [version] = await client.accessSecretVersion({ name });

    if (!version?.payload?.data) {
      throw new Error(`Secret ${secretName} has no payload data`);
    }

    // Decode the base64-encoded secret value
    const secretValue = Buffer.from(version.payload.data as string, 'base64').toString('utf-8');

    return secretValue;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to retrieve secret ${secretName}: ${errorMessage}`);
  }
}

/**
 * Retrieve all Baselane credentials from Google Secret Manager
 *
 * Fetches clientId, clientSecret, and environment from Secret Manager.
 * Uses environment variable fallbacks for local development.
 *
 * @param projectId - The Google Cloud project ID (optional)
 * @returns Promise resolving to Baselane credentials
 * @throws Error if required credentials are missing
 */
export async function getBaselaneCredentials(
  projectId?: string
): Promise<BaselaneCredentials> {
  try {
    // Try to get credentials from Secret Manager
    const clientId = await getSecret(SECRET_NAMES.CLIENT_ID, projectId);
    const clientSecret = await getSecret(SECRET_NAMES.CLIENT_SECRET, projectId);

    // Environment defaults to 'sandbox' if not set
    let environment: 'sandbox' | 'production' = 'sandbox';

    try {
      const envValue = await getSecret(SECRET_NAMES.ENVIRONMENT, projectId);
      environment = envValue === 'production' ? 'production' : 'sandbox';
    } catch {
      // Environment secret is optional, default to sandbox
      environment = process.env.BASELANE_ENVIRONMENT === 'production' ? 'production' : 'sandbox';
    }

    return {
      clientId,
      clientSecret,
      environment
    };
  } catch (error) {
    // For local development, fall back to environment variables
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      const clientId = process.env.BASELANE_CLIENT_ID;
      const clientSecret = process.env.BASELANE_CLIENT_SECRET;
      const environment = process.env.BASELANE_ENVIRONMENT === 'production' ? 'production' : 'sandbox';

      if (!clientId || !clientSecret) {
        throw new Error(
          'Baselane credentials not found in Secret Manager or environment variables. ' +
          'Set BASELANE_CLIENT_ID and BASELANE_CLIENT_SECRET environment variables for local development.'
        );
      }

      return {
        clientId,
        clientSecret,
        environment
      };
    }

    throw error;
  }
}

/**
 * Get the webhook secret for signature validation
 *
 * @param projectId - The Google Cloud project ID (optional)
 * @returns Promise resolving to webhook secret
 */
export async function getWebhookSecret(projectId?: string): Promise<string> {
  try {
    return await getSecret(SECRET_NAMES.WEBHOOK_SECRET, projectId);
  } catch (error) {
    // Fallback to environment variable
    const webhookSecret = process.env.BASELANE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error(
        'Webhook secret not found. Set BASELANE_WEBHOOK_SECRET environment variable.'
      );
    }
    return webhookSecret;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export { SECRET_NAMES };
export default { getSecret, getBaselaneCredentials, getWebhookSecret };
