/**
 * Mock Banking Adapter
 *
 * Implementation for testing and development.
 * Returns realistic mock data without connecting to real providers.
 */

import { BaseAdapter } from './BaseAdapter';
import {
  TransactionType,
  TransactionDirection,
  TransactionStatus,
  AccountStatus,
  PaymentStatus,
  BankingProvider,
  BankingErrorCode,
} from '../../types/banking';
import type {
  AdapterCapabilities,
  ProviderHealthStatus,
  UnifiedAccount,
  UnifiedTransaction,
  PaymentInitiationRequest,
  PaymentInitiationResponse,
  AccountFilters,
  TransactionFilters,
} from '../../types/banking';

export class MockAdapter extends BaseAdapter {
  readonly provider: BankingProvider;

  // Mock data storage
  private mockAccounts: Map<string, UnifiedAccount[]> = new Map();
  private mockTransactions: Map<string, UnifiedTransaction[]> = new Map();

  constructor(config: any) {
    super(config);
    this.provider = (config.provider as BankingProvider) || ('plaid' as BankingProvider);
    this.initializeMockData();
  }

  // ========================================================================
  // REQUIRED IMPLEMENTATIONS
  // ========================================================================

  getCapabilities(): AdapterCapabilities {
    return {
      supportsAccountAggregation: true,
      supportsBalanceCheck: true,
      supportsTransactionHistory: true,
      supportsPaymentInitiation: true,
      supportsWebhooks: false,
      supportsRealtimeUpdates: false,
      supportedPaymentMethods: ['ach_credit', 'wire', 'internal_transfer'],
      maxHistoryDays: 730, // 2 years
    };
  }

  async healthCheckImplementation(): Promise<ProviderHealthStatus> {
    return {
      provider: this.provider,
      isHealthy: true,
      latencyMs: 50,
      lastChecked: new Date().toISOString(),
    };
  }

  async listAccountsImplementation(filters?: AccountFilters): Promise<UnifiedAccount[]> {
    let accounts = Array.from(this.mockAccounts.values()).flat();

    if (filters?.type) {
      accounts = accounts.filter(a => a.type === filters.type);
    }
    if (filters?.status) {
      accounts = accounts.filter(a => a.status === filters.status);
    }
    if (filters?.currency) {
      accounts = accounts.filter(a => a.currency === filters.currency);
    }

    return accounts;
  }

  async listTransactionsImplementation(filters: TransactionFilters): Promise<UnifiedTransaction[]> {
    let transactions = Array.from(this.mockTransactions.values()).flat();

    if (filters?.accountIds) {
      transactions = transactions.filter(t => filters.accountIds!.includes(t.accountId));
    }
    if (filters?.direction) {
      transactions = transactions.filter(t => t.direction === filters.direction);
    }
    if (filters?.startDate) {
      transactions = transactions.filter(t => t.bookedAt >= filters.startDate!);
    }
    if (filters?.endDate) {
      transactions = transactions.filter(t => t.bookedAt <= filters.endDate!);
    }
    if (filters?.minAmount) {
      transactions = transactions.filter(t => Math.abs(t.amount) >= filters.minAmount!);
    }
    if (filters?.maxAmount) {
      transactions = transactions.filter(t => Math.abs(t.amount) <= filters.maxAmount!);
    }
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      transactions = transactions.filter(t =>
        t.description.toLowerCase().includes(searchLower) ||
        t.merchantName?.toLowerCase().includes(searchLower)
      );
    }

    // Sort by date descending
    transactions.sort((a, b) => new Date(b.bookedAt).getTime() - new Date(a.bookedAt).getTime());

    // Apply limit and offset
    if (filters?.offset) {
      transactions = transactions.slice(filters.offset);
    }
    if (filters?.limit) {
      transactions = transactions.slice(0, filters.limit);
    }

