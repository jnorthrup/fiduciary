/**
 * Base Banking Adapter
 *
 * Abstract base class providing common functionality for all banking adapters.
 * Implements error handling, rate limiting, retry logic, and caching.
 */

import type {
  IBankingAdapter,
  AdapterCapabilities,
  ProviderHealthStatus,
  AdapterResult,
  UnifiedAccount,
  UnifiedTransaction,
  PaymentInitiationRequest,
  PaymentInitiationResponse,
  AccountFilters,
  TransactionFilters,
  BankingProvider,
  BankingErrorCode,
} from '../../types/banking';

export abstract class BaseAdapter implements IBankingAdapter {
  // ========================================================================
  // ABSTRACT PROPERTIES (must be implemented by subclasses)
  // ========================================================================

  abstract readonly provider: BankingProvider;
  abstract getCapabilities(): AdapterCapabilities;

  // ========================================================================
  // PROTECTED STATE
  // ========================================================================

  protected config: any;
  protected cache: Map<string, { data: any; expiresAt: number }>;
  protected rateLimitState: {
    requestCount: number;
    resetTime: number;
  };

  // ========================================================================
  // CONSTRUCTOR
  // ========================================================================

  constructor(config: any) {
    this.config = config;
    this.cache = new Map();
    this.rateLimitState = {
      requestCount: 0,
      resetTime: Date.now() + (config.rateLimit?.perMilliseconds || 60000),
    };
  }

  // ========================================================================
  // ABSTRACT METHODS (must be implemented by subclasses)
  // ========================================================================

  /**
   * Subclasses implement the actual health check logic
   */
  abstract healthCheckImplementation(): Promise<ProviderHealthStatus>;

  /**
   * Subclasses implement actual account listing
   */
  abstract listAccountsImplementation(filters?: AccountFilters): Promise<UnifiedAccount[]>;

  /**
   * Subclasses implement actual transaction listing
   */
  abstract listTransactionsImplementation(filters: TransactionFilters): Promise<UnifiedTransaction[]>;

  /**
   * Subclasses implement payment initiation
   */
  abstract initiatePaymentImplementation(request: PaymentInitiationRequest): Promise<PaymentInitiationResponse>;

  // ========================================================================
  // PUBLIC INTERFACE (with retry, rate limiting, caching)
  // ========================================================================

  async healthCheck(): Promise<ProviderHealthStatus> {
    return this.executeWithRetry('healthCheck', () => this.healthCheckImplementation());
  }

  async listAccounts(filters?: AccountFilters): Promise<UnifiedAccount[]> {
    const cacheKey = this.getCacheKey('accounts', filters || {});

    return this.getCachedOrExecute(
      cacheKey,
      300000, // 5 minute cache
      () => this.executeWithRetry('listAccounts', () => this.listAccountsImplementation(filters))
    );
  }

  async getAccount(accountId: string): Promise<UnifiedAccount | null> {
    const accounts = await this.listAccounts();
    return accounts.find(a => a.id === accountId) || null;
  }

  async getBalance(accountId: string): Promise<{
    currentBalance: number;
    availableBalance?: number;
    ledgerBalance?: number;
    currency: string;
    lastUpdatedAt: string;
  }> {
    const account = await this.getAccount(accountId);
    if (!account) {
      throw new Error(`Account ${accountId} not found`);
    }

    return {
      currentBalance: account.currentBalance,
      availableBalance: account.availableBalance,
      ledgerBalance: account.ledgerBalance,
      currency: account.currency,
      lastUpdatedAt: account.lastSyncedAt || account.updatedAt,
    };
  }

  async syncAccount(accountId: string): Promise<UnifiedAccount> {
    // Clear cache for this account
    this.cache.delete(this.getCacheKey('accounts', {}));

    return this.executeWithRetry('syncAccount', async () => {
      const accounts = await this.listAccountsImplementation();
      const account = accounts.find(a => a.id === accountId);
      if (!account) {
        throw new Error(`Account ${accountId} not found`);
      }
      return account;
    });
  }

  async listTransactions(filters: TransactionFilters): Promise<UnifiedTransaction[]> {
    const cacheKey = this.getCacheKey('transactions', filters);

    return this.getCachedOrExecute(
      cacheKey,
      60000, // 1 minute cache
      () => this.executeWithRetry('listTransactions', () => this.listTransactionsImplementation(filters))
    );
  }

