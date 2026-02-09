import express from 'express';
import crypto from 'crypto';
import persistence from '../lib/gcs-persistence.js';

const router = express.Router();

// ============================================================================
// CONFIGURATION
// ============================================================================

const COINBASE_API_KEY = process.env.COINBASE_API_KEY || '';
const COINBASE_API_SECRET = process.env.COINBASE_API_SECRET || '';
const COINBASE_API_BASE = 'https://api.coinbase.com/v2';
const USE_LIVE_API = !!(COINBASE_API_KEY && COINBASE_API_SECRET);

// ============================================================================
// HMAC-SHA256 REQUEST SIGNING (Coinbase API v2)
// ============================================================================

/**
 * Generate Coinbase API v2 authentication headers.
 * @see https://docs.cloud.coinbase.com/sign-in-with-coinbase/docs/api-key-authentication
 */
function signRequest(method, path, body = '') {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const message = timestamp + method.toUpperCase() + path + (body || '');
  const signature = crypto
    .createHmac('sha256', COINBASE_API_SECRET)
    .update(message)
    .digest('hex');

  return {
    'CB-ACCESS-KEY': COINBASE_API_KEY,
    'CB-ACCESS-SIGN': signature,
    'CB-ACCESS-TIMESTAMP': timestamp,
    'CB-VERSION': '2024-01-01',
    'Content-Type': 'application/json',
  };
}

// ============================================================================
// MOCK COINBASE FACADE
// ============================================================================

class MockCoinbaseFacade {
  async ensureState(uid) {
    let state = await persistence.loadData(uid, 'coinbase');
    if (!state) {
      state = this.getInitialMockData();
      await persistence.saveData(uid, 'coinbase', state);
    }
    return state;
  }

