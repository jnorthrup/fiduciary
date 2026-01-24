/**
 * Mock for @google-cloud/secret-manager
 *
 * This mock provides:
 * - SecretManagerServiceClient constructor
 * - accessSecretVersion method
 * - Helper functions for tests to control mock behavior
 */

import { vi } from 'vitest';

// Create the mock function for tests to control
export const mockAccessSecretVersion = vi.fn();

// Mock the SecretManagerServiceClient as a proper class
export class SecretManagerServiceClient {
  accessSecretVersion = mockAccessSecretVersion;
}
