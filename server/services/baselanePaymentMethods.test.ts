/**
 * Tests for Baselane Payment Methods
 *
 * Test file for payment method operations
 * Phase: Rent Collection & Payments - Payment Methods
 * Track: baselane_api_20260124
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BaselaneService } from './baselaneService.js';
import type { PaymentMethod } from './baselaneService.js';

describe('BaselaneService - Payment Method Operations', () => {
  let service: BaselaneService;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;

    service = new BaselaneService({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      environment: 'sandbox'
    });

    service.setAuthToken({
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      expiresAt: Date.now() + 3600000,
      scope: ['properties', 'tenants', 'rent']
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('listPaymentMethods()', () => {
    it('should return list of payment methods for tenant', async () => {
      const mockMethods: PaymentMethod[] = [
        {
          id: 'pm-1',
          tenantId: 'tenant-1',
          type: 'bank_account',
          isDefault: true,
          bankAccount: {
            last4: '1234',
            bankName: 'Chase Bank',
            accountType: 'checking'
          }
        },
        {
          id: 'pm-2',
          tenantId: 'tenant-1',
          type: 'card',
          isDefault: false,
          card: {
            last4: '5678',
            brand: 'Visa',
            expiry: '12/27'
          }
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ payment_methods: mockMethods })
      });

      const result = await service.listPaymentMethods('tenant-1');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].type).toBe('bank_account');
      expect(result.data?.[1].type).toBe('card');
    });

    it('should handle API errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await service.listPaymentMethods('tenant-1');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should make GET request to /tenants/{tenantId}/payment-methods', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ payment_methods: [] })
      });

      await service.listPaymentMethods('tenant-1');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://sandbox-api.baselane.com/v1/tenants/tenant-1/payment-methods',
        expect.objectContaining({
          method: 'GET'
        })
      );
    });
  });

  describe('addBankAccount()', () => {
    it('should add new bank account payment method', async () => {
      const accountDetails = {
        accountNumber: '123456789',
        routingNumber: '021000021',
        accountType: 'checking' as const
      };

      const newMethod: PaymentMethod = {
        id: 'pm-new-1',
        tenantId: 'tenant-1',
        type: 'bank_account',
        isDefault: false,
        bankAccount: {
          last4: '6789',
          bankName: 'JPMorgan Chase',
          accountType: 'checking'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ payment_method: newMethod })
      });

      const result = await service.addBankAccount('tenant-1', accountDetails);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('pm-new-1');
      expect(result.data?.type).toBe('bank_account');
    });

    it('should handle invalid routing number', async () => {
      const accountDetails = {
        accountNumber: '123456789',
        routingNumber: '000000000',
        accountType: 'checking' as const
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            code: 'INVALID_ROUTING_NUMBER',
            message: 'Invalid routing number'
          }
        })
      });

      const result = await service.addBankAccount('tenant-1', accountDetails);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_ROUTING_NUMBER');
    });

    it('should make POST request to /tenants/{tenantId}/payment-methods/bank-account', async () => {
      const accountDetails = {
        accountNumber: '123456789',
        routingNumber: '021000021',
        accountType: 'checking' as const
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ payment_method: { id: 'pm-1', type: 'bank_account' } })
      });

      await service.addBankAccount('tenant-1', accountDetails);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://sandbox-api.baselane.com/v1/tenants/tenant-1/payment-methods/bank-account',
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
  });

  describe('verifyPaymentMethod()', () => {
    it('should verify payment method with micro-deposits', async () => {
      const verificationDetails = {
        amount1: 0.15,
        amount2: 0.28
      };

      const verifiedMethod: PaymentMethod = {
        id: 'pm-1',
        tenantId: 'tenant-1',
        type: 'bank_account',
        isDefault: true,
        bankAccount: {
          last4: '1234',
          bankName: 'Chase Bank',
          accountType: 'checking'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ payment_method: verifiedMethod })
      });

      const result = await service.verifyPaymentMethod('tenant-1', 'pm-1', verificationDetails);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('pm-1');
    });

    it('should handle incorrect micro-deposit amounts', async () => {
      const verificationDetails = {
        amount1: 0.01,
        amount2: 0.02
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            code: 'VERIFICATION_FAILED',
            message: 'Micro-deposit amounts do not match'
          }
        })
      });

      const result = await service.verifyPaymentMethod('tenant-1', 'pm-1', verificationDetails);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VERIFICATION_FAILED');
    });

    it('should make POST request to /tenants/{tenantId}/payment-methods/{methodId}/verify', async () => {
      const verificationDetails = {
        amount1: 0.15,
        amount2: 0.28
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ payment_method: { id: 'pm-1', verified: true } })
      });

      await service.verifyPaymentMethod('tenant-1', 'pm-1', verificationDetails);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://sandbox-api.baselane.com/v1/tenants/tenant-1/payment-methods/pm-1/verify',
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
  });
});
