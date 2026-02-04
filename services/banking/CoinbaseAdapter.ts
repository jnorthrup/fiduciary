/**
 * Coinbase Adapter
 *
 * Adapter for Coinbase Commerce API - ACH and fiat payment processing.
 * Supports merchant accounts, ACH transfers, and payment methods.
 *
 * Coinbase Commerce API: https://commerce.coinbase.com/docs/api
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
 * Coinbase API response types
 */
interface CoinbaseAccount {
  id: string;
  name: string;
  currency: string;
  balance: {
    amount: string;
    currency: string;
  };
  available_balance: {
    amount: string;
    currency: string;
  };
  type: 'fiat' | 'crypto';
}

interface CoinbaseCharge {
  code: string;
  name: string;
  description: string;
  pricing_type: 'fixed_price' | 'no_price';
  price: {
    amount: string;
    currency: string;
  };
  status: 'created' | 'pending' | 'completed' | 'expired';
  created_at: string;
  expires_at: string;
}

interface CoinbasePaymentMethod {
  id: string;
  type: 'ach_bank_account' | 'fiat_account' | 'wire_transfer';
  name: string;
  currency: string;
}

export class CoinbaseAdapter extends BaseAdapter {
  readonly provider: BankingProvider = BankingProvider.COINBASE;
  private apiUrl: string;
  private apiKey: string;

  constructor(config: any) {
    super(config);
    this.apiUrl = config.credentials?.apiUrl || 'https://api.commerce.coinbase.com';
    this.apiKey = config.credentials?.apiKey || '';
  }

  // ========================================================================
  // CAPABILITIES
  // ========================================================================

  getCapabilities(): AdapterCapabilities {
    return {
      supportsAccountAggregation: true,
      supportsBalanceCheck: true,
      supportsTransactionHistory: true,
      supportsPaymentInitiation: true, // Supports ACH payments
      supportsWebhooks: true,
      supportsRealtimeUpdates: true,
      supportedPaymentMethods: ['ACH_CREDIT', 'ACH_DEBIT', 'WIRE'],
      maxHistoryDays: 365,
    };
  }

  // ========================================================================
  // HEALTH CHECK
  // ========================================================================

