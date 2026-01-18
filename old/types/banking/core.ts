/**
 * Banking Abstraction Layer - Core Types
 *
 * Unified types for multi-bank connectivity supporting:
 * - Commercial APIs: Plaid, Coinbase
 * - Open-source: OBP, Fineract, Mifos, Teller
 * - Crypto: Bitcoin, Lightning, DeFi protocols
 */

// ============================================================================
// PROVIDER ENUMERATION
// ============================================================================

/**
 * Supported banking providers
 */
export enum BankingProvider {
  // Commercial
  PLAID = 'plaid',
  COINBASE = 'coinbase',

  // Open-source core banking
  OBP = 'obp', // Open Bank Project
  FINERACT = 'fineract', // Apache Fineract CN
  MIFOS = 'mifos', // Mifos X

  // Scrapers/Aggregators
  TELLER = 'teller',

  // Crypto
  BITCOIN_CORE = 'bitcoin_core',
  LIGHTNING = 'lightning',
  FIREBLOCKS = 'fireblocks',
}

/**
 * Provider categories for feature capability lookup
 */
export enum ProviderCategory {
  COMMERCIAL_AGGREGATOR = 'commercial_aggregator',
  CORE_BANKING = 'core_banking',
  SCRAPER = 'scraper',
  CRYPTO = 'crypto',
}

// ============================================================================
// UNIFIED ACCOUNT TYPES
// ============================================================================

/**
 * Standardized account types across all providers
 */
export enum UnifiedAccountType {
  CHECKING = 'checking',
  SAVINGS = 'savings',
  CREDIT_CARD = 'credit_card',
  LOAN = 'loan',
  INVESTMENT = 'investment',
  CRYPTO = 'crypto',
  MONEY_MARKET = 'money_market',
  CD = 'certificate_of_deposit',
  LINE_OF_CREDIT = 'line_of_credit',
  UNKNOWN = 'unknown',
}

/**
 * Account status
 */
export enum AccountStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  CLOSED = 'closed',
  FROZEN = 'frozen',
  PENDING = 'pending',
}

// ============================================================================
// CORE DOMAIN MODELS
// ============================================================================

/**
 * Unified Bank Account model
 *
 * Normalizes account data from all providers into a single schema
 */
export interface UnifiedAccount {
  // Unified identifiers
  id: string;
  provider: BankingProvider;
  providerAccountId: string;

  // Account details
  type: UnifiedAccountType;
  name: string;
  displayName: string;
  currency: string;
  status: AccountStatus;

  // Balances
  currentBalance: number;
  availableBalance?: number;
  ledgerBalance?: number;

  // Metadata
  institutionName?: string;
  institutionId?: string;
  lastSyncedAt?: string;
  accountNumberMask?: string;
  routingNumber?: string;
  iban?: string;
  swift?: string;

  // Crypto-specific
  walletAddress?: string;
  network?: string;
  tokenAddress?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

/**
 * Unified Transaction model
 */
export interface UnifiedTransaction {
  id: string;
  provider: BankingProvider;
  providerTransactionId: string;

  // Account references
  accountId: string;
  counterpartAccount?: string;
  counterpartName?: string;

  // Transaction details
  amount: number;
  currency: string;
  description: string;
  category?: string;
  subcategory?: string;

  // Direction
  type: TransactionType;
  direction: TransactionDirection;

  // Status
  status: TransactionStatus;

  // Metadata
  merchantName?: string;
  merchantCategoryCode?: string;
  paymentMethod?: string;
  reference?: string;
  notes?: string;

  // Timestamps
  bookedAt: string;
  valueAt: string;
  createdAt: string;
}

/**
 * Transaction type classification
 */
export enum TransactionType {
  CARD_PAYMENT = 'card_payment',
  BANK_TRANSFER = 'bank_transfer',
  DIRECT_DEBIT = 'direct_debit',
  CHECK = 'check',
  INTEREST = 'interest',
  FEE = 'fee',
  WIRE = 'wire',
  ACH = 'ach',
  SEPA = 'sepa',
  FPS = 'fps', // UK Faster Payments
  CRYPTO_TRANSFER = 'crypto_transfer',
  SWAP = 'swap',
  UNKNOWN = 'unknown',
}

/**
 * Transaction direction
 */
export enum TransactionDirection {
  CREDIT = 'credit', // Money in
  DEBIT = 'debit', // Money out
}

/**
 * Transaction status
 */
export enum TransactionStatus {
  PENDING = 'pending',
  BOOKED = 'booked',
  CLEARED = 'cleared',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * Payment initiation request
 */
export interface PaymentInitiationRequest {
  // Source account
  sourceAccountId: string;

