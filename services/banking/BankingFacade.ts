/**
 * Banking Facade Service
 *
 * Unified facade providing a single interface to all banking providers.
 * Implements the Facade pattern to simplify multi-bank operations.
 *
 * This is the main service that the rest of the application should use.
 * It handles provider routing, aggregation, and normalization.
 */

import type {
  IBankingAdapter,
  BankingProvider,
  UnifiedAccount,
  UnifiedTransaction,
  PaymentInitiationRequest,
  PaymentInitiationResponse,
  AccountFilters,
  TransactionFilters,
  ProviderHealthStatus,
  BankingError,
} from '../../types/banking';
import { MockAdapter } from './MockAdapter';
import { TellerAdapter } from './TellerAdapter';

export class BankingFacade {
  // ========================================================================
  // STATE
  // ========================================================================

  private adapters: Map<BankingProvider, IBankingAdapter> = new Map();
  private enabledProviders: Set<BankingProvider> = new Set();

  // ========================================================================
  // INITIALIZATION
  // ========================================================================

  /**
   * Register a banking adapter
   */
  registerAdapter(adapter: IBankingAdapter): void {
    this.adapters.set(adapter.provider, adapter);
    console.log(`[BankingFacade] Registered adapter: ${adapter.provider}`);
  }

  /**
   * Enable a provider for use
   */
  enableProvider(provider: BankingProvider): void {
    const adapter = this.adapters.get(provider);
    if (!adapter) {
      throw new Error(`Provider ${provider} not registered`);
    }
    this.enabledProviders.add(provider);
    console.log(`[BankingFacade] Enabled provider: ${provider}`);
  }

  /**
   * Disable a provider
   */
  disableProvider(provider: BankingProvider): void {
    this.enabledProviders.delete(provider);
    console.log(`[BankingFacade] Disabled provider: ${provider}`);
  }

  /**
   * Initialize with default providers
   */
  static async initialize(configs: Array<{ provider: BankingProvider; config: any }>): Promise<BankingFacade> {
    const facade = new BankingFacade();

    for (const { provider, config } of configs) {
      const adapter = BankingFacade.createAdapter(provider, config);
      facade.registerAdapter(adapter);
      facade.enableProvider(provider);
    }

    return facade;
  }

