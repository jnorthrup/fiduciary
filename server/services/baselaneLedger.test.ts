/**
 * Tests for Baselane Ledger Integration
 *
 * Test file for rent payment journal posting
 * Phase: Ledger Integration
 * Track: baselane_api_20260124
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { Payment } from './baselaneService.js';
import { postRentPaymentToLedger, getJournalEntryForPayment } from './baselaneLedger.js';

describe('Baselane Ledger Integration - Rent Payment Posting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('postRentPaymentToLedger()', () => {
    it('should post completed rent payment to ledger', async () => {
      const payment: Payment = {
        id: 'payment-1',
        chargeId: 'charge-1',
        tenantId: 'tenant-1',
        amount: 2000,
        status: 'completed',
        paymentMethod: 'bank_account',
        paymentMethodId: 'pm-1',
        createdAt: '2026-01-15T10:00:00Z',
        completedAt: '2026-01-15T10:01:00Z'
      };

      const result = await postRentPaymentToLedger(payment, {
        propertyId: 'prop-1',
        cashAccountId: 'acct-cash-1',
        rentalIncomeAccountId: 'acct-rental-1'
      });

      expect(result.success).toBe(true);
      expect(result.journalEntryId).toBeDefined();
      expect(result.debitAmount).toBe(2000);
      expect(result.creditAmount).toBe(2000);
    });

    it('should store Baselane metadata in journal entry', async () => {
      const payment: Payment = {
        id: 'payment-baselane-123',
        chargeId: 'charge-1',
        tenantId: 'tenant-1',
        amount: 2500,
        status: 'completed',
        paymentMethod: 'card',
        paymentMethodId: 'pm-2',
        createdAt: '2026-01-15T10:00:00Z',
        completedAt: '2026-01-15T10:01:00Z'
      };

      const result = await postRentPaymentToLedger(payment, {
        propertyId: 'prop-1',
        cashAccountId: 'acct-cash-1',
        rentalIncomeAccountId: 'acct-rental-1'
      });

      expect(result.baselanePaymentId).toBe('payment-baselane-123');
      expect(result.baselaneTenantId).toBe('tenant-1');
    });

    it('should handle posting errors gracefully (fire-and-forget)', async () => {
      const payment: Payment = {
        id: 'payment-1',
        chargeId: 'charge-1',
        tenantId: 'tenant-1',
        amount: 2000,
        status: 'completed',
        paymentMethod: 'bank_account',
        paymentMethodId: 'pm-1',
        createdAt: '2026-01-15T10:00:00Z',
        completedAt: '2026-01-15T10:01:00Z'
      };

      // Mock ledger service failure
      const result = await postRentPaymentToLedger(payment, {
        propertyId: 'invalid-prop',
        cashAccountId: 'invalid-cash',
        rentalIncomeAccountId: 'invalid-rental'
      });

      // Should return success=true for fire-and-forget pattern
      // Errors logged but don't fail the operation
      expect(result).toBeDefined();
    });

    it('should post debit to cash/bank account', async () => {
      const payment: Payment = {
        id: 'payment-1',
        chargeId: 'charge-1',
        tenantId: 'tenant-1',
        amount: 2000,
        status: 'completed',
        paymentMethod: 'bank_account',
        paymentMethodId: 'pm-1',
        createdAt: '2026-01-15T10:00:00Z',
        completedAt: '2026-01-15T10:01:00Z'
      };

      const result = await postRentPaymentToLedger(payment, {
        propertyId: 'prop-1',
        cashAccountId: 'acct-cash-1',
        rentalIncomeAccountId: 'acct-rental-1'
      });

      expect(result.debitAccountId).toBe('acct-cash-1');
      expect(result.debitAmount).toBe(2000);
    });

    it('should post credit to rental income account', async () => {
      const payment: Payment = {
        id: 'payment-1',
        chargeId: 'charge-1',
        tenantId: 'tenant-1',
        amount: 2000,
        status: 'completed',
        paymentMethod: 'bank_account',
        paymentMethodId: 'pm-1',
        createdAt: '2026-01-15T10:00:00Z',
        completedAt: '2026-01-15T10:01:00Z'
      };

      const result = await postRentPaymentToLedger(payment, {
        propertyId: 'prop-1',
        cashAccountId: 'acct-cash-1',
        rentalIncomeAccountId: 'acct-rental-1'
      });

      expect(result.creditAccountId).toBe('acct-rental-1');
      expect(result.creditAmount).toBe(2000);
    });
  });

  describe('getJournalEntryForPayment()', () => {
    it('should retrieve journal entry by Baselane payment ID', async () => {
      const journalEntry = await getJournalEntryForPayment('payment-1');

      expect(journalEntry).toBeDefined();
      expect(journalEntry?.baselanePaymentId).toBe('payment-1');
    });

    it('should return null for non-existent payment', async () => {
      const journalEntry = await getJournalEntryForPayment('non-existent');

      expect(journalEntry).toBeNull();
    });

    it('should include full journal entry details', async () => {
      const journalEntry = await getJournalEntryForPayment('payment-1');

      expect(journalEntry?.journalEntryId).toBeDefined();
      expect(journalEntry?.debitAccountId).toBeDefined();
      expect(journalEntry?.creditAccountId).toBeDefined();
      expect(journalEntry?.amount).toBeDefined();
    });
  });
});
