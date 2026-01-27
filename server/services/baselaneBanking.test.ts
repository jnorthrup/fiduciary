/**
 * Tests for Baselane Banking Operations
 *
 * Test file for balance, transaction, and transfer operations
 * Phase: Banking Operations
 * Track: baselane_api_20260124
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BaselaneService } from './baselaneService.js';
import type { Balance, Transaction } from './baselaneService.js';

describe('BaselaneService - Banking Operations', () => {
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
      scope: ['properties', 'tenants', 'rent', 'banking']
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getBalance()', () => {
    it('should return account balance', async () => {
      const mockBalance: Balance = {
        available: 15000.50,
        current: 18250.75,
        pending: 3250.25,
        currency: 'USD',
        asOfDate: '2026-01-24T12:00:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ balance: mockBalance })
      });

      const result = await service.getBalance('account-1');

      expect(result.success).toBe(true);
      expect(result.data?.available).toBe(15000.50);
      expect(result.data?.pending).toBe(3250.25);
    });

    it('should handle non-existent account', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: { message: 'Account not found' } })
      });

      const result = await service.getBalance('non-existent');

      expect(result.success).toBe(false);
    });

    it('should make GET request to /banking/accounts/{accountId}/balance', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ balance: { available: 1000 } })
      });

      await service.getBalance('account-1');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://sandbox-api.baselane.com/v1/banking/accounts/account-1/balance',
        expect.objectContaining({
          method: 'GET'
        })
      );
    });
  });

  describe('getTransactions()', () => {
    it('should return list of transactions', async () => {
      const mockTransactions: Transaction[] = [
        {
          id: 'txn-1',
          accountId: 'account-1',
          amount: 2000,
          type: 'credit',
          description: 'Rent payment - Unit 101',
          category: 'rent',
          propertyId: 'prop-1',
          unitId: 'unit-101',
          postedDate: '2026-01-15',
          createdAt: '2026-01-15T10:00:00Z'
        },
        {
          id: 'txn-2',
          accountId: 'account-1',
          amount: -150.50,
          type: 'debit',
          description: 'Maintenance - plumbing',
          category: 'maintenance',
          propertyId: 'prop-1',
          postedDate: '2026-01-16',
          createdAt: '2026-01-16T14:30:00Z'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: mockTransactions })
      });

      const result = await service.getTransactions('account-1');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].type).toBe('credit');
    });

    it('should filter transactions by date range', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: [] })
      });

      await service.getTransactions('account-1', {
        startDate: '2026-01-01',
        endDate: '2026-01-31'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('startDate=2026-01-01'),
        expect.any(Object)
      );
    });

    it('should support pagination', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: [] })
      });

      await service.getTransactions('account-1', {
        limit: 50,
        offset: 100
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=50'),
        expect.any(Object)
      );
    });

    it('should handle API errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await service.getTransactions('account-1');

      expect(result.success).toBe(false);
    });
  });

  describe('categorizeTransaction()', () => {
    it('should categorize transaction', async () => {
      const categorizedTransaction: Transaction = {
        id: 'txn-1',
        accountId: 'account-1',
        amount: -150.50,
        type: 'debit',
        description: 'Maintenance - plumbing',
        category: 'maintenance',
        propertyId: 'prop-1',
        postedDate: '2026-01-16',
        createdAt: '2026-01-16T14:30:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transaction: categorizedTransaction })
      });

      const result = await service.categorizeTransaction('txn-1', 'maintenance', 'prop-1');

      expect(result.success).toBe(true);
      expect(result.data?.category).toBe('maintenance');
    });

    it('should handle invalid category', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            code: 'INVALID_CATEGORY',
            message: 'Invalid transaction category'
          }
        })
      });

      const result = await service.categorizeTransaction('txn-1', 'invalid-category');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_CATEGORY');
    });
  });

  describe('initiateTransfer()', () => {
    it('should initiate internal transfer', async () => {
      const transfer = {
        fromAccountId: 'account-1',
        toAccountId: 'account-2',
        amount: 5000,
        memo: 'Monthly transfer'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transferId: 'transfer-1' })
      });

      const result = await service.initiateTransfer(transfer);

      expect(result.success).toBe(true);
      expect(result.data?.transferId).toBe('transfer-1');
    });

    it('should initiate external ACH transfer', async () => {
      const transfer = {
        fromAccountId: 'account-1',
        amount: 10000,
        memo: 'Owner distribution',
        routingNumber: '021000021',
        accountNumber: '123456789',
        accountType: 'checking' as const
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transferId: 'transfer-external-1' })
      });

      const result = await service.initiateTransfer(transfer);

      expect(result.success).toBe(true);
      expect(result.data?.transferId).toBe('transfer-external-1');
    });

    it('should handle insufficient funds', async () => {
      const transfer = {
        fromAccountId: 'account-1',
        toAccountId: 'account-2',
        amount: 999999,
        memo: 'Large transfer'
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            code: 'INSUFFICIENT_FUNDS',
            message: 'Insufficient funds for transfer'
          }
        })
      });

      const result = await service.initiateTransfer(transfer);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INSUFFICIENT_FUNDS');
    });

    it('should make POST request to /banking/transfers', async () => {
      const transfer = {
        fromAccountId: 'account-1',
        toAccountId: 'account-2',
        amount: 5000
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transferId: 'transfer-1' })
      });

      await service.initiateTransfer(transfer);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://sandbox-api.baselane.com/v1/banking/transfers',
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
  });
});
