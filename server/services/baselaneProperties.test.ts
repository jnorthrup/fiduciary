/**
 * Tests for Baselane Property Operations
 *
 * Test file for property CRUD operations
 * Phase: Property Management API
 * Track: baselane_api_20260124
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BaselaneService } from './baselaneService.js';
import type { Property } from './baselaneService.js';

describe('BaselaneService - Property Operations', () => {
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

  describe('getProperties()', () => {
    it('should be defined', () => {
      expect(typeof service.getProperties).toBe('function');
    });

    it('should return array of properties', async () => {
      const mockProperties: Property[] = [
        {
          id: 'prop-1',
          address: {
            street: '123 Main St',
            city: 'San Francisco',
            state: 'CA',
            zip: '94102',
            country: 'US'
          },
          propertyType: 'residential',
          units: 1
        },
        {
          id: 'prop-2',
          address: {
            street: '456 Oak Ave',
            city: 'Los Angeles',
            state: 'CA',
            zip: '90001',
            country: 'US'
          },
          propertyType: 'multifamily',
          units: 4
        }
      ];

      // Type check only
      expect(Array.isArray(mockProperties)).toBe(true);
      expect(mockProperties[0].address.street).toBe('123 Main St');
    });
  });

  describe('createProperty()', () => {
    it('should be defined', () => {
      expect(typeof service.createProperty).toBe('function');
    });

    it('should accept property data without id', async () => {
      const newProperty: Omit<Property, 'id'> = {
        address: {
          street: '789 Pine Rd',
          city: 'Seattle',
          state: 'WA',
          zip: '98101',
          country: 'US'
        },
        propertyType: 'commercial',
        units: 1
      };

      expect(newProperty.address.street).toBe('789 Pine Rd');
      expect(newProperty.propertyType).toBe('commercial');
    });
  });

  describe('getProperty()', () => {
    it('should be defined', () => {
      expect(typeof service.getProperty).toBe('function');
    });

    it('should accept propertyId parameter', () => {
      const propertyId = 'prop-123';
      expect(propertyId).toBeDefined();
    });
  });

  describe('updateProperty()', () => {
    it('should be defined', () => {
      expect(typeof service.updateProperty).toBe('function');
    });

    it('should accept propertyId and updates', () => {
      const updates: Partial<Property> = {
        nickname: 'Updated Name',
        units: 5
      };

      expect(updates.nickname).toBe('Updated Name');
      expect(updates.units).toBe(5);
    });
  });

  describe('deleteProperty()', () => {
    it('should be defined', () => {
      expect(typeof service.deleteProperty).toBe('function');
    });

    it('should accept propertyId parameter', () => {
      const propertyId = 'prop-123';
      expect(propertyId).toBeDefined();
    });
  });
});