  getInitialMockData() {
    const now = new Date().toISOString();
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();

    return {
      accounts: {
        'cb_acct_btc': {
          id: 'cb_acct_btc',
          name: 'BTC Wallet',
          primary: true,
          type: 'wallet',
          currency: {
            code: 'BTC',
            name: 'Bitcoin',
            color: '#F7931A',
            type: 'crypto',
            exponent: 8,
          },
          balance: {
            amount: '1.45320000',
            currency: 'BTC',
          },
          native_balance: {
            amount: '62847.36',
            currency: 'USD',
          },
          created_at: '2023-06-15T10:00:00.000Z',
          updated_at: now,
        },
        'cb_acct_eth': {
          id: 'cb_acct_eth',
          name: 'ETH Wallet',
          primary: false,
          type: 'wallet',
          currency: {
            code: 'ETH',
            name: 'Ethereum',
            color: '#627EEA',
            type: 'crypto',
            exponent: 18,
          },
          balance: {
            amount: '12.78500000',
            currency: 'ETH',
          },
          native_balance: {
            amount: '31962.50',
            currency: 'USD',
          },
          created_at: '2023-06-15T10:00:00.000Z',
          updated_at: now,
        },
        'cb_acct_usdc': {
          id: 'cb_acct_usdc',
          name: 'USDC Wallet',
          primary: false,
          type: 'wallet',
          currency: {
            code: 'USDC',
            name: 'USD Coin',
            color: '#2775CA',
            type: 'crypto',
            exponent: 6,
          },
          balance: {
            amount: '25000.00',
            currency: 'USDC',
          },
          native_balance: {
            amount: '25000.00',
            currency: 'USD',
          },
          created_at: '2023-08-01T10:00:00.000Z',
          updated_at: now,
        },
      },
      transactions: [
        {
          id: 'cb_txn_1',
          type: 'send',
          status: 'completed',
          amount: {
            amount: '-0.05000000',
            currency: 'BTC',
          },
          native_amount: {
            amount: '-2163.50',
            currency: 'USD',
          },
          description: null,
          created_at: yesterday,
          updated_at: yesterday,
          network: {
            status: 'confirmed',
            hash: '3a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1',
            transaction_fee: {
              amount: '0.00012000',
              currency: 'BTC',
            },
            confirmations: 6,
          },
          to: {
            resource: 'bitcoin_address',
            address: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
          },
          details: {
            title: 'Sent Bitcoin',
            subtitle: 'To bc1qw508...v8f3t4',
          },
          account_id: 'cb_acct_btc',
        },
        {
          id: 'cb_txn_2',
          type: 'receive',
          status: 'completed',
          amount: {
            amount: '2.50000000',
            currency: 'ETH',
          },
          native_amount: {
            amount: '6250.00',
            currency: 'USD',
          },
          description: 'Payment from client',
          created_at: twoDaysAgo,
          updated_at: twoDaysAgo,
          network: {
            status: 'confirmed',
            hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
            transaction_fee: {
              amount: '0.002100000000000000',
              currency: 'ETH',
            },
            confirmations: 45,
          },
          from: {
            resource: 'ethereum_address',
            address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
          },
          details: {
            title: 'Received Ethereum',
            subtitle: 'From 0x742d...bD18',
          },
          account_id: 'cb_acct_eth',
        },
        {
          id: 'cb_txn_3',
          type: 'send',
          status: 'completed',
          amount: {
            amount: '-5000.00',
            currency: 'USDC',
          },
          native_amount: {
            amount: '-5000.00',
            currency: 'USD',
          },
          description: 'Vendor payment',
          created_at: threeDaysAgo,
          updated_at: threeDaysAgo,
          network: {
            status: 'confirmed',
            hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            transaction_fee: {
              amount: '0.001500000000000000',
              currency: 'ETH',
            },
            confirmations: 120,
          },
          to: {
            resource: 'ethereum_address',
            address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
          },
          details: {
            title: 'Sent USD Coin',
            subtitle: 'To 0xdAC1...1ec7',
          },
          account_id: 'cb_acct_usdc',
        },
        {
          id: 'cb_txn_4',
          type: 'deposit',
          status: 'completed',
          amount: {
            amount: '10000.00',
            currency: 'USDC',
          },
          native_amount: {
            amount: '10000.00',
            currency: 'USD',
          },
          description: 'Deposit from bank account',
          created_at: threeDaysAgo,
          updated_at: threeDaysAgo,
          network: null,
          details: {
            title: 'Deposited USD Coin',
            subtitle: 'From linked bank account',
          },
          account_id: 'cb_acct_usdc',
        },
        {
          id: 'cb_txn_5',
          type: 'receive',
          status: 'pending',
          amount: {
            amount: '0.10000000',
            currency: 'BTC',
          },
          native_amount: {
            amount: '4328.70',
            currency: 'USD',
          },
          description: null,
          created_at: now,
          updated_at: now,
          network: {
            status: 'pending',
            hash: '9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8',
            transaction_fee: {
              amount: '0.00008000',
              currency: 'BTC',
            },
            confirmations: 1,
          },
          from: {
            resource: 'bitcoin_address',
            address: '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy',
          },
          details: {
            title: 'Receiving Bitcoin',
            subtitle: 'From 3J98t...WNLy',
          },
          account_id: 'cb_acct_btc',
        },
      ],
      receive_addresses: {},
    };
  }

  async listAccounts(uid) {
    const state = await this.ensureState(uid);
    return Object.values(state.accounts);
  }

  async getAccount(uid, accountId) {
    const state = await this.ensureState(uid);
    return state.accounts[accountId] || null;
  }

  async getBalance(uid, accountId) {
    const state = await this.ensureState(uid);
    const account = state.accounts[accountId];
    if (!account) return null;
    return {
      balance: account.balance,
      native_balance: account.native_balance,
      currency: account.currency.code,
      updated_at: account.updated_at,
    };
  }

