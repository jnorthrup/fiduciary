/**
 * BOFA Secret Manager Tests
 * Tests for Google Secret Manager integration for BOFA credentials
 *
 * Track: bofa_cashpro_20260123
 * Phase: 1.2 Google Secret Manager Setup
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getSecret,
  getBofaCredentials
} from './bofaSecretManager';
import type { BOFAAuthConfig } from './bofaCashProService';

// Mock the Secret Manager client
vi.mock('@google-cloud/secret-manager');

import { SecretManagerServiceClient, mockAccessSecretVersion } from '@google-cloud/secret-manager';

describe('bofaSecretManager', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getSecret', () => {
    it('retrieves secret successfully from Secret Manager', async () => {
      const secretName = 'bofa-client-id';
      const secretValue = 'test-client-id-12345';
      const projectId = 'fiduciary-prod';

      process.env.GOOGLE_CLOUD_PROJECT = projectId;

      // Mock successful Secret Manager response
      (mockAccessSecretVersion as any).mockResolvedValue([
        {
          payload: {
            data: Buffer.from(secretValue, 'utf-8')
          }
        }
      ]);

      const result = await getSecret(secretName);

      expect(result).toBe(secretValue);
      expect(mockAccessSecretVersion).toHaveBeenCalledTimes(1);
      expect(mockAccessSecretVersion).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.stringContaining(`projects/${projectId}/secrets/${secretName}`)
        })
      );
    });

    it('throws error when secret is not found (404)', async () => {
      const secretName = 'non-existent-secret';
      const projectId = 'fiduciary-prod';

      process.env.GOOGLE_CLOUD_PROJECT = projectId;

      // Mock 404 error from Secret Manager
      const error: any = new Error('Secret not found');
      error.code = 5; // NOT_FOUND status code in gRPC
      error.status = 404;

      (mockAccessSecretVersion as any).mockRejectedValue(error);

      await expect(getSecret(secretName)).rejects.toThrow('Secret not found');
      expect(mockAccessSecretVersion).toHaveBeenCalledTimes(1);
    });

    it('throws error when GOOGLE_CLOUD_PROJECT env var is missing', async () => {
      delete process.env.GOOGLE_CLOUD_PROJECT;

      await expect(getSecret('bofa-client-id')).rejects.toThrow('GOOGLE_CLOUD_PROJECT');
      expect(mockAccessSecretVersion).not.toHaveBeenCalled();
    });

    it('throws error when secret payload is missing', async () => {
      const secretName = 'bofa-client-id';
      const projectId = 'fiduciary-prod';

      process.env.GOOGLE_CLOUD_PROJECT = projectId;

      // Mock response with missing payload
      (mockAccessSecretVersion as any).mockResolvedValue([{}]);

      await expect(getSecret(secretName)).rejects.toThrow('Secret payload is missing');
    });

    it('throws error when secret payload data is missing', async () => {
      const secretName = 'bofa-client-id';
      const projectId = 'fiduciary-prod';

      process.env.GOOGLE_CLOUD_PROJECT = projectId;

      // Mock response with payload but no data
      (mockAccessSecretVersion as any).mockResolvedValue([
        { payload: {} }
      ]);

      await expect(getSecret(secretName)).rejects.toThrow('Secret payload data is missing');
    });

    it('handles secret with special characters', async () => {
      const secretName = 'bofa-client-secret';
      const secretValue = 'secret-with-special-chars-!@#$%^&*()';
      const projectId = 'fiduciary-prod';

      process.env.GOOGLE_CLOUD_PROJECT = projectId;

      (mockAccessSecretVersion as any).mockResolvedValue([
        {
          payload: {
            data: Buffer.from(secretValue, 'utf-8')
          }
        }
      ]);

      const result = await getSecret(secretName);

      expect(result).toBe(secretValue);
    });

    it('uses "latest" version for secret retrieval', async () => {
      const secretName = 'bofa-client-id';
      const secretValue = 'test-client-id-12345';
      const projectId = 'fiduciary-prod';

      process.env.GOOGLE_CLOUD_PROJECT = projectId;

      (mockAccessSecretVersion as any).mockResolvedValue([
        {
          payload: {
            data: Buffer.from(secretValue, 'utf-8')
          }
        }
      ]);

      await getSecret(secretName);

      expect(mockAccessSecretVersion).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.stringMatching(/\/versions\/latest$/)
        })
      );
    });
  });

  describe('getBofaCredentials', () => {
    it('retrieves all BOFA credentials successfully', async () => {
      const projectId = 'fiduciary-prod';

      process.env.GOOGLE_CLOUD_PROJECT = projectId;

      // Mock all three secrets
      (mockAccessSecretVersion as any)
        .mockResolvedValueOnce([
          {
            payload: { data: Buffer.from('test-client-id-abc123', 'utf-8') }
          }
        ])
        .mockResolvedValueOnce([
          {
            payload: { data: Buffer.from('test-client-secret-xyz789', 'utf-8') }
          }
        ])
        .mockResolvedValueOnce([
          {
            payload: { data: Buffer.from('test-tenant-id-456', 'utf-8') }
          }
        ]);

      const credentials = await getBofaCredentials();

      expect(credentials).toEqual({
        clientId: 'test-client-id-abc123',
        clientSecret: 'test-client-secret-xyz789',
        tenantId: 'test-tenant-id-456',
        tokenUrl: 'https://api.bankofamerica.com/auth/oauth/v2/token'
      } satisfies BOFAAuthConfig);

      expect(mockAccessSecretVersion).toHaveBeenCalledTimes(3);
    });

    it('throws error when bofa-client-id is missing', async () => {
      const projectId = 'fiduciary-prod';

      process.env.GOOGLE_CLOUD_PROJECT = projectId;

      // Mock 404 for client-id
      const error: any = new Error('Secret not found');
      error.code = 5;
      error.status = 404;

      (mockAccessSecretVersion as any).mockRejectedValue(error);

      await expect(getBofaCredentials()).rejects.toThrow('bofa-client-id');
    });

    it('throws error when bofa-client-secret is missing', async () => {
      const projectId = 'fiduciary-prod';

      process.env.GOOGLE_CLOUD_PROJECT = projectId;

      // Mock success for client-id, 404 for client-secret
      (mockAccessSecretVersion as any)
        .mockResolvedValueOnce([
          {
            payload: { data: Buffer.from('test-client-id', 'utf-8') }
          }
        ]);

      const error: any = new Error('Secret not found');
      error.code = 5;
      error.status = 404;

      (mockAccessSecretVersion as any).mockRejectedValueOnce(error);

      await expect(getBofaCredentials()).rejects.toThrow('bofa-client-secret');
    });

    it('throws error when bofa-tenant-id is missing', async () => {
      const projectId = 'fiduciary-prod';

      process.env.GOOGLE_CLOUD_PROJECT = projectId;

      // Mock success for client-id and client-secret, 404 for tenant-id
      (mockAccessSecretVersion as any)
        .mockResolvedValueOnce([
          {
            payload: { data: Buffer.from('test-client-id', 'utf-8') }
          }
        ])
        .mockResolvedValueOnce([
          {
            payload: { data: Buffer.from('test-client-secret', 'utf-8') }
          }
        ]);

      const error: any = new Error('Secret not found');
      error.code = 5;
      error.status = 404;

      (mockAccessSecretVersion as any).mockRejectedValueOnce(error);

      await expect(getBofaCredentials()).rejects.toThrow('bofa-tenant-id');
    });

    it('includes correct token URL in credentials', async () => {
      const projectId = 'fiduciary-prod';

      process.env.GOOGLE_CLOUD_PROJECT = projectId;

      (mockAccessSecretVersion as any)
        .mockResolvedValue([
          {
            payload: { data: Buffer.from('test-client-id', 'utf-8') }
          }
        ])
        .mockResolvedValue([
          {
            payload: { data: Buffer.from('test-client-secret', 'utf-8') }
          }
        ])
        .mockResolvedValue([
          {
            payload: { data: Buffer.from('test-tenant-id', 'utf-8') }
          }
        ]);

      const credentials = await getBofaCredentials();

      expect(credentials.tokenUrl).toBe('https://api.bankofamerica.com/auth/oauth/v2/token');
    });

    it('retrieves secrets in correct order: client-id, client-secret, tenant-id', async () => {
      const projectId = 'fiduciary-prod';

      process.env.GOOGLE_CLOUD_PROJECT = projectId;

      const callOrder: string[] = [];

      (mockAccessSecretVersion as any).mockImplementation((request: any) => {
        const secretName = request.name.split('/secrets/')[1].split('/versions')[0];
        callOrder.push(secretName);

        return Promise.resolve([
          {
            payload: { data: Buffer.from(`test-${secretName}`, 'utf-8') }
          }
        ]);
      });

      await getBofaCredentials();

      expect(callOrder).toEqual([
        'bofa-client-id',
        'bofa-client-secret',
        'bofa-tenant-id'
      ]);
    });

    it('throws error when GOOGLE_CLOUD_PROJECT env var is missing', async () => {
      delete process.env.GOOGLE_CLOUD_PROJECT;

      await expect(getBofaCredentials()).rejects.toThrow('GOOGLE_CLOUD_PROJECT');
      expect(mockAccessSecretVersion).not.toHaveBeenCalled();
    });

    it('handles empty secret values', async () => {
      const projectId = 'fiduciary-prod';

      process.env.GOOGLE_CLOUD_PROJECT = projectId;

      // Mock empty string for client-id
      (mockAccessSecretVersion as any).mockResolvedValue([
        {
          payload: { data: Buffer.from('', 'utf-8') }
        }
      ]);

      const credentials = await getBofaCredentials();

      // Empty secret is still returned (validation happens elsewhere)
      expect(credentials.clientId).toBe('');
    });
  });

  describe('Error Messages', () => {
    it('getSecret provides helpful error message for 404', async () => {
      const secretName = 'missing-secret';
      const projectId = 'fiduciary-prod';

      process.env.GOOGLE_CLOUD_PROJECT = projectId;

      const error: any = new Error('Secret not found');
      error.code = 5;
      error.status = 404;

      (mockAccessSecretVersion as any).mockRejectedValue(error);

      await expect(getSecret(secretName)).rejects.toThrow(/missing-secret/);
    });

    it('getBofaCredentials provides helpful error message indicating which secret is missing', async () => {
      const projectId = 'fiduciary-prod';

      process.env.GOOGLE_CLOUD_PROJECT = projectId;

      const error: any = new Error('Secret not found');
      error.code = 5;
      error.status = 404;

      (mockAccessSecretVersion as any).mockRejectedValue(error);

      await expect(getBofaCredentials()).rejects.toThrow(/bofa-client-id/);
    });
  });
});
