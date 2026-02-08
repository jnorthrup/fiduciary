/**
 * Banking Core Types Tests
 *
 * Test suite for banking provider configuration types
 */

import { describe, it, expect } from 'vitest';
import {
  BankingProvider,
  AchqConfig,
  StripeConfig,
  ProviderConfig,
} from './core';

describe('Banking Core Types - Provider Configs', () => {
  describe('AchqConfig', () => {
    it('should accept valid ACHQ configuration', () => {
      const config: AchqConfig = {
        provider: BankingProvider.ACHQ,
        enabled: true,
        environment: 'sandbox',
        credentials: {
          apiKey: 'test-api-key',
          webhookSecret: 'test-webhook-secret',
        },
        rateLimit: {
          maxRequests: 100,
          perMilliseconds: 60000,
        },
        retryPolicy: {
          maxAttempts: 3,
          backoffMs: 1000,
        },
      };

      expect(config.provider).toBe(BankingProvider.ACHQ);
      expect(config.credentials.apiKey).toBe('test-api-key');
      expect(config.credentials.webhookSecret).toBe('test-webhook-secret');
    });

    it('should accept minimal configuration without optional fields', () => {
      const config: AchqConfig = {
        provider: BankingProvider.ACHQ,
        enabled: true,
        environment: 'production',
        credentials: {
          apiKey: 'prod-api-key',
          webhookSecret: 'prod-webhook-secret',
        },
      };

      expect(config.provider).toBe(BankingProvider.ACHQ);
      expect(config.rateLimit).toBeUndefined();
      expect(config.retryPolicy).toBeUndefined();
    });

    it('should be assignable to ProviderConfig', () => {
      const config: ProviderConfig = {
        provider: BankingProvider.ACHQ,
        enabled: true,
        environment: 'sandbox',
        credentials: {
          apiKey: 'test',
          webhookSecret: 'test',
        },
      };

      expect(config.provider).toBe(BankingProvider.ACHQ);
    });
  });

  describe('StripeConfig', () => {
    it('should accept valid Stripe configuration', () => {
      const config: StripeConfig = {
        provider: BankingProvider.STRIPE,
        enabled: true,
        environment: 'sandbox',
        credentials: {
          secretKey: 'sk_test_123',
          publishableKey: 'pk_test_456',
          webhookSecret: 'whsec_789',
        },
        rateLimit: {
          maxRequests: 100,
          perMilliseconds: 60000,
        },
        retryPolicy: {
          maxAttempts: 3,
          backoffMs: 1000,
        },
      };

      expect(config.provider).toBe(BankingProvider.STRIPE);
      expect(config.credentials.secretKey).toBe('sk_test_123');
      expect(config.credentials.publishableKey).toBe('pk_test_456');
      expect(config.credentials.webhookSecret).toBe('whsec_789');
    });

    it('should accept minimal configuration without optional fields', () => {
      const config: StripeConfig = {
        provider: BankingProvider.STRIPE,
        enabled: true,
        environment: 'production',
        credentials: {
          secretKey: 'sk_live_123',
          publishableKey: 'pk_live_456',
          webhookSecret: 'whsec_live_789',
        },
      };

      expect(config.provider).toBe(BankingProvider.STRIPE);
      expect(config.rateLimit).toBeUndefined();
      expect(config.retryPolicy).toBeUndefined();
    });

    it('should be assignable to ProviderConfig', () => {
      const config: ProviderConfig = {
        provider: BankingProvider.STRIPE,
        enabled: true,
        environment: 'sandbox',
        credentials: {
          secretKey: 'sk_test',
          publishableKey: 'pk_test',
          webhookSecret: 'whsec',
        },
      };

      expect(config.provider).toBe(BankingProvider.STRIPE);
    });
  });

  describe('BankingProvider enum', () => {
    it('should include ACHQ and STRIPE providers', () => {
      expect(BankingProvider.ACHQ).toBe('achq');
      expect(BankingProvider.STRIPE).toBe('stripe');
    });

    it('should have unique string values for all providers', () => {
      const providers = Object.values(BankingProvider);
      const uniqueProviders = new Set(providers);

      expect(providers.length).toBe(uniqueProviders.size);
    });
  });
});