  /**
   * Factory method to create adapters
   */
  private static createAdapter(provider: BankingProvider, config: any): IBankingAdapter {
    switch (provider) {
      case 'teller':
        return new TellerAdapter(config);

      case 'plaid':
      case 'obp':
      case 'fineract':
      case 'mifos':
      case 'coinbase':
        // For now, use MockAdapter for unimplemented providers
        return new MockAdapter({ ...config, provider });

      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  // ========================================================================
  // HEALTH & STATUS
  // ========================================================================

  /**
   * Check health of all enabled providers
   */
  async checkAllProvidersHealth(): Promise<ProviderHealthStatus[]> {
    const results: ProviderHealthStatus[] = [];

    for (const provider of this.enabledProviders) {
      const adapter = this.adapters.get(provider);
      if (adapter) {
        try {
          const health = await adapter.healthCheck();
          results.push(health);
        } catch (error) {
          results.push({
            provider,
            isHealthy: false,
            lastChecked: new Date().toISOString(),
            errorMessage: error?.message || 'Health check failed',
          });
        }
      }
    }

    return results;
  }

  /**
   * Check health of specific provider
   */
  async checkProviderHealth(provider: BankingProvider): Promise<ProviderHealthStatus | null> {
    const adapter = this.adapters.get(provider);
    if (!adapter) {
      return null;
    }

    return adapter.healthCheck();
  }

  // ========================================================================
  // ACCOUNT AGGREGATION
  // ========================================================================

  /**
   * List all accounts from all enabled providers
   */
  async listAllAccounts(filters?: Omit<AccountFilters, 'provider'>): Promise<UnifiedAccount[]> {
    const allAccounts: UnifiedAccount[] = [];

    for (const provider of this.enabledProviders) {
      const adapter = this.adapters.get(provider);
      if (adapter) {
        try {
          const accounts = await adapter.listAccounts(filters);
          allAccounts.push(...accounts);
        } catch (error) {
          console.error(`[BankingFacade] Error listing accounts from ${provider}:`, error);
        }
      }
    }

    return allAccounts;
  }

  /**
   * List accounts from specific provider
   */
  async listAccountsByProvider(
    provider: BankingProvider,
    filters?: AccountFilters
  ): Promise<UnifiedAccount[]> {
    const adapter = this.adapters.get(provider);
    if (!adapter) {
      throw new Error(`Provider ${provider} not available`);
    }

    return adapter.listAccounts({ ...filters, provider });
  }

  /**
   * Get specific account
   */
  async getAccount(accountId: string): Promise<UnifiedAccount | null> {
    // Search across all providers
    for (const provider of this.enabledProviders) {
      const adapter = this.adapters.get(provider);
      if (adapter) {
        try {
          const account = await adapter.getAccount(accountId);
          if (account) {
            return account;
          }
        } catch (error) {
          // Continue to next provider
        }
      }
    }

    return null;
  }

  /**
   * Get account balance
   */
  async getBalance(accountId: string): Promise<{
    currentBalance: number;
    availableBalance?: number;
    ledgerBalance?: number;
    currency: string;
    lastUpdatedAt: string;
    provider: BankingProvider;
  } | null> {
    const account = await this.getAccount(accountId);
    if (!account) {
      return null;
    }

    const adapter = this.adapters.get(account.provider);
    if (!adapter) {
      return null;
    }

    const balance = await adapter.getBalance(accountId);

    return {
      ...balance,
      provider: account.provider,
    };
  }

  /**
   * Sync account data from provider
   */
  async syncAccount(accountId: string): Promise<UnifiedAccount | null> {
    const account = await this.getAccount(accountId);
    if (!account) {
      return null;
    }

    const adapter = this.adapters.get(account.provider);
    if (!adapter) {
      return null;
    }

    return adapter.syncAccount(accountId);
  }

  // ========================================================================
  // TRANSACTIONS
  // ========================================================================

  /**
   * List transactions from all providers
   */
  async listAllTransactions(filters: Omit<TransactionFilters, 'provider'>): Promise<UnifiedTransaction[]> {
    const allTransactions: UnifiedTransaction[] = [];

    for (const provider of this.enabledProviders) {
      const adapter = this.adapters.get(provider);
      if (adapter) {
        try {
          const transactions = await adapter.listTransactions({ ...filters, provider });
          allTransactions.push(...transactions);
        } catch (error) {
          console.error(`[BankingFacade] Error listing transactions from ${provider}:`, error);
        }
      }
    }

    // Sort by date descending
    allTransactions.sort((a, b) => new Date(b.bookedAt).getTime() - new Date(a.bookedAt).getTime());

    // Apply limit after aggregation
    if (filters.limit) {
      allTransactions.length = Math.min(allTransactions.length, filters.limit);
    }

    return allTransactions;
  }

  /**
   * List transactions from specific account
   */
  async listTransactionsByAccount(
    accountId: string,
    filters?: Omit<TransactionFilters, 'accountIds' | 'provider'>
  ): Promise<UnifiedTransaction[]> {
    const account = await this.getAccount(accountId);
    if (!account) {
      throw new Error(`Account ${accountId} not found`);
    }

    const adapter = this.adapters.get(account.provider);
    if (!adapter) {
      throw new Error(`Provider ${account.provider} not available`);
    }

    return adapter.listTransactions({
      ...filters,
      accountIds: [accountId],
    });
  }

  /**
   * Get specific transaction
   */
  async getTransaction(transactionId: string): Promise<UnifiedTransaction | null> {
    // Search across all providers
    for (const provider of this.enabledProviders) {
      const adapter = this.adapters.get(provider);
      if (adapter) {
        try {
          const txn = await adapter.getTransaction(transactionId);
          if (txn) {
            return txn;
          }
        } catch (error) {
          // Continue to next provider
        }
      }
    }

    return null;
  }

  /**
   * Sync transactions from provider
   */
  async syncTransactions(accountId: string, since?: string): Promise<UnifiedTransaction[]> {
    const account = await this.getAccount(accountId);
    if (!account) {
      throw new Error(`Account ${accountId} not found`);
    }

    const adapter = this.adapters.get(account.provider);
    if (!adapter) {
      throw new Error(`Provider ${account.provider} not available`);
    }

    return adapter.syncTransactions(accountId, since);
  }

  // ========================================================================
  // PAYMENTS
  // ========================================================================

  /**
   * Initiate payment
   */
  async initiatePayment(request: PaymentInitiationRequest): Promise<PaymentInitiationResponse> {
    const account = await this.getAccount(request.sourceAccountId);
    if (!account) {
      throw new Error(`Source account ${request.sourceAccountId} not found`);
    }

    const adapter = this.adapters.get(account.provider);
    if (!adapter) {
      throw new Error(`Provider ${account.provider} not available`);
    }

    return adapter.initiatePayment(request);
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentId: string, provider: BankingProvider): Promise<PaymentInitiationResponse> {
    const adapter = this.adapters.get(provider);
    if (!adapter) {
      throw new Error(`Provider ${provider} not available`);
    }

    return adapter.getPaymentStatus(paymentId);
  }

  // ========================================================================
  // AGGREGATION & ANALYTICS
  // ========================================================================

  /**
   * Get total balance across all accounts
   */
  async getTotalBalances(): Promise<{
    byCurrency: Record<string, number>;
    byProvider: Record<BankingProvider, number>;
    grandTotal: number;
  }> {
    const accounts = await this.listAllAccounts();

    const byCurrency: Record<string, number> = {};
    const byProvider: Record<string, number> = {};
    let grandTotal = 0;

    for (const account of accounts) {
      const amount = account.currentBalance;

      byCurrency[account.currency] = (byCurrency[account.currency] || 0) + amount;
      byProvider[account.provider] = (byProvider[account.provider] || 0) + amount;
      grandTotal += amount;
    }

    return {
      byCurrency,
      byProvider: byProvider as Record<BankingProvider, number>,
      grandTotal,
    };
  }

  /**
   * Get transaction summary
   */
  async getTransactionSummary(filters?: Omit<TransactionFilters, 'provider'>): Promise<{
    totalCredits: number;
    totalDebits: number;
    netChange: number;
    transactionCount: number;
    byCategory: Record<string, number>;
  }> {
    const transactions = await this.listAllTransactions(filters || {});

    let totalCredits = 0;
    let totalDebits = 0;
    const byCategory: Record<string, number> = {};

    for (const txn of transactions) {
      if (txn.direction === 'credit') {
        totalCredits += txn.amount;
      } else {
        totalDebits += Math.abs(txn.amount);
      }

      if (txn.category) {
        byCategory[txn.category] = (byCategory[txn.category] || 0) + Math.abs(txn.amount);
      }
    }

    return {
      totalCredits,
      totalDebits,
      netChange: totalCredits - totalDebits,
      transactionCount: transactions.length,
      byCategory,
    };
  }

  // ========================================================================
  // UTILITY
  // ========================================================================

  /**
   * Get list of enabled providers
   */
  getEnabledProviders(): BankingProvider[] {
    return Array.from(this.enabledProviders);
  }

  /**
   * Get capabilities for a provider
   */
  getProviderCapabilities(provider: BankingProvider) {
    const adapter = this.adapters.get(provider);
    return adapter?.getCapabilities() || null;
  }
}
