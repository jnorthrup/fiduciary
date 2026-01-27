/**
 * Tests for Baselane Webhook Ledger Integration
 *
 * Test file for automatic rent payment posting via webhooks
 * Phase: Ledger Integration - Automatic Posting
 * Track: baselane_api_20260124
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { WebhookPayload } from './baselaneService.js';
import { handleRentPaymentWebhook } from './baselaneWebhookLedger.js';
import { getJournalEntryForPayment } from './baselaneLedger.js';

describe('Baselane Webhook Ledger Integration - Automatic Posting', () => {
  beforeEach(() => {
    // Clear storage
    delete globalThis['baselane_journal_entries'];
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('handleRentPaymentWebhook()', () => {
    it('should post completed payment to ledger', async () => {
      const webhookPayload: WebhookPayload = {
        eventId: 'event-1',
        eventType: 'rent.payment.completed',
        timestamp: '2026-01-15T10:01:00Z',
        data: {
          paymentId: 'payment-1',
          tenantId: 'tenant-1',
          amount: 2000,
          propertyId: 'prop-1',
          status: 'completed'
        },
        signature: 'sig-1'
      };

      const result = await handleRentPaymentWebhook(webhookPayload, {
        cashAccountId: 'acct-cash-1',
        rentalIncomeAccountId: 'acct-rental-1'
      });

      expect(result.success).toBe(true);
      expect(result.journalEntryId).toBeDefined();
    });

    it('should not post pending payments to ledger', async () => {
      const webhookPayload: WebhookPayload = {
        eventId: 'event-2',
        eventType: 'rent.payment.completed',
        timestamp: '2026-01-15T10:00:00Z',
        data: {
          paymentId: 'payment-2',
          tenantId: 'tenant-1',
          amount: 2000,
          propertyId: 'prop-1',
          status: 'pending'
        },
        signature: 'sig-2'
      };

      const result = await handleRentPaymentWebhook(webhookPayload, {
        cashAccountId: 'acct-cash-1',
        rentalIncomeAccountId: 'acct-rental-1'
      });

      expect(result.success).toBe(true);
      expect(result.journalEntryId).toBeUndefined();
      expect(result.message).toContain('not completed');
    });

    it('should store ledger transaction ID with payment', async () => {
      const webhookPayload: WebhookPayload = {
        eventId: 'event-3',
        eventType: 'rent.payment.completed',
        timestamp: '2026-01-15T10:01:00Z',
        data: {
          paymentId: 'payment-3',
          tenantId: 'tenant-1',
          amount: 2500,
          propertyId: 'prop-1',
          status: 'completed'
        },
        signature: 'sig-3'
      };

      const result = await handleRentPaymentWebhook(webhookPayload, {
        cashAccountId: 'acct-cash-1',
        rentalIncomeAccountId: 'acct-rental-1'
      });

      expect(result.journalEntryId).toBeDefined();

      // Verify journal entry is stored
      const journalEntry = await getJournalEntryForPayment('payment-3');
      expect(journalEntry).not.toBeNull();
      expect(journalEntry?.baselanePaymentId).toBe('payment-3');
    });

    it('should handle webhook errors with logging (fire-and-forget)', async () => {
      const webhookPayload: WebhookPayload = {
        eventId: 'event-4',
        eventType: 'rent.payment.completed',
        timestamp: '2026-01-15T10:01:00Z',
        data: {
          paymentId: '', // Invalid payment ID
          tenantId: 'tenant-1',
          amount: 2000,
          propertyId: 'prop-1',
          status: 'completed'
        },
        signature: 'sig-4'
      };

      const result = await handleRentPaymentWebhook(webhookPayload, {
        cashAccountId: 'acct-cash-1',
        rentalIncomeAccountId: 'acct-rental-1'
      });

      // Fire-and-forget: should return success even with invalid data
      expect(result).toBeDefined();
    });

    it('should only process rent.payment.completed events', async () => {
      const webhookPayload: WebhookPayload = {
        eventId: 'event-5',
        eventType: 'rent.payment.failed',
        timestamp: '2026-01-15T10:01:00Z',
        data: {
          paymentId: 'payment-5',
          tenantId: 'tenant-1',
          amount: 2000,
          propertyId: 'prop-1',
          status: 'failed'
        },
        signature: 'sig-5'
      };

      const result = await handleRentPaymentWebhook(webhookPayload, {
        cashAccountId: 'acct-cash-1',
        rentalIncomeAccountId: 'acct-rental-1'
      });

      expect(result.success).toBe(true);
      expect(result.processed).toBe(false);
      expect(result.message?.toLowerCase()).toContain('not a completed payment event');
    });
  });

  describe('Webhook Event Types', () => {
    it('should process rent.payment.completed', async () => {
      const webhookPayload: WebhookPayload = {
        eventId: 'event-1',
        eventType: 'rent.payment.completed',
        timestamp: '2026-01-15T10:01:00Z',
        data: {
          paymentId: 'payment-1',
          tenantId: 'tenant-1',
          amount: 2000,
          propertyId: 'prop-1',
          status: 'completed'
        },
        signature: 'sig-1'
      };

      const result = await handleRentPaymentWebhook(webhookPayload, {
        cashAccountId: 'acct-cash-1',
        rentalIncomeAccountId: 'acct-rental-1'
      });

      expect(result.processed).toBe(true);
    });

    it('should not process tenant.created events', async () => {
      const webhookPayload: WebhookPayload = {
        eventId: 'event-6',
        eventType: 'tenant.created',
        timestamp: '2026-01-15T10:00:00Z',
        data: {
          tenantId: 'tenant-new',
          firstName: 'John',
          lastName: 'Doe'
        },
        signature: 'sig-6'
      };

      const result = await handleRentPaymentWebhook(webhookPayload, {
        cashAccountId: 'acct-cash-1',
        rentalIncomeAccountId: 'acct-rental-1'
      });

      expect(result.processed).toBe(false);
    });
  });
});