  async sendCrypto(uid, { accountId, to, amount, currency, description, idem }) {
    const state = await this.ensureState(uid);
    const account = state.accounts[accountId];
    if (!account) return { error: 'Account not found' };

    if (account.currency.code !== currency) {
      return { error: `Account currency mismatch: expected ${account.currency.code}, got ${currency}` };
    }

    const currentBalance = parseFloat(account.balance.amount);
    const sendAmount = parseFloat(amount);

    if (sendAmount <= 0) {
      return { error: 'Amount must be positive' };
    }

    if (sendAmount > currentBalance) {
      return { error: 'Insufficient funds', available: account.balance.amount };
    }

    const txnId = `cb_txn_${Date.now()}`;
    const now = new Date().toISOString();

    const transaction = {
      id: txnId,
      type: 'send',
      status: 'pending',
      amount: {
        amount: `-${sendAmount.toFixed(8)}`,
        currency,
      },
      native_amount: {
        amount: `-${(sendAmount * parseFloat(account.native_balance.amount) / currentBalance).toFixed(2)}`,
        currency: 'USD',
      },
      description: description || null,
      created_at: now,
      updated_at: now,
      idem: idem || null,
      network: {
        status: 'pending',
        hash: null,
        transaction_fee: {
          amount: '0.00010000',
          currency,
        },
        confirmations: 0,
      },
      to: {
        resource: currency === 'BTC' ? 'bitcoin_address' : 'ethereum_address',
        address: to,
      },
      details: {
        title: `Sent ${account.currency.name}`,
        subtitle: `To ${to.substring(0, 8)}...${to.substring(to.length - 4)}`,
      },
      account_id: accountId,
    };

    // Deduct balance
    const newBalance = (currentBalance - sendAmount).toFixed(8);
    account.balance.amount = newBalance;
    const nativeRate = parseFloat(account.native_balance.amount) / currentBalance;
    account.native_balance.amount = (parseFloat(newBalance) * nativeRate).toFixed(2);
    account.updated_at = now;

    state.accounts[accountId] = account;
    state.transactions.unshift(transaction);
    await persistence.saveData(uid, 'coinbase', state);

    return { transaction };
  }

  async generateReceiveAddress(uid, accountId, currency) {
    const state = await this.ensureState(uid);
    const account = state.accounts[accountId];
    if (!account) return null;

    const addressKey = `${accountId}_${currency}`;

    // Return existing address if one was already generated
    if (state.receive_addresses[addressKey]) {
      return state.receive_addresses[addressKey];
    }

    // Generate mock address based on currency
    let address;
    const randomHex = (len) => crypto.randomBytes(len).toString('hex');

    switch (currency || account.currency.code) {
      case 'BTC':
        address = 'bc1q' + randomHex(20);
        break;
      case 'ETH':
      case 'USDC':
        address = '0x' + randomHex(20);
        break;
      default:
        address = '0x' + randomHex(20);
    }

    const receiveAddress = {
      id: `addr_${Date.now()}`,
      address,
      name: null,
      network: 'mainnet',
      uri: currency === 'BTC' ? `bitcoin:${address}` : `ethereum:${address}`,
      currency: currency || account.currency.code,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    state.receive_addresses[addressKey] = receiveAddress;
    await persistence.saveData(uid, 'coinbase', state);

    return receiveAddress;
  }

  async listTransactions(uid, { accountId, limit, offset } = {}) {
    const state = await this.ensureState(uid);
    let txns = [...state.transactions];

    if (accountId) {
      txns = txns.filter(t => t.account_id === accountId);
    }

    txns.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const start = offset ? parseInt(offset) : 0;
    const end = limit ? start + parseInt(limit) : txns.length;
    const paginated = txns.slice(start, end);

    return {
      transactions: paginated,
      count: paginated.length,
      total: txns.length,
    };
  }

  async getTransaction(uid, transactionId) {
    const state = await this.ensureState(uid);
    return state.transactions.find(t => t.id === transactionId) || null;
  }

  validateAddress(address, currency) {
    if (!address || !currency) {
      return { valid: false, reason: 'Address and currency are required' };
    }

    const upper = currency.toUpperCase();

    switch (upper) {
      case 'BTC': {
        // P2PKH (1...), P2SH (3...), or Bech32 (bc1...)
        const btcValid =
          /^1[a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address) ||
          /^3[a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address) ||
          /^bc1[a-z0-9]{25,90}$/.test(address);
        return {
          valid: btcValid,
          currency: 'BTC',
          address,
          reason: btcValid ? 'Valid Bitcoin address' : 'Invalid Bitcoin address. Must start with 1, 3, or bc1.',
        };
      }
      case 'ETH':
      case 'USDC':
      case 'USDT':
      case 'DAI': {
        // Ethereum-style: 0x + 40 hex chars
        const ethValid = /^0x[0-9a-fA-F]{40}$/.test(address);
        return {
          valid: ethValid,
          currency: upper,
          address,
          reason: ethValid ? `Valid ${upper} address` : `Invalid ${upper} address. Must be 0x followed by 40 hex characters.`,
        };
      }
      default:
        return {
          valid: false,
          currency: upper,
          address,
          reason: `Unsupported currency: ${upper}. Supported: BTC, ETH, USDC, USDT, DAI.`,
        };
    }
  }

  async checkHealth() {
    return {
      status: USE_LIVE_API ? 'live' : 'mock',
      timestamp: new Date().toISOString(),
      provider: 'coinbase',
      api_version: '2024-01-01',
      live_api_configured: USE_LIVE_API,
      latency_ms: USE_LIVE_API ? null : 0,
    };
  }
}

// Initialize facade
const coinbaseFacade = new MockCoinbaseFacade();

// ============================================================================
// HEALTH ENDPOINT
// ============================================================================

router.get('/health', async (req, res) => {
  try {
    const health = await coinbaseFacade.checkHealth();
    res.json(health);
  } catch (error) {
    res.status(500).json({ error: 'Health check failed', message: error.message });
  }
});

// ============================================================================
// ACCOUNT ENDPOINTS
// ============================================================================

router.get('/accounts', async (req, res) => {
  try {
    const uid = req.user.uid;
    const accounts = await coinbaseFacade.listAccounts(uid);
    res.json({ accounts, count: accounts.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list accounts', message: error.message });
  }
});

router.get('/accounts/:id', async (req, res) => {
  try {
    const uid = req.user.uid;
    const { id } = req.params;
    const account = await coinbaseFacade.getAccount(uid, id);

    if (!account) {
      return res.status(404).json({ error: 'Account not found', accountId: id });
    }

    res.json(account);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get account', message: error.message });
  }
});

router.get('/accounts/:id/balance', async (req, res) => {
  try {
    const uid = req.user.uid;
    const { id } = req.params;
    const balance = await coinbaseFacade.getBalance(uid, id);

    if (!balance) {
      return res.status(404).json({ error: 'Account not found', accountId: id });
    }

    res.json(balance);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get balance', message: error.message });
  }
});

// ============================================================================
// SEND / RECEIVE ENDPOINTS
// ============================================================================

router.post('/send', async (req, res) => {
  try {
    const uid = req.user.uid;
    const { accountId, to, amount, currency, description, idem } = req.body;

    if (!accountId || !to || !amount || !currency) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['accountId', 'to', 'amount', 'currency'],
      });
    }

    // Validate destination address
    const validation = coinbaseFacade.validateAddress(to, currency);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Invalid destination address',
        details: validation,
      });
    }

    const result = await coinbaseFacade.sendCrypto(uid, {
      accountId,
      to,
      amount,
      currency,
      description,
      idem,
    });

    if (result.error) {
      return res.status(400).json({ error: result.error, available: result.available });
    }

    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to send crypto', message: error.message });
  }
});

