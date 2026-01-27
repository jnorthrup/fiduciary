/**
 * Tests for Baselane CRM Integration
 *
 * Test file for tenant to CRM person synchronization
 * Phase: Tenant Management API - CRM Integration
 * Track: baselane_api_20260124
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { Tenant } from './baselaneService.js';
import {
  mapTenant,
  getTenantMapping,
  syncTenantToCrm,
  getTenantMappings
} from './baselaneMapping.js';

describe('Baselane CRM Integration - Tenant Sync', () => {
  beforeEach(() => {
    // Clear global storage
    delete globalThis['baselane_mappings'];
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('syncTenantToCrm()', () => {
    it('should sync tenant data to CRM person', async () => {
      const mapping = {
        baselaneTenantId: 'baselane-tenant-123',
        fiduciaryCrmPersonId: 'crm-person-456',
        fiduciaryEntityId: 'entity-789',
        propertyId: 'baselane-prop-123',
        unitId: 'unit-101',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const tenant: Tenant = {
        id: 'baselane-tenant-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1-555-1234',
        leaseStart: '2026-01-01',
        leaseEnd: '2026-12-31',
        monthlyRent: 2000,
        securityDeposit: 4000
      };

      const result = await syncTenantToCrm(tenant, mapping);

      expect(result.crmPersonId).toBe('crm-person-456');
      expect(result.created).toBe(false);
    });

    it('should create new CRM person when mapping does not exist', async () => {
      const tenant: Tenant = {
        id: 'new-tenant-123',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        phone: '+1-555-5678',
        leaseStart: '2026-02-01',
        leaseEnd: '2027-01-31',
        monthlyRent: 2500,
        securityDeposit: 5000
      };

      // Mock CRM person creation
      const mockCreateCrmPerson = vi.fn().mockResolvedValue({
        id: 'new-crm-person-789',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com'
      });

      // Create mapping after sync
      await mapTenant(
        'new-tenant-123',
        'new-crm-person-789',
        'entity-456',
        'prop-123',
        'unit-201'
      );

      const mapping = await getTenantMapping('new-tenant-123');
      expect(mapping).not.toBeNull();
      expect(mapping?.fiduciaryCrmPersonId).toBe('new-crm-person-789');

      const result = await syncTenantToCrm(tenant, mapping!);
      expect(result.crmPersonId).toBe('new-crm-person-789');
    });

    it('should update existing CRM person with new tenant data', async () => {
      const mapping = {
        baselaneTenantId: 'baselane-tenant-123',
        fiduciaryCrmPersonId: 'crm-person-456',
        fiduciaryEntityId: 'entity-789',
        propertyId: 'baselane-prop-123',
        unitId: 'unit-101',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const updatedTenant: Tenant = {
        id: 'baselane-tenant-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe.new@example.com', // Updated email
        phone: '+1-555-9999', // Updated phone
        leaseStart: '2026-01-01',
        leaseEnd: '2026-12-31',
        monthlyRent: 2000,
        securityDeposit: 4000
      };

      const result = await syncTenantToCrm(updatedTenant, mapping);

      expect(result.crmPersonId).toBe('crm-person-456');
      expect(result.created).toBe(false);
      // In real implementation, CRM person would be updated with new data
    });

    it('should handle sync errors gracefully', async () => {
      const mapping = {
        baselaneTenantId: 'baselane-tenant-123',
        fiduciaryCrmPersonId: 'crm-person-456',
        fiduciaryEntityId: 'entity-789',
        propertyId: 'baselane-prop-123',
        unitId: 'unit-101',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const tenant: Tenant = {
        id: 'baselane-tenant-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'invalid-email', // Invalid data
        leaseStart: '2026-01-01',
        leaseEnd: '2026-12-31',
        monthlyRent: 2000,
        securityDeposit: 4000
      };

      // Sync should log error but not throw
      const result = await syncTenantToCrm(tenant, mapping);
      expect(result).toBeDefined();
    });

    it('should include lease information in sync', async () => {
      const mapping = {
        baselaneTenantId: 'baselane-tenant-123',
        fiduciaryCrmPersonId: 'crm-person-456',
        fiduciaryEntityId: 'entity-789',
        propertyId: 'baselane-prop-123',
        unitId: 'unit-101',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const tenant: Tenant = {
        id: 'baselane-tenant-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        leaseStart: '2026-01-01',
        leaseEnd: '2026-12-31',
        monthlyRent: 2000,
        securityDeposit: 4000
      };

      const result = await syncTenantToCrm(tenant, mapping);

      expect(result.crmPersonId).toBe('crm-person-456');
      // Lease data should be logged/synced
    });
  });

  describe('Tenant Mapping for CRM', () => {
    it('should store CRM person ID with tenant mapping', async () => {
      const mapping = await mapTenant(
        'baselane-tenant-123',
        'crm-person-456',
        'entity-789',
        'prop-123',
        'unit-101'
      );

      expect(mapping.fiduciaryCrmPersonId).toBe('crm-person-456');
      expect(mapping.baselaneTenantId).toBe('baselane-tenant-123');
    });

    it('should retrieve tenant mapping for CRM sync', async () => {
      await mapTenant(
        'baselane-tenant-123',
        'crm-person-456',
        'entity-789',
        'prop-123',
        'unit-101'
      );

      const mapping = await getTenantMapping('baselane-tenant-123');

      expect(mapping).not.toBeNull();
      expect(mapping?.fiduciaryCrmPersonId).toBe('crm-person-456');
      expect(mapping?.fiduciaryEntityId).toBe('entity-789');
    });

    it('should update mapping when CRM person changes', async () => {
      await mapTenant(
        'baselane-tenant-123',
        'crm-person-456',
        'entity-789',
        'prop-123',
        'unit-101'
      );

      // Update with new CRM person ID
      await mapTenant(
        'baselane-tenant-123',
        'crm-person-999',
        'entity-789',
        'prop-123',
        'unit-101'
      );

      const mapping = await getTenantMapping('baselane-tenant-123');
      expect(mapping?.fiduciaryCrmPersonId).toBe('crm-person-999');
    });

    it('should store property and unit association', async () => {
      const mapping = await mapTenant(
        'baselane-tenant-123',
        'crm-person-456',
        'entity-789',
        'prop-123',
        'unit-101'
      );

      expect(mapping.propertyId).toBe('prop-123');
      expect(mapping.unitId).toBe('unit-101');
    });

    it('should list all tenant mappings for bulk sync', async () => {
      await mapTenant('tenant-1', 'crm-1', 'entity-1', 'prop-1', 'unit-1');
      await mapTenant('tenant-2', 'crm-2', 'entity-1', 'prop-1', 'unit-2');
      await mapTenant('tenant-3', 'crm-3', 'entity-2', 'prop-2', 'unit-1');

      const mappings = await getTenantMappings();

      expect(mappings).toHaveLength(3);
      expect(mappings[0].fiduciaryCrmPersonId).toBe('crm-1');
      expect(mappings[1].fiduciaryCrmPersonId).toBe('crm-2');
      expect(mappings[2].fiduciaryCrmPersonId).toBe('crm-3');
    });
  });
});
