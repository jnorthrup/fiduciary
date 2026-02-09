/**
 * Coinbase Rail Adapter
 *
 * Integrates Coinbase crypto operations into the fiduciary settlement/rail architecture.
 * Implements RailFormatter and FIConnector interfaces from types/settlement.ts,
 * plus a high-level CoinbaseRail class for direct crypto operations.
 *
 * Phase 1 (parallel) creates coinbaseService.ts with server-side API integration.
 * This adapter provides the client-facing rail abstraction layer.
 */

import {
  PaymentRail,
  PaymentStatus,
  PaymentIntent,
  PayeeCoordinates,
  Execution,
  FormattedPayload,
  RailFormatter,
  FIConnector,
  FIIdentifier,
  TransmitResult,
} from '../types/settlement';

import { apiPost, apiGet } from './apiClient';

// ============================================================================
// COINBASE-SPECIFIC TYPES
// ============================================================================
// Defined here for type safety; Phase 1 coinbaseService.ts defines the same
// interfaces on the server side.

export interface CoinbaseAccount {
  id: string;
  name: string;
  currency: string;
  balance: { amount: string; currency: string };
  type: 'wallet' | 'vault' | 'fiat';
}

export interface CoinbaseBalance {
  amount: string;
  currency: string;
}

export interface CoinbaseTransaction {
  id: string;
  type: 'send' | 'receive' | 'deposit' | 'withdrawal';
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  amount: { amount: string; currency: string };
  created_at: string;
  description: string;
  to?: { address: string };
  from?: { address: string };
}

export interface CoinbaseSendRequest {
  accountId: string;
  to: string;
  amount: string;
  currency: string;
  memo?: string;
}

export interface CoinbaseSendResponse {
  id: string;
  status: 'pending' | 'completed';
  amount: { amount: string; currency: string };
}

export interface CoinbaseAddress {
  id: string;
  address: string;
  currency: string;
  network: string;
}

// ============================================================================
// CRYPTO COORDINATES (extends PayeeCoordinates for crypto rail)
// ============================================================================

export interface CryptoCoordinates {
  type: 'crypto';
  address: string;
  currency: string;
  network: string;
  memo?: string;
}

// Extended PaymentRail value for crypto
export const COINBASE_CRYPTO_RAIL = 'COINBASE_CRYPTO' as PaymentRail;

// ============================================================================
// ADDRESS VALIDATION
// ============================================================================

/**
 * Validates a cryptocurrency address based on its currency.
 *
 * BTC address formats:
 *   - Legacy (P2PKH): starts with '1', 25-34 chars, base58
 *   - Script (P2SH): starts with '3', 25-34 chars, base58
 *   - Bech32 (P2WPKH/P2WSH): starts with 'bc1', 42-62 chars, bech32
 *
 * ETH address format:
 *   - Starts with '0x', followed by 40 hex chars (42 total)
 */
export function validateCryptoAddress(
  address: string,
  currency: string
): { valid: boolean; reason?: string } {
  if (!address || address.trim().length === 0) {
    return { valid: false, reason: 'Address is required' };
  }

  const trimmed = address.trim();
  const upperCurrency = currency.toUpperCase();

  switch (upperCurrency) {
    case 'BTC': {
      // Legacy P2PKH: starts with 1
      if (trimmed.startsWith('1')) {
        const base58Regex = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;
        if (trimmed.length >= 25 && trimmed.length <= 34 && base58Regex.test(trimmed)) {
          return { valid: true };
        }
        return { valid: false, reason: 'Invalid P2PKH address: must be 25-34 base58 characters starting with 1' };
      }
      // P2SH: starts with 3
      if (trimmed.startsWith('3')) {
        const base58Regex = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;
        if (trimmed.length >= 25 && trimmed.length <= 34 && base58Regex.test(trimmed)) {
          return { valid: true };
        }
        return { valid: false, reason: 'Invalid P2SH address: must be 25-34 base58 characters starting with 3' };
      }
      // Bech32: starts with bc1
      if (trimmed.startsWith('bc1')) {
        const bech32Regex = /^bc1[ac-hj-np-z02-9]{38,58}$/;
        if (bech32Regex.test(trimmed)) {
          return { valid: true };
        }
        return { valid: false, reason: 'Invalid Bech32 address: must start with bc1 and be 42-62 characters' };
      }
      return { valid: false, reason: 'Invalid BTC address: must start with 1, 3, or bc1' };
    }

    case 'ETH':
    case 'USDC':
    case 'USDT':
    case 'DAI': {
      // ERC-20 tokens share ETH address format
      const ethRegex = /^0x[0-9a-fA-F]{40}$/;
      if (ethRegex.test(trimmed)) {
        return { valid: true };
      }
      return { valid: false, reason: 'Invalid ETH address: must start with 0x followed by 40 hex characters' };
    }

    default:
      return { valid: false, reason: `Unsupported currency for address validation: ${currency}` };
  }
}

