/**
 * Tests for Baselane Payment Processing
 *
 * Test file for payment operations
 * Phase: Rent Collection & Payments - Payment Processing
 * Track: baselane_api_20260124
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BaselaneService } from './baselaneService.js';
import type { Payment } from './baselaneService.js';

describe('BaselaneService - Payment Operations', () => {
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

  describe('initiatePayment()', () => {
    it('should initiate new payment', async () => {
      const newPayment = {
        chargeId: 'charge-1',
        tenantId: 'tenant-1',
        amount: 2000,
        paymentMethod: 'bank_account' as const,
        paymentMethodId: 'pm-1'
      };

      const createdPayment: Payment = {
        ...newPayment,
        id: 'payment-1',
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ payment: createdPayment })
      });

      const result = await service.initiatePayment(newPayment);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('payment-1');
      expect(result.data?.status).toBe('pending');
    });

    it('should handle insufficient funds error', async () => {
      const payment = {
        chargeId: 'charge-1',
        tenantId: 'tenant-1',
        amount: 2000,
        paymentMethod: 'bank_account' as const,
        paymentMethodId: 'pm-1'
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            code: 'INSUFFICIENT_FUNDS',
            message: 'Insufficient funds for payment'
          }
        })
      });

      const result = await service.initiatePayment(payment);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INSUFFICIENT_FUNDS');
    });

    it('should make POST request to /rent/payments endpoint', async () => {
      const payment = {
        chargeId: 'charge-1',
        tenantId: 'tenant-1',
        amount: 2000,
        paymentMethod: 'card' as const,
        paymentMethodId: 'pm-1'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ payment: { ...payment, id: 'payment-1' } })
      });

      await service.initiatePayment(payment);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://sandbox-api.baselane.com/v1/rent/payments',
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
  });

  describe('getPayments()', () => {
    it('should return list of payments', async () => {
      const mockPayments: Payment[] = [
        {
          id: 'payment-1',
          chargeId: 'charge-1',
          tenantId: 'tenant-1',
          amount: 2000,
          status: 'completed',
          paymentMethod: 'bank_account',
          paymentMethodId: 'pm-1',
          createdAt: '2026-01-15T10:00:00Z',
          completedAt: '2026-01-15T10:01:00Z'
        },
        {
          id: 'payment-2',
          chargeId: 'charge-2',
          tenantId: 'tenant-2',
          amount: 2500,
          status: 'pending',
          paymentMethod: 'card',
          paymentMethodId: 'pm-2',
          createdAt: '2026-01-16T10:00:00Z'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ payments: mockPayments })
      });

      const result = await service.getPayments();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].status).toBe('completed');
      expect(result.data?.[1].status).toBe('pending');
    });

    it('should filter payments by tenant ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ payments: [] })
      });

      await service.getPayments('tenant-1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('tenantId=tenant-1'),
        expect.any(Object)
      );
    });

    it('should handle API errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await service.getPayments();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getPaymentStatus()', () => {
    it('should return payment status', async () => {
      const mockPayment: Payment = {
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

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ payment: mockPayment })
      });

      const result = await service.getPaymentStatus('payment-1');

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('completed');
    });

    it('should handle non-existent payment', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: { message: 'Payment not found' } })
      });

      const result = await service.getPaymentStatus('non-existent');

      expect(result.success).toBe(false);
    });
  });

  describe('refundPayment()', () => {
    it('should refund payment', async () => {
      const refundedPayment: Payment = {
        id: 'payment-1',
        chargeId: 'charge-1',
        tenantId: 'tenant-1',
        amount: 2000,
        status: 'refunded',
        paymentMethod: 'bank_account',
        paymentMethodId: 'pm-1',
        createdAt: '2026-01-15T10:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ payment: refundedPayment })
      });

      const result = await service.refundPayment('payment-1', 2000, 'Tenant request');

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('refunded');
    });

    it('should handle refund of already refunded payment', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            code: 'ALREADY_REFUNDED',
            message: 'Payment has already been refunded'
          }
        })
      });

      const result = await service.refundPayment('payment-1', 2000);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('ALREADY_REFUNDED');
    });

    it('should make POST request to /rent/payments/{paymentId}/refund', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ payment: { id: 'payment-1', status: 'refunded' } })
      });

      await service.refundPayment('payment-1', 2000, 'Tenant request');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://sandbox-api.baselane.com/v1/rent/payments/payment-1/refund',
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
  });
});
