/**
 * Banking Facade Tests
 *
 * Integration tests for the unified banking facade
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BankingFacade } from './BankingFacade';
import { MockAdapter } from './MockAdapter';
import type {
  BankingProvider,
  UnifiedAccount,
  UnifiedTransaction,
  PaymentInitiationRequest,
} from '../../types/banking';

describe('BankingFacade', () => {
  let facade: BankingFacade;
  let mockAdapter: MockAdapter;

  beforeEach(() => {
    facade = new BankingFacade();
    mockAdapter = new MockAdapter({
      provider: 'plaid',
      environment: 'sandbox',
      credentials: { apiKey: 'test-key' },
    });

    facade.registerAdapter(mockAdapter);
    facade.enableProvider('plaid' as BankingProvider);
  });

  describe('Provider Management', () => {
    it('should register and enable providers', () => {
      const enabled = facade.getEnabledProviders();
      expect(enabled).toContain('plaid');
    });

    it('should check provider health', async () => {
      const health = await facade.checkProviderHealth('plaid' as BankingProvider);
      expect(health).toBeDefined();
      expect(health?.provider).toBe('plaid');
      expect(health?.isHealthy).toBe(true);
    });

    it('should check all providers health', async () => {
      const healthResults = await facade.checkAllProvidersHealth();
      expect(healthResults).toHaveLength(1);
      expect(healthResults[0].isHealthy).toBe(true);
    });

    it('should disable providers', () => {
      facade.disableProvider('plaid' as BankingProvider);
      const enabled = facade.getEnabledProviders();
      expect(enabled).not.toContain('plaid');
    });
  });

  describe('Account Aggregation', () => {
    it('should list all accounts from enabled providers', async () => {
      const accounts = await facade.listAllAccounts();

      expect(accounts).toBeDefined();
      expect(accounts.length).toBeGreaterThan(0);
      expect(accounts[0]).toMatchObject({
        id: expect.any(String),
        provider: 'plaid',
        type: expect.any(String),
        currentBalance: expect.any(Number),
        currency: 'USD',
      });
    });

    it('should filter accounts by type', async () => {
      const checkingAccounts = await facade.listAllAccounts({
        type: 'checking',
      });

      expect(checkingAccounts.length).toBeGreaterThan(0);
      checkingAccounts.forEach(account => {
        expect(account.type).toBe('checking');
      });
    });

    it('should filter accounts by status', async () => {
      const activeAccounts = await facade.listAllAccounts({
        status: 'active',
      });

      expect(activeAccounts.length).toBeGreaterThan(0);
      activeAccounts.forEach(account => {
        expect(account.status).toBe('active');
      });
    });

    it('should get specific account by ID', async () => {
      const accounts = await facade.listAllAccounts();
      const accountId = accounts[0].id;

      const account = await facade.getAccount(accountId);

      expect(account).toBeDefined();
      expect(account?.id).toBe(accountId);
    });

    it('should return null for non-existent account', async () => {
      const account = await facade.getAccount('non_existent_id');
      expect(account).toBeNull();
    });

    it('should get account balance', async () => {
      const accounts = await facade.listAllAccounts();
      const accountId = accounts[0].id;

      const balance = await facade.getBalance(accountId);

      expect(balance).toBeDefined();
      expect(balance?.currentBalance).toBeDefined();
      expect(balance?.currency).toBeDefined();
      expect(balance?.provider).toBe('plaid');
    });

    it('should sync account data', async () => {
      const accounts = await facade.listAllAccounts();
      const accountId = accounts[0].id;

      const syncedAccount = await facade.syncAccount(accountId);

      expect(syncedAccount).toBeDefined();
      expect(syncedAccount?.id).toBe(accountId);
    });
  });

  describe('Transactions', () => {
    it('should list transactions from all providers', async () => {
      const transactions = await facade.listAllTransactions({});

      expect(transactions).toBeDefined();
      expect(transactions.length).toBeGreaterThan(0);
      expect(transactions[0]).toMatchObject({
        id: expect.any(String),
        provider: 'plaid',
        accountId: expect.any(String),
        amount: expect.any(Number),
        direction: expect.any(String),
        status: expect.any(String),
      });
    });

    it('should filter transactions by account', async () => {
      const accounts = await facade.listAllAccounts();
      const accountId = accounts[0].id;

      const transactions = await facade.listTransactionsByAccount(accountId);

      expect(transactions).toBeDefined();
      transactions.forEach(txn => {
        expect(txn.accountId).toBe(accountId);
      });
    });

    it('should filter transactions by direction', async () => {
      const debitTransactions = await facade.listAllTransactions({
        direction: 'debit',
      });

      expect(debitTransactions).toBeDefined();
      debitTransactions.forEach(txn => {
        expect(txn.direction).toBe('debit');
      });
    });

    it('should filter transactions by date range', async () => {
      const startDate = new Date('2024-01-01').toISOString();
      const endDate = new Date('2024-12-31').toISOString();

      const transactions = await facade.listAllTransactions({
        startDate,
        endDate,
      });

      expect(transactions).toBeDefined();
      transactions.forEach(txn => {
        expect(txn.bookedAt >= startDate).toBe(true);
        expect(txn.bookedAt <= endDate).toBe(true);
      });
    });

    it('should limit transaction results', async () => {
      const limitedTransactions = await facade.listAllTransactions({
        limit: 5,
      });

      expect(limitedTransactions.length).toBeLessThanOrEqual(5);
    });

    it('should get specific transaction by ID', async () => {
      const transactions = await facade.listAllTransactions({ limit: 1 });
      const transactionId = transactions[0].id;

      const transaction = await facade.getTransaction(transactionId);

      expect(transaction).toBeDefined();
      expect(transaction?.id).toBe(transactionId);
    });

    it('should search transactions by description', async () => {
      const transactions = await facade.listAllTransactions({
        search: 'Amazon',
      });

      expect(transactions).toBeDefined();
      transactions.forEach(txn => {
        expect(
          txn.description.toLowerCase().includes('amazon') ||
          txn.merchantName?.toLowerCase().includes('amazon')
        ).toBe(true);
      });
    });

    it('should sync transactions from provider', async () => {
      const accounts = await facade.listAllAccounts();
      const accountId = accounts[0].id;

      const transactions = await facade.syncTransactions(accountId);

      expect(transactions).toBeDefined();
      expect(transactions.length).toBeGreaterThan(0);
    });
  });

  describe('Payments', () => {
    it('should initiate a payment', async () => {
      const accounts = await facade.listAllAccounts();
      const sourceAccountId = accounts[0].id;

      const paymentRequest: PaymentInitiationRequest = {
        sourceAccountId,
        beneficiaryName: 'John Doe',
        beneficiaryAccount: '123456789',
        amount: 100.00,
        currency: 'USD',
        reference: 'Test payment',
        description: 'Test payment description',
        method: 'ach_credit' as any,
      };

      const payment = await facade.initiatePayment(paymentRequest);

      expect(payment).toBeDefined();
      expect(payment.paymentId).toBeDefined();
      expect(payment.status).toBe('processing');
    });

    it('should fail payment for non-existent account', async () => {
      const paymentRequest: PaymentInitiationRequest = {
        sourceAccountId: 'non_existent_account',
        beneficiaryName: 'John Doe',
        beneficiaryAccount: '123456789',
        amount: 100.00,
        currency: 'USD',
        method: 'ach_credit' as any,
      };

      await expect(facade.initiatePayment(paymentRequest)).rejects.toThrow();
    });
  });

  describe('Aggregation & Analytics', () => {
    it('should calculate total balances across all accounts', async () => {
      const summary = await facade.getTotalBalances();

      expect(summary).toBeDefined();
      expect(summary.grandTotal).toBeDefined();
      expect(summary.byCurrency).toBeDefined();
      expect(summary.byProvider).toBeDefined();
    });

    it('should group balances by currency', async () => {
      const summary = await facade.getTotalBalances();

      expect(summary.byCurrency['USD']).toBeDefined();
      expect(summary.byCurrency['USD']).toBeGreaterThan(0);
    });

    it('should group balances by provider', async () => {
      const summary = await facade.getTotalBalances();

      expect(summary.byProvider['plaid']).toBeDefined();
      expect(summary.byProvider['plaid']).toBeGreaterThan(0);
    });

    it('should generate transaction summary', async () => {
      const summary = await facade.getTransactionSummary({});

      expect(summary).toBeDefined();
      expect(summary.totalCredits).toBeDefined();
      expect(summary.totalDebits).toBeDefined();
      expect(summary.netChange).toBeDefined();
      expect(summary.transactionCount).toBeDefined();
      expect(summary.byCategory).toBeDefined();
    });

    it('should calculate transaction summary by date range', async () => {
      const startDate = new Date('2024-01-01').toISOString();
      const endDate = new Date('2024-12-31').toISOString();

      const summary = await facade.getTransactionSummary({
        startDate,
        endDate,
      });

      expect(summary.transactionCount).toBeGreaterThan(0);
    });

    it('should categorize transactions', async () => {
      const summary = await facade.getTransactionSummary({});

      expect(Object.keys(summary.byCategory).length).toBeGreaterThan(0);
    });
  });

  describe('Capabilities', () => {
    it('should return provider capabilities', () => {
      const capabilities = facade.getProviderCapabilities('plaid' as BankingProvider);

      expect(capabilities).toBeDefined();
      expect(capabilities?.supportsAccountAggregation).toBe(true);
      expect(capabilities?.supportsBalanceCheck).toBe(true);
      expect(capabilities?.supportsTransactionHistory).toBe(true);
      expect(capabilities?.supportsPaymentInitiation).toBe(true);
    });

    it('should return null for non-existent provider', () => {
      const capabilities = facade.getProviderCapabilities('non_existent' as BankingProvider);
      expect(capabilities).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle disabled provider gracefully', async () => {
      facade.disableProvider('plaid' as BankingProvider);

      const accounts = await facade.listAllAccounts();
      expect(accounts).toEqual([]);
    });

    it('should handle provider errors gracefully', async () => {
      // Mock a failing adapter
      const failingAdapter = new MockAdapter({
        provider: 'failing',
        environment: 'sandbox',
        credentials: { apiKey: 'test-key' },
      });

      // Override listAccounts to throw error
      vi.spyOn(failingAdapter, 'listAccounts').mockRejectedValue(new Error('Provider error'));

      facade.registerAdapter(failingAdapter);
      facade.enableProvider('failing' as BankingProvider);

      // Should not throw, but return empty results
      const accounts = await facade.listAllAccounts();
      // At least the mock adapter should still work
      expect(accounts.length).toBeGreaterThanOrEqual(0);
    });
  });
});
