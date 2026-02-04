/**
 * Fedwire Adapter
 *
 * Adapter for Federal Reserve Wire Network (Fedwire) - real-time gross settlement system.
 * Supports same-day wire transfers, Fedwire message formatting, and payment initiation.
 *
 * Fedwire is the primary real-time payment system in the US, operated by the Federal Reserve Banks.
 * Used for high-value, time-critical payments.
 *
 * Reference: Fedwire Funds Service - https://www.federalreserve.gov/paymentsystems/fedwire_about.htm
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
 * Fedwire message types
 */
enum FedwireMessageType {
  FUNDS_TRANSFER = 'funds_transfer',
  REPEAT_TRANSFER = 'repeat_transfer',
  DRAWDOWN_REQUEST = 'drawdown_request',
  NOTIFICATION_OF_CHANGE = 'notification_of_change',
  REQUEST_FOR_STATEMENT = 'request_for_statement',
}

/**
 * Fedwire business function codes
 */
enum FedwireBusinessFunction {
  CUSTOMER_TRANSFER = '1000', // Customer credit transfer
  BOOK_ENTRY_SECURITIES = '2000', // Book-entry securities transfer
  BANK_TRANSFER = '3000', // Bank remittance
  FED_TRANSFER = '4000', // Funds transfer
}

/**
 * Fedwire payment response
 */
interface FedwirePaymentResponse {
  paymentId: string;
  status: string;
  fedwireMessageId?: string;
  imad?: string; // Immediate Amount
  amount: number;
  currency: string;
  originatorBankRouting: string;
  beneficiaryBankRouting: string;
  settlementDate: string;
  fedwireSequenceNumber?: string;
  traces?: FedwireTrace[];
}

/**
 * Fedwire trace information
 */
interface FedwireTrace {
  sequenceNumber: string;
  status: string;
  timestamp: string;
  description?: string;
}

export class FedwireAdapter extends BaseAdapter {
  readonly provider: BankingProvider = 'fedwire' as any;
  private apiUrl: string;
  private routingNumber: string;
  private bankName: string;
  private clientId: string;

  constructor(config: any) {
    super(config);

    this.apiUrl = config.credentials?.apiUrl || 'https://frbservices.org';
    this.routingNumber = config.credentials?.routingNumber || '';
    this.bankName = config.bankName || 'Unknown Bank';
    this.clientId = config.credentials?.clientId || '';
  }

  // ========================================================================
  // CAPABILITIES
  // ========================================================================

  getCapabilities(): AdapterCapabilities {
    return {
      supportsAccountAggregation: true, // Fedwire accounts
      supportsBalanceCheck: true,
      supportsTransactionHistory: true,
      supportsPaymentInitiation: true, // Wire transfers
      supportsWebhooks: false, // Batch file-based
      supportsRealtimeUpdates: true, // Real-time settlement
      supportedPaymentMethods: ['FEDWIRE', 'WIRE'],
      maxHistoryDays: 365, // 1 year history
    };
  }

  // ========================================================================
  // HEALTH CHECK
  // ========================================================================

