/**
 * Plaid Adapter
 *
 * Adapter for Plaid API - bank account aggregation and transaction processing.
 * Supports account linking, balance checks, transaction history, and auth.
 *
 * Plaid API: https://plaid.com/docs/api
 *
 * Note: This adapter requires a Plaid Client ID and Secret.
 * Get credentials at: https://dashboard.plaid.com
 */

import { BaseAdapter } from './BaseAdapter';
import type {
  AdapterCapabilities,
  ProviderHealthStatus,
  UnifiedAccount,
  UnifiedTransaction,
  PaymentInitiationRequest,
  PaymentInitiationResponse,
  AccountFilters,
  TransactionFilters,
  BankingErrorCode,
  BankingProvider,
  TransactionType,
  TransactionDirection,
  TransactionStatus,
  AccountStatus,
  UnifiedAccountType,
} from '../../types/banking';

/**
 * Plaid API response types
 */
interface PlaidAccount {
  account_id: string;
  name: string;
  official_name?: string;
  type: 'checking' | 'savings' | 'cd' | 'money_market' | 'credit_card' | 'loan' | 'brokerage' | 'investment';
  subtype: string[];
  mask: string;
  balances: {
    available?: number;
    current?: number;
    limit?: number;
    currency?: string;
    iso_currency_code?: string;
  };
}

interface PlaidTransaction {
  transaction_id: string;
  account_id: string;
  amount: number;
  date: string;
  name: string;
  merchant_name?: string;
  payment_channel: 'online' | 'in store' | 'other';
  pending: boolean;
  category?: string[];
  category_id?: string;
  currency: string;
  iso_currency_code?: string;
}

interface PlaidItem {
  item_id: string;
  institution_id: string;
  webhook?: string;
  error?: {
    error_code: string;
    error_message: string;
  };
  available_products: string[];
  billed_products: string[];
}

interface PlaidInstitution {
  institution_id: string;
  name: string;
  primary_color?: string;
  logo?: string;
  url?: string;
}

export class PlaidAdapter extends BaseAdapter {
  readonly provider: BankingProvider = BankingProvider.PLAID;
  private apiUrl: string;
  private clientId: string;
  private secret: string;
  private accessToken: string | null = null;

  constructor(config: any) {
    super(config);

    const environment = config.environment || 'sandbox';
    this.clientId = config.credentials?.clientId || '';
    this.secret = config.credentials?.secret || '';

    // Map environment to Plaid API URL
    const envUrls: Record<string, string> = {
      sandbox: 'https://sandbox.plaid.com',
      development: 'https://development.plaid.com',
      production: 'https://production.plaid.com',
    };
    this.apiUrl = envUrls[environment] || envUrls.sandbox;
  }

  // ========================================================================
  // CAPABILITIES
  // ========================================================================

  getCapabilities(): AdapterCapabilities {
    return {
      supportsAccountAggregation: true,
      supportsBalanceCheck: true,
      supportsTransactionHistory: true,
      supportsPaymentInitiation: false, // Plaid doesn't directly support payments
      supportsWebhooks: true,
      supportsRealtimeUpdates: false, // Requires webhook setup
      supportedPaymentMethods: [], // No direct payment support
      maxHistoryDays: 730, // 2 years
    };
  }

  // ========================================================================
  // HEALTH CHECK
  // ========================================================================

  async healthCheckImplementation(): Promise<ProviderHealthStatus> {
    const startTime = Date.now();
    try {
      // Test API connectivity with a simple auth call
      const response = await this.makePlaidRequest('/auth/get', {
        access_token: this.accessToken || 'access-sandbox-xxx',
      });

      const latency = Date.now() - startTime;

      // Even with invalid token, if we get a response, API is up
      return {
        provider: this.provider,
        isHealthy: response.ok || response.status === 400 || response.status === 401,
        latencyMs: latency,
        lastChecked: new Date().toISOString(),
        features: this.getCapabilities(),
      };
    } catch (error) {
      return {
        provider: this.provider,
        isHealthy: false,
        latencyMs: Date.now() - startTime,
        lastChecked: new Date().toISOString(),
        error: this.handleError(error),
        features: this.getCapabilities(),
      };
    }
  }

  // ========================================================================
  // LIST ACCOUNTS
  // ========================================================================

