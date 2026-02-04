/**
 * Coinbase Adapter Tests
 *
 * Test suite for Coinbase Commerce API integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CoinbaseAdapter } from './CoinbaseAdapter';
import { BankingProvider } from '../../types/banking';

describe('CoinbaseAdapter', () => {
  let adapter: CoinbaseAdapter;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock fetch globally
    mockFetch = vi.fn();
    global.fetch = mockFetch;

    adapter = new CoinbaseAdapter({
      credentials: {
        apiKey: 'test-api-key',
        apiUrl: 'https://api.commerce.coinbase.com',
      },
      rateLimit: {
        maxRequests: 100,
        perMilliseconds: 60000,
      },
    });
  });

  describe('Configuration', () => {
    it('should have correct provider identifier', () => {
      expect(adapter.provider).toBe(BankingProvider.COINBASE);
    });

    it('should return correct capabilities', () => {
      const capabilities = adapter.getCapabilities();

      expect(capabilities.supportsAccountAggregation).toBe(true);
      expect(capabilities.supportsBalanceCheck).toBe(true);
      expect(capabilities.supportsTransactionHistory).toBe(true);
      expect(capabilities.supportsPaymentInitiation).toBe(true); // ACH payments
      expect(capabilities.supportsWebhooks).toBe(true);
      expect(capabilities.supportedPaymentMethods).toContain('ACH_CREDIT');
      expect(capabilities.supportedPaymentMethods).toContain('ACH_DEBIT');
      expect(capabilities.supportedPaymentMethods).toContain('WIRE');
    });
  });

  describe('Health Check', () => {
    it('should return healthy status when API is accessible', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      const health = await adapter.healthCheck();

      expect(health.provider).toBe(BankingProvider.COINBASE);
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

  describe('List Accounts', () => {
    it('should fetch and transform Coinbase accounts', async () => {
      const mockAccounts = {
        data: [
          {
            id: 'abc123',
            name: 'USD Wallet',
            currency: 'USD',
            balance: { amount: '1000.00', currency: 'USD' },
            available_balance: { amount: '950.00', currency: 'USD' },
            type: 'fiat',
          },
          {
            id: 'xyz789',
            name: 'BTC Wallet',
            currency: 'BTC',
            balance: { amount: '0.5', currency: 'BTC' },
            available_balance: { amount: '0.5', currency: 'BTC' },
            type: 'crypto',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAccounts,
      });

      const accounts = await adapter.listAccounts();

      expect(accounts).toHaveLength(2);
      expect(accounts[0].provider).toBe(BankingProvider.COINBASE);
      expect(accounts[0].currency).toBe('USD');
      expect(accounts[0].currentBalance).toBe(1000.00);
      expect(accounts[1].currency).toBe('BTC');
      expect(accounts[1].type).toBe('crypto');
    });

    it('should filter accounts by type', async () => {
      const mockAccounts = {
        data: [
          {
            id: 'abc123',
            name: 'USD Wallet',
            currency: 'USD',
            balance: { amount: '1000.00', currency: 'USD' },
            available_balance: { amount: '950.00', currency: 'USD' },
            type: 'fiat',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAccounts,
      });

      const accounts = await adapter.listAccounts({ type: 'checking' });

      expect(accounts).toHaveLength(0); // Fiat accounts map to checking
    });
  });

  describe('List Transactions (Charges)', () => {
    it('should fetch and transform Coinbase charges', async () => {
      const mockCharges = {
        data: [
          {
            code: 'ABC123',
            name: 'Invoice Payment',
            description: 'Payment for invoice #123',
            pricing_type: 'fixed_price',
            price: { amount: '500.00', currency: 'USD' },
            status: 'completed',
            created_at: '2024-01-15T10:00:00Z',
            expires_at: '2024-01-22T10:00:00Z',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCharges,
      });

      const transactions = await adapter.listTransactions({});

      expect(transactions).toHaveLength(1);
      expect(transactions[0].provider).toBe(BankingProvider.COINBASE);
      expect(transactions[0].amount).toBe(500.00);
      expect(transactions[0].currency).toBe('USD');
      expect(transactions[0].status).toBe('completed');
      expect(transactions[0].description).toBe('Payment for invoice #123');
    });

    it('should filter transactions by date range', async () => {
      const mockCharges = { data: [] };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCharges,
      });

      await adapter.listTransactions({
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z',
      });

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('start_date=');
      expect(url).toContain('end_date=');
    });
  });

  describe('Initiate Payment (ACH)', () => {
    it('should create a Coinbase charge for ACH payment', async () => {
      const mockCharge = {
        code: 'XYZ789',
        name: 'Test Payment',
        description: 'Test ACH payment',
        pricing_type: 'fixed_price',
        price: { amount: '100.00', currency: 'USD' },
        status: 'created',
        created_at: '2024-01-15T10:00:00Z',
        expires_at: '2024-01-22T10:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCharge,
      });

      const payment = await adapter.initiatePayment({
        sourceAccountId: 'coinbase_abc123',
        beneficiaryName: 'John Doe',
        beneficiaryAccount: '987654321',
        amount: 100.00,
        currency: 'USD',
        reference: 'Test payment',
        method: 'ACH_CREDIT',
      });

      expect(payment.paymentId).toBe('XYZ789');
      expect(payment.amount).toBe(100.00);
      expect(payment.currency).toBe('USD');
      expect(payment.status).toBe('pending');
      expect(payment.metadata.chargeCode).toBe('XYZ789');
      expect(payment.metadata.hostedUrl).toContain('checkout/XYZ789');

      // Verify request payload
      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.name).toBe('John Doe');
      expect(requestBody.description).toBe('Test payment');
      expect(requestBody.price.amount).toBe('100.00');
    });

    it('should handle payment initiation errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Invalid payment amount' }),
      });

      await expect(adapter.initiatePayment({
        sourceAccountId: 'coinbase_abc123',
        beneficiaryName: 'John Doe',
        beneficiaryAccount: '987654321',
        amount: -100.00,
        currency: 'USD',
      })).rejects.toThrow();
    });
  });

  describe('Get Balance', () => {
    it('should fetch account balance', async () => {
      const mockAccount = {
        id: 'abc123',
        name: 'USD Wallet',
        currency: 'USD',
        balance: { amount: '1000.00', currency: 'USD' },
        available_balance: { amount: '950.00', currency: 'USD' },
        type: 'fiat',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAccount,
      });

      const balance = await adapter.getBalance('abc123');

      expect(balance.currentBalance).toBe(1000.00);
      expect(balance.availableBalance).toBe(950.00);
      expect(balance.currency).toBe('USD');
    });
  });

  describe('Get Payment Methods', () => {
    it('should fetch ACH payment methods', async () => {
      const mockPaymentMethods = {
        data: [
          {
            id: 'pm_abc123',
            type: 'ach_bank_account',
            name: 'Bank of America ***1234',
            currency: 'USD',
          },
          {
            id: 'pm_xyz789',
            type: 'wire_transfer',
            name: 'Wire Transfer',
            currency: 'USD',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPaymentMethods,
      });

      const paymentMethods = await adapter.getPaymentMethods();

      expect(paymentMethods).toHaveLength(2);
      expect(paymentMethods[0].type).toBe('ach_bank_account');
      expect(paymentMethods[1].type).toBe('wire_transfer');
    });
  });

  describe('Error Handling', () => {
    it('should handle 401 authentication errors', async () => {
      mockFetch.mockRejectedValueOnce({
        response: { status: 401 },
      });

      const health = await adapter.healthCheck();
      expect(health.isHealthy).toBe(false);
      expect(health.error?.code).toBe('AUTHENTICATION_FAILED');
    });

    it('should handle 429 rate limit errors', async () => {
      mockFetch.mockRejectedValueOnce({
        response: { status: 429 },
      });

      const health = await adapter.healthCheck();
      expect(health.isHealthy).toBe(false);
      expect(health.error?.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should handle 500 server errors', async () => {
      mockFetch.mockRejectedValueOnce({
        response: { status: 500 },
      });

      const health = await adapter.healthCheck();
      expect(health.isHealthy).toBe(false);
      expect(health.error?.code).toBe('PROVIDER_UNAVAILABLE');
    });
  });

  describe('Rate Limiting', () => {
    it('should respect rate limit configuration', async () => {
      const rateLimitedAdapter = new CoinbaseAdapter({
        credentials: {
          apiKey: 'test-api-key',
        },
        rateLimit: {
          maxRequests: 10,
          perMilliseconds: 60000,
        },
      });

      // Make multiple requests
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      for (let i = 0; i < 5; i++) {
        await rateLimitedAdapter.listAccounts();
      }

      // Should have made 5 calls
      expect(mockFetch).toHaveBeenCalledTimes(5);
    });
  });
});
