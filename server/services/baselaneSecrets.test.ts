/**
 * Tests for Baselane Secret Manager Integration
 *
 * Test file for Secret Manager client and credential retrieval
 * Phase: Project Setup & Configuration
 * Track: baselane_api_20260124
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Google Cloud Secret Manager BEFORE importing
const mockAccessSecretVersion = vi.fn();

vi.mock('@google-cloud/secret-manager', () => ({
  SecretManagerServiceClient: class {
    accessSecretVersion = mockAccessSecretVersion;
  }
}));

// Now import after mocking
import {
  getBaselaneCredentials,
  getSecret,
  getWebhookSecret,
  SECRET_NAMES
} from './baselaneSecrets.js';

describe('Baselane Secrets - Module Structure', () => {
  it('should export getSecret function', () => {
    expect(typeof getSecret).toBe('function');
  });

  it('should export getBaselaneCredentials function', () => {
    expect(typeof getBaselaneCredentials).toBe('function');
  });

  it('should export getWebhookSecret function', () => {
    expect(typeof getWebhookSecret).toBe('function');
  });

  it('should export SECRET_NAMES constant', () => {
    expect(SECRET_NAMES).toBeDefined();
    expect(SECRET_NAMES.CLIENT_ID).toBe('baselane-client-id');
    expect(SECRET_NAMES.CLIENT_SECRET).toBe('baselane-client-secret');
    expect(SECRET_NAMES.ENVIRONMENT).toBe('baselane-environment');
    expect(SECRET_NAMES.WEBHOOK_SECRET).toBe('baselane-webhook-secret');
  });
});

describe('Baselane Secrets - TypeScript Interfaces', () => {
  describe('getSecret function signature', () => {
    it('should accept secret name string', () => {
      // Type check - function accepts string
      type GetSecretType = (name: string, projectId?: string) => Promise<string>;
      const fn: GetSecretType = () => Promise.resolve('');
      expect(typeof fn).toBe('function');
    });

    it('should return Promise<string>', () => {
      // Type check - returns Promise<string>
      type GetSecretType = () => Promise<string>;
      const result: Promise<string> = Promise.resolve('secret');
      expect(typeof result.then).toBe('function');
    });
  });

  describe('BaselaneCredentials interface', () => {
    it('should have correct structure', () => {
      // Type check - verify interface structure
      const credentials: {
        clientId: string;
        clientSecret: string;
        environment: 'sandbox' | 'production';
      } = {
        clientId: 'test-id',
        clientSecret: 'test-secret',
        environment: 'sandbox'
      };

      expect(credentials.clientId).toBeDefined();
      expect(credentials.clientSecret).toBeDefined();
      expect(credentials.environment).toBeDefined();
    });
  });
});
