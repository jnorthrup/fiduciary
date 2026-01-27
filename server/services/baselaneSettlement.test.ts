/**
 * Tests for Baselane Settlement Integration
 *
 * Test file for property expense payment orders and reconciliation
 * Phase: Settlement Integration
 * Track: baselane_api_20260124
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { Transaction } from './baselaneService.js';
import {
  createPaymentOrderForExpense,
  reconcileTransactionWithPaymentOrder,
  getPaymentOrderForTransaction
} from './baselaneSettlement.js';

describe('Baselane Settlement Integration - Property Expenses', () => {
  beforeEach(() => {
    // Clear storage
    delete globalThis['baselane_payment_orders'];
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createPaymentOrderForExpense()', () => {
    it('should create payment order from Baselane expense transaction', async () => {
      const transaction: Transaction = {
        id: 'txn-1',
        accountId: 'account-1',
        amount: -150.50,
        type: 'debit',
        description: 'Maintenance - plumbing repair',
        category: 'maintenance',
        propertyId: 'prop-1',
        unitId: 'unit-101',
        postedDate: '2026-01-16',
        createdAt: '2026-01-16T14:30:00Z'
      };

      const result = await createPaymentOrderForExpense(transaction, {
        entityId: 'entity-1',
        vendorId: 'vendor-plumbing-1',
        expenseCategoryId: 'cat-maintenance'
      });

      expect(result.success).toBe(true);
      expect(result.paymentOrderId).toBeDefined();
      expect(result.amount).toBe(150.50); // Absolute value for payment
      expect(result.baselaneTransactionId).toBe('txn-1');
    });

    it('should include Baselane property metadata in payment order', async () => {
      const transaction: Transaction = {
        id: 'txn-2',
        accountId: 'account-1',
        amount: -500,
        type: 'debit',
        description: 'Property tax - January',
        category: 'tax',
        propertyId: 'prop-1',
        postedDate: '2026-01-15',
        createdAt: '2026-01-15T09:00:00Z'
      };

      const result = await createPaymentOrderForExpense(transaction, {
        entityId: 'entity-1',
        vendorId: 'vendor-tax-1',
        expenseCategoryId: 'cat-tax'
      });

      expect(result.baselanePropertyId).toBe('prop-1');
      expect(result.baselaneTransactionId).toBe('txn-2');
      expect(result.metadata?.description).toBe('Property tax - January');
    });

    it('should link payment order to property for reconciliation', async () => {
      const transaction: Transaction = {
        id: 'txn-3',
        accountId: 'account-1',
        amount: -200,
        type: 'debit',
        description: 'Landscaping services',
        category: 'maintenance',
        propertyId: 'prop-1',
        postedDate: '2026-01-17',
        createdAt: '2026-01-17T16:00:00Z'
      };

      const result = await createPaymentOrderForExpense(transaction, {
        entityId: 'entity-1',
        vendorId: 'vendor-landscaping-1',
        expenseCategoryId: 'cat-landscaping'
      });

      expect(result.propertyId).toBe('prop-1');
      expect(result.entityId).toBe('entity-1');
    });

    it('should handle non-expense transactions (ignore)', async () => {
      const transaction: Transaction = {
        id: 'txn-4',
        accountId: 'account-1',
        amount: 2000, // Credit - rent income
        type: 'credit',
        description: 'Rent payment received',
        category: 'rent',
        propertyId: 'prop-1',
        postedDate: '2026-01-15',
        createdAt: '2026-01-15T10:00:00Z'
      };

      const result = await createPaymentOrderForExpense(transaction, {
        entityId: 'entity-1',
        vendorId: 'vendor-1',
        expenseCategoryId: 'cat-1'
      });

      expect(result.success).toBe(true);
      expect(result.created).toBe(false);
      expect(result.message?.toLowerCase()).toContain('not an expense');
    });
  });

  describe('reconcileTransactionWithPaymentOrder()', () => {
    it('should match Baselane transaction to payment order', async () => {
      // First create a payment order
      const transaction: Transaction = {
        id: 'txn-5',
        accountId: 'account-1',
        amount: -150.50,
        type: 'debit',
        description: 'Maintenance - plumbing',
        category: 'maintenance',
        propertyId: 'prop-1',
        unitId: 'unit-101',
        postedDate: '2026-01-16',
        createdAt: '2026-01-16T14:30:00Z'
      };

      await createPaymentOrderForExpense(transaction, {
        entityId: 'entity-1',
        vendorId: 'vendor-1',
        expenseCategoryId: 'cat-1'
      });

      // Now reconcile
      const result = await reconcileTransactionWithPaymentOrder('txn-5', {
        status: 'paid',
        paidAt: '2026-01-16T15:00:00Z'
      });

      expect(result.success).toBe(true);
      expect(result.paymentOrderStatus).toBe('paid');
    });

    it('should update payment order status on Baselane payment', async () => {
      const transaction: Transaction = {
        id: 'txn-6',
        accountId: 'account-1',
        amount: -300,
        type: 'debit',
        description: 'HVAC repair',
        category: 'maintenance',
        propertyId: 'prop-1',
        postedDate: '2026-01-18',
        createdAt: '2026-01-18T10:00:00Z'
      };

      await createPaymentOrderForExpense(transaction, {
        entityId: 'entity-1',
        vendorId: 'vendor-1',
        expenseCategoryId: 'cat-1'
      });

      const result = await reconcileTransactionWithPaymentOrder('txn-6', {
        status: 'paid',
        paidAt: '2026-01-18T14:00:00Z'
      });

      expect(result.paymentOrderStatus).toBe('paid');
      expect(result.paidAt).toBeDefined();
    });

    it('should handle failed payments', async () => {
      const transaction: Transaction = {
        id: 'txn-7',
        accountId: 'account-1',
        amount: -200,
        type: 'debit',
        description: 'Vendor payment',
        category: 'maintenance',
        propertyId: 'prop-1',
        postedDate: '2026-01-19',
        createdAt: '2026-01-19T09:00:00Z'
      };

      await createPaymentOrderForExpense(transaction, {
        entityId: 'entity-1',
        vendorId: 'vendor-1',
        expenseCategoryId: 'cat-1'
      });

      const result = await reconcileTransactionWithPaymentOrder('txn-7', {
        status: 'failed',
        failedReason: 'Insufficient funds'
      });

      expect(result.paymentOrderStatus).toBe('failed');
      expect(result.failedReason).toBe('Insufficient funds');
    });

    it('should handle refunds', async () => {
      const transaction: Transaction = {
        id: 'txn-8',
        accountId: 'account-1',
        amount: -100,
        type: 'debit',
        description: 'Deposit refund',
        category: 'refund',
        propertyId: 'prop-1',
        postedDate: '2026-01-20',
        createdAt: '2026-01-20T11:00:00Z'
      };

      await createPaymentOrderForExpense(transaction, {
        entityId: 'entity-1',
        vendorId: 'vendor-1',
        expenseCategoryId: 'cat-1'
      });

      const result = await reconcileTransactionWithPaymentOrder('txn-8', {
        status: 'refunded',
        refundedAt: '2026-01-20T16:00:00Z',
        refundAmount: 100
      });

      expect(result.paymentOrderStatus).toBe('refunded');
    });
  });

  describe('getPaymentOrderForTransaction()', () => {
    it('should retrieve payment order by Baselane transaction ID', async () => {
      const transaction: Transaction = {
        id: 'txn-9',
        accountId: 'account-1',
        amount: -150,
        type: 'debit',
        description: 'Maintenance',
        category: 'maintenance',
        propertyId: 'prop-1',
        postedDate: '2026-01-21',
        createdAt: '2026-01-21T10:00:00Z'
      };

      await createPaymentOrderForExpense(transaction, {
        entityId: 'entity-1',
        vendorId: 'vendor-1',
        expenseCategoryId: 'cat-1'
      });

      const paymentOrder = await getPaymentOrderForTransaction('txn-9');

      expect(paymentOrder).not.toBeNull();
      expect(paymentOrder?.baselaneTransactionId).toBe('txn-9');
      expect(paymentOrder?.amount).toBe(150);
    });

    it('should return null for non-mapped transaction', async () => {
      const paymentOrder = await getPaymentOrderForTransaction('non-existent');

      expect(paymentOrder).toBeNull();
    });
  });
});
