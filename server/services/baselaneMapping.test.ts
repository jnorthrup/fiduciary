/**
 * Tests for Baselane Entity Mapping
 *
 * Test file for property and tenant mapping to fiduciary system
 * Phase: Property Management API
 * Track: baselane_api_20260124
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  mapProperty,
  getPropertyMapping,
  updatePropertySync,
  togglePropertySync,
  removePropertyMapping,
  syncPropertyToEntity,
  getSyncEnabledProperties,
  mapTenant,
  getTenantMapping,
  removeTenantMapping,
  syncTenantToCrm,
  getSyncStatuses
} from './baselaneMapping.js';
import type { Property, Tenant } from './baselaneService.js';

describe('Baselane Entity Mapping - Property Mapping', () => {
  beforeEach(() => {
    // Clear global storage
    delete globalThis['baselane_mappings'];
    vi.clearAllMocks();
  });

  describe('mapProperty()', () => {
    it('should create new property mapping', async () => {
      const mapping = await mapProperty(
        'baselane-prop-123',
        'entity-456',
        'HOLDING_TRUST'
      );

      expect(mapping.baselanePropertyId).toBe('baselane-prop-123');
      expect(mapping.fiduciaryEntityId).toBe('entity-456');
      expect(mapping.propertyType).toBe('HOLDING_TRUST');
      expect(mapping.syncEnabled).toBe(true);
      expect(mapping.createdAt).toBeDefined();
    });

    it('should update existing property mapping', async () => {
      // Create initial mapping
      await mapProperty('baselane-prop-123', 'entity-456', 'HOLDING_TRUST');

      // Update with new entity
      const mapping = await mapProperty(
        'baselane-prop-123',
        'entity-789',
        'OPERATING_LLC'
      );

      expect(mapping.fiduciaryEntityId).toBe('entity-789');
      expect(mapping.propertyType).toBe('OPERATING_LLC');
    });
  });

  describe('getPropertyMapping()', () => {
    it('should return null for non-existent mapping', async () => {
      const mapping = await getPropertyMapping('non-existent');
      expect(mapping).toBeNull();
    });

    it('should return existing mapping', async () => {
      await mapProperty('baselane-prop-123', 'entity-456', 'HOLDING_TRUST');

      const mapping = await getPropertyMapping('baselane-prop-123');
      expect(mapping).not.toBeNull();
      expect(mapping!.baselanePropertyId).toBe('baselane-prop-123');
    });
  });

  describe('togglePropertySync()', () => {
    it('should toggle sync enabled state', async () => {
      await mapProperty('baselane-prop-123', 'entity-456', 'HOLDING_TRUST');

      const disabled = await togglePropertySync('baselane-prop-123');
      expect(disabled).toBe(false);

      const enabled = await togglePropertySync('baselane-prop-123');
      expect(enabled).toBe(true);
    });

    it('should return false for non-existent mapping', async () => {
      const result = await togglePropertySync('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('removePropertyMapping()', () => {
    it('should remove existing mapping', async () => {
      await mapProperty('baselane-prop-123', 'entity-456', 'HOLDING_TRUST');

      const removed = await removePropertyMapping('baselane-prop-123');
      expect(removed).toBe(true);

      const mapping = await getPropertyMapping('baselane-prop-123');
      expect(mapping).toBeNull();
    });

    it('should return false for non-existent mapping', async () => {
      const removed = await removePropertyMapping('non-existent');
      expect(removed).toBe(false);
    });
  });

  describe('syncPropertyToEntity()', () => {
    it('should sync property data to entity', async () => {
      const mapping = {
        baselanePropertyId: 'baselane-prop-123',
        fiduciaryEntityId: 'entity-456',
        propertyType: 'HOLDING_TRUST' as const,
        syncEnabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const property: Property = {
        id: 'baselane-prop-123',
        address: {
          street: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          zip: '94102',
          country: 'US'
        },
        propertyType: 'residential',
        units: 1,
        nickname: 'Sunset Property'
      };

      const result = await syncPropertyToEntity(property, mapping);

      expect(result.entityId).toBe('entity-456');
      expect(result.created).toBe(false); // Not creating new entity in test
    });
  });
});

describe('Baselane Entity Mapping - Tenant Mapping', () => {
  beforeEach(() => {
    delete globalThis['baselane_mappings'];
    vi.clearAllMocks();
  });

  describe('mapTenant()', () => {
    it('should create new tenant mapping', async () => {
      const mapping = await mapTenant(
        'baselane-tenant-123',
        'crm-person-456',
        'entity-789',
        'baselane-prop-123',
        'unit-101'
      );

      expect(mapping.baselaneTenantId).toBe('baselane-tenant-123');
      expect(mapping.fiduciaryCrmPersonId).toBe('crm-person-456');
      expect(mapping.fiduciaryEntityId).toBe('entity-789');
    });
  });

  describe('getTenantMapping()', () => {
    it('should return null for non-existent mapping', async () => {
      const mapping = await getTenantMapping('non-existent');
      expect(mapping).toBeNull();
    });
  });

  describe('removeTenantMapping()', () => {
    it('should remove existing mapping', async () => {
      await mapTenant(
        'baselane-tenant-123',
        'crm-person-456',
        'entity-789',
        'baselane-prop-123',
        'unit-101'
      );

      const removed = await removeTenantMapping('baselane-tenant-123');
      expect(removed).toBe(true);

      const mapping = await getTenantMapping('baselane-tenant-123');
      expect(mapping).toBeNull();
    });
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
        leaseStart: '2026-01-01',
        leaseEnd: '2026-12-31',
        monthlyRent: 2000,
        securityDeposit: 4000
      };

      const result = await syncTenantToCrm(tenant, mapping);

      expect(result.crmPersonId).toBe('crm-person-456');
      expect(result.created).toBe(false);
    });
  });
});

describe('Baselane Entity Mapping - Sync Status', () => {
  beforeEach(() => {
    delete globalThis['baselane_mappings'];
  });

  describe('getSyncEnabledProperties()', () => {
    it('should return only enabled properties', async () => {
      await mapProperty('prop-1', 'entity-1', 'HOLDING_TRUST');
      await mapProperty('prop-2', 'entity-2', 'HOLDING_TRUST');

      // Disable second property
      await togglePropertySync('prop-2');

      const enabled = await getSyncEnabledProperties();

      expect(enabled).toHaveLength(1);
      expect(enabled[0].baselanePropertyId).toBe('prop-1');
      expect(enabled[0].syncEnabled).toBe(true);
    });
  });

  describe('getSyncStatuses()', () => {
    it('should return sync status for enabled properties', async () => {
      await mapProperty('prop-1', 'entity-1', 'HOLDING_TRUST');

      const statuses = await getSyncStatuses();

      expect(statuses).toHaveLength(1);
      expect(statuses[0].propertyId).toBe('prop-1');
      expect(statuses[0].status).toBe('success');
    });
  });
});