// ============================================================================
// RAIL FORMATTER: CoinbaseRailFormatter
// ============================================================================

/**
 * Formats PaymentIntent + CryptoCoordinates into a Coinbase JSON payload.
 * Implements the RailFormatter interface from settlement.ts.
 */
export class CoinbaseRailFormatter implements RailFormatter {
  rail = COINBASE_CRYPTO_RAIL;

  /**
   * Formats a PaymentIntent with CryptoCoordinates into a FormattedPayload
   * containing a JSON-serialized Coinbase send request.
   */
  format(
    intent: PaymentIntent,
    coordinates: PayeeCoordinates,
    exec: Execution
  ): FormattedPayload {
    const crypto = coordinates as unknown as CryptoCoordinates;

    if (crypto.type !== 'crypto') {
      throw new Error(
        `CoinbaseRailFormatter requires CryptoCoordinates (type='crypto'), got type='${crypto.type}'`
      );
    }

    const addressValidation = validateCryptoAddress(crypto.address, crypto.currency);
    if (!addressValidation.valid) {
      throw new Error(`Invalid crypto address: ${addressValidation.reason}`);
    }

    const payload: CoinbaseSendRequest = {
      accountId: exec.fi_reference || intent.entity_id,
      to: crypto.address,
      amount: intent.amount.toString(),
      currency: crypto.currency,
      memo: intent.memo || crypto.memo,
    };

    return {
      rail: this.rail,
      format: 'json' as FormattedPayload['format'],
      content: JSON.stringify(payload),
      filename: `coinbase_send_${intent.intent_id}_${exec.exec_id}.json`,
    };
  }

  /**
   * Parses a raw Coinbase API response to extract settlement status.
   */
  parse_response(raw: unknown): {
    status: PaymentStatus;
    reference?: string;
    error?: string;
  } {
    if (!raw || typeof raw !== 'object') {
      return {
        status: PaymentStatus.FAILED,
        error: 'Invalid response: expected an object',
      };
    }

    const response = raw as Record<string, unknown>;

    // Handle error responses
    if (response.error || response.errors) {
      const errorMsg =
        typeof response.error === 'string'
          ? response.error
          : Array.isArray(response.errors)
            ? (response.errors as Array<{ message?: string }>)
                .map((e) => e.message || String(e))
                .join('; ')
            : 'Unknown Coinbase error';

      return {
        status: PaymentStatus.FAILED,
        error: errorMsg,
      };
    }

    const data = (response.data || response) as Record<string, unknown>;
    const id = data.id as string | undefined;
    const status = data.status as string | undefined;

    const statusMap: Record<string, PaymentStatus> = {
      pending: PaymentStatus.SUBMITTED,
      completed: PaymentStatus.SETTLED,
      failed: PaymentStatus.FAILED,
      cancelled: PaymentStatus.RETURNED,
    };

    return {
      status: statusMap[status || ''] || PaymentStatus.CREATED,
      reference: id,
    };
  }
}

// ============================================================================
// FI CONNECTOR: CoinbaseFIConnector
// ============================================================================

/**
 * Transmits formatted Coinbase payloads via the API client.
 * Implements the FIConnector interface from settlement.ts.
 */
export class CoinbaseFIConnector implements FIConnector {
  fi = FIIdentifier.BANK_SECONDARY;
  supported_rails = [COINBASE_CRYPTO_RAIL];

