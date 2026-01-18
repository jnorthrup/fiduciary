/**
 * Banking Adapter Interface
 *
 * Defines the contract that all banking provider adapters must implement.
 * Uses the Adapter pattern to normalize different banking APIs into a unified interface.
 */

import type {
  UnifiedAccount,
  UnifiedTransaction,
  PaymentInitiationRequest,
  PaymentInitiationResponse,
  AccountFilters,
  TransactionFilters,
  BankingProvider,
  BankingErrorCode,
} from './core';

/**
 * Provider health status
 */
export interface ProviderHealthStatus {
  provider: BankingProvider;
  isHealthy: boolean;
  latencyMs?: number;
  lastChecked: string;
  errorMessage?: string;
}

/**
 * Adapter capabilities - features supported by each provider
 */
export interface AdapterCapabilities {
  supportsAccountAggregation: boolean;
  supportsBalanceCheck: boolean;
  supportsTransactionHistory: boolean;
  supportsPaymentInitiation: boolean;
  supportsWebhooks: boolean;
  supportsRealtimeUpdates: boolean;
  supportedPaymentMethods: string[];
  maxHistoryDays?: number;
}

/**
 * Base Banking Adapter interface
 *
 * All provider adapters must implement this interface
 */
export interface IBankingAdapter {
  // ========================================================================
  // PROVIDER METADATA
  // ========================================================================

  /**
   * Get the provider type this adapter handles
   */
  readonly provider: BankingProvider;

  /**
   * Get capabilities supported by this adapter
   */
  getCapabilities(): AdapterCapabilities;

  /**
   * Check provider health/connectivity
   */
  healthCheck(): Promise<ProviderHealthStatus>;

  // ========================================================================
  // ACCOUNT MANAGEMENT
  // ========================================================================

  /**
   * List all accounts from this provider
   */
  listAccounts(filters?: AccountFilters): Promise<UnifiedAccount[]>;

  /**
   * Get a specific account by ID
   */
  getAccount(accountId: string): Promise<UnifiedAccount | null>;

  /**
   * Get balances for an account
   * Returns up-to-date balance information from the provider
   */
  getBalance(accountId: string): Promise<{
    currentBalance: number;
    availableBalance?: number;
    ledgerBalance?: number;
    currency: string;
    lastUpdatedAt: string;
  }>;

  /**
   * Sync account data from provider
   * Forces a refresh of account and balance data
   */
  syncAccount(accountId: string): Promise<UnifiedAccount>;

  // ========================================================================
  // TRANSACTIONS
  // ========================================================================

  /**
   * List transactions with optional filters
   */
  listTransactions(filters: TransactionFilters): Promise<UnifiedTransaction[]>;

  /**
   * Get a specific transaction by ID
   */
  getTransaction(transactionId: string): Promise<UnifiedTransaction | null>;

  /**
   * Sync recent transactions from provider
   */
  syncTransactions(accountId: string, since?: string): Promise<UnifiedTransaction[]>;

  // ========================================================================
  // PAYMENTS
  // ========================================================================

  /**
   * Initiate a payment
   */
  initiatePayment(request: PaymentInitiationRequest): Promise<PaymentInitiationResponse>;

  /**
   * Get payment status
   */
  getPaymentStatus(paymentId: string): Promise<PaymentInitiationResponse>;

  // ========================================================================
  // WEBHOOKS (Optional)
  // ========================================================================

  /**
   * Verify and parse incoming webhook from provider
   * Returns standardized event or throws if invalid
   */
  verifyWebhook?(payload: unknown, signature?: string): Promise<WebhookEvent>;

  /**
   * Register webhook URL with provider
   */
  registerWebhook?(url: string): Promise<{ webhookId: string }>;
}

/**
 * Webhook event types
 */
export enum WebhookEventType {
  ACCOUNT_UPDATED = 'account_updated',
  TRANSACTION_CREATED = 'transaction_created',
  TRANSACTION_STATUS_CHANGED = 'transaction_status_changed',
  PAYMENT_INITIATED = 'payment_initiated',
  PAYMENT_COMPLETED = 'payment_completed',
  PAYMENT_FAILED = 'payment_failed',
  AUTHENTICATION_REQUIRED = 'authentication_required',
}

/**
 * Standardized webhook event
 */
export interface WebhookEvent {
  provider: BankingProvider;
  eventType: WebhookEventType;
  eventId: string;
  timestamp: string;
  data: Record<string, unknown>;
  rawPayload?: unknown;
}

// ============================================================================
// ADAPTER RESULT TYPE
// ============================================================================

/**
 * Result wrapper for adapter operations
 * Provides consistent error handling across all adapters
 */
export interface AdapterResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: BankingErrorCode;
    message: string;
    originalError?: unknown;
  };
  metadata?: {
    provider: BankingProvider;
    operation: string;
    durationMs: number;
    cached: boolean;
  };
}

/**
 * Helper to create successful result
 */
export function successResult<T>(
  data: T,
  metadata: Partial<AdapterResult<T>['metadata']> = {}
): AdapterResult<T> {
  return {
    success: true,
    data,
    metadata: {
      durationMs: 0,
      cached: false,
      ...metadata,
    },
  };
}

/**
 * Helper to create error result
 */
export function errorResult<T>(
  code: BankingErrorCode,
  message: string,
  provider: BankingProvider,
  originalError?: unknown
): AdapterResult<T> {
  return {
    success: false,
    error: {
      code,
      message,
      originalError,
    },
    metadata: {
      provider,
      operation: 'unknown',
      durationMs: 0,
      cached: false,
    },
  };
}