  // Destination
  beneficiaryName: string;
  beneficiaryAccount: string;
  beneficiaryReference?: string;

  // Payment details
  amount: number;
  currency: string;
  reference?: string;
  description?: string;

  // Payment method
  method: PaymentMethod;

  // Execution
  executeAt?: string; // Scheduled payment
  endToEndId?: string;
}

/**
 * Supported payment methods
 */
export enum PaymentMethod {
  SEPA_CREDIT_TRANSFER = 'sepa_credit_transfer',
  FPS = 'faster_payments',
  ACH_CREDIT = 'ach_credit',
  WIRE = 'wire',
  INTERNAL = 'internal_transfer',
  CRYPTO_ONCHAIN = 'crypto_onchain',
  CRYPTO_LIGHTNING = 'crypto_lightning',
}

/**
 * Payment initiation response
 */
export interface PaymentInitiationResponse {
  paymentId: string;
  providerPaymentId: string;
  status: PaymentStatus;
  submittedAt: string;
  expectedSettlementAt?: string;
  fees?: number;
}

/**
 * Payment status tracking
 */
export enum PaymentStatus {
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  SUBMITTED = 'submitted',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected',
}

// ============================================================================
// PROVIDER CONFIGURATION
// ============================================================================

/**
 * Base provider configuration
 */
export interface ProviderConfig {
  provider: BankingProvider;
  enabled: boolean;
  environment: 'sandbox' | 'production';
  credentials: Record<string, string>;
  rateLimit?: {
    maxRequests: number;
    perMilliseconds: number;
  };
  retryPolicy?: {
    maxAttempts: number;
    backoffMs: number;
  };
}

/**
 * Plaid-specific configuration
 */
export interface PlaidConfig extends ProviderConfig {
  provider: BankingProvider.PLAID;
  credentials: {
    clientId: string;
    secret: string;
    publicKey?: string;
  };
  webhookUrl?: string;
}

/**
 * OBP-specific configuration
 */
export interface OBPConfig extends ProviderConfig {
  provider: BankingProvider.OBP;
  credentials: {
    apiUrl: string;
    consumerKey: string;
    consumerSecret: string;
    username?: string;
    password?: string;
  };
}

/**
 * Teller-specific configuration
 */
export interface TellerConfig extends ProviderConfig {
  provider: BankingProvider.TELLER;
  credentials: {
    certFile?: string;
    certKey?: string;
    apiKey?: string;
  };
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Banking provider error codes
 */
export enum BankingErrorCode {
  // Authentication
  INVALID_CREDENTIALS = 'invalid_credentials',
  TOKEN_EXPIRED = 'token_expired',
  UNAUTHORIZED = 'unauthorized',

  // Rate limiting
  RATE_LIMITED = 'rate_limited',
  QUOTA_EXCEEDED = 'quota_exceeded',

  // Account/transaction issues
  ACCOUNT_NOT_FOUND = 'account_not_found',
  ACCOUNT_LOCKED = 'account_locked',
  INSUFFICIENT_FUNDS = 'insufficient_funds',
  INVALID_PAYMENT = 'invalid_payment',

  // Provider issues
  PROVIDER_UNAVAILABLE = 'provider_unavailable',
  PROVIDER_TIMEOUT = 'provider_timeout',
  NOT_SUPPORTED = 'not_supported',

  // Generic
  UNKNOWN_ERROR = 'unknown_error',
}

/**
 * Standardized banking error
 */
export class BankingError extends Error {
  constructor(
    public code: BankingErrorCode,
    public provider: BankingProvider,
    message: string,
    public originalError?: any
  ) {
    super(`[${provider}] ${code}: ${message}`);
    this.name = 'BankingError';
  }
}

// ============================================================================
// QUERY FILTERS
// ============================================================================

/**
 * Account query filters
 */
export interface AccountFilters {
  provider?: BankingProvider;
  institutionId?: string;
  type?: UnifiedAccountType;
  status?: AccountStatus;
  currency?: string;
  syncedSince?: string;
}

/**
 * Transaction query filters
 */
export interface TransactionFilters {
  accountIds?: string[];
  provider?: BankingProvider;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  direction?: TransactionDirection;
  category?: string;
  search?: string; // Search in description/memo
  limit?: number;
  offset?: number;
}
