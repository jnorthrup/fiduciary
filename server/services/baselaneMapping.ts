/**
 * Baselane Entity Mapping
 *
 * Maps Baselane properties and tenants to fiduciary system entities
 * Track: baselane_api_20260124
 */

import type { Property, Unit, Tenant } from './baselaneService.js';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Property mapping configuration
 */
export interface BaselanePropertyMapping {
  baselanePropertyId: string;
  fiduciaryEntityId: string;
  propertyType: 'HOLDING_TRUST' | 'OPERATING_LLC';
  syncEnabled: boolean;
  lastSyncAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Tenant mapping configuration
 */
export interface BaselaneTenantMapping {
  baselaneTenantId: string;
  fiduciaryCrmPersonId: string;
  fiduciaryEntityId: string;
  propertyId: string;
  unitId: string;
  lastSyncAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Sync status for mapped entities
 */
export interface SyncStatus {
  propertyId: string;
  lastSync: string;
  recordsSynced: number;
  status: 'success' | 'partial' | 'failed';
  errors?: string[];
}

// ============================================================================
// MAPPING STORAGE
// ============================================================================

const MAPPING_STORAGE_KEY = 'baselane_mappings';

/**
 * Get all property mappings
 */
export async function getPropertyMappings(): Promise<BaselanePropertyMapping[]> {
  // In a real implementation, this would query the persistence layer
  // For now, we return in-memory storage
  const stored = globalThis[MAPPING_STORAGE_KEY];
  return stored?.properties || [];
}

/**
 * Save property mappings
 */
export async function savePropertyMappings(mappings: BaselanePropertyMapping[]): Promise<void> {
  // In a real implementation, this would save to the persistence layer
  globalThis[MAPPING_STORAGE_KEY] = {
    properties: mappings,
    tenants: globalThis[MAPPING_STORAGE_KEY]?.tenants || []
  };
}

/**
 * Get all tenant mappings
 */
export async function getTenantMappings(): Promise<BaselaneTenantMapping[]> {
  const stored = globalThis[MAPPING_STORAGE_KEY];
  return stored?.tenants || [];
}

/**
 * Save tenant mappings
 */
export async function saveTenantMappings(mappings: BaselaneTenantMapping[]): Promise<void> {
  globalThis[MAPPING_STORAGE_KEY] = {
    properties: globalThis[MAPPING_STORAGE_KEY]?.properties || [],
    tenants: mappings
  };
}

// ============================================================================
// PROPERTY MAPPING OPERATIONS
// ============================================================================

/**
 * Create a property mapping
 */
export async function mapProperty(
  baselanePropertyId: string,
  fiduciaryEntityId: string,
  propertyType: 'HOLDING_TRUST' | 'OPERATING_LLC'
): Promise<BaselanePropertyMapping> {
  const mappings = await getPropertyMappings();

  // Check if mapping already exists
  const existing = mappings.find(m => m.baselanePropertyId === baselanePropertyId);
  if (existing) {
    // Update existing mapping
    existing.fiduciaryEntityId = fiduciaryEntityId;
    existing.propertyType = propertyType;
    existing.updatedAt = new Date().toISOString();
    await savePropertyMappings(mappings);
    return existing;
  }

  // Create new mapping
  const mapping: BaselanePropertyMapping = {
    baselanePropertyId,
    fiduciaryEntityId,
    propertyType,
    syncEnabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  mappings.push(mapping);
  await savePropertyMappings(mappings);

  console.log('[Baselane Mapping] Property mapped:', {
    baselanePropertyId,
    fiduciaryEntityId,
    propertyType
  });

  return mapping;
}

/**
 * Get property mapping by Baselane property ID
 */
export async function getPropertyMapping(
  baselanePropertyId: string
): Promise<BaselanePropertyMapping | null> {
  const mappings = await getPropertyMappings();
  return mappings.find(m => m.baselanePropertyId === baselanePropertyId) || null;
}

/**
 * Update property sync status
 */
export async function updatePropertySync(
  baselanePropertyId: string,
  syncStatus: SyncStatus
): Promise<void> {
  const mappings = await getPropertyMappings();
  const mapping = mappings.find(m => m.baselanePropertyId === baselanePropertyId);

  if (mapping) {
    mapping.lastSyncAt = syncStatus.lastSync;
    mapping.updatedAt = new Date().toISOString();
    await savePropertyMappings(mappings);
  }
}

/**
 * Toggle sync for a property
 */
export async function togglePropertySync(
  baselanePropertyId: string
): Promise<boolean> {
  const mappings = await getPropertyMappings();
  const mapping = mappings.find(m => m.baselanePropertyId === baselanePropertyId);

  if (mapping) {
    mapping.syncEnabled = !mapping.syncEnabled;
    mapping.updatedAt = new Date().toISOString();
    await savePropertyMappings(mappings);

    console.log('[Baselane Mapping] Property sync toggled:', {
      baselanePropertyId,
      syncEnabled: mapping.syncEnabled
    });

    return mapping.syncEnabled;
  }

  return false;
}

/**
 * Remove property mapping
 */
export async function removePropertyMapping(baselanePropertyId: string): Promise<boolean> {
  const mappings = await getPropertyMappings();
  const index = mappings.findIndex(m => m.baselanePropertyId === baselanePropertyId);

  if (index >= 0) {
    mappings.splice(index, 1);
    await savePropertyMappings(mappings);

    console.log('[Baselane Mapping] Property mapping removed:', {
      baselanePropertyId
    });

    return true;
  }

  return false;
}

// ============================================================================
// TENANT MAPPING OPERATIONS
// ============================================================================

/**
 * Create a tenant mapping
 */
export async function mapTenant(
  baselaneTenantId: string,
  fiduciaryCrmPersonId: string,
  fiduciaryEntityId: string,
  propertyId: string,
  unitId: string
): Promise<BaselaneTenantMapping> {
  const mappings = await getTenantMappings();

  // Check if mapping already exists
  const existing = mappings.find(m => m.baselaneTenantId === baselaneTenantId);
  if (existing) {
    // Update existing mapping
    existing.fiduciaryCrmPersonId = fiduciaryCrmPersonId;
    existing.fiduciaryEntityId = fiduciaryEntityId;
    existing.propertyId = propertyId;
    existing.unitId = unitId;
    existing.updatedAt = new Date().toISOString();
    await saveTenantMappings(mappings);
    return existing;
  }

  // Create new mapping
  const mapping: BaselaneTenantMapping = {
    baselaneTenantId,
    fiduciaryCrmPersonId,
    fiduciaryEntityId,
    propertyId,
    unitId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  mappings.push(mapping);
  await saveTenantMappings(mappings);

  console.log('[Baselane Mapping] Tenant mapped:', {
    baselaneTenantId,
    fiduciaryCrmPersonId,
    fiduciaryEntityId,
    propertyId,
    unitId
  });

  return mapping;
}

/**
 * Get tenant mapping by Baselane tenant ID
 */
export async function getTenantMapping(
  baselaneTenantId: string
): Promise<BaselaneTenantMapping | null> {
  const mappings = await getTenantMappings();
  return mappings.find(m => m.baselaneTenantId === baselaneTenantId) || null;
}

/**
 * Remove tenant mapping
 */
export async function removeTenantMapping(baselaneTenantId: string): Promise<boolean> {
  const mappings = await getTenantMappings();
  const index = mappings.findIndex(m => m.baselaneTenantId === baselaneTenantId);

  if (index >= 0) {
    mappings.splice(index, 1);
    await saveTenantMappings(mappings);

    console.log('[Baselane Mapping] Tenant mapping removed:', {
      baselaneTenantId
    });

    return true;
  }

  return false;
}

// ============================================================================
// SYNC OPERATIONS
// ============================================================================

/**
 * Sync a Baselane property to fiduciary entity
 *
 * This function takes a Baselane property and creates/updates
 * the corresponding fiduciary entity.
 */
export async function syncPropertyToEntity(
  property: Property,
  mapping: BaselanePropertyMapping
): Promise<{ entityId: string; created: boolean }> {
  // In a real implementation, this would:
  // 1. Check if entity exists (by mapping)
  // 2. If not, create new entity with property data
  // 3. Update entity with latest property data
  // 4. Store property metadata in entity

  console.log('[Baselane Sync] Syncing property to entity:', {
    baselanePropertyId: property.id,
    fiduciaryEntityId: mapping.fiduciaryEntityId,
    propertyNickname: property.nickname
  });

  // Return entity ID and whether it was created
  return {
    entityId: mapping.fiduciaryEntityId,
    created: false // Would be true if entity was created
  };
}

/**
 * Sync a Baselane tenant to CRM person
 *
 * This function takes a Baselane tenant and creates/updates
 * the corresponding CRM person entry.
 */
export async function syncTenantToCrm(
  tenant: Tenant,
  mapping: BaselaneTenantMapping
): Promise<{ crmPersonId: string; created: boolean }> {
  // In a real implementation, this would:
  // 1. Check if CRM person exists (by mapping)
  // 2. If not, create new CRM person with tenant data
  // 3. Update CRM person with latest tenant data
  // 4. Link CRM person to entity

  console.log('[Baselane Sync] Syncing tenant to CRM:', {
    baselaneTenantId: tenant.id,
    fiduciaryCrmPersonId: mapping.fiduciaryCrmPersonId,
    tenantName: `${tenant.firstName} ${tenant.lastName}`
  });

  return {
    crmPersonId: mapping.fiduciaryCrmPersonId,
    created: false
  };
}

/**
 * Get all enabled properties for sync
 */
export async function getSyncEnabledProperties(): Promise<BaselanePropertyMapping[]> {
  const mappings = await getPropertyMappings();
  return mappings.filter(m => m.syncEnabled);
}

/**
 * Get sync status for all enabled properties
 */
export async function getSyncStatuses(): Promise<SyncStatus[]> {
  const mappings = await getSyncEnabledProperties();

  return mappings.map(mapping => ({
    propertyId: mapping.baselanePropertyId,
    lastSync: mapping.lastSyncAt || 'Never',
    recordsSynced: 0, // Would be calculated from actual sync data
    status: 'success' as const
  }));
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Property mapping
  mapProperty,
  getPropertyMapping,
  updatePropertySync,
  togglePropertySync,
  removePropertyMapping,
  syncPropertyToEntity,
  getSyncEnabledProperties,

  // Tenant mapping
  mapTenant,
  getTenantMapping,
  removeTenantMapping,
  syncTenantToCrm,

  // Sync status
  getSyncStatuses
};
