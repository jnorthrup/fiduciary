/**
 * Tests for Baselane Rent Collection
 *
 * Test file for rent charge operations
 * Phase: Rent Collection & Payments
 * Track: baselane_api_20260124
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BaselaneService } from './baselaneService.js';
import type { RentCharge } from './baselaneService.js';

describe('BaselaneService - Rent Charge Operations', () => {
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

  describe('createRentCharge()', () => {
    it('should create new rent charge', async () => {
      const newCharge: Omit<RentCharge, 'id'> = {
        tenantId: 'tenant-1',
        propertyId: 'prop-1',
        unitId: 'unit-101',
        amount: 2000,
        dueDate: '2026-02-01',
        type: 'rent',
        description: 'February 2026 rent'
      };

      const createdCharge: RentCharge = {
        ...newCharge,
        id: 'charge-1',
        status: 'pending'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ charge: createdCharge })
      });

      const result = await service.createRentCharge(newCharge);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('charge-1');
      expect(result.data?.amount).toBe(2000);
    });

    it('should handle validation errors', async () => {
      const invalidCharge = {
        tenantId: '',
        propertyId: 'prop-1',
        unitId: 'unit-101',
        amount: -100,
        dueDate: 'invalid-date',
        type: 'rent' as const
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid charge data',
            details: { tenantId: ['Required'], amount: ['Must be positive'] }
          }
        })
      });

      const result = await service.createRentCharge(invalidCharge);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('should make POST request to /rent/charges endpoint', async () => {
      const newCharge: Omit<RentCharge, 'id'> = {
        tenantId: 'tenant-1',
        propertyId: 'prop-1',
        unitId: 'unit-101',
        amount: 2000,
        dueDate: '2026-02-01',
        type: 'rent'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ charge: { ...newCharge, id: 'charge-1' } })
      });

      await service.createRentCharge(newCharge);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://sandbox-api.baselane.com/v1/rent/charges',
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
  });

  describe('getRentCharges()', () => {
    it('should return list of rent charges', async () => {
      const mockCharges: RentCharge[] = [
        {
          id: 'charge-1',
          tenantId: 'tenant-1',
          propertyId: 'prop-1',
          unitId: 'unit-101',
          amount: 2000,
          dueDate: '2026-02-01',
          type: 'rent',
          status: 'pending'
        },
        {
          id: 'charge-2',
          tenantId: 'tenant-2',
          propertyId: 'prop-1',
          unitId: 'unit-102',
          amount: 2500,
          dueDate: '2026-02-01',
          type: 'rent',
          status: 'paid'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ charges: mockCharges })
      });

      const result = await service.getRentCharges();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].amount).toBe(2000);
    });

    it('should filter charges by tenant ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ charges: [] })
      });

      await service.getRentCharges('tenant-1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('tenantId=tenant-1'),
        expect.any(Object)
      );
    });

    it('should handle API errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await service.getRentCharges();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('voidRentCharge()', () => {
    it('should void existing rent charge', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const result = await service.voidRentCharge('charge-1');

      expect(result.success).toBe(true);
    });

    it('should handle non-existent charge', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: { message: 'Charge not found' } })
      });

      const result = await service.voidRentCharge('non-existent');

      expect(result.success).toBe(false);
    });

    it('should make DELETE request to /rent/charges/{chargeId}', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      await service.voidRentCharge('charge-1');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://sandbox-api.baselane.com/v1/rent/charges/charge-1',
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });
  });
});
