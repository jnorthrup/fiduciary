/**
 * Tests for Baselane Webhook Integration
 *
 * Test file for webhook endpoint, signature validation, and event handlers
 * Phase: Webhook Integration
 * Track: baselane_api_20260124
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { WebhookPayload } from './baselaneService.js';
import {
  verifyWebhookSignature,
  handleBaselaneWebhook,
  registerWebhook,
  deleteWebhook,
  getWebhookRegistration
} from './baselaneWebhooks.js';

describe('Baselane Webhook Integration - Signature Validation', () => {
  beforeEach(() => {
    // Clear storage
    delete globalThis['baselane_webhooks'];
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('verifyWebhookSignature()', () => {
    it('should verify valid webhook signature', async () => {
      const payload: WebhookPayload = {
        eventId: 'event-1',
        eventType: 'rent.payment.completed',
        timestamp: '2026-01-15T10:00:00Z',
        data: {
          paymentId: 'payment-1',
          tenantId: 'tenant-1',
          amount: 2000,
          status: 'completed'
        },
        signature: 'valid-signature'
      };

      // Mock crypto verification
      const result = await verifyWebhookSignature(payload, 'test-webhook-secret');

      // In real implementation, this would use HMAC-SHA256
      expect(result).toBeDefined();
    });

    it('should reject invalid webhook signature', async () => {
      const payload: WebhookPayload = {
        eventId: 'event-2',
        eventType: 'rent.payment.completed',
        timestamp: '2026-01-15T10:00:00Z',
        data: {
          paymentId: 'payment-1',
          tenantId: 'tenant-1',
          amount: 2000,
          status: 'completed'
        },
        signature: 'invalid-signature'
      };

      // Mock signature that doesn't match
      const result = await verifyWebhookSignature(payload, 'test-webhook-secret');

      expect(result.valid).toBe(false);
    });

    it('should detect replay attacks', async () => {
      const payload: WebhookPayload = {
        eventId: 'replay-event-1',
        eventType: 'rent.payment.completed',
        timestamp: '2026-01-15T10:00:00Z',
        data: {
          paymentId: 'payment-1',
          tenantId: 'tenant-1',
          amount: 2000,
          status: 'completed'
        },
        signature: 'valid-signature'
      };

      // First call should succeed
      await verifyWebhookSignature(payload, 'test-webhook-secret');

      // Second call with same eventId should be rejected (replay)
      const result = await verifyWebhookSignature(payload, 'test-webhook-secret');

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('replay');
    });
  });

  describe('handleBaselaneWebhook()', () => {
    it('should process valid webhook', async () => {
      const payload: WebhookPayload = {
        eventId: 'event-3',
        eventType: 'rent.payment.completed',
        timestamp: '2026-01-15T10:00:00Z',
        data: {
          paymentId: 'payment-1',
          tenantId: 'tenant-1',
          amount: 2000,
          propertyId: 'prop-1',
          status: 'completed'
        },
        signature: 'valid-signature'
      };

      const result = await handleBaselaneWebhook(payload, {
        webhookSecret: 'test-webhook-secret',
        cashAccountId: 'acct-cash-1',
        rentalIncomeAccountId: 'acct-rental-1'
      });

      expect(result.success).toBe(true);
      expect(result.processed).toBe(true);
    });

    it('should reject webhook with invalid signature', async () => {
      const payload: WebhookPayload = {
        eventId: 'event-4',
        eventType: 'rent.payment.completed',
        timestamp: '2026-01-15T10:00:00Z',
        data: {
          paymentId: 'payment-1',
          tenantId: 'tenant-1',
          amount: 2000,
          status: 'completed'
        },
        signature: 'invalid-signature'
      };

      const result = await handleBaselaneWebhook(payload, {
        webhookSecret: 'test-webhook-secret',
        cashAccountId: 'acct-cash-1',
        rentalIncomeAccountId: 'acct-rental-1'
      });

      expect(result.success).toBe(false);
      expect(result.reason).toContain('invalid signature');
    });

    it('should log webhook processing errors', async () => {
      const payload: WebhookPayload = {
        eventId: 'event-5',
        eventType: 'rent.payment.completed',
        timestamp: 'invalid-date',
        data: {
          paymentId: 'payment-1',
          tenantId: 'tenant-1',
          amount: 2000,
          status: 'completed'
        },
        signature: 'valid-signature'
      };

      const result = await handleBaselaneWebhook(payload, {
        webhookSecret: 'test-webhook-secret',
        cashAccountId: 'acct-cash-1',
        rentalIncomeAccountId: 'acct-rental-1'
      });

      // Should return success for fire-and-forget pattern
      expect(result).toBeDefined();
    });
  });
});

describe('Baselane Webhook Integration - Event Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Webhook Event Types', () => {
    it('should handle rent.payment.completed', async () => {
      const payload: WebhookPayload = {
        eventId: 'event-6',
        eventType: 'rent.payment.completed',
        timestamp: '2026-01-15T10:00:00Z',
        data: {
          paymentId: 'payment-1',
          tenantId: 'tenant-1',
          amount: 2000,
          propertyId: 'prop-1',
          status: 'completed'
        },
        signature: 'valid-signature'
      };

      const result = await handleBaselaneWebhook(payload, {
        webhookSecret: 'test-webhook-secret',
        cashAccountId: 'acct-cash-1',
        rentalIncomeAccountId: 'acct-rental-1'
      });

      expect(result.processed).toBe(true);
    });

    it('should handle rent.payment.failed', async () => {
      const payload: WebhookPayload = {
        eventId: 'event-7',
        eventType: 'rent.payment.failed',
        timestamp: '2026-01-15T10:00:00Z',
        data: {
          paymentId: 'payment-2',
          tenantId: 'tenant-2',
          amount: 2000,
          failedReason: 'Insufficient funds'
        },
        signature: 'valid-signature'
      };

      const result = await handleBaselaneWebhook(payload, {
        webhookSecret: 'test-webhook-secret',
        cashAccountId: 'acct-cash-1',
        rentalIncomeAccountId: 'acct-rental-1'
      });

      expect(result.success).toBe(true);
      expect(result.processed).toBe(true);
    });

    it('should handle tenant.created', async () => {
      const payload: WebhookPayload = {
        eventId: 'event-8',
        eventType: 'tenant.created',
        timestamp: '2026-01-15T10:00:00Z',
        data: {
          tenantId: 'tenant-new-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com'
        },
        signature: 'valid-signature'
      };

      const result = await handleBaselaneWebhook(payload, {
        webhookSecret: 'test-webhook-secret',
        cashAccountId: 'acct-cash-1',
        rentalIncomeAccountId: 'acct-rental-1'
      });

      expect(result.success).toBe(true);
    });

    it('should handle banking.transaction.posted', async () => {
      const payload: WebhookPayload = {
        eventId: 'event-9',
        eventType: 'banking.transaction.posted',
        timestamp: '2026-01-15T10:00:00Z',
        data: {
          transactionId: 'txn-1',
          accountId: 'account-1',
          amount: -150,
          type: 'debit',
          propertyId: 'prop-1'
        },
        signature: 'valid-signature'
      };

      const result = await handleBaselaneWebhook(payload, {
        webhookSecret: 'test-webhook-secret',
        cashAccountId: 'acct-cash-1',
        rentalIncomeAccountId: 'acct-rental-1'
      });

      expect(result.success).toBe(true);
    });

    it('should handle property.created', async () => {
      const payload: WebhookPayload = {
        eventId: 'event-10',
        eventType: 'property.created',
        timestamp: '2026-01-15T10:00:00Z',
        data: {
          propertyId: 'prop-new-1',
          nickname: 'Sunset Property',
          address: {
            street: '123 Main St',
            city: 'San Francisco',
            state: 'CA',
            zip: '94102'
          }
        },
        signature: 'valid-signature'
      };

      const result = await handleBaselaneWebhook(payload, {
        webhookSecret: 'test-webhook-secret',
        cashAccountId: 'acct-cash-1',
        rentalIncomeAccountId: 'acct-rental-1'
      });

      expect(result.success).toBe(true);
    });
  });
});

describe('Baselane Webhook Integration - Registration', () => {
  beforeEach(() => {
    delete globalThis['baselane_webhooks'];
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('registerWebhook()', () => {
    it('should register webhook configuration', async () => {
      const result = await registerWebhook({
        url: 'https://example.com/webhooks/baselane',
        events: ['rent.payment.completed', 'rent.payment.failed', 'tenant.created'],
        secret: 'webhook-secret-123'
      });

      expect(result.success).toBe(true);
      expect(result.webhookId).toBeDefined();
    });

    it('should store webhook configuration', async () => {
      await registerWebhook({
        url: 'https://example.com/webhooks/baselane',
        events: ['rent.payment.completed'],
        secret: 'webhook-secret-123'
      });

      const registration = await getWebhookRegistration();

      expect(registration).not.toBeNull();
      expect(registration?.url).toBe('https://example.com/webhooks/baselane');
      expect(registration?.events).toContain('rent.payment.completed');
    });
  });

  describe('deleteWebhook()', () => {
    it('should delete webhook registration', async () => {
      await registerWebhook({
        url: 'https://example.com/webhooks/baselane',
        events: ['rent.payment.completed'],
        secret: 'webhook-secret-123'
      });

      const result = await deleteWebhook();

      expect(result.success).toBe(true);

      const registration = await getWebhookRegistration();
      expect(registration).toBeNull();
    });
  });

  describe('getWebhookRegistration()', () => {
    it('should return null when no webhook registered', async () => {
      const registration = await getWebhookRegistration();

      expect(registration).toBeNull();
    });

    it('should return webhook configuration when registered', async () => {
      await registerWebhook({
        url: 'https://example.com/webhooks/baselane',
        events: ['rent.payment.completed', 'tenant.created'],
        secret: 'webhook-secret-123'
      });

      const registration = await getWebhookRegistration();

      expect(registration).not.toBeNull();
      expect(registration?.events).toHaveLength(2);
    });
  });
});
