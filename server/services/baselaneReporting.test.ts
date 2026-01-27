/**
 * Tests for Baselane Reporting & Analytics
 *
 * Test file for property performance, portfolio summary, and rent roll
 * Phase: Reporting & Analytics
 * Track: baselane_api_20260124
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BaselaneService } from './baselaneService.js';
import type {
  PropertyPerformance,
  PortfolioSummary,
  RentRollEntry
} from './baselaneService.js';

describe('BaselaneService - Reporting & Analytics', () => {
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
      scope: ['properties', 'tenants', 'rent', 'banking', 'reports']
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getPropertyPerformance()', () => {
    it('should return property performance metrics', async () => {
      const mockPerformance: PropertyPerformance = {
        propertyId: 'prop-1',
        totalRevenue: 24000,
        totalExpenses: 4500,
        netOperatingIncome: 19500,
        occupancyRate: 0.95,
        averageRent: 2000,
        totalCollected: 22800,
        totalOutstanding: 1200,
        period: {
          start: '2026-01-01',
          end: '2026-01-31'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ performance: mockPerformance })
      });

      const result = await service.getPropertyPerformance('prop-1', '2026-01-01', '2026-01-31');

      expect(result.success).toBe(true);
      expect(result.data?.propertyId).toBe('prop-1');
      expect(result.data?.netOperatingIncome).toBe(19500);
      expect(result.data?.occupancyRate).toBe(0.95);
    });

    it('should include period in query params', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ performance: {} })
      });

      await service.getPropertyPerformance('prop-1', '2026-01-01', '2026-01-31');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('startDate=2026-01-01'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('endDate=2026-01-31'),
        expect.any(Object)
      );
    });

    it('should handle API errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await service.getPropertyPerformance('prop-1', '2026-01-01', '2026-01-31');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getPortfolioSummary()', () => {
    it('should return portfolio summary metrics', async () => {
      const mockSummary: PortfolioSummary = {
        totalProperties: 5,
        totalUnits: 12,
        totalRevenue: 120000,
        totalExpenses: 25000,
        netOperatingIncome: 95000,
        occupancyRate: 0.92,
        totalTenants: 11
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ summary: mockSummary })
      });

      const result = await service.getPortfolioSummary();

      expect(result.success).toBe(true);
      expect(result.data?.totalProperties).toBe(5);
      expect(result.data?.totalUnits).toBe(12);
      expect(result.data?.occupancyRate).toBe(0.92);
    });

    it('should handle API errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await service.getPortfolioSummary();

      expect(result.success).toBe(false);
    });
  });

  describe('getRentRoll()', () => {
    it('should return rent roll report', async () => {
      const mockRentRoll: RentRollEntry[] = [
        {
          propertyId: 'prop-1',
          propertyName: 'Sunset Property',
          unitId: 'unit-101',
          unitNumber: '101',
          tenantName: 'John Doe',
          monthlyRent: 2000,
          leaseStart: '2026-01-01',
          leaseEnd: '2026-12-31',
          balance: 0,
          status: 'current'
        },
        {
          propertyId: 'prop-1',
          propertyName: 'Sunset Property',
          unitId: 'unit-102',
          unitNumber: '102',
          tenantName: 'Jane Smith',
          monthlyRent: 2200,
          leaseStart: '2026-01-15',
          leaseEnd: '2026-12-31',
          balance: 2200,
          status: 'late'
        },
        {
          propertyId: 'prop-2',
          propertyName: 'Sunrise Apartments',
          unitId: 'unit-201',
          unitNumber: '201',
          tenantName: 'Bob Johnson',
          monthlyRent: 2500,
          leaseStart: '2026-02-01',
          leaseEnd: '2027-01-31',
          balance: -500,
          status: 'paid_ahead'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ rentRoll: mockRentRoll })
      });

      const result = await service.getRentRoll();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(result.data?.[0].status).toBe('current');
      expect(result.data?.[1].status).toBe('late');
      expect(result.data?.[2].status).toBe('paid_ahead');
    });

    it('should handle API errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await service.getRentRoll();

      expect(result.success).toBe(false);
    });
  });
});
