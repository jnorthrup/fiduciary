/**
 * Plaid Adapter Tests
 *
 * Test suite for Plaid API integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlaidAdapter } from './PlaidAdapter';
import { BankingProvider } from '../../types/banking';

describe('PlaidAdapter', () => {
  let adapter: PlaidAdapter;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock fetch globally
    mockFetch = vi.fn();
    global.fetch = mockFetch;

    adapter = new PlaidAdapter({
      credentials: {
        clientId: 'test-client-id',
        secret: 'test-secret',
      },
      environment: 'sandbox',
      rateLimit: {
        maxRequests: 100,
        perMilliseconds: 60000,
      },
    });
  });

  describe('Configuration', () => {
    it('should have correct provider identifier', () => {
      expect(adapter.provider).toBe(BankingProvider.PLAID);
    });

    it('should return correct capabilities', () => {
      const capabilities = adapter.getCapabilities();

      expect(capabilities.supportsAccountAggregation).toBe(true);
      expect(capabilities.supportsBalanceCheck).toBe(true);
      expect(capabilities.supportsTransactionHistory).toBe(true);
      expect(capabilities.supportsPaymentInitiation).toBe(false); // No payments
      expect(capabilities.supportsWebhooks).toBe(true);
      expect(capabilities.maxHistoryDays).toBe(730); // 2 years
    });

    it('should use correct API URL for environment', () => {
      const sandboxAdapter = new PlaidAdapter({
        credentials: { clientId: 'test', secret: 'test' },
        environment: 'sandbox',
      });

      const devAdapter = new PlaidAdapter({
        credentials: { clientId: 'test', secret: 'test' },
        environment: 'development',
      });

      const prodAdapter = new PlaidAdapter({
        credentials: { clientId: 'test', secret: 'test' },
        environment: 'production',
      });

      // Test that they'd use different URLs by checking health
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      sandboxAdapter.healthCheck();
      devAdapter.healthCheck();
      prodAdapter.healthCheck();

      const sandboxUrl = mockFetch.mock.calls[0][0];
      const devUrl = mockFetch.mock.calls[1][0];
      const prodUrl = mockFetch.mock.calls[2][0];

      expect(sandboxUrl).toContain('sandbox.plaid.com');
      expect(devUrl).toContain('development.plaid.com');
      expect(prodUrl).toContain('production.plaid.com');
    });
  });

  describe('Health Check', () => {
    it('should return healthy status when API is accessible', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const health = await adapter.healthCheck();

      expect(health.provider).toBe(BankingProvider.PLAID);
      expect(health.isHealthy).toBe(true);
      expect(health.latencyMs).toBeGreaterThanOrEqual(0);
      expect(health.lastChecked).toBeDefined();
    });

    it('should return unhealthy status when API is inaccessible', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const health = await adapter.healthCheck();

      expect(health.isHealthy).toBe(false);
      expect(health.error).toBeDefined();
    });
  });

  describe('Token Exchange', () => {
    it('should exchange public token for access token', async () => {
      const mockResponse = {
        access_token: 'access-sandbox-xxx',
        item_id: 'item-xxx',
        request_id: 'req-xxx',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const accessToken = await adapter.exchangePublicToken('public-sandbox-xxx');

      expect(accessToken).toBe('access-sandbox-xxx');

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.public_token).toBe('public-sandbox-xxx');
    });

    it('should handle token exchange errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error_code: 'INVALID_PUBLIC_TOKEN',
          error_message: 'Public token expired',
        }),
      });

      await expect(adapter.exchangePublicToken('invalid-token')).rejects.toThrow();
    });
  });

  describe('Link Token Creation', () => {
    it('should create link token for Plaid Link', async () => {
      const mockResponse = {
        link_token: 'link-sandbox-xxx',
        expiration: '2024-01-15T10:00:00Z',
        request_id: 'req-xxx',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const linkToken = await adapter.createLinkToken({
        clientUserId: 'user-123',
      });

      expect(linkToken).toBe('link-sandbox-xxx');

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.client_name).toBe('Fiduciary App');
      expect(requestBody.products).toContain('auth');
      expect(requestBody.products).toContain('transactions');
      expect(requestBody.products).toContain('balance');
    });
  });

  describe('List Accounts', () => {
    beforeEach(() => {
      // Set access token
      adapter['accessToken'] = 'access-sandbox-xxx';
    });

    it('should fetch and transform Plaid accounts', async () => {
      const mockAccountsResponse = {
        accounts: [
          {
            account_id: 'acc-123',
            name: 'Plaid Checking',
            official_name: 'Plaid Gold Checking',
            type: 'checking',
            subtype: ['checking'],
            mask: '0000',
            balances: {
              available: 5000,
              current: 5200,
              iso_currency_code: 'USD',
            },
          },
          {
            account_id: 'acc-456',
            name: 'Plaid Savings',
            type: 'savings',
            subtype: ['savings'],
            mask: '1111',
            balances: {
              available: 10000,
              current: 10000,
              iso_currency_code: 'USD',
            },
          },
        ],
        item: {
          item_id: 'item-xxx',
          institution_id: 'ins_123',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAccountsResponse,
      });

      const accounts = await adapter.listAccounts();

      expect(accounts).toHaveLength(2);
      expect(accounts[0].provider).toBe(BankingProvider.PLAID);
      expect(accounts[0].type).toBe('checking');
      expect(accounts[0].currentBalance).toBe(5200);
      expect(accounts[0].availableBalance).toBe(5000);
      expect(accounts[1].type).toBe('savings');
      expect(accounts[1].currentBalance).toBe(10000);
    });

    it('should filter accounts by type', async () => {
      const mockAccountsResponse = {
        accounts: [
          {
            account_id: 'acc-123',
            name: 'Plaid Checking',
            type: 'checking',
            subtype: ['checking'],
            mask: '0000',
            balances: { current: 5200, iso_currency_code: 'USD' },
          },
        ],
        item: { item_id: 'item-xxx', institution_id: 'ins_123' },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAccountsResponse,
      });

      const accounts = await adapter.listAccounts({ type: 'savings' });

      expect(accounts).toHaveLength(0);
    });

    it('should require access token', async () => {
      adapter['accessToken'] = null;

      await expect(adapter.listAccounts()).rejects.toThrow(
        'No access token. Call exchangePublicToken() first.'
      );
    });
  });

  describe('List Transactions', () => {
    beforeEach(() => {
      adapter['accessToken'] = 'access-sandbox-xxx';
    });

    it('should fetch and transform Plaid transactions', async () => {
      const mockTransactionsResponse = {
        transactions: [
          {
            transaction_id: 'tx-123',
            account_id: 'acc-123',
            amount: -50.25,
            date: '2024-01-15',
            name: 'Uber',
            merchant_name: 'Uber Technologies Inc',
            payment_channel: 'in store',
            pending: false,
            category: ['Transportation'],
            currency: 'USD',
          },
          {
            transaction_id: 'tx-456',
            account_id: 'acc-123',
            amount: 1000,
            date: '2024-01-16',
            name: 'Payroll',
            payment_channel: 'other',
            pending: false,
            currency: 'USD',
          },
        ],
        accounts: [
          {
            account_id: 'acc-123',
            mask: '0000',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTransactionsResponse,
      });

      const transactions = await adapter.listTransactions({});

      expect(transactions).toHaveLength(2);
      expect(transactions[0].provider).toBe(BankingProvider.PLAID);
      expect(transactions[0].amount).toBe(50.25);
      expect(transactions[0].direction).toBe('debit');
      expect(transactions[0].counterparty?.name).toBe('Uber Technologies Inc');
      expect(transactions[1].amount).toBe(1000);
      expect(transactions[1].direction).toBe('credit');
    });

    it('should filter transactions by amount', async () => {
      const mockTransactionsResponse = {
        transactions: [
          {
            transaction_id: 'tx-123',
            account_id: 'acc-123',
            amount: -50.25,
            date: '2024-01-15',
            name: 'Uber',
            currency: 'USD',
          },
        ],
        accounts: [{ account_id: 'acc-123', mask: '0000' }],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTransactionsResponse,
      });

      const transactions = await adapter.listTransactions({ minAmount: 100 });

      expect(transactions).toHaveLength(0);
    });

    it('should filter transactions by search term', async () => {
      const mockTransactionsResponse = {
        transactions: [
          {
            transaction_id: 'tx-123',
            account_id: 'acc-123',
            amount: -50.25,
            date: '2024-01-15',
            name: 'Uber',
            merchant_name: 'Uber Technologies Inc',
            currency: 'USD',
          },
          {
            transaction_id: 'tx-456',
            account_id: 'acc-123',
            amount: -25.50,
            date: '2024-01-16',
            name: 'Starbucks',
            merchant_name: 'Starbucks Coffee',
            currency: 'USD',
          },
        ],
        accounts: [{ account_id: 'acc-123', mask: '0000' }],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTransactionsResponse,
      });

      const transactions = await adapter.listTransactions({ search: 'starbucks' });

      expect(transactions).toHaveLength(1);
      expect(transactions[0].description).toBe('Starbucks');
    });
  });

  describe('Get Balance', () => {
    beforeEach(() => {
      adapter['accessToken'] = 'access-sandbox-xxx';
    });

    it('should fetch account balance', async () => {
      const mockBalanceResponse = {
        accounts: [
          {
            account_id: 'acc-123',
            balances: {
              available: 5000,
              current: 5200,
              iso_currency_code: 'USD',
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBalanceResponse,
      });

      const balance = await adapter.getBalance('acc-123');

      expect(balance.currentBalance).toBe(5200);
      expect(balance.availableBalance).toBe(5000);
      expect(balance.currency).toBe('USD');
      expect(balance.lastUpdatedAt).toBeDefined();
    });
  });

  describe('Get Account Numbers', () => {
    beforeEach(() => {
      adapter['accessToken'] = 'access-sandbox-xxx';
    });

    it('should fetch account and routing numbers', async () => {
      const mockAuthResponse = {
        accounts: [
          {
            account_id: 'acc-123',
            mask: '0000',
          },
        ],
        numbers: {
          ach: [
            {
              account_id: 'acc-123',
              account: '123456789',
              routing: '021000021',
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAuthResponse,
      });

      const numbers = await adapter.getAccountNumbers('acc-123');

      expect(numbers).toEqual({
        accountNumber: '123456789',
        routingNumber: '021000021',
      });
    });

    it('should return null if account not found', async () => {
      const mockAuthResponse = {
        accounts: [],
        numbers: { ach: [] },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAuthResponse,
      });

      const numbers = await adapter.getAccountNumbers('acc-999');

      expect(numbers).toBeNull();
    });
  });

  describe('Rotate Access Token', () => {
    beforeEach(() => {
      adapter['accessToken'] = 'access-sandbox-xxx';
    });

    it('should rotate access token', async () => {
      const mockResponse = {
        new_access_token: 'access-sandbox-new',
        request_id: 'req-xxx',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const newToken = await adapter.rotateAccessToken();

      expect(newToken).toBe('access-sandbox-new');
      expect(adapter['accessToken']).toBe('access-sandbox-new');
    });
  });

  describe('Payment Initiation', () => {
    it('should reject payment initiation', async () => {
      await expect(
        adapter.initiatePayment({
          sourceAccountId: 'acc-123',
          beneficiaryName: 'Test',
          beneficiaryAccount: '123',
          amount: 100,
          currency: 'USD',
        })
      ).rejects.toThrow('Payment initiation not supported by Plaid adapter');
    });
  });

  describe('Error Handling', () => {
    it('should handle ITEM_LOGIN_REQUIRED error', async () => {
      adapter['accessToken'] = 'access-sandbox-xxx';

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error_code: 'ITEM_LOGIN_REQUIRED',
          error_message: 'Item needs re-authentication',
        }),
      });

      try {
        await adapter.listAccounts();
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.code).toBe('AUTHENTICATION_FAILED');
      }
    });

    it('should handle rate limit errors', async () => {
      mockFetch.mockRejectedValueOnce({
        code: 'RATE_LIMIT_EXCEEDED',
      });

      const health = await adapter.healthCheck();
      expect(health.isHealthy).toBe(false);
      expect(health.error?.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });
});