  async healthCheckImplementation(): Promise<ProviderHealthStatus> {
    const startTime = Date.now();
    try {
      const response = await this.makeRequest('/charges', { method: 'GET' });
      const latency = Date.now() - startTime;

      return {
        provider: this.provider,
        isHealthy: response.ok,
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
    try {
      const response = await this.makeRequest('/accounts', { method: 'GET' });

      if (!response.ok) {
        throw new Error(`Coinbase API error: ${response.status}`);
      }

      const data = await response.json();
      const accounts: CoinbaseAccount[] = data.data || [];

      let unified = accounts.map(this.transformAccount.bind(this));

      // Apply filters
      if (filters?.type) {
        unified = unified.filter(acc => acc.type === filters.type);
      }

      if (filters?.status) {
        unified = unified.filter(acc => acc.status === filters.status);
      }

      if (filters?.currency) {
        unified = unified.filter(acc => acc.currency === filters.currency);
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
    try {
      // Coinbase Commerce uses "charges" for payments
      const queryParams = new URLSearchParams();

      if (filters.startDate) {
        queryParams.append('start_date', new Date(filters.startDate).toISOString());
      }

      if (filters.endDate) {
        queryParams.append('end_date', new Date(filters.endDate).toISOString());
      }

      if (filters.limit) {
        queryParams.append('limit', filters.limit.toString());
      }

      const queryString = queryParams.toString();
      const endpoint = `/charges${queryString ? `?${queryString}` : ''}`;

      const response = await this.makeRequest(endpoint, { method: 'GET' });

      if (!response.ok) {
        throw new Error(`Coinbase API error: ${response.status}`);
      }

      const data = await response.json();
      const charges: CoinbaseCharge[] = data.data || [];

      let unified = charges.map(this.transformChargeToTransaction.bind(this));

      // Apply additional filters
      if (filters.minAmount !== undefined) {
        unified = unified.filter(tx => Math.abs(tx.amount) >= filters.minAmount!);
      }

      if (filters.maxAmount !== undefined) {
        unified = unified.filter(tx => Math.abs(tx.amount) <= filters.maxAmount!);
      }

      if (filters.direction) {
        unified = unified.filter(tx => tx.direction === filters.direction);
      }

      return unified;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ========================================================================
  // INITIATE PAYMENT (ACH)
  // ========================================================================

  async initiatePaymentImplementation(request: PaymentInitiationRequest): Promise<PaymentInitiationResponse> {
    try {
      // Coinbase Commerce creates a "charge" for ACH payments
      const chargePayload = {
        name: request.beneficiaryName || 'Payment',
        description: request.reference || 'Fiduciary ACH Payment',
        pricing_type: 'fixed_price',
        price: {
          amount: request.amount.toFixed(2),
          currency: request.currency || 'USD',
        },
        metadata: {
          source_account: request.sourceAccountId,
          beneficiary_account: request.beneficiaryAccount,
          payment_method: request.method || 'ACH_CREDIT',
        },
      };

      const response = await this.makeRequest('/charges', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chargePayload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Coinbase charge creation failed: ${error.message || response.status}`);
      }

      const charge: CoinbaseCharge = await response.json();

      return {
        paymentId: charge.code,
        status: this.mapChargeStatus(charge.status),
        provider: this.provider,
        createdAt: new Date(charge.created_at).toISOString(),
        expiresAt: new Date(charge.expires_at).toISOString(),
        amount: parseFloat(charge.price.amount),
        currency: charge.price.currency,
        fee: 0, // Coinbase Commerce doesn't charge for ACH
        estimatedArrival: this.estimateArrival(charge.status),
        metadata: {
          chargeCode: charge.code,
          hostedUrl: `${this.apiUrl.replace('api', 'commerce')}/checkout/${charge.code}`,
          paymentMethods: ['ach_bank_account', 'wire_transfer'],
        },
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ========================================================================
  // GET BALANCE
  // ========================================================================

  async getBalance(accountId: string): Promise<{ currentBalance: number; availableBalance: number; currency: string }> {
    try {
      const response = await this.makeRequest(`/accounts/${accountId}`, { method: 'GET' });

      if (!response.ok) {
        throw new Error(`Coinbase API error: ${response.status}`);
      }

      const account: CoinbaseAccount = await response.json();

      return {
        currentBalance: parseFloat(account.balance.amount),
        availableBalance: parseFloat(account.available_balance.amount),
        currency: account.balance.currency,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ========================================================================
  // GET PAYMENT METHODS (ACH accounts)
  // ========================================================================

  async getPaymentMethods(): Promise<CoinbasePaymentMethod[]> {
    try {
      const response = await this.makeRequest('/payment-methods', { method: 'GET' });

      if (!response.ok) {
        throw new Error(`Coinbase API error: ${response.status}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ========================================================================
  // TRANSFORMATION HELPERS
  // ========================================================================

  private transformAccount(account: CoinbaseAccount): UnifiedAccount {
    return {
      id: `coinbase_${account.id}`,
      provider: this.provider,
      providerAccountId: account.id,
      type: account.type === 'fiat' ? UnifiedAccountType.CHECKING : UnifiedAccountType.CRYPTO,
      name: account.name,
      displayName: `Coinbase ${account.name}`,
      currency: account.currency,
      status: AccountStatus.ACTIVE,
      currentBalance: parseFloat(account.balance.amount),
      availableBalance: parseFloat(account.available_balance.amount),
      accountNumber: null,
      routingNumber: null,
      swiftCode: null,
      institution: {
        name: 'Coinbase',
        address: null,
        country: 'US',
      },
      metadata: {
        type: account.type,
      },
      lastSync: new Date().toISOString(),
    };
  }

  private transformChargeToTransaction(charge: CoinbaseCharge): UnifiedTransaction {
    const isCredit = charge.pricing_type === 'fixed_price';
    const amount = parseFloat(charge.price.amount);

    return {
      id: `coinbase_charge_${charge.code}`,
      provider: this.provider,
      providerTransactionId: charge.code,
      accountId: charge.code, // Charges don't have traditional account IDs
      type: isCredit ? TransactionType.PAYMENT : TransactionType.TRANSFER,
      direction: isCredit ? TransactionDirection.CREDIT : TransactionDirection.DEBIT,
      amount: amount,
      currency: charge.price.currency,
      status: this.mapChargeStatus(charge.status),
      description: charge.description || charge.name,
      memo: charge.name,
      valueDate: new Date(charge.created_at).toISOString(),
      bookingDate: new Date(charge.created_at).toISOString(),
      counterparty: {
        name: 'Coinbase Commerce',
        account: null,
      },
      metadata: {
        chargeCode: charge.code,
        pricingType: charge.pricing_type,
        checkoutUrl: `${this.apiUrl.replace('api', 'commerce')}/checkout/${charge.code}`,
      },
      raw: charge,
    };
  }

  private mapChargeStatus(status: string): TransactionStatus {
    switch (status) {
      case 'created':
        return TransactionStatus.PENDING;
      case 'pending':
        return TransactionStatus.PENDING;
      case 'completed':
        return TransactionStatus.COMPLETED;
      case 'expired':
        return TransactionStatus.FAILED;
      default:
        return TransactionStatus.UNKNOWN;
    }
  }

  private estimateArrival(status: string): string | undefined {
    // ACH typically takes 1-3 business days
    const days = 3;
    const arrival = new Date();
    arrival.setDate(arrival.getDate() + days);
    return arrival.toISOString();
  }

  // ========================================================================
  // ERROR HANDLING
  // ========================================================================

  private handleError(error: any): BankingErrorCode {
    if (error.response?.status === 401) {
      return { code: 'AUTHENTICATION_FAILED', message: 'Invalid Coinbase API key' };
    }
    if (error.response?.status === 403) {
      return { code: 'AUTHORIZATION_FAILED', message: 'Insufficient permissions' };
    }
    if (error.response?.status === 429) {
      return { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' };
    }
    if (error.response?.status >= 500) {
      return { code: 'PROVIDER_UNAVAILABLE', message: 'Coinbase API error' };
    }
    return { code: 'UNKNOWN_ERROR', message: error.message || 'Unknown error' };
  }

  // ========================================================================
  // HTTP CLIENT
  // ========================================================================

  private async makeRequest(endpoint: string, options: RequestInit): Promise<Response> {
    const url = `${this.apiUrl}${endpoint}`;

    const headers = {
      ...options.headers,
      'X-CC-Api-Key': this.apiKey,
      'X-CC-Version': '2018-03-22',
      'Accept': 'application/json',
    };

    return fetch(url, {
      ...options,
      headers,
    });
  }
}