  async getTransaction(transactionId: string): Promise<UnifiedTransaction | null> {
    // Try cache first
    const cacheKey = this.getCacheKey('transaction', { transactionId });
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    // If not in cache, need to search
    const txns = await this.listTransactions({ limit: 1000 });
    const transaction = txns.find(t => t.id === transactionId || t.providerTransactionId === transactionId);

    if (transaction) {
      this.cache.set(cacheKey, {
        data: transaction,
        expiresAt: Date.now() + 300000, // 5 minute cache
      });
    }

    return transaction || null;
  }

  async syncTransactions(accountId: string, since?: string): Promise<UnifiedTransaction[]> {
    // Clear transaction cache
    this.cache.delete(this.getCacheKey('transactions', {}));

    return this.executeWithRetry('syncTransactions', () =>
      this.listTransactionsImplementation({
        accountIds: [accountId],
        startDate: since,
      })
    );
  }

  async initiatePayment(request: PaymentInitiationRequest): Promise<PaymentInitiationResponse> {
    // Payments are never cached
    return this.executeWithRetry('initiatePayment', () =>
      this.initiatePaymentImplementation(request)
    );
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentInitiationResponse> {
    return this.executeWithRetry('getPaymentStatus', async () => {
      // Subclasses can override to implement provider-specific status checking
      throw new Error('getPaymentStatus not implemented by this provider');
    });
  }

  // ========================================================================
  // PROTECTED HELPERS
  // ========================================================================

  /**
   * Execute operation with retry logic
   */
  protected async executeWithRetry<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const maxAttempts = this.config.retryPolicy?.maxAttempts || 3;
    const backoffMs = this.config.retryPolicy?.backoffMs || 1000;
    let lastError: any;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Check rate limit
        await this.checkRateLimit();

        // Execute operation
        const startTime = Date.now();
        const result = await fn();
        const duration = Date.now() - startTime;

        console.log(`[${this.provider}] ${operation} completed in ${duration}ms (attempt ${attempt}/${maxAttempts})`);
        return result;
      } catch (error) {
        lastError = error;

        // Don't retry certain errors
        if (this.isNonRetriableError(error)) {
          throw error;
        }

        // If not the last attempt, wait and retry
        if (attempt < maxAttempts) {
          const waitTime = backoffMs * attempt;
          console.warn(`[${this.provider}] ${operation} failed (attempt ${attempt}/${maxAttempts}), retrying in ${waitTime}ms:`, error?.message);
          await this.sleep(waitTime);
        }
      }
    }

    throw lastError;
  }

  /**
   * Check and enforce rate limits
   */
  protected async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const maxRequests = this.config.rateLimit?.maxRequests || 100;
    const windowMs = this.config.rateLimit?.perMilliseconds || 60000;

    // Reset counter if window expired
    if (now >= this.rateLimitState.resetTime) {
      this.rateLimitState.requestCount = 0;
      this.rateLimitState.resetTime = now + windowMs;
    }

    // Check if over limit
    if (this.rateLimitState.requestCount >= maxRequests) {
      const waitTime = this.rateLimitState.resetTime - now;
      console.warn(`[${this.provider}] Rate limit exceeded, waiting ${waitTime}ms`);
      await this.sleep(waitTime);
      this.rateLimitState.requestCount = 0;
      this.rateLimitState.resetTime = Date.now() + windowMs;
    }

    this.rateLimitState.requestCount++;
  }

  /**
   * Get from cache or execute function
   */
  protected async getCachedOrExecute<T>(
    key: string,
    ttlMs: number,
    fn: () => Promise<T>
  ): Promise<T> {
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      console.log(`[${this.provider}] Cache hit: ${key}`);
      return cached.data;
    }

    console.log(`[${this.provider}] Cache miss: ${key}`);
    const result = await fn();
    this.cache.set(key, {
      data: result,
      expiresAt: Date.now() + ttlMs,
    });

    return result;
  }

  /**
   * Generate cache key
   */
  protected getCacheKey(operation: string, params: any): string {
    const paramStr = JSON.stringify(params, Object.keys(params).sort());
    return `${this.provider}:${operation}:${Buffer.from(paramStr).toString('base64')}`;
  }

  /**
   * Check if error should not be retried
   */
  protected isNonRetriableError(error: any): boolean {
    const nonRetriableCodes = ['invalid_credentials', 'unauthorized', 'not_supported', 'invalid_payment'];
    return nonRetriableCodes.includes(error?.code);
  }

  /**
   * Sleep helper
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