  /**
   * Transmits a formatted payload to Coinbase via the API proxy.
   */
  async transmit(payload: FormattedPayload): Promise<TransmitResult> {
    try {
      const sendRequest: CoinbaseSendRequest = JSON.parse(
        payload.content as string
      );

      const response = await apiPost<CoinbaseSendResponse>(
        '/banking/coinbase/send',
        sendRequest
      );

      return {
        success: true,
        fi_reference: response.id,
        raw_response: response,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown transmission error';
      return {
        success: false,
        error: message,
        raw_response: error,
      };
    }
  }

  /**
   * Checks the status of a previously submitted Coinbase transaction.
   */
  async check_status(
    fi_reference: string
  ): Promise<{ status: PaymentStatus; updated_at: string }> {
    try {
      const response = await apiGet<{
        status: string;
        updated_at: string;
      }>(`/banking/coinbase/transactions/${fi_reference}`);

      const statusMap: Record<string, PaymentStatus> = {
        pending: PaymentStatus.SUBMITTED,
        completed: PaymentStatus.SETTLED,
        failed: PaymentStatus.FAILED,
        cancelled: PaymentStatus.RETURNED,
      };

      return {
        status: statusMap[response.status] || PaymentStatus.CREATED,
        updated_at: response.updated_at || new Date().toISOString(),
      };
    } catch {
      return {
        status: PaymentStatus.FAILED,
        updated_at: new Date().toISOString(),
      };
    }
  }
}

// ============================================================================
// HIGH-LEVEL ADAPTER: CoinbaseRail
// ============================================================================

/**
 * High-level Coinbase rail adapter providing simplified methods for
 * balance queries, sends, receives, transaction listing, and address validation.
 */
export class CoinbaseRail {
  /**
   * Lists all Coinbase accounts for the authenticated user.
   */
  async listAccounts(): Promise<CoinbaseAccount[]> {
    return apiGet<CoinbaseAccount[]>('/banking/coinbase/accounts');
  }

  /**
   * Returns the balance for a specific Coinbase account.
   */
  async getBalance(accountId: string): Promise<CoinbaseBalance> {
    if (!accountId) {
      throw new Error('accountId is required');
    }
    return apiGet<CoinbaseBalance>(
      `/banking/coinbase/accounts/${accountId}/balance`
    );
  }

  /**
   * Sends cryptocurrency to an external address.
   * Validates required fields before submitting.
   */
  async send(params: {
    address: string;
    amount: string;
    currency: string;
    memo?: string;
  }): Promise<CoinbaseSendResponse> {
    if (!params.address || params.address.trim().length === 0) {
      throw new Error('address is required');
    }
    if (!params.amount || params.amount.trim().length === 0) {
      throw new Error('amount is required');
    }
    if (!params.currency || params.currency.trim().length === 0) {
      throw new Error('currency is required');
    }

    const amountNum = parseFloat(params.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      throw new Error('amount must be a positive number');
    }

    const validation = validateCryptoAddress(params.address, params.currency);
    if (!validation.valid) {
      throw new Error(`Invalid address: ${validation.reason}`);
    }

    return apiPost<CoinbaseSendResponse>('/banking/coinbase/send', {
      to: params.address,
      amount: params.amount,
      currency: params.currency,
      memo: params.memo,
    });
  }

  /**
   * Generates or retrieves a receive/deposit address for a given account and currency.
   */
  async receive(
    accountId: string,
    currency: string
  ): Promise<CoinbaseAddress> {
    if (!accountId) {
      throw new Error('accountId is required');
    }
    if (!currency) {
      throw new Error('currency is required');
    }

    return apiPost<CoinbaseAddress>(
      `/banking/coinbase/accounts/${accountId}/addresses`,
      { currency }
    );
  }

  /**
   * Lists transactions with optional pagination.
   */
  async getTransactions(params?: {
    accountId?: string;
    limit?: number;
    cursor?: string;
  }): Promise<CoinbaseTransaction[]> {
    const queryParts: string[] = [];
    if (params?.limit) queryParts.push(`limit=${params.limit}`);
    if (params?.cursor) queryParts.push(`cursor=${params.cursor}`);
    const query = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';

    const basePath = params?.accountId
      ? `/banking/coinbase/accounts/${params.accountId}/transactions`
      : '/banking/coinbase/transactions';

    return apiGet<CoinbaseTransaction[]>(`${basePath}${query}`);
  }

  /**
   * Validates a cryptocurrency address for a given currency.
   */
  async validateAddress(
    address: string,
    currency: string
  ): Promise<{ valid: boolean; reason?: string }> {
    return validateCryptoAddress(address, currency);
  }
}