  async listAccountsImplementation(filters?: AccountFilters): Promise<UnifiedAccount[]> {
    if (!this.accessToken) {
      throw new Error('No access token. Call exchangePublicToken() first.');
    }

    try {
      const response = await this.makePlaidRequest('/accounts/get', {
        access_token: this.accessToken,
        options: {
          account_ids: filters?.accountIds,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Plaid API error: ${error.error_message || response.status}`);
      }

      const data = await response.json();
      const accounts: PlaidAccount[] = data.accounts || [];
      const item: PlaidItem = data.item;

      let unified = accounts.map((acc) => this.transformAccount(acc, item));

      // Apply filters
      if (filters?.type) {
        unified = unified.filter((acc) => acc.type === filters.type);
      }

      if (filters?.status) {
        unified = unified.filter((acc) => acc.status === filters.status);
      }

      if (filters?.currency) {
        unified = unified.filter((acc) => acc.currency === filters.currency);
      }

      return unified;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ========================================================================
  // LIST TRANSACTIONS
  // ========================================================================

  async listTransactionsImplementation(filters: TransactionFilters): Promise<UnifiedTransaction[]> {
    if (!this.accessToken) {
      throw new Error('No access token. Call exchangePublicToken() first.');
    }

    try {
      const requestConfig: any = {
        access_token: this.accessToken,
        start_date: filters.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: filters.endDate || new Date().toISOString().split('T')[0],
        options: {
          count: filters.limit || 100,
          offset: filters.offset || 0,
        },
      };

      const response = await this.makePlaidRequest('/transactions/get', requestConfig);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Plaid API error: ${error.error_message || response.status}`);
      }

      const data = await response.json();
      const transactions: PlaidTransaction[] = data.transactions || [];
      const accounts: PlaidAccount[] = data.accounts || [];

      // Create account lookup map
      const accountMap = new Map<string, PlaidAccount>();
      accounts.forEach((acc) => accountMap.set(acc.account_id, acc));

      let unified = transactions.map((tx) => this.transformTransaction(tx, accountMap.get(tx.account_id)));

      // Apply additional filters
      if (filters.minAmount !== undefined) {
        unified = unified.filter((tx) => Math.abs(tx.amount) >= filters.minAmount!);
      }

      if (filters.maxAmount !== undefined) {
        unified = unified.filter((tx) => Math.abs(tx.amount) <= filters.maxAmount!);
      }

      if (filters.direction) {
        unified = unified.filter((tx) => tx.direction === filters.direction);
      }

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        unified = unified.filter(
          (tx) =>
            tx.description?.toLowerCase().includes(searchLower) ||
            tx.memo?.toLowerCase().includes(searchLower) ||
            tx.counterparty?.name?.toLowerCase().includes(searchLower)
        );
      }

      return unified;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ========================================================================
  // PAYMENT INITIATION
  // ========================================================================

  async initiatePaymentImplementation(request: PaymentInitiationRequest): Promise<PaymentInitiationResponse> {
    // Plaid doesn't support direct payment initiation
    throw new Error(
      'Payment initiation not supported by Plaid adapter. ' +
      'Plaid provides read-only access to accounts and transactions. ' +
      'Use a payment provider like Stripe, Dwolla, or bank-specific APIs for ACH payments.'
    );
  }

  // ========================================================================
  // PLAID-SPECIFIC METHODS
  // ========================================================================

  /**
   * Exchange a public token for an access token
   * Called after Plaid Link successful authentication
   */
  async exchangePublicToken(publicToken: string): Promise<string> {
    try {
      const response = await this.makePlaidRequest('/item/public_token/exchange', {
        public_token: publicToken,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Token exchange failed: ${error.error_message || response.status}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      return this.accessToken;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Create a link token for Plaid Link frontend
   */
  async createLinkToken(user?: { clientUserId: string }): Promise<string> {
    try {
      const configs = {
        user: { client_user_id: user?.clientUserId || 'user-' + Date.now() },
        client_name: 'Fiduciary App',
        products: ['auth', 'transactions', 'balance'] as const,
        country_codes: ['US'],
        language: 'en',
        webhook: this.config.webhookUrl,
      };

      const response = await this.makePlaidRequest('/link/token/create', configs);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Link token creation failed: ${error.error_message || response.status}`);
      }

      const data = await response.json();
      return data.link_token;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get account numbers (routing and account numbers)
   * Requires auth numbers product
   */
  async getAccountNumbers(accountId: string): Promise<{
    accountNumber: string;
    routingNumber: string;
  } | null> {
    if (!this.accessToken) {
      throw new Error('No access token. Call exchangePublicToken() first.');
    }

    try {
      const response = await this.makePlaidRequest('/auth/get', {
        access_token: this.accessToken,
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const account = data.accounts?.find((a: PlaidAccount) => a.account_id === accountId);

      if (!account) {
        return null;
      }

      const numbers = data.numbers?.ach?.find((n: any) => n.account_id === accountId);

      return {
        accountNumber: numbers?.account || '',
        routingNumber: numbers?.routing || '',
      };
    } catch (error) {
      console.error('Error getting account numbers:', error);
      return null;
    }
  }

  /**
   * Get balance for a specific account
   */
  async getBalance(accountId: string): Promise<{
    currentBalance: number;
    availableBalance?: number;
    currency: string;
    lastUpdatedAt: string;
  }> {
    if (!this.accessToken) {
      throw new Error('No access token. Call exchangePublicToken() first.');
    }

    try {
      const response = await this.makePlaidRequest('/accounts/balance/get', {
        access_token: this.accessToken,
        options: {
          account_ids: [accountId],
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Balance check failed: ${error.error_message || response.status}`);
      }

      const data = await response.json();
      const account = data.accounts?.find((a: PlaidAccount) => a.account_id === accountId);

      if (!account) {
        throw new Error('Account not found');
      }

      return {
        currentBalance: account.balances.current || 0,
        availableBalance: account.balances.available,
        currency: account.balances.iso_currency_code || account.balances.currency || 'USD',
        lastUpdatedAt: new Date().toISOString(),
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Rotate access token (security best practice)
   */
  async rotateAccessToken(): Promise<string> {
    if (!this.accessToken) {
      throw new Error('No access token to rotate.');
    }

    try {
      const response = await this.makePlaidRequest('/item/access_token/invalidate', {
        access_token: this.accessToken,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Token rotation failed: ${error.error_message || response.status}`);
      }

      const data = await response.json();
      this.accessToken = data.new_access_token;
      return this.accessToken;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ========================================================================
  // TRANSFORMATION HELPERS
  // ========================================================================

  private transformAccount(account: PlaidAccount, item: PlaidItem): UnifiedAccount {
    // Map Plaid account types to unified types
    const typeMap: Record<string, UnifiedAccountType> = {
      checking: UnifiedAccountType.CHECKING,
      savings: UnifiedAccountType.SAVINGS,
      cd: UnifiedAccountType.CD,
      money_market: UnifiedAccountType.MONEY_MARKET,
      credit_card: UnifiedAccountType.CREDIT_CARD,
      loan: UnifiedAccountType.LOAN,
      brokerage: UnifiedAccountType.INVESTMENT,
      investment: UnifiedAccountType.INVESTMENT,
    };

    const currency = account.balances.iso_currency_code || account.balances.currency || 'USD';

    return {
      id: `plaid_${account.account_id}`,
      provider: this.provider,
      providerAccountId: account.account_id,
      type: typeMap[account.type] || UnifiedAccountType.UNKNOWN,
      name: account.official_name || account.name,
      displayName: `${account.official_name || account.name} (...${account.mask})`,
      currency,
      status: item.error ? AccountStatus.FROZEN : AccountStatus.ACTIVE,
      currentBalance: account.balances.current || 0,
      availableBalance: account.balances.available,
      accountNumber: account.mask,
      routingNumber: null,
      swiftCode: null,
      institution: {
        name: item.institution_id || 'Unknown',
        address: null,
        country: 'US',
      },
      metadata: {
        itemId: item.item_id,
        institutionId: item.institution_id,
        subtypes: account.subtype,
        mask: account.mask,
      },
      lastSync: new Date().toISOString(),
    };
  }

  private transformTransaction(transaction: PlaidTransaction, account?: PlaidAccount): UnifiedTransaction {
    const isDebit = transaction.amount < 0;

    return {
      id: `plaid_tx_${transaction.transaction_id}`,
      provider: this.provider,
      providerTransactionId: transaction.transaction_id,
      accountId: `plaid_${transaction.account_id}`,
      type: TransactionType.PAYMENT,
      direction: isDebit ? TransactionDirection.DEBIT : TransactionDirection.CREDIT,
      amount: Math.abs(transaction.amount),
      currency: transaction.iso_currency_code || transaction.currency || 'USD',
      status: transaction.pending ? TransactionStatus.PENDING : TransactionStatus.COMPLETED,
      description: transaction.name,
      memo: transaction.merchant_name,
      valueDate: new Date(transaction.date).toISOString(),
      bookingDate: new Date(transaction.date).toISOString(),
      category: transaction.category?.[0],
      counterparty: {
        name: transaction.merchant_name || transaction.name,
        account: null,
      },
      metadata: {
        paymentChannel: transaction.payment_channel,
        categoryId: transaction.category_id,
        pending: transaction.pending,
        accountMask: account?.mask,
      },
      raw: transaction,
    };
  }

  // ========================================================================
  // ERROR HANDLING
  // ========================================================================

  private handleError(error: any): BankingErrorCode {
    if (error.response?.status === 401 || error.code === 'ITEM_LOGIN_REQUIRED') {
      return {
        code: 'AUTHENTICATION_FAILED',
        message: 'Plaid credentials invalid or item needs re-authentication',
      };
    }
    if (error.response?.status === 403) {
      return { code: 'AUTHORIZATION_FAILED', message: 'Insufficient permissions' };
    }
    if (error.response?.status === 429 || error.code === 'RATE_LIMIT_EXCEEDED') {
      return { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' };
    }
    if (error.response?.status >= 500 || error.code === 'INTERNAL_SERVER_ERROR') {
      return { code: 'PROVIDER_UNAVAILABLE', message: 'Plaid API error' };
    }
    if (error.code === 'INVALID_ACCESS_TOKEN') {
      return { code: 'INVALID credentials', message: 'Access token expired or invalid' };
    }
    return { code: 'UNKNOWN_ERROR', message: error.message || 'Unknown error' };
  }

  // ========================================================================
  // HTTP CLIENT
  // ========================================================================

  private async makePlaidRequest(endpoint: string, data: any): Promise<Response> {
    const url = `${this.apiUrl}${endpoint}`;

    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Plaid-Version': '2020-09-14',
      },
      body: JSON.stringify({
        client_id: this.clientId,
        secret: this.secret,
        ...data,
      }),
    });
  }
}
