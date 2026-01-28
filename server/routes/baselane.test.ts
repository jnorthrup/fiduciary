/**
 * Baselane API Routes Tests
 * Track: baselane_api_20260124
 */

import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { createServer, type Server } from 'http';
import { request as httpRequest } from 'node:http';
import express from 'express';
import baselaneRouter from './baselane.js';

const TEST_PORT = 30108;

// Mock dependencies
vi.mock('../services/baselaneService.js', () => ({
  BaselaneService: vi.fn()
}));

vi.mock('../services/baselaneMapping.js', () => ({
  syncPropertiesToEntities: vi.fn()
}));

vi.mock('../services/baselaneSecrets.js', () => ({
  getBaselaneConfig: vi.fn(() => Promise.resolve({
    clientId: 'test-client',
    clientSecret: 'test-secret',
    environment: 'sandbox' as const
  }))
}));

import { BaselaneService } from '../services/baselaneService.js';
import { syncPropertiesToEntities } from '../services/baselaneMapping.js';

describe('Baselane API Routes', () => {
  let server: Server;
  let app: express.Application;
  let mockServiceInstance: any;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    // Mock auth middleware
    app.use((req, _res, next) => {
      req.user = { uid: 'test-user-123', email: 'test@example.com' };
      next();
    });

    app.use('/api/baselane', baselaneRouter);

    server = createServer(app).listen(TEST_PORT);
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock service instance
    mockServiceInstance = {
      getProperties: vi.fn(),
      getTenants: vi.fn(),
      createRentCharge: vi.fn(),
      getBalance: vi.fn(),
      getTransactions: vi.fn()
    };

    // Mock BaselaneService constructor - must return function for 'new'
    (BaselaneService as any).mockImplementation(function() {
      return mockServiceInstance;
    });
  });

  const get = (path: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: TEST_PORT,
        path: `/api/baselane${path}`,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const req = httpRequest(options, (res) => {
        let data = '';
        res.on('data', (c: any) => data += c);
        res.on('end', () => {
          try {
            resolve({
              status: res.statusCode,
              body: JSON.parse(data)
            });
          } catch {
            resolve({ status: res.statusCode, body: data });
          }
        });
      });

      req.on('error', reject);
      req.end();
    });
  };

  const post = (path: string, body?: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      const postData = body ? JSON.stringify(body) : '';
      const options = {
        hostname: 'localhost',
        port: TEST_PORT,
        path: `/api/baselane${path}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = httpRequest(options, (res) => {
        let data = '';
        res.on('data', (c: any) => data += c);
        res.on('end', () => {
          try {
            resolve({
              status: res.statusCode,
              body: JSON.parse(data)
            });
          } catch {
            resolve({ status: res.statusCode, body: data });
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  };

  describe('GET /api/baselane/properties', () => {
    it('returns properties from Baselane API', async () => {
      const mockProperties = [
        {
          id: 'prop-1',
          address: {
            street: '123 Main St',
            city: 'San Francisco',
            state: 'CA',
            zip: '94102',
            country: 'US'
          },
          propertyType: 'residential' as const,
          units: 4
        }
      ];

      mockServiceInstance.getProperties.mockResolvedValue({
        success: true,
        data: mockProperties
      });

      const response = await get('/properties');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockProperties);
      expect(mockServiceInstance.getProperties).toHaveBeenCalledTimes(1);
    });

    it('returns 500 on service error', async () => {
      mockServiceInstance.getProperties.mockResolvedValue({
        success: false,
        error: {
          code: 'API_ERROR',
          message: 'Failed to fetch properties',
          requestId: '123'
        }
      });

      const response = await get('/properties');

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        error: 'Failed to fetch properties'
      });
    });

    it('returns 500 on exception', async () => {
      mockServiceInstance.getProperties.mockRejectedValue(new Error('Network error'));

      const response = await get('/properties');

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        error: 'Internal Server Error',
        message: 'Network error'
      });
    });
  });

  describe('POST /api/baselane/properties/sync', () => {
    it('syncs properties to fiduciary entities', async () => {
      const mockSyncResult = {
        synced: 2,
        mappings: [
          {
            baselanePropertyId: 'prop-1',
            fiduciaryEntityId: 'entity-1',
            propertyType: 'HOLDING_TRUST' as const,
            syncEnabled: true,
            createdAt: '2026-01-27T00:00:00Z',
            updatedAt: '2026-01-27T00:00:00Z'
          }
        ]
      };

      vi.mocked(syncPropertiesToEntities).mockResolvedValue(mockSyncResult);

      const response = await post('/properties/sync');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockSyncResult);
      expect(syncPropertiesToEntities).toHaveBeenCalledWith('test-user-123');
    });

    it('returns 500 on sync error', async () => {
      vi.mocked(syncPropertiesToEntities).mockRejectedValue(new Error('Sync failed'));

      const response = await post('/properties/sync');

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        error: 'Property Sync Failed'
      });
    });
  });

  describe('GET /api/baselane/tenants', () => {
    it('returns tenants from Baselane API', async () => {
      const mockTenants = [
        {
          id: 'tenant-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          leaseStart: '2026-01-01',
          leaseEnd: '2027-01-01',
          monthlyRent: 2000,
          securityDeposit: 4000
        }
      ];

      mockServiceInstance.getTenants.mockResolvedValue({
        success: true,
        data: mockTenants
      });

      const response = await get('/tenants');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockTenants);
      expect(mockServiceInstance.getTenants).toHaveBeenCalledTimes(1);
    });

    it('returns 500 on service error', async () => {
      mockServiceInstance.getTenants.mockResolvedValue({
        success: false,
        error: {
          code: 'API_ERROR',
          message: 'Failed to fetch tenants',
          requestId: '123'
        }
      });

      const response = await get('/tenants');

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        error: 'Failed to fetch tenants'
      });
    });

    it('returns 500 on exception', async () => {
      mockServiceInstance.getTenants.mockRejectedValue(new Error('Service unavailable'));

      const response = await get('/tenants');

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        error: 'Internal Server Error',
        message: 'Service unavailable'
      });
    });
  });

  describe('POST /api/baselane/rent/charges', () => {
    it('creates a rent charge', async () => {
      const chargeRequest = {
        tenantId: 'tenant-1',
        propertyId: 'prop-1',
        unitId: 'unit-1',
        amount: 2000,
        dueDate: '2026-02-01',
        type: 'rent' as const,
        description: 'February 2026 Rent'
      };

      const mockCharge = {
        id: 'charge-1',
        ...chargeRequest,
        status: 'pending' as const,
        createdAt: '2026-01-27T00:00:00Z'
      };

      mockServiceInstance.createRentCharge.mockResolvedValue({
        success: true,
        data: mockCharge
      });

      const response = await post('/rent/charges', chargeRequest);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockCharge);
      expect(mockServiceInstance.createRentCharge).toHaveBeenCalledWith(chargeRequest);
    });

    it('returns 400 on missing required fields', async () => {
      const response = await post('/rent/charges', {
        tenantId: 'tenant-1',
        amount: 2000
        // Missing propertyId, unitId, dueDate, type
      });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: 'Validation Error'
      });
    });

    it('returns 500 on service error', async () => {
      const chargeRequest = {
        tenantId: 'tenant-1',
        propertyId: 'prop-1',
        unitId: 'unit-1',
        amount: 2000,
        dueDate: '2026-02-01',
        type: 'rent' as const
      };

      mockServiceInstance.createRentCharge.mockResolvedValue({
        success: false,
        error: {
          code: 'API_ERROR',
          message: 'Failed to create charge',
          requestId: '123'
        }
      });

      const response = await post('/rent/charges', chargeRequest);

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        error: 'Failed to create charge'
      });
    });

    it('returns 500 on exception', async () => {
      const chargeRequest = {
        tenantId: 'tenant-1',
        propertyId: 'prop-1',
        unitId: 'unit-1',
        amount: 2000,
        dueDate: '2026-02-01',
        type: 'rent' as const
      };

      mockServiceInstance.createRentCharge.mockRejectedValue(new Error('Database error'));

      const response = await post('/rent/charges', chargeRequest);

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        error: 'Internal Server Error',
        message: 'Database error'
      });
    });
  });

  describe('GET /api/baselane/balance', () => {
    it('returns account balance', async () => {
      const mockBalance = {
        available: 50000,
        current: 52000,
        pending: 2000,
        currency: 'USD',
        asOfDate: '2026-01-27'
      };

      mockServiceInstance.getBalance.mockResolvedValue({
        success: true,
        data: mockBalance
      });

      const response = await get('/balance?accountId=acct-1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockBalance);
      expect(mockServiceInstance.getBalance).toHaveBeenCalledWith('acct-1');
    });

    it('returns 400 when accountId is missing', async () => {
      const response = await get('/balance');

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: 'Validation Error',
        message: 'accountId query parameter is required'
      });
    });

    it('returns 500 on service error', async () => {
      mockServiceInstance.getBalance.mockResolvedValue({
        success: false,
        error: {
          code: 'API_ERROR',
          message: 'Failed to fetch balance',
          requestId: '123'
        }
      });

      const response = await get('/balance?accountId=acct-1');

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        error: 'Failed to fetch balance'
      });
    });

    it('returns 500 on exception', async () => {
      mockServiceInstance.getBalance.mockRejectedValue(new Error('Connection timeout'));

      const response = await get('/balance?accountId=acct-1');

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        error: 'Internal Server Error',
        message: 'Connection timeout'
      });
    });
  });

  describe('GET /api/baselane/transactions', () => {
    it('returns transactions without filters', async () => {
      const mockTransactions = [
        {
          id: 'txn-1',
          accountId: 'acct-1',
          amount: 2000,
          type: 'credit' as const,
          description: 'Rent payment',
          postedDate: '2026-01-15',
          createdAt: '2026-01-15T10:00:00Z'
        }
      ];

      mockServiceInstance.getTransactions.mockResolvedValue({
        success: true,
        data: mockTransactions
      });

      const response = await get('/transactions?accountId=acct-1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockTransactions);
      expect(mockServiceInstance.getTransactions).toHaveBeenCalledWith('acct-1', {});
    });

    it('returns transactions with date filters', async () => {
      const mockTransactions = [
        {
          id: 'txn-1',
          accountId: 'acct-1',
          amount: 2000,
          type: 'credit' as const,
          description: 'Rent payment',
          postedDate: '2026-01-15',
          createdAt: '2026-01-15T10:00:00Z'
        }
      ];

      mockServiceInstance.getTransactions.mockResolvedValue({
        success: true,
        data: mockTransactions
      });

      const response = await get('/transactions?accountId=acct-1&startDate=2026-01-01&endDate=2026-01-31');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockTransactions);
      expect(mockServiceInstance.getTransactions).toHaveBeenCalledWith('acct-1', {
        startDate: '2026-01-01',
        endDate: '2026-01-31'
      });
    });

    it('returns 400 when accountId is missing', async () => {
      const response = await get('/transactions');

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: 'Validation Error',
        message: 'accountId query parameter is required'
      });
    });

    it('returns 500 on service error', async () => {
      mockServiceInstance.getTransactions.mockResolvedValue({
        success: false,
        error: {
          code: 'API_ERROR',
          message: 'Failed to fetch transactions',
          requestId: '123'
        }
      });

      const response = await get('/transactions?accountId=acct-1');

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        error: 'Failed to fetch transactions'
      });
    });

    it('returns 500 on exception', async () => {
      mockServiceInstance.getTransactions.mockRejectedValue(new Error('Timeout'));

      const response = await get('/transactions?accountId=acct-1');

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        error: 'Internal Server Error',
        message: 'Timeout'
      });
    });
  });
});
