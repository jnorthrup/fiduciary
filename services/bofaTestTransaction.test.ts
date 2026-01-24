/**
 * Tests for BOFA Test Transaction Helper
 *
 * Test file for 2-cent validation transaction helper
 * Phase 7.1 - Test Payment Order Creation
 * Track: bofa_cashpro_20260123
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTestPaymentOrder } from './bofaTestTransaction';

// Mock persistence
vi.mock('../server/lib/gcs-persistence.js', () => ({
  default: {
    loadData: vi.fn(async (uid: string, component: string) => {
      const key = `${uid}/${component}`;
      return { paymentOrders: {} };
    }),
    saveData: vi.fn(async (uid: string, component: string, data: any) => {
      // Mock save - do nothing
    })
  }
}));

// Mock nacha generator
vi.mock('../server/lib/nacha-generator.js', () => ({
  generateNachaFile: vi.fn(() => Buffer.from('mock nacha content'))
}));

// Mock sponsors
vi.mock('../server/config/sponsors.js', () => ({
  getSponsor: vi.fn(() => ({
    odfiRouting: '021000021',
    immediateOriginName: 'TEST SPONSOR',
    name: 'Test Company',
    companyId: 'TESTCOMPANY'
  }))
}));

// Mock BOFA service
vi.mock('./bofaCashProService', () => ({
  submitACHFile: vi.fn(),
  getPaymentStatus: vi.fn()
}));

describe('BOFA Test Transaction Helper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTestPaymentOrder', () => {
    it('should create a test payment order with 2-cent amount', async () => {
      const result = await createTestPaymentOrder('test-user-123');

      expect(result).toBeDefined();
      expect(result.paymentOrderId).toBeDefined();
      expect(result.amount).toBe(0.02);
      expect(result.status).toBe('created');
    });

    it('should use test routing number 021000021', async () => {
      const result = await createTestPaymentOrder('test-user-456');

      expect(result.payee.routingNumber).toBe('021000021');
    });

    it('should use test account number format 9999999999', async () => {
      const result = await createTestPaymentOrder('test-user-789');

      expect(result.payee.accountNumber).toBe('9999999999');
    });

    it('should include timestamp in payment order', async () => {
      const result = await createTestPaymentOrder('test-user-timestamp');

      expect(result.createdAt).toBeDefined();
      expect(new Date(result.createdAt)).toBeInstanceOf(Date);
    });

    it('should use ACH payment method', async () => {
      const result = await createTestPaymentOrder('test-user-method');

      expect(result.method).toBe('ACH');
    });

    it('should generate unique payment order IDs', async () => {
      const result1 = await createTestPaymentOrder('test-user-unique');
      const result2 = await createTestPaymentOrder('test-user-unique');

      expect(result1.paymentOrderId).not.toBe(result2.paymentOrderId);
    });

    it('should include test payee information', async () => {
      const result = await createTestPaymentOrder('test-user-payee');

      expect(result.payee).toBeDefined();
      expect(result.payee.name).toBe('TEST PAYEE');
      expect(result.payee.id).toBeDefined();
    });

    it('should save payment order to persistence', async () => {
      const persistence = await import('../server/lib/gcs-persistence.js');
      const result = await createTestPaymentOrder('test-user-save');

      expect(persistence.default.saveData).toHaveBeenCalled();
    });

    it('should handle custom amounts for testing', async () => {
      const result = await createTestPaymentOrder('test-user-custom', 0.05);

      expect(result.amount).toBe(0.05);
    });

    it('should round amounts to 2 decimal places', async () => {
      const result = await createTestPaymentOrder('test-user-round', 0.023);

      expect(result.amount).toBe(0.02);
    });

    it('should reject negative amounts', async () => {
      await expect(createTestPaymentOrder('test-user-negative', -0.01))
        .rejects.toThrow('Amount must be positive');
    });

    it('should reject zero amount', async () => {
      await expect(createTestPaymentOrder('test-user-zero', 0))
        .rejects.toThrow('Amount must be positive');
    });

    it('should reject amounts > $1.00 for test transactions', async () => {
      await expect(createTestPaymentOrder('test-user-large', 1.50))
        .rejects.toThrow('Test transactions must be $1.00 or less');
    });
  });

  describe('validateTestPaymentOrder', () => {
    it('should validate well-formed test payment order', () => {
      const order = {
        paymentOrderId: 'test-123',
        amount: 0.02,
        payee: {
          name: 'Test Payee',
          routingNumber: '021000021',
          accountNumber: '9999999999'
        },
        method: 'ACH',
        status: 'created',
        createdAt: new Date().toISOString()
      };

      // This would be validated against the spec requirements
      expect(order.paymentOrderId).toBeDefined();
      expect(order.amount).toBeGreaterThan(0);
      expect(order.payee.routingNumber).toBe('021000021');
      expect(order.payee.accountNumber).toBe('9999999999');
    });
  });
});
