import { apiGet, apiPost } from './apiClient';

// ============================================================================
// TYPES
// ============================================================================

export interface CoinbaseCurrency {
  code: string;
  name: string;
  color: string;
  type: 'crypto' | 'fiat';
  exponent: number;
}

export interface CoinbaseAmount {
  amount: string;
  currency: string;
}

export interface CoinbaseAccount {
  id: string;
  name: string;
  primary: boolean;
  type: 'wallet' | 'vault' | 'fiat';
  currency: CoinbaseCurrency;
  balance: CoinbaseAmount;
  native_balance: CoinbaseAmount;
  created_at: string;
  updated_at: string;
}

export interface CoinbaseBalance {
  balance: CoinbaseAmount;
  native_balance: CoinbaseAmount;
  currency: string;
  updated_at: string;
}

export interface CoinbaseTransactionNetwork {
  status: 'pending' | 'confirmed' | 'failed';
  hash: string | null;
  transaction_fee: CoinbaseAmount;
  confirmations: number;
}

export interface CoinbaseTransactionParty {
  resource: string;
  address: string;
}

export interface CoinbaseTransactionDetails {
  title: string;
  subtitle: string;
}

export interface CoinbaseTransaction {
  id: string;
  type: 'send' | 'receive' | 'deposit' | 'withdrawal' | 'buy' | 'sell';
  status: 'pending' | 'completed' | 'failed' | 'canceled';
  amount: CoinbaseAmount;
  native_amount: CoinbaseAmount;
  description: string | null;
  created_at: string;
  updated_at: string;
  network: CoinbaseTransactionNetwork | null;
  to?: CoinbaseTransactionParty;
  from?: CoinbaseTransactionParty;
  details: CoinbaseTransactionDetails;
  account_id: string;
  idem?: string | null;
}

export interface CoinbaseSendRequest {
  accountId: string;
  to: string;
  amount: string;
  currency: string;
  description?: string;
  idem?: string;
}

export interface CoinbaseSendResponse {
  transaction: CoinbaseTransaction;
}

export interface CoinbaseAddress {
  id: string;
  address: string;
  name: string | null;
  network: string;
  uri: string;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface CoinbaseAddressValidation {
  valid: boolean;
  currency: string;
  address: string;
  reason: string;
}

export interface CoinbaseAccountsResponse {
  accounts: CoinbaseAccount[];
  count: number;
}

export interface CoinbaseTransactionsResponse {
  transactions: CoinbaseTransaction[];
  count: number;
  total: number;
}

export interface CoinbaseTransactionListParams {
  accountId?: string;
  limit?: number;
  offset?: number;
}

export interface CoinbaseHealthResponse {
  status: 'live' | 'mock';
  timestamp: string;
  provider: string;
  api_version: string;
  live_api_configured: boolean;
  latency_ms: number | null;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const BASE = '/coinbase';

/**
 * List all Coinbase accounts (wallets).
 */
export function listAccounts(): Promise<CoinbaseAccountsResponse> {
  return apiGet<CoinbaseAccountsResponse>(`${BASE}/accounts`);
}

/**
 * Get a single Coinbase account by ID.
 */
export function getAccount(id: string): Promise<CoinbaseAccount> {
  return apiGet<CoinbaseAccount>(`${BASE}/accounts/${id}`);
}

/**
 * Get the balance for a specific account.
 */
export function getBalance(accountId: string): Promise<CoinbaseBalance> {
  return apiGet<CoinbaseBalance>(`${BASE}/accounts/${accountId}/balance`);
}

/**
 * Send cryptocurrency to an address.
 */
export function sendCrypto(req: CoinbaseSendRequest): Promise<CoinbaseSendResponse> {
  return apiPost<CoinbaseSendResponse>(`${BASE}/send`, req);
}

/**
 * Generate a receive address for a given account and currency.
 */
export function getReceiveAddress(accountId: string, currency?: string): Promise<CoinbaseAddress> {
  return apiPost<CoinbaseAddress>(`${BASE}/receive`, { accountId, currency });
}

/**
 * List transactions, optionally filtered by account.
 */
export function listTransactions(params?: CoinbaseTransactionListParams): Promise<CoinbaseTransactionsResponse> {
  const query = new URLSearchParams();
  if (params?.accountId) query.set('accountId', params.accountId);
  if (params?.limit !== undefined) query.set('limit', String(params.limit));
  if (params?.offset !== undefined) query.set('offset', String(params.offset));
  const qs = query.toString();
  return apiGet<CoinbaseTransactionsResponse>(`${BASE}/transactions${qs ? `?${qs}` : ''}`);
}

/**
 * Get a single transaction by ID.
 */
export function getTransaction(id: string): Promise<CoinbaseTransaction> {
  return apiGet<CoinbaseTransaction>(`${BASE}/transactions/${id}`);
}

/**
 * Validate a cryptocurrency address for a given currency.
 */
export function validateAddress(address: string, currency: string): Promise<CoinbaseAddressValidation> {
  return apiPost<CoinbaseAddressValidation>(`${BASE}/validate-address`, { address, currency });
}

/**
 * Check Coinbase API connectivity health.
 */
export function checkHealth(): Promise<CoinbaseHealthResponse> {
  return apiGet<CoinbaseHealthResponse>(`${BASE}/health`);
}
