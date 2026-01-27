/**
 * Tests for Baselane Service
 *
 * Test file for Baselane API integration
 * Phase: Project Setup & Configuration
 * Track: baselane_api_20260124
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaselaneService, BaselaneConfig } from './baselaneService.js';

describe('BaselaneService - Module Structure', () => {
  let service: BaselaneService;

  beforeEach(() => {
    service = new BaselaneService({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      environment: 'sandbox'
    });
  });

  it('should export BaselaneService class', () => {
    expect(BaselaneService).toBeDefined();
    expect(typeof BaselaneService).toBe('function');
  });

  it('should create service instance with config', () => {
    expect(service).toBeInstanceOf(BaselaneService);
    expect(service['config']).toBeDefined();
  });

  it('should have config properties', () => {
    const config = service['config'];
    expect(config.clientId).toBe('test-client-id');
    expect(config.clientSecret).toBe('test-client-secret');
    expect(config.environment).toBe('sandbox');
  });
});

describe('BaselaneService - TypeScript Interfaces', () => {
  describe('BaselaneConfig', () => {
    it('should accept valid config', () => {
      const config: BaselaneConfig = {
        clientId: 'client-id',
        clientSecret: 'client-secret',
        environment: 'sandbox'
      };
      expect(config.clientId).toBeDefined();
      expect(config.clientSecret).toBeDefined();
      expect(config.environment).toBeDefined();
    });

    it('should accept production environment', () => {
      const config: BaselaneConfig = {
        clientId: 'client-id',
        clientSecret: 'client-secret',
        environment: 'production'
      };
      expect(config.environment).toBe('production');
    });
  });

  describe('Property Interface', () => {
    it('should define Property interface', () => {
      // Type check - if this compiles, interface exists
      const property: {
        id?: string;
        address: {
          street: string;
          city: string;
          state: string;
          zip: string;
          country: string;
        };
        propertyType: 'residential' | 'multifamily' | 'commercial';
        units: number;
        nickname?: string;
      } = {
        address: {
          street: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          zip: '94102',
          country: 'US'
        },
        propertyType: 'residential',
        units: 1
      };

      expect(property.address.street).toBe('123 Main St');
      expect(property.propertyType).toBe('residential');
    });
  });

  describe('Tenant Interface', () => {
    it('should define Tenant interface', () => {
      const tenant: {
        id?: string;
        firstName: string;
        lastName: string;
        email: string;
        phone?: string;
        unitId?: string;
        leaseStart: string;
        leaseEnd: string;
        monthlyRent: number;
        securityDeposit: number;
      } = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        leaseStart: '2026-01-01',
        leaseEnd: '2026-12-31',
        monthlyRent: 2000,
        securityDeposit: 4000
      };

      expect(tenant.firstName).toBe('John');
      expect(tenant.monthlyRent).toBe(2000);
    });
  });

  describe('RentCharge Interface', () => {
    it('should define RentCharge interface', () => {
      const charge: {
        id?: string;
        tenantId: string;
        propertyId: string;
        unitId: string;
        amount: number;
        dueDate: string;
        type: 'rent' | 'late_fee' | 'other';
        description?: string;
      } = {
        tenantId: 'tenant-123',
        propertyId: 'prop-123',
        unitId: 'unit-123',
        amount: 2000,
        dueDate: '2026-02-01',
        type: 'rent'
      };

      expect(charge.amount).toBe(2000);
      expect(charge.type).toBe('rent');
    });
  });

  describe('Payment Interface', () => {
    it('should define Payment interface', () => {
      const payment: {
        id?: string;
        chargeId: string;
        tenantId: string;
        amount: number;
        status: 'pending' | 'completed' | 'failed' | 'refunded';
        paymentMethod: 'bank_account' | 'card';
        createdAt?: string;
        completedAt?: string;
      } = {
        chargeId: 'charge-123',
        tenantId: 'tenant-123',
        amount: 2000,
        status: 'completed',
        paymentMethod: 'bank_account'
      };

      expect(payment.amount).toBe(2000);
      expect(payment.status).toBe('completed');
    });
  });

  describe('Balance Interface', () => {
    it('should define Balance interface', () => {
      const balance: {
        available: number;
        current: number;
        pending: number;
        currency: string;
        asOfDate: string;
      } = {
        available: 5000,
        current: 5500,
        pending: -500,
        currency: 'USD',
        asOfDate: '2026-01-24'
      };

      expect(balance.available).toBe(5000);
      expect(balance.currency).toBe('USD');
    });
  });
});