    return transactions;
  }

  async initiatePaymentImplementation(request: PaymentInitiationRequest): Promise<PaymentInitiationResponse> {
    // Simulate processing
    await this.sleep(500);

    const paymentId = `mock_payment_${Date.now()}`;

    // Create a transaction for this payment
    const transaction: UnifiedTransaction = {
      id: `txn_${paymentId}`,
      provider: this.provider,
      providerTransactionId: paymentId,
      accountId: request.sourceAccountId,
      amount: -request.amount,
      currency: request.currency,
      description: request.description || request.reference || 'Payment',
      type: TransactionType.BANK_TRANSFER,
      direction: TransactionDirection.DEBIT,
      status: TransactionStatus.PENDING,
      counterpartName: request.beneficiaryName,
      counterpartAccount: request.beneficiaryAccount,
      reference: request.reference,
      bookedAt: new Date().toISOString(),
      valueAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    // Store transaction
    const accountTransactions = this.mockTransactions.get(request.sourceAccountId) || [];
    accountTransactions.unshift(transaction);
    this.mockTransactions.set(request.sourceAccountId, accountTransactions);

    return {
      paymentId,
      providerPaymentId: paymentId,
      status: PaymentStatus.PROCESSING,
      submittedAt: new Date().toISOString(),
      expectedSettlementAt: new Date(Date.now() + 86400000).toISOString(), // +1 day
      fees: 0,
    };
  }

  // ========================================================================
  // MOCK DATA GENERATION
  // ========================================================================

  private initializeMockData(): void {
    // Generate mock accounts
    const accounts: UnifiedAccount[] = [
      {
        id: 'mock_acct_1',
        provider: this.provider,
        providerAccountId: 'plaid_acct_1',
        type: 'checking' as any,
        name: 'Primary Checking',
        displayName: 'Chase Checking - ****1234',
        currency: 'USD',
        status: AccountStatus.ACTIVE,
        currentBalance: 15234.56,
        availableBalance: 14834.56,
        ledgerBalance: 15234.56,
        institutionName: 'Chase Bank',
        institutionId: 'ins_1',
        accountNumberMask: '1234',
        routingNumber: '021000021',
        lastSyncedAt: new Date().toISOString(),
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'mock_acct_2',
        provider: this.provider,
        providerAccountId: 'plaid_acct_2',
        type: 'savings' as any,
        name: 'Emergency Savings',
        displayName: 'Chase Savings - ****5678',
        currency: 'USD',
        status: AccountStatus.ACTIVE,
        currentBalance: 45678.90,
        availableBalance: 45678.90,
        ledgerBalance: 45678.90,
        institutionName: 'Chase Bank',
        institutionId: 'ins_1',
        accountNumberMask: '5678',
        routingNumber: '021000021',
        lastSyncedAt: new Date().toISOString(),
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'mock_acct_3',
        provider: this.provider,
        providerAccountId: 'plaid_acct_3',
        type: 'credit_card' as any,
        name: 'Rewards Credit Card',
        displayName: 'Chase Sapphire - ****9012',
        currency: 'USD',
        status: AccountStatus.ACTIVE,
        currentBalance: -2345.67,
        availableBalance: 7654.33,
        ledgerBalance: -2345.67,
        institutionName: 'Chase Bank',
        institutionId: 'ins_1',
        accountNumberMask: '9012',
        lastSyncedAt: new Date().toISOString(),
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: new Date().toISOString(),
      },
    ];

    this.mockAccounts.set('default', accounts);

    // Generate mock transactions for each account
    accounts.forEach(account => {
      const transactions = this.generateMockTransactions(account.id, account.type);
      this.mockTransactions.set(account.id, transactions);
    });
  }

  private generateMockTransactions(accountId: string, accountType: string): UnifiedTransaction[] {
    const transactions: UnifiedTransaction[] = [];
    const now = Date.now();
    const merchants = [
      'Amazon',
      'Starbucks',
      'Whole Foods',
      'Shell Gas',
      'Netflix',
      'AT&T',
      'Target',
      'Costco',
      'Uber',
      'Delta Airlines',
    ];

    for (let i = 0; i < 50; i++) {
      const date = new Date(now - i * 86400000 * Math.random() * 30); // Last 30 days
      const isCredit = accountType === 'credit_card' || Math.random() > 0.7;
      const merchant = merchants[Math.floor(Math.random() * merchants.length)];
      const amount = Math.round((Math.random() * 200 + 5) * 100) / 100;

      transactions.push({
        id: `mock_txn_${accountId}_${i}`,
        provider: this.provider,
        providerTransactionId: `plaid_txn_${i}`,
        accountId,
        amount: isCredit ? -amount : amount,
        currency: 'USD',
        description: `Purchase at ${merchant}`,
        category: isCredit ? 'Shopping' : 'Income',
        type: TransactionType.CARD_PAYMENT,
        direction: isCredit ? TransactionDirection.DEBIT : TransactionDirection.CREDIT,
        status: Math.random() > 0.1 ? TransactionStatus.BOOKED : TransactionStatus.PENDING,
        merchantName: merchant,
        merchantCategoryCode: isCredit ? '5411' : undefined,
        bookedAt: date.toISOString(),
        valueAt: date.toISOString(),
        createdAt: date.toISOString(),
      });
    }

    return transactions.sort((a, b) => new Date(b.bookedAt).getTime() - new Date(a.bookedAt).getTime());
  }
}
