/**
 * Tests for Baselane Tenant Operations
 *
 * Test file for tenant CRUD operations
 * Phase: Tenant Management API
 * Track: baselane_api_20260124
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BaselaneService } from './baselaneService.js';
import type { Tenant } from './baselaneService.js';

describe('BaselaneService - Tenant Operations', () => {
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

    // Set mock auth token
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

  describe('getTenants()', () => {
    it('should return list of tenants', async () => {
      const mockTenants: Tenant[] = [
        {
          id: 'tenant-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          leaseStart: '2026-01-01',
          leaseEnd: '2026-12-31',
          monthlyRent: 2000,
          securityDeposit: 4000
        },
        {
          id: 'tenant-2',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@example.com',
          leaseStart: '2026-02-01',
          leaseEnd: '2027-01-31',
          monthlyRent: 2500,
          securityDeposit: 5000
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tenants: mockTenants })
      });

      const result = await service.getTenants();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].firstName).toBe('John');
      expect(result.data?.[1].firstName).toBe('Jane');
    });

    it('should handle API errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await service.getTenants();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Network error');
    });

    it('should make GET request to /tenants endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tenants: [] })
      });

      await service.getTenants();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://sandbox-api.baselane.com/v1/tenants',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-access-token'
          })
        })
      );
    });
  });

  describe('getTenant()', () => {
    it('should return single tenant by ID', async () => {
      const mockTenant: Tenant = {
        id: 'tenant-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1-555-1234',
        unitId: 'unit-101',
        propertyId: 'prop-1',
        leaseStart: '2026-01-01',
        leaseEnd: '2026-12-31',
        monthlyRent: 2000,
        securityDeposit: 4000
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tenant: mockTenant })
      });

      const result = await service.getTenant('tenant-1');

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('tenant-1');
      expect(result.data?.firstName).toBe('John');
      expect(result.data?.email).toBe('john.doe@example.com');
    });

    it('should handle non-existent tenant', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: { message: 'Tenant not found' } })
      });

      const result = await service.getTenant('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should make GET request to /tenants/{tenantId} endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tenant: { id: 'tenant-1' } })
      });

      await service.getTenant('tenant-1');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://sandbox-api.baselane.com/v1/tenants/tenant-1',
        expect.objectContaining({
          method: 'GET'
        })
      );
    });
  });

  describe('createTenant()', () => {
    it('should create new tenant', async () => {
      const newTenant: Omit<Tenant, 'id'> = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1-555-1234',
        unitId: 'unit-101',
        propertyId: 'prop-1',
        leaseStart: '2026-01-01',
        leaseEnd: '2026-12-31',
        monthlyRent: 2000,
        securityDeposit: 4000
      };

      const createdTenant: Tenant = {
        ...newTenant,
        id: 'tenant-new-1'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tenant: createdTenant })
      });

      const result = await service.createTenant(newTenant);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('tenant-new-1');
      expect(result.data?.firstName).toBe('John');
    });

    it('should handle validation errors', async () => {
      const invalidTenant = {
        firstName: '',
        lastName: 'Doe',
        email: 'invalid-email',
        leaseStart: '2026-01-01',
        leaseEnd: '2026-12-31',
        monthlyRent: 2000,
        securityDeposit: 4000
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid tenant data',
            details: { firstName: ['First name is required'], email: ['Invalid email format'] }
          }
        })
      });

      const result = await service.createTenant(invalidTenant as Omit<Tenant, 'id'>);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('should make POST request to /tenants endpoint', async () => {
      const newTenant: Omit<Tenant, 'id'> = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        leaseStart: '2026-01-01',
        leaseEnd: '2026-12-31',
        monthlyRent: 2000,
        securityDeposit: 4000
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tenant: { ...newTenant, id: 'tenant-1' } })
      });

      await service.createTenant(newTenant);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://sandbox-api.baselane.com/v1/tenants',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('John')
        })
      );
    });
  });

  describe('updateTenant()', () => {
    it('should update existing tenant', async () => {
      const updates: Partial<Tenant> = {
        monthlyRent: 2200,
        phone: '+1-555-5678'
      };

      const updatedTenant: Tenant = {
        id: 'tenant-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1-555-5678',
        leaseStart: '2026-01-01',
        leaseEnd: '2026-12-31',
        monthlyRent: 2200,
        securityDeposit: 4000
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tenant: updatedTenant })
      });

      const result = await service.updateTenant('tenant-1', updates);

      expect(result.success).toBe(true);
      expect(result.data?.monthlyRent).toBe(2200);
      expect(result.data?.phone).toBe('+1-555-5678');
    });

    it('should handle non-existent tenant update', async () => {
      const updates: Partial<Tenant> = { monthlyRent: 2500 };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: { message: 'Tenant not found' } })
      });

      const result = await service.updateTenant('non-existent', updates);

      expect(result.success).toBe(false);
    });

    it('should make PATCH request to /tenants/{tenantId} endpoint', async () => {
      const updates: Partial<Tenant> = { monthlyRent: 2200 };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tenant: { id: 'tenant-1', monthlyRent: 2200 } })
      });

      await service.updateTenant('tenant-1', updates);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://sandbox-api.baselane.com/v1/tenants/tenant-1',
        expect.objectContaining({
          method: 'PATCH'
        })
      );
    });
  });

  describe('deleteTenant()', () => {
    it('should delete tenant', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const result = await service.deleteTenant('tenant-1');

      expect(result.success).toBe(true);
    });

    it('should handle deletion errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await service.deleteTenant('tenant-1');

      expect(result.success).toBe(false);
    });
  });
});
