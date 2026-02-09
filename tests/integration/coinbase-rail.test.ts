/**
 * Integration Test: Coinbase Rail Adapter
 *
 * Tests the CoinbaseRail high-level adapter, CoinbaseRailFormatter (RailFormatter),
 * CoinbaseFIConnector (FIConnector), address validation, and end-to-end flows.
 *
 * All API calls are mocked via vi.mock on apiClient. Tests are self-contained
 * and do not require a running server.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  CoinbaseRail,
  CoinbaseRailFormatter,
  CoinbaseFIConnector,
  CryptoCoordinates,
  COINBASE_CRYPTO_RAIL,
  validateCryptoAddress,
  type CoinbaseAccount,
  type CoinbaseBalance,
  type CoinbaseSendResponse,
  type CoinbaseAddress,
  type CoinbaseTransaction,
} from '../../services/coinbaseRailAdapter';

import {
  PaymentStatus,
  PaymentIntent,
  Execution,
  PaymentRail,
  FIIdentifier,
} from '../../types/settlement';

// ============================================================================
// MOCK apiClient
// ============================================================================

vi.mock('../../services/apiClient', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

import { apiGet, apiPost } from '../../services/apiClient';

const mockApiGet = vi.mocked(apiGet);
const mockApiPost = vi.mocked(apiPost);

// ============================================================================
// TEST FIXTURES
// ============================================================================

const MOCK_ACCOUNTS: CoinbaseAccount[] = [
  {
    id: 'acct-btc-001',
    name: 'Bitcoin Wallet',
    currency: 'BTC',
    balance: { amount: '1.25000000', currency: 'BTC' },
    type: 'wallet',
  },
  {
    id: 'acct-eth-001',
    name: 'Ethereum Wallet',
    currency: 'ETH',
    balance: { amount: '15.500000', currency: 'ETH' },
    type: 'wallet',
  },
  {
    id: 'acct-usdc-001',
    name: 'USDC Wallet',
    currency: 'USDC',
    balance: { amount: '50000.00', currency: 'USDC' },
    type: 'wallet',
  },
];

const MOCK_BALANCE: CoinbaseBalance = {
  amount: '1.25000000',
  currency: 'BTC',
};

const MOCK_SEND_RESPONSE: CoinbaseSendResponse = {
  id: 'tx-send-001',
  status: 'pending',
  amount: { amount: '0.50000000', currency: 'BTC' },
};

const MOCK_ADDRESS: CoinbaseAddress = {
  id: 'addr-001',
  address: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
  currency: 'BTC',
  network: 'bitcoin',
};

const MOCK_TRANSACTIONS: CoinbaseTransaction[] = [
  {
    id: 'tx-001',
    type: 'send',
    status: 'completed',
    amount: { amount: '-0.50000000', currency: 'BTC' },
    created_at: '2026-02-09T10:00:00Z',
    description: 'Sent BTC',
    to: { address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa' },
  },
  {
    id: 'tx-002',
    type: 'receive',
    status: 'completed',
    amount: { amount: '1.00000000', currency: 'BTC' },
    created_at: '2026-02-08T14:30:00Z',
    description: 'Received BTC',
    from: { address: '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy' },
  },
  {
    id: 'tx-003',
    type: 'send',
    status: 'pending',
    amount: { amount: '-0.10000000', currency: 'BTC' },
    created_at: '2026-02-09T12:00:00Z',
    description: 'Pending send',
    to: { address: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4' },
  },
];

// Valid test addresses
const VALID_BTC_LEGACY = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
const VALID_BTC_P2SH = '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy';
const VALID_BTC_BECH32 = 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';
const VALID_ETH_ADDR = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD08';

function buildTestIntent(overrides?: Partial<PaymentIntent>): PaymentIntent {
  return {
    intent_id: 'intent-001',
    entity_id: 'entity-001',
    payee_id: 'payee-001',
    amount: 0.5,
    currency: 'BTC',
    purpose: 'transfer',
    urgency: 'immediate',
    cost_tolerance: 'fastest',
    memo: 'Test crypto payment',
    idempotency_key: 'idem-001',
    created_at: '2026-02-09T10:00:00Z',
    ...overrides,
  };
}

function buildTestExecution(overrides?: Partial<Execution>): Execution {
  return {
    exec_id: 'exec-001',
    intent_id: 'intent-001',
    rail: COINBASE_CRYPTO_RAIL,
    fi: FIIdentifier.BANK_SECONDARY,
    status: PaymentStatus.CREATED,
    fi_reference: 'acct-btc-001',
    ...overrides,
  };
}

function buildCryptoCoordinates(
  overrides?: Partial<CryptoCoordinates>
): CryptoCoordinates {
  return {
    type: 'crypto',
    address: VALID_BTC_LEGACY,
    currency: 'BTC',
    network: 'bitcoin',
    ...overrides,
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe('Coinbase Rail Adapter', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // --------------------------------------------------------------------------
  // CoinbaseRail High-Level Adapter
  // --------------------------------------------------------------------------
  describe('CoinbaseRail adapter', () => {
    let rail: CoinbaseRail;

    beforeEach(() => {
      rail = new CoinbaseRail();
    });

    it('listAccounts returns typed accounts with BTC/ETH/USDC', async () => {
      mockApiGet.mockResolvedValueOnce(MOCK_ACCOUNTS);

      const accounts = await rail.listAccounts();

      expect(accounts).toHaveLength(3);
      expect(accounts[0].currency).toBe('BTC');
      expect(accounts[1].currency).toBe('ETH');
      expect(accounts[2].currency).toBe('USDC');
      expect(accounts[0].type).toBe('wallet');
      expect(accounts[0].balance.amount).toBe('1.25000000');
      expect(mockApiGet).toHaveBeenCalledWith('/banking/coinbase/accounts');
    });

    it('getBalance returns balance for a specific account', async () => {
      mockApiGet.mockResolvedValueOnce(MOCK_BALANCE);

      const balance = await rail.getBalance('acct-btc-001');

      expect(balance.amount).toBe('1.25000000');
      expect(balance.currency).toBe('BTC');
      expect(mockApiGet).toHaveBeenCalledWith(
        '/banking/coinbase/accounts/acct-btc-001/balance'
      );
    });

    it('getBalance throws if accountId is empty', async () => {
      await expect(rail.getBalance('')).rejects.toThrow('accountId is required');
    });

    it('send validates required fields - missing address', async () => {
      await expect(
        rail.send({ address: '', amount: '0.5', currency: 'BTC' })
      ).rejects.toThrow('address is required');
    });

    it('send validates required fields - missing amount', async () => {
      await expect(
        rail.send({ address: VALID_BTC_LEGACY, amount: '', currency: 'BTC' })
      ).rejects.toThrow('amount is required');
    });

    it('send validates required fields - missing currency', async () => {
      await expect(
        rail.send({ address: VALID_BTC_LEGACY, amount: '0.5', currency: '' })
      ).rejects.toThrow('currency is required');
    });

    it('send validates amount is a positive number', async () => {
      await expect(
        rail.send({ address: VALID_BTC_LEGACY, amount: '-1', currency: 'BTC' })
      ).rejects.toThrow('amount must be a positive number');

      await expect(
        rail.send({ address: VALID_BTC_LEGACY, amount: '0', currency: 'BTC' })
      ).rejects.toThrow('amount must be a positive number');

      await expect(
        rail.send({
          address: VALID_BTC_LEGACY,
          amount: 'not-a-number',
          currency: 'BTC',
        })
      ).rejects.toThrow('amount must be a positive number');
    });

    it('send returns transaction ID on success', async () => {
      mockApiPost.mockResolvedValueOnce(MOCK_SEND_RESPONSE);

      const result = await rail.send({
        address: VALID_BTC_LEGACY,
        amount: '0.50000000',
        currency: 'BTC',
        memo: 'Payment for services',
      });

      expect(result.id).toBe('tx-send-001');
      expect(result.status).toBe('pending');
      expect(result.amount.amount).toBe('0.50000000');
      expect(mockApiPost).toHaveBeenCalledWith('/banking/coinbase/send', {
        to: VALID_BTC_LEGACY,
        amount: '0.50000000',
        currency: 'BTC',
        memo: 'Payment for services',
      });
    });

    it('receive returns a valid deposit address', async () => {
      mockApiPost.mockResolvedValueOnce(MOCK_ADDRESS);

      const address = await rail.receive('acct-btc-001', 'BTC');

      expect(address.address).toBe(VALID_BTC_BECH32);
      expect(address.currency).toBe('BTC');
      expect(address.network).toBe('bitcoin');
      expect(address.id).toBe('addr-001');
      expect(mockApiPost).toHaveBeenCalledWith(
        '/banking/coinbase/accounts/acct-btc-001/addresses',
        { currency: 'BTC' }
      );
    });

    it('receive throws if accountId is empty', async () => {
      await expect(rail.receive('', 'BTC')).rejects.toThrow(
        'accountId is required'
      );
    });

    it('receive throws if currency is empty', async () => {
      await expect(rail.receive('acct-btc-001', '')).rejects.toThrow(
        'currency is required'
      );
    });

    it('getTransactions returns paginated results', async () => {
      mockApiGet.mockResolvedValueOnce(MOCK_TRANSACTIONS);

      const txns = await rail.getTransactions({
        accountId: 'acct-btc-001',
        limit: 10,
        cursor: 'cursor-abc',
      });

      expect(txns).toHaveLength(3);
      expect(txns[0].type).toBe('send');
      expect(txns[1].type).toBe('receive');
      expect(txns[2].status).toBe('pending');
      expect(mockApiGet).toHaveBeenCalledWith(
        '/banking/coinbase/accounts/acct-btc-001/transactions?limit=10&cursor=cursor-abc'
      );
    });

    it('getTransactions works without params', async () => {
      mockApiGet.mockResolvedValueOnce(MOCK_TRANSACTIONS);

      const txns = await rail.getTransactions();

      expect(txns).toHaveLength(3);
      expect(mockApiGet).toHaveBeenCalledWith(
        '/banking/coinbase/transactions'
      );
    });

    it('getTransactions works with only accountId', async () => {
      mockApiGet.mockResolvedValueOnce([]);

      await rail.getTransactions({ accountId: 'acct-eth-001' });

      expect(mockApiGet).toHaveBeenCalledWith(
        '/banking/coinbase/accounts/acct-eth-001/transactions'
      );
    });
  });

  // --------------------------------------------------------------------------
  // Address Validation
  // --------------------------------------------------------------------------
  describe('validateAddress', () => {
    let rail: CoinbaseRail;

    beforeEach(() => {
      rail = new CoinbaseRail();
    });

    it('accepts valid BTC legacy address (1xxx)', async () => {
      const result = await rail.validateAddress(VALID_BTC_LEGACY, 'BTC');
      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('accepts valid BTC P2SH address (3xxx)', async () => {
      const result = await rail.validateAddress(VALID_BTC_P2SH, 'BTC');
      expect(result.valid).toBe(true);
    });

    it('accepts valid BTC Bech32 address (bc1xxx)', async () => {
      const result = await rail.validateAddress(VALID_BTC_BECH32, 'BTC');
      expect(result.valid).toBe(true);
    });

    it('accepts valid ETH address format (0x + 40 hex)', async () => {
      const result = await rail.validateAddress(VALID_ETH_ADDR, 'ETH');
      expect(result.valid).toBe(true);
    });

    it('accepts USDC addresses (same as ETH format)', async () => {
      const result = await rail.validateAddress(VALID_ETH_ADDR, 'USDC');
      expect(result.valid).toBe(true);
    });

    it('rejects invalid BTC address - wrong prefix', async () => {
      const result = await rail.validateAddress('5InvalidBtcAddress', 'BTC');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('must start with 1, 3, or bc1');
    });

    it('rejects invalid BTC legacy address - too short', async () => {
      const result = await rail.validateAddress('1A1z', 'BTC');
      expect(result.valid).toBe(false);
    });

    it('rejects invalid ETH address - wrong length', async () => {
      const result = await rail.validateAddress('0x742d35Cc6634C053', 'ETH');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('40 hex characters');
    });

    it('rejects invalid ETH address - invalid hex chars', async () => {
      const result = await rail.validateAddress(
        '0xZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ',
        'ETH'
      );
      expect(result.valid).toBe(false);
    });

    it('rejects empty address', async () => {
      const result = await rail.validateAddress('', 'BTC');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Address is required');
    });

    it('rejects whitespace-only address', async () => {
      const result = await rail.validateAddress('   ', 'BTC');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Address is required');
    });

    it('rejects unsupported currency', async () => {
      const result = await rail.validateAddress('someaddr', 'DOGE');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Unsupported currency');
    });
  });

  // --------------------------------------------------------------------------
  // RailFormatter: CoinbaseRailFormatter
  // --------------------------------------------------------------------------
  describe('CoinbaseRailFormatter', () => {
    let formatter: CoinbaseRailFormatter;

    beforeEach(() => {
      formatter = new CoinbaseRailFormatter();
    });

    it('has rail set to COINBASE_CRYPTO', () => {
      expect(formatter.rail).toBe(COINBASE_CRYPTO_RAIL);
    });

    it('formats PaymentIntent with CryptoCoordinates into coinbase JSON payload', () => {
      const intent = buildTestIntent();
      const coordinates = buildCryptoCoordinates();
      const exec = buildTestExecution();

      const payload = formatter.format(intent, coordinates as any, exec);

      expect(payload.rail).toBe(COINBASE_CRYPTO_RAIL);
      expect(payload.format).toBe('json');
      expect(payload.filename).toContain('coinbase_send_intent-001_exec-001');

      const content = JSON.parse(payload.content as string);
      expect(content.to).toBe(VALID_BTC_LEGACY);
      expect(content.amount).toBe('0.5');
      expect(content.currency).toBe('BTC');
      expect(content.memo).toBe('Test crypto payment');
      expect(content.accountId).toBe('acct-btc-001');
    });

    it('uses entity_id as accountId when fi_reference is absent', () => {
      const intent = buildTestIntent({ entity_id: 'entity-fallback' });
      const coordinates = buildCryptoCoordinates();
      const exec = buildTestExecution({ fi_reference: undefined });

      const payload = formatter.format(intent, coordinates as any, exec);
      const content = JSON.parse(payload.content as string);

      expect(content.accountId).toBe('entity-fallback');
    });

    it('throws on non-crypto coordinates', () => {
      const intent = buildTestIntent();
      const achCoords = {
        type: 'ach',
        routing_number: '021000021',
        account_number: '123456789',
        account_type: 'checking' as const,
        account_holder: 'Test Holder',
      };
      const exec = buildTestExecution();

      expect(() => formatter.format(intent, achCoords, exec)).toThrow(
        "CoinbaseRailFormatter requires CryptoCoordinates (type='crypto')"
      );
    });

    it('throws on invalid crypto address in coordinates', () => {
      const intent = buildTestIntent();
      const coordinates = buildCryptoCoordinates({ address: 'invalid-addr' });
      const exec = buildTestExecution();

      expect(() =>
        formatter.format(intent, coordinates as any, exec)
      ).toThrow('Invalid crypto address');
    });

    it('parse_response extracts status from successful Coinbase response', () => {
      const result = formatter.parse_response({
        data: {
          id: 'tx-parsed-001',
          status: 'completed',
        },
      });

      expect(result.status).toBe(PaymentStatus.SETTLED);
      expect(result.reference).toBe('tx-parsed-001');
      expect(result.error).toBeUndefined();
    });

    it('parse_response maps pending status to SUBMITTED', () => {
      const result = formatter.parse_response({
        data: { id: 'tx-002', status: 'pending' },
      });

      expect(result.status).toBe(PaymentStatus.SUBMITTED);
      expect(result.reference).toBe('tx-002');
    });

    it('parse_response maps failed status to FAILED', () => {
      const result = formatter.parse_response({
        data: { id: 'tx-003', status: 'failed' },
      });

      expect(result.status).toBe(PaymentStatus.FAILED);
    });

    it('parse_response maps cancelled status to RETURNED', () => {
      const result = formatter.parse_response({
        data: { id: 'tx-004', status: 'cancelled' },
      });

      expect(result.status).toBe(PaymentStatus.RETURNED);
    });

    it('parse_response handles error responses', () => {
      const result = formatter.parse_response({
        errors: [{ message: 'Insufficient funds' }],
      });

      expect(result.status).toBe(PaymentStatus.FAILED);
      expect(result.error).toContain('Insufficient funds');
    });

    it('parse_response handles string error field', () => {
      const result = formatter.parse_response({
        error: 'Rate limit exceeded',
      });

      expect(result.status).toBe(PaymentStatus.FAILED);
      expect(result.error).toBe('Rate limit exceeded');
    });

    it('parse_response returns FAILED for null/invalid input', () => {
      expect(formatter.parse_response(null).status).toBe(PaymentStatus.FAILED);
      expect(formatter.parse_response(undefined).status).toBe(
        PaymentStatus.FAILED
      );
      expect(formatter.parse_response('not-an-object').status).toBe(
        PaymentStatus.FAILED
      );
    });

    it('parse_response defaults to CREATED for unknown status', () => {
      const result = formatter.parse_response({
        data: { id: 'tx-unknown', status: 'processing' },
      });

      expect(result.status).toBe(PaymentStatus.CREATED);
    });

    it('parse_response works when data is at root level (no wrapper)', () => {
      const result = formatter.parse_response({
        id: 'tx-root-001',
        status: 'completed',
      });

      expect(result.status).toBe(PaymentStatus.SETTLED);
      expect(result.reference).toBe('tx-root-001');
    });
  });

  // --------------------------------------------------------------------------
  // FIConnector: CoinbaseFIConnector
  // --------------------------------------------------------------------------
  describe('CoinbaseFIConnector', () => {
    let connector: CoinbaseFIConnector;

    beforeEach(() => {
      connector = new CoinbaseFIConnector();
    });

    it('has correct fi identifier and supported rails', () => {
      expect(connector.fi).toBe(FIIdentifier.BANK_SECONDARY);
      expect(connector.supported_rails).toContain(COINBASE_CRYPTO_RAIL);
    });

    it('transmit sends payload and returns success with fi_reference', async () => {
      mockApiPost.mockResolvedValueOnce(MOCK_SEND_RESPONSE);

      const payload = {
        rail: COINBASE_CRYPTO_RAIL,
        format: 'json' as const,
        content: JSON.stringify({
          accountId: 'acct-btc-001',
          to: VALID_BTC_LEGACY,
          amount: '0.5',
          currency: 'BTC',
        }),
      };

      const result = await connector.transmit(payload);

      expect(result.success).toBe(true);
      expect(result.fi_reference).toBe('tx-send-001');
      expect(result.raw_response).toEqual(MOCK_SEND_RESPONSE);
    });

    it('transmit returns failure on API error', async () => {
      mockApiPost.mockRejectedValueOnce(new Error('Network timeout'));

      const payload = {
        rail: COINBASE_CRYPTO_RAIL,
        format: 'json' as const,
        content: JSON.stringify({
          accountId: 'acct-btc-001',
          to: VALID_BTC_LEGACY,
          amount: '0.5',
          currency: 'BTC',
        }),
      };

      const result = await connector.transmit(payload);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network timeout');
    });

    it('check_status maps completed status correctly', async () => {
      mockApiGet.mockResolvedValueOnce({
        status: 'completed',
        updated_at: '2026-02-09T12:00:00Z',
      });

      const result = await connector.check_status('tx-001');

      expect(result.status).toBe(PaymentStatus.SETTLED);
      expect(result.updated_at).toBe('2026-02-09T12:00:00Z');
    });

    it('check_status maps pending status correctly', async () => {
      mockApiGet.mockResolvedValueOnce({
        status: 'pending',
        updated_at: '2026-02-09T11:00:00Z',
      });

      const result = await connector.check_status('tx-002');

      expect(result.status).toBe(PaymentStatus.SUBMITTED);
    });

    it('check_status returns FAILED on API error', async () => {
      mockApiGet.mockRejectedValueOnce(new Error('Not found'));

      const result = await connector.check_status('tx-nonexistent');

      expect(result.status).toBe(PaymentStatus.FAILED);
      expect(result.updated_at).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Integration Flows
  // --------------------------------------------------------------------------
  describe('Integration flows', () => {
    let rail: CoinbaseRail;

    beforeEach(() => {
      rail = new CoinbaseRail();
    });

    it('full send flow: validate address -> check balance -> send -> verify transaction', async () => {
      // Step 1: Validate destination address
      const validation = await rail.validateAddress(VALID_BTC_LEGACY, 'BTC');
      expect(validation.valid).toBe(true);

      // Step 2: Check balance
      mockApiGet.mockResolvedValueOnce({
        amount: '2.00000000',
        currency: 'BTC',
      } as CoinbaseBalance);

      const balance = await rail.getBalance('acct-btc-001');
      expect(parseFloat(balance.amount)).toBeGreaterThan(0.5);

      // Step 3: Send
      mockApiPost.mockResolvedValueOnce({
        id: 'tx-flow-001',
        status: 'pending',
        amount: { amount: '0.50000000', currency: 'BTC' },
      } as CoinbaseSendResponse);

      const sendResult = await rail.send({
        address: VALID_BTC_LEGACY,
        amount: '0.50000000',
        currency: 'BTC',
        memo: 'Integration test send',
      });
      expect(sendResult.id).toBe('tx-flow-001');
      expect(sendResult.status).toBe('pending');

      // Step 4: Verify transaction appears in transaction list
      mockApiGet.mockResolvedValueOnce([
        {
          id: 'tx-flow-001',
          type: 'send',
          status: 'completed',
          amount: { amount: '-0.50000000', currency: 'BTC' },
          created_at: '2026-02-09T10:00:00Z',
          description: 'Sent BTC',
          to: { address: VALID_BTC_LEGACY },
        },
      ] as CoinbaseTransaction[]);

      const txns = await rail.getTransactions({ accountId: 'acct-btc-001' });
      const sentTx = txns.find((t) => t.id === 'tx-flow-001');
      expect(sentTx).toBeDefined();
      expect(sentTx!.status).toBe('completed');
      expect(sentTx!.to?.address).toBe(VALID_BTC_LEGACY);
    });

    it('full receive flow: get receive address -> verify format', async () => {
      // Step 1: Get a receive address
      mockApiPost.mockResolvedValueOnce({
        id: 'addr-receive-001',
        address: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
        currency: 'BTC',
        network: 'bitcoin',
      } as CoinbaseAddress);

      const receiveAddr = await rail.receive('acct-btc-001', 'BTC');

      expect(receiveAddr.address).toBeTruthy();
      expect(receiveAddr.currency).toBe('BTC');
      expect(receiveAddr.network).toBe('bitcoin');

      // Step 2: Validate the returned address format
      const validation = await rail.validateAddress(
        receiveAddr.address,
        receiveAddr.currency
      );
      expect(validation.valid).toBe(true);
    });

    it('full ETH send flow: validate -> send -> check status via connector', async () => {
      // Step 1: Validate ETH address
      const validation = await rail.validateAddress(VALID_ETH_ADDR, 'ETH');
      expect(validation.valid).toBe(true);

      // Step 2: Send via rail adapter
      mockApiPost.mockResolvedValueOnce({
        id: 'tx-eth-001',
        status: 'pending',
        amount: { amount: '5.0', currency: 'ETH' },
      } as CoinbaseSendResponse);

      const sendResult = await rail.send({
        address: VALID_ETH_ADDR,
        amount: '5.0',
        currency: 'ETH',
      });
      expect(sendResult.id).toBe('tx-eth-001');

      // Step 3: Check status via FIConnector
      const connector = new CoinbaseFIConnector();
      mockApiGet.mockResolvedValueOnce({
        status: 'completed',
        updated_at: '2026-02-09T13:00:00Z',
      });

      const statusResult = await connector.check_status(sendResult.id);
      expect(statusResult.status).toBe(PaymentStatus.SETTLED);
    });

    it('formatter -> connector end-to-end: format intent then transmit', async () => {
      const formatter = new CoinbaseRailFormatter();
      const connector = new CoinbaseFIConnector();

      // Step 1: Format
      const intent = buildTestIntent({ amount: 1.5, memo: 'E2E flow' });
      const coords = buildCryptoCoordinates({
        address: VALID_BTC_BECH32,
        currency: 'BTC',
      });
      const exec = buildTestExecution();

      const payload = formatter.format(intent, coords as any, exec);
      expect(payload.format).toBe('json');

      // Step 2: Transmit
      mockApiPost.mockResolvedValueOnce({
        id: 'tx-e2e-001',
        status: 'pending',
        amount: { amount: '1.5', currency: 'BTC' },
      });

      const transmitResult = await connector.transmit(payload);
      expect(transmitResult.success).toBe(true);
      expect(transmitResult.fi_reference).toBe('tx-e2e-001');

      // Step 3: Parse response
      const parsed = formatter.parse_response(transmitResult.raw_response);
      expect(parsed.status).toBe(PaymentStatus.SUBMITTED);
      expect(parsed.reference).toBe('tx-e2e-001');
    });
  });

  // --------------------------------------------------------------------------
  // validateCryptoAddress direct tests (standalone function)
  // --------------------------------------------------------------------------
  describe('validateCryptoAddress (standalone)', () => {
    it('handles case-insensitive currency codes', () => {
      expect(validateCryptoAddress(VALID_BTC_LEGACY, 'btc').valid).toBe(true);
      expect(validateCryptoAddress(VALID_ETH_ADDR, 'eth').valid).toBe(true);
      expect(validateCryptoAddress(VALID_ETH_ADDR, 'Usdc').valid).toBe(true);
    });

    it('validates DAI addresses (ERC-20 token)', () => {
      expect(validateCryptoAddress(VALID_ETH_ADDR, 'DAI').valid).toBe(true);
    });

    it('validates USDT addresses (ERC-20 token)', () => {
      expect(validateCryptoAddress(VALID_ETH_ADDR, 'USDT').valid).toBe(true);
    });

    it('rejects BTC address with invalid base58 characters (0, O, I, l)', () => {
      // '0' is not in base58
      const result = validateCryptoAddress('10000000000000000000000000', 'BTC');
      expect(result.valid).toBe(false);
    });
  });
});