router.post('/receive', async (req, res) => {
  try {
    const uid = req.user.uid;
    const { accountId, currency } = req.body;

    if (!accountId) {
      return res.status(400).json({
        error: 'Missing required field',
        required: ['accountId'],
      });
    }

    const address = await coinbaseFacade.generateReceiveAddress(uid, accountId, currency);

    if (!address) {
      return res.status(404).json({ error: 'Account not found', accountId });
    }

    res.json(address);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate receive address', message: error.message });
  }
});

// ============================================================================
// TRANSACTION ENDPOINTS
// ============================================================================

router.get('/transactions', async (req, res) => {
  try {
    const uid = req.user.uid;
    const { accountId, limit, offset } = req.query;

    const result = await coinbaseFacade.listTransactions(uid, { accountId, limit, offset });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list transactions', message: error.message });
  }
});

router.get('/transactions/:id', async (req, res) => {
  try {
    const uid = req.user.uid;
    const { id } = req.params;
    const transaction = await coinbaseFacade.getTransaction(uid, id);

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found', transactionId: id });
    }

    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get transaction', message: error.message });
  }
});

// ============================================================================
// ADDRESS VALIDATION ENDPOINT
// ============================================================================

router.post('/validate-address', (req, res) => {
  try {
    const { address, currency } = req.body;

    if (!address || !currency) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['address', 'currency'],
      });
    }

    const result = coinbaseFacade.validateAddress(address, currency);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to validate address', message: error.message });
  }
});

export default router;
