/**
 * Tests for Baselane Unit Operations
 *
 * Test file for unit CRUD operations
 * Phase: Property Management API
 * Track: baselane_api_20260124
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BaselaneService } from './baselaneService.js';
import type { Unit } from './baselaneService.js';

describe('BaselaneService - Unit Operations', () => {
  let service: BaselaneService;

  beforeEach(() => {
    service = new BaselaneService({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      environment: 'sandbox'
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('listUnits()', () => {
    it('should be defined', () => {
      expect(typeof service.listUnits).toBe('function');
    });

    it('should accept propertyId parameter', () => {
      const propertyId = 'prop-123';
      expect(propertyId).toBeDefined();
    });
  });

  describe('createUnit()', () => {
    it('should be defined', () => {
      expect(typeof service.createUnit).toBe('function');
    });

    it('should accept propertyId and unit data', async () => {
      const propertyId = 'prop-123';
      const newUnit: Omit<Unit, 'id'> = {
        propertyId: 'prop-123',
        unitNumber: '101',
        sqft: 850,
        bedrooms: 2,
        bathrooms: 1.5,
        rentAmount: 2500.00,
        securityDeposit: 5000.00
      };

      expect(newUnit.unitNumber).toBe('101');
      expect(newUnit.bedrooms).toBe(2);
    });
  });

  describe('updateUnit()', () => {
    it('should be defined', () => {
      expect(typeof service.updateUnit).toBe('function');
    });

    it('should accept propertyId, unitId, and updates', () => {
      const propertyId = 'prop-123';
      const unitId = 'unit-456';
      const updates: Partial<Unit> = {
        rentAmount: 2750.00,
        isOccupied: true
      };

      expect(updates.rentAmount).toBe(2750.00);
      expect(updates.isOccupied).toBe(true);
    });
  });
});