  async healthCheckImplementation(): Promise<ProviderHealthStatus> {
    const startTime = Date.now();
    try {
      // Check Fedwire connectivity (mock for now - real Fedwire requires VPN)
      const response = await this.makeRequest('/health', { method: 'GET' });
      const latency = Date.now() - startTime;

      return {
        provider: this.provider,
        isHealthy: response.ok || response.status === 401,
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
      // Fedwire accounts - typically checking accounts with wire capabilities
      const fedwireAccounts: UnifiedAccount[] = [
        {
          id: `fedwire_master_${this.routingNumber}`,
          provider: this.provider,
          providerAccountId: this.routingNumber,
          type: UnifiedAccountType.CHECKING,
          name: `${this.bankName} Fedwire Master Account`,
          displayName: `${this.bankName} - Fedwire Master`,
          currency: 'USD',
          status: AccountStatus.ACTIVE,
          currentBalance: 0, // Fedwire doesn't provide balance via API
          availableBalance: null,
          accountNumber: this.routingNumber,
          routingNumber: this.routingNumber,
          swiftCode: null,
          institution: {
            name: 'Federal Reserve Bank',
            address: 'Your Federal Reserve District',
            country: 'US',
          },
          metadata: {
            accountType: 'master',
            fedwireEligible: true,
          },
          lastSync: new Date().toISOString(),
        },
      ];

      // Apply filters
      let filtered = fedwireAccounts;
      if (filters?.type) {
        filtered = filtered.filter((acc) => acc.type === filters.type);
      }
      if (filters?.currency) {
        filtered = filtered.filter((acc) => acc.currency === filters.currency);
      }

      return filtered;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ========================================================================
  // LIST TRANSACTIONS
  // ========================================================================

  async listTransactionsImplementation(filters: TransactionFilters): Promise<UnifiedTransaction[]> {
    try {
      // Fetch Fedwire transaction history from local database/ledger
      const requestBody: any = {
        routingNumber: this.routingNumber,
        startDate: filters.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: filters.endDate || new Date().toISOString().split('T')[0],
        limit: filters.limit || 100,
      };

      if (filters.accountId) {
        requestBody.accountId = filters.accountId;
      }

      const response = await this.makeRequest('/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Fedwire API error: ${response.status}`);
      }

      const data = await response.json();
      const transactions = data.transactions || [];

      let unified = transactions.map(this.transformTransaction.bind(this));

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

      return unified;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ========================================================================
  // INITIATE PAYMENT (FEDWIRE WIRE TRANSFER)
  // ========================================================================

  async initiatePaymentImplementation(request: PaymentInitiationRequest): Promise<PaymentInitiationResponse> {
    try {
      // Validate required fields
      if (!request.beneficiaryAccount || !request.beneficiaryRoutingNumber) {
        throw new Error('Beneficiary account and routing number are required for Fedwire transfers');
      }

      if (!request.originatorAccount || !request.originatorRoutingNumber) {
        throw new Error('Originator account and routing number are required for Fedwire transfers');
      }

      // Create Fedwire message
      const fedwireMessage = {
        messageType: FedwireMessageType.FUNDS_TRANSFER,
        businessFunction: FedwireBusinessFunction.CUSTOMER_TRANSFER,
        // Header
        senderSuppliedId: `FW-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'CRC',
        inputFormat: 'FIX',
        outputFormat: 'FIX',
        // Date/time
        date: new Date().toISOString().split('T')[0],
        startTime: new Date().toISOString().split('T')[1].split('.')[0],
        // Amount
        amount: request.amount.toFixed(2),
        currency: request.currency || 'USD',
        // Originator
        originatorName: request.originatorName || this.bankName,
        originatorRoutingNumber: request.originatorRoutingNumber,
        originatorAccount: request.originatorAccount,
        originatorAddress: request.originatorAddress || '',
        originatorId: this.clientId,
        // Beneficiary
        beneficiaryName: request.beneficiaryName,
        beneficiaryRoutingNumber: request.beneficiaryRoutingNumber,
        beneficiaryAccount: request.beneficiaryAccount,
        beneficiaryAddress: request.beneficiaryAddress || '',
        // Reference
        reference: request.reference || '',
        description: request.description || `Wire transfer to ${request.beneficiaryName}`,
        // Fedwire-specific
        immediateAmount: request.amount.toFixed(2),
        serviceMessageCode: request.serviceMessageCode || 'BSP',
        // Priority
        priority: request.priority || 'NORMAL',
      };

      const response = await this.makeRequest('/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fedwireMessage),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Fedwire payment failed: ${error.message || response.status}`);
      }

      const result: FedwirePaymentResponse = await response.json();

      // Transform to unified response
      return {
        paymentId: result.paymentId || fedwireMessage.senderSuppliedId,
        status: this.mapFedwireStatus(result.status),
        provider: this.provider,
        createdAt: new Date().toISOString(),
        amount: result.amount,
        currency: result.currency,
        fee: this.calculateFedwireFee(request.amount),
        estimatedArrival: result.settlementDate,
        metadata: {
          fedwireMessageId: result.fedwireMessageId,
          imad: result.imad,
          fedwireSequenceNumber: result.fedwireSequenceNumber,
          originatorBankRouting: result.originatorBankRouting,
          beneficiaryBankRouting: result.beneficiaryBankRouting,
          messageType: fedwireMessage.messageType,
          businessFunction: fedwireMessage.businessFunction,
          serviceMessageCode: fedwireMessage.serviceMessageCode,
          priority: fedwireMessage.priority,
          traces: result.traces,
        },
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ========================================================================
  // FEDWIRE-SPECIFIC METHODS
  // ========================================================================

  /**
   * Get Fedwire balance
   * Note: Fedwire doesn't provide real-time balance - must check with bank
   */
  async getBalance(accountId: string): Promise<{
    currentBalance: number;
    availableBalance?: number;
    currency: string;
    lastUpdatedAt: string;
  }> {
    // Fedwire doesn't support balance queries via API
    // Must be checked against bank's systems
    return {
      currentBalance: 0,
      currency: 'USD',
      lastUpdatedAt: new Date().toISOString(),
    };
  }

  /**
   * Format Fedwire message
   */
  formatFedwireMessage(payment: PaymentInitiationRequest): string {
    const lines = [
      `Type: CRC`,
      `Input Format: FIX`,
      `Output Format: FIX`,
      `Date: ${new Date().toISOString().split('T')[0]}`,
      `Time: ${new Date().toISOString().split('T')[1].split('.')[0]}`,
      `Immediate Amount: ${payment.amount.toFixed(2)}`,
      `Sender Supplied ID: FW-${Date.now()}`,
      `Originator Name: ${payment.originatorName || 'Bank'}`,
      `Originator Routing Number: ${payment.originatorRoutingNumber}`,
      `Originator Account: ${payment.originatorAccount}`,
      `Beneficiary Name: ${payment.beneficiaryName}`,
      `Beneficiary Routing Number: ${payment.beneficiaryRoutingNumber}`,
      `Beneficiary Account: ${payment.beneficiaryAccount}`,
      `Reference: ${payment.reference || ''}`,
      `Description: ${payment.description || 'Wire Transfer'}`,
    ];

    return lines.join('\n');
  }

  /**
   * Validate Fedwire routing number
   */
  async validateRoutingNumber(routingNumber: string): Promise<{
    valid: boolean;
    bankName?: string;
    address?: string;
    fedwireEligible?: boolean;
  }> {
    // Validate routing number format
    if (!/^\d{9}$/.test(routingNumber)) {
      return { valid: false };
    }

    // Check if routing number is Fedwire-enabled
    const response = await this.makeRequest(`/routing/${routingNumber}`, {
      method: 'GET',
    });

    if (!response.ok) {
      return { valid: false };
    }

    const data = await response.json();
    return {
      valid: true,
      bankName: data.bankName,
      address: data.address,
      fedwireEligible: data.fedwireEligible || false,
    };
  }

  /**
   * Get payment status/traces
   */
  async getPaymentStatus(paymentId: string): Promise<FedwirePaymentResponse | null> {
    try {
      const response = await this.makeRequest(`/payments/${paymentId}`, {
        method: 'GET',
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting payment status:', error);
      return null;
    }
  }

  // ========================================================================
  // TRANSFORMATION HELPERS
  // ========================================================================

  private transformTransaction(tx: any): UnifiedTransaction {
    return {
      id: `fedwire_${tx.paymentId || tx.senderSuppliedId}`,
      provider: this.provider,
      providerTransactionId: tx.paymentId,
      accountId: tx.originatorAccount || 'fedwire_master',
      type: TransactionType.TRANSFER,
      direction: tx.direction || (tx.amount >= 0 ? TransactionDirection.CREDIT : TransactionDirection.DEBIT),
      amount: Math.abs(tx.amount),
      currency: tx.currency || 'USD',
      status: this.mapFedwireStatus(tx.status),
      description: tx.description || tx.beneficiaryName || 'Wire Transfer',
      memo: tx.reference,
      valueDate: tx.settlementDate || tx.date,
      bookingDate: tx.date,
      counterparty: {
        name: tx.beneficiaryName || tx.originatorName,
        account: tx.beneficiaryAccount || tx.originatorAccount,
      },
      metadata: {
        fedwireMessageId: tx.fedwireMessageId,
        fedwireSequenceNumber: tx.fedwireSequenceNumber,
        imad: tx.imad,
        serviceMessageCode: tx.serviceMessageCode,
        priority: tx.priority,
        traces: tx.traces,
      },
      raw: tx,
    };
  }

  private mapFedwireStatus(status: string): TransactionStatus {
    switch (status?.toUpperCase()) {
      case 'COMPLETED':
      case 'SETTLED':
        return TransactionStatus.COMPLETED;
      case 'PENDING':
      case 'PROCESSING':
        return TransactionStatus.PENDING;
      case 'FAILED':
      case 'REJECTED':
      case 'RETURNED':
        return TransactionStatus.FAILED;
      case 'CANCELLED':
        return TransactionStatus.CANCELLED;
      default:
        return TransactionStatus.UNKNOWN;
    }
  }

  private calculateFedwireFee(amount: number): number {
    // Fedwire fees vary by bank
    // Typical fees: $10-30 for outgoing wires
    // Incoming wires: Often free
    if (amount >= 1000000) {
      return 25; // Large wires
    } else if (amount >= 100000) {
      return 20;
    } else if (amount >= 10000) {
      return 15;
    } else {
      return 10;
    }
  }

  // ========================================================================
  // ERROR HANDLING
  // ========================================================================

  private handleError(error: any): BankingErrorCode {
    if (error.response?.status === 401) {
      return { code: 'AUTHENTICATION_FAILED', message: 'Invalid Fedwire credentials' };
    }
    if (error.response?.status === 403) {
      return { code: 'AUTHORIZATION_FAILED', message: 'Insufficient permissions for Fedwire' };
    }
    if (error.response?.status === 429) {
      return { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many Fedwire requests' };
    }
    if (error.response?.status >= 500) {
      return { code: 'PROVIDER_UNAVAILABLE', message: 'Fedwire service unavailable' };
    }
    if (error.message?.includes('routing')) {
      return { code: 'INVALID_ROUTING_NUMBER', message: 'Invalid Fedwire routing number' };
    }
    if (error.message?.includes('amount')) {
      return { code: 'INVALID_AMOUNT', message: 'Invalid wire amount' };
    }
    return { code: 'UNKNOWN_ERROR', message: error.message || 'Unknown Fedwire error' };
  }

  // ========================================================================
  // HTTP CLIENT
  // ========================================================================

  private async makeRequest(endpoint: string, options: RequestInit): Promise<Response> {
    const url = `${this.apiUrl}${endpoint}`;

    const headers = {
      ...options.headers,
      'X-Fedwire-Client-ID': this.clientId,
      'Accept': 'application/json',
    };

    return fetch(url, {
      ...options,
      headers,
    });
  }
}
