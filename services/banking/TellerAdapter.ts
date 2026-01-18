/**
 * Teller.io Adapter
 *
 * Adapter for Teller - open-source bank data scraper.
 * MIT license, supports 4000+ US/UK institutions.
 *
 * Teller API: https://teller.io/docs/api
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
 * Teller API response types (based on public docs)
 */
interface TellerAccount {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'investment' | 'credit-card' | 'loan';
  institution: { name: string };
  account_number: string;
  routing_number: string;
  balances: {
    ledger: number;
    available: number;
  };
  currency: string;
}

interface TellerTransaction {
  id: string;
  account_id: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  merchant_name?: string;
  status: 'posted' | 'pending';
  type: 'card' | 'ach' | 'wire' | 'check' | 'digital';
}

export class TellerAdapter extends BaseAdapter {
  readonly provider: BankingProvider = BankingProvider.TELLER;
  private apiUrl: string;
  private apiKey: string;

  constructor(config: any) {
    super(config);
    this.apiUrl = config.credentials?.apiUrl || 'https://api.teller.io';
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
      supportsPaymentInitiation: false, // Teller is read-only
      supportsWebhooks: true,
      supportsRealtimeUpdates: true,
      supportedPaymentMethods: [], // No payments
      maxHistoryDays: 730,
    };
  }

  // ========================================================================
  // HEALTH CHECK
  // ========================================================================

  async healthCheckImplementation(): Promise<ProviderHealthStatus> {
    const startTime = Date.now();
    try {
      const response = await this.makeRequest('/accounts', { method: 'GET' });
      const latency = Date.now() - startTime;

      return {
        provider: this.provider,
        isHealthy: response.ok,
        latencyMs: latency,
        lastChecked: new Date().toISOString(),
        errorMessage: response.ok ? undefined : 'API returned error',
      };
    } catch (error) {
      return {
        provider: this.provider,
        isHealthy: false,
        latencyMs: Date.now() - startTime,
        lastChecked: new Date().toISOString(),
        errorMessage: error?.message || 'Connection failed',
      };
    }
  }

  // ========================================================================
  // ACCOUNTS
  // ========================================================================

  async listAccountsImplementation(filters?: AccountFilters): Promise<UnifiedAccount[]> {
    const response = await this.makeRequest('/accounts', { method: 'GET' });

    if (!response.ok) {
      throw this.handleError(response);
    }

    const tellerAccounts: TellerAccount[] = await response.json();

    return tellerAccounts.map(this.transformAccount);
  }

  private transformAccount(tellerAcct: TellerAccount): UnifiedAccount {
    const type = this.mapAccountType(tellerAcct.type);

    return {
      id: `teller_${tellerAcct.id}`,
      provider: this.provider,
      providerAccountId: tellerAcct.id,
      type,
      name: tellerAcct.name,
      displayName: `${tellerAcct.institution.name} - ${tellerAcct.name}`,
      currency: tellerAcct.currency,
      status: AccountStatus.ACTIVE,
      currentBalance: tellerAcct.balances.ledger,
      availableBalance: tellerAcct.balances.available,
      ledgerBalance: tellerAcct.balances.ledger,
      institutionName: tellerAcct.institution.name,
      accountNumberMask: tellerAcct.account_number.slice(-4),
      routingNumber: tellerAcct.routing_number,
      lastSyncedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  private mapAccountType(tellerType: string): UnifiedAccountType {
    const mapping: Record<string, UnifiedAccountType> = {
      checking: UnifiedAccountType.CHECKING,
      savings: UnifiedAccountType.SAVINGS,
      investment: UnifiedAccountType.INVESTMENT,
      'credit-card': UnifiedAccountType.CREDIT_CARD,
      loan: UnifiedAccountType.LOAN,
    };
    return mapping[tellerType] || UnifiedAccountType.UNKNOWN;
  }

  // ========================================================================
  // TRANSACTIONS
  // ========================================================================

  async listTransactionsImplementation(filters: TransactionFilters): Promise<UnifiedTransaction[]> {
    if (!filters.accountIds || filters.accountIds.length === 0) {
      throw new Error('accountId is required for Teller transactions');
    }

    const accountId = filters.accountIds[0];
    const providerAccountId = accountId.replace('teller_', '');

    const url = `/accounts/${providerAccountId}/transactions`;
    const response = await this.makeRequest(url, { method: 'GET' });

    if (!response.ok) {
      throw this.handleError(response);
    }

    const tellerTxns: TellerTransaction[] = await response.json();

    return tellerTxns
      .map(txn => this.transformTransaction(txn, accountId))
      .filter(txn => this.applyTransactionFilters(txn, filters));
  }

  private transformTransaction(tellerTxn: TellerTransaction, accountId: string): UnifiedTransaction {
    const isNegative = tellerTxn.amount < 0;

    return {
      id: `teller_${tellerTxn.id}`,
      provider: this.provider,
      providerTransactionId: tellerTxn.id,
      accountId,
      amount: tellerTxn.amount,
      currency: tellerTxn.currency,
      description: tellerTxn.description,
      category: tellerTxn.category,
      type: this.mapTransactionType(tellerTxn.type),
      direction: isNegative ? TransactionDirection.DEBIT : TransactionDirection.CREDIT,
      status: tellerTxn.status === 'posted' ? TransactionStatus.BOOKED : TransactionStatus.PENDING,
      merchantName: tellerTxn.merchant_name,
      bookedAt: tellerTxn.date,
      valueAt: tellerTxn.date,
      createdAt: new Date().toISOString(),
    };
  }

  private mapTransactionType(tellerType: string): TransactionType {
    const mapping: Record<string, TransactionType> = {
      card: TransactionType.CARD_PAYMENT,
      ach: TransactionType.ACH,
      wire: TransactionType.WIRE,
      check: TransactionType.CHECK,
      digital: TransactionType.BANK_TRANSFER,
    };
    return mapping[tellerType] || TransactionType.UNKNOWN;
  }

  private applyTransactionFilters(txn: UnifiedTransaction, filters: TransactionFilters): boolean {
    if (filters.startDate && txn.bookedAt < filters.startDate) return false;
    if (filters.endDate && txn.bookedAt > filters.endDate) return false;
    if (filters.direction && txn.direction !== filters.direction) return false;
    if (filters.minAmount && Math.abs(txn.amount) < filters.minAmount) return false;
    if (filters.maxAmount && Math.abs(txn.amount) > filters.maxAmount) return false;
    if (filters.search && !txn.description.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  }

  // ========================================================================
  // PAYMENTS (Not supported by Teller)
  // ========================================================================

  async initiatePaymentImplementation(): Promise<PaymentInitiationResponse> {
    throw new Error('Payment initiation not supported by Teller API');
  }

  // ========================================================================
  // HTTP HELPERS
  // ========================================================================

  private async makeRequest(endpoint: string, options: RequestInit): Promise<Response> {
    const url = `${this.apiUrl}${endpoint}`;

    const headers: HeadersInit = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    return fetch(url, {
      ...options,
      headers,
    });
  }

  private handleError(response: Response): Error {
    let code = BankingErrorCode.UNKNOWN_ERROR;

    if (response.status === 401) code = BankingErrorCode.INVALID_CREDENTIALS;
    if (response.status === 429) code = BankingErrorCode.RATE_LIMITED;
    if (response.status === 404) code = BankingErrorCode.ACCOUNT_NOT_FOUND;

    return new Error(`Teller API error: ${response.status} ${response.statusText}`);
  }
}
