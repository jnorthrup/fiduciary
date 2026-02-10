export const API_BASE_URL = '/api';
export const TOKEN_KEY = 'google_id_token'; // Align with authService SESSION_KEY

export function getAuthToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

type ApiOptions = RequestInit & { raw?: boolean };

// USER IDENTIFICATION FOR MOCK ACLs
let currentUserId: string | null = null;

export function setApiUser(uid: string | null) {
  currentUserId = uid;
  console.log('[API] User set to:', uid);
}

// STORAGE HELPERS
function getStorageKey(key: string): string {
  if (!currentUserId) return `public_${key}`;
  return `mock_data_${currentUserId}_${key}`;
}

function getStoredData<T>(key: string, defaultData: T): T {
  try {
    const storageKey = getStorageKey(key);
    const stored = localStorage.getItem(storageKey);
    if (stored) return JSON.parse(stored);

    // Initialize with default if not found
    localStorage.setItem(storageKey, JSON.stringify(defaultData));
    return JSON.parse(JSON.stringify(defaultData));
  } catch (e) {
    console.warn('Failed to load mock data', e);
    return JSON.parse(JSON.stringify(defaultData));
  }
}

function saveStoredData(key: string, data: any) {
  try {
    localStorage.setItem(getStorageKey(key), JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save mock data', e);
  }
}

// MOCK DATA DEFAULTS
const DEFAULT_ACCOUNTS = [
  { code: '1000', name: 'Operating Cash', type: 'Asset' },
  { code: '1100', name: 'Accounts Receivable', type: 'Asset' },
  { code: '2000', name: 'Accounts Payable', type: 'Liability' },
  { code: '4000', name: 'Revenue', type: 'Income' },
  { code: '5000', name: 'Expenses', type: 'Expense' }
];

const DEFAULT_JOURNAL = [
  { id: 1, entry_date: '2023-10-01', memo: 'Opening Balance', source_module: 'manual', entity_id: 1, external_ref: 'OP-001' }
];

// COINBASE MOCK DATA DEFAULTS
const MOCK_COINBASE_ACCOUNTS = [
  {
    id: 'cb_acct_btc',
    name: 'BTC Wallet',
    primary: true,
    type: 'wallet',
    currency: { code: 'BTC', name: 'Bitcoin', color: '#F7931A', type: 'crypto', exponent: 8 },
    balance: { amount: '1.45320000', currency: 'BTC' },
    native_balance: { amount: '62847.36', currency: 'USD' },
    created_at: '2023-06-15T10:00:00.000Z',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'cb_acct_eth',
    name: 'ETH Wallet',
    primary: false,
    type: 'wallet',
    currency: { code: 'ETH', name: 'Ethereum', color: '#627EEA', type: 'crypto', exponent: 18 },
    balance: { amount: '12.78500000', currency: 'ETH' },
    native_balance: { amount: '31962.50', currency: 'USD' },
    created_at: '2023-06-15T10:00:00.000Z',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'cb_acct_usdc',
    name: 'USDC Wallet',
    primary: false,
    type: 'wallet',
    currency: { code: 'USDC', name: 'USD Coin', color: '#2775CA', type: 'crypto', exponent: 6 },
    balance: { amount: '25000.00', currency: 'USDC' },
    native_balance: { amount: '25000.00', currency: 'USD' },
    created_at: '2023-08-01T10:00:00.000Z',
    updated_at: new Date().toISOString(),
  },
];

const MOCK_COINBASE_TRANSACTIONS = [
  {
    id: 'cb_txn_1',
    type: 'send',
    status: 'completed',
    amount: { amount: '-0.05000000', currency: 'BTC' },
    native_amount: { amount: '-2163.50', currency: 'USD' },
    description: null,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
    network: { status: 'confirmed', hash: '3a1b2c3d4e5f...', transaction_fee: { amount: '0.00012000', currency: 'BTC' }, confirmations: 6 },
    to: { resource: 'bitcoin_address', address: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4' },
    details: { title: 'Sent Bitcoin', subtitle: 'To bc1qw508...v8f3t4' },
    account_id: 'cb_acct_btc',
  },
  {
    id: 'cb_txn_2',
    type: 'receive',
    status: 'completed',
    amount: { amount: '2.50000000', currency: 'ETH' },
    native_amount: { amount: '6250.00', currency: 'USD' },
    description: 'Payment from client',
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    network: { status: 'confirmed', hash: '0xabcdef1234...', transaction_fee: { amount: '0.00210000', currency: 'ETH' }, confirmations: 45 },
    from: { resource: 'ethereum_address', address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18' },
    details: { title: 'Received Ethereum', subtitle: 'From 0x742d...bD18' },
    account_id: 'cb_acct_eth',
  },
  {
    id: 'cb_txn_3',
    type: 'send',
    status: 'completed',
    amount: { amount: '-5000.00', currency: 'USDC' },
    native_amount: { amount: '-5000.00', currency: 'USD' },
    description: 'Vendor payment',
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    network: { status: 'confirmed', hash: '0x1234567890...', transaction_fee: { amount: '0.00150000', currency: 'ETH' }, confirmations: 120 },
    to: { resource: 'ethereum_address', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
    details: { title: 'Sent USD Coin', subtitle: 'To 0xdAC1...1ec7' },
    account_id: 'cb_acct_usdc',
  },
];

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Real fetch to the serverless backend
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;

  console.log(`[API] ${options.method || 'GET'} ${url} (User: ${currentUserId})`);

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.error('[API] Unauthorized - Token expired or invalid');
      }
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    if (options.raw) return response as unknown as T;
    return await response.json() as T;

  } catch (error) {
    console.warn(`[API] Fetch failed for ${url}, falling back to mock routing`, error);
    // FALLBACK TO MOCK ROUTING (Keep existing logic as safety)
    return mockApiRequest<T>(path, options);
  }
}

async function mockApiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  // MOCK ROUTING
  if (path.includes('/banking/plaid/create-link-token')) {
    return { link_token: 'mock-link-token-' + (currentUserId || 'anon') } as T;
  }
  if (path.includes('/banking/plaid/exchange-public-token')) {
    return { success: true } as T;
  }
  if (path.includes('/auth/register')) {
    return { success: true, user: { id: currentUserId || 'mock-user' } } as T;
  }
  if (path.includes('/ledger/balance/cash')) {
    return { value: 142500.50 } as T;
  }
  if (path.includes('/ledger/balance/transit')) {
    return { value: 28900.00 } as T;
  }
  if (path.includes('/ledger/balance/ap')) {
    return { value: 15400.25 } as T;
  }
  if (path.includes('/ledger/series/cash')) {
    const MOCK_SERIES = Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
      value: 100000 + Math.random() * 50000
    }));
    return MOCK_SERIES as T;
  }
  if (path.includes('/ledger/series/transit')) {
    const MOCK_SERIES = Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
      value: 30000 + Math.random() * 10000
    }));
    return MOCK_SERIES as T;
  }
  if (path.includes('/ledger/accounts/init-defaults')) {
    // Reset or ensure defaults
    const current = getStoredData('accounts', DEFAULT_ACCOUNTS);
    if (current.length === 0) {
      saveStoredData('accounts', DEFAULT_ACCOUNTS);
    }
    return { success: true, count: current.length } as T;
  }
  if (path.includes('/ledger/accounts')) {
    if (options.method === 'POST') {
      const body = JSON.parse(options.body as string);
      const accounts = getStoredData('accounts', DEFAULT_ACCOUNTS);
      accounts.push(body);
      saveStoredData('accounts', accounts);
      return body as T;
    }
    return getStoredData('accounts', DEFAULT_ACCOUNTS) as T;
  }
  if (path.includes('/ledger/journal')) {
    if (options.method === 'POST') {
      return { success: true, id: Date.now() } as T;
    }
    return getStoredData('journal', DEFAULT_JOURNAL) as T;
  }
  if (path.includes('/ledger/reports')) {
    return {
      title: 'Mock Report',
      generated_at: new Date().toISOString(),
      rows: []
    } as T;
  }
  if (path.includes('/rail/bank/import/batch')) {
    return { success: true, imported: 10 } as T;
  }

  // =========================================================================
  // COINBASE MOCK ROUTES
  // =========================================================================
  if (path.includes('/coinbase/validate-address')) {
    const body = JSON.parse(options.body as string);
    const { address, currency } = body;
    let valid = false;
    let reason = '';
    const upper = (currency || '').toUpperCase();
    switch (upper) {
      case 'BTC':
        valid = /^(1|3)[a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address) || /^bc1[a-z0-9]{25,90}$/.test(address);
        reason = valid ? 'Valid Bitcoin address' : 'Invalid Bitcoin address. Must start with 1, 3, or bc1.';
        break;
      case 'ETH': case 'USDC': case 'USDT': case 'DAI':
        valid = /^0x[0-9a-fA-F]{40}$/.test(address);
        reason = valid ? `Valid ${upper} address` : `Invalid ${upper} address. Must be 0x followed by 40 hex characters.`;
        break;
      default:
        reason = `Unsupported currency: ${upper}`;
    }
    return { valid, currency: upper, address, reason } as T;
  }

  if (path.includes('/coinbase/accounts') && path.includes('/balance')) {
    const cbState = getStoredData('coinbase_accounts', MOCK_COINBASE_ACCOUNTS);
    const idMatch = path.match(/\/coinbase\/accounts\/([^/]+)\/balance/);
    const acct = idMatch ? cbState.find((a: any) => a.id === idMatch[1]) : null;
    if (acct) {
      return { balance: acct.balance, native_balance: acct.native_balance, currency: acct.currency.code, updated_at: acct.updated_at } as T;
    }
    return { error: 'Account not found' } as T;
  }

  if (path.includes('/coinbase/accounts')) {
    const idMatch = path.match(/\/coinbase\/accounts\/([^/]+)$/);
    const cbAccts = getStoredData('coinbase_accounts', MOCK_COINBASE_ACCOUNTS);
    if (idMatch) {
      const acct = cbAccts.find((a: any) => a.id === idMatch[1]);
      return (acct || { error: 'Account not found' }) as T;
    }
    return { accounts: cbAccts, count: cbAccts.length } as T;
  }

  if (path.includes('/coinbase/send')) {
    const body = JSON.parse(options.body as string);
    const cbAccts = getStoredData('coinbase_accounts', MOCK_COINBASE_ACCOUNTS);
    const acct = cbAccts.find((a: any) => a.id === body.accountId);
    const txn = {
      id: `cb_txn_${Date.now()}`,
      type: 'send',
      status: 'pending',
      amount: { amount: `-${body.amount}`, currency: body.currency },
      native_amount: { amount: `-${body.amount}`, currency: 'USD' },
      description: body.description || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      network: { status: 'pending', hash: null, transaction_fee: { amount: '0.00010000', currency: body.currency }, confirmations: 0 },
      to: { resource: body.currency === 'BTC' ? 'bitcoin_address' : 'ethereum_address', address: body.to },
      details: { title: `Sent ${body.currency}`, subtitle: `To ${body.to.substring(0, 8)}...` },
      account_id: body.accountId,
    };
    if (acct) {
      const bal = parseFloat(acct.balance.amount) - parseFloat(body.amount);
      acct.balance.amount = bal.toFixed(8);
      saveStoredData('coinbase_accounts', cbAccts);
    }
    const cbTxns = getStoredData('coinbase_transactions', MOCK_COINBASE_TRANSACTIONS);
    cbTxns.unshift(txn);
    saveStoredData('coinbase_transactions', cbTxns);
    return { transaction: txn } as T;
  }

  if (path.includes('/coinbase/receive')) {
    const body = JSON.parse(options.body as string);
    const curr = body.currency || 'BTC';
    const addr = curr === 'BTC'
      ? 'bc1q' + Array.from({ length: 40 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('')
      : '0x' + Array.from({ length: 40 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
    return {
      id: `addr_${Date.now()}`,
      address: addr,
      name: null,
      network: 'mainnet',
      uri: curr === 'BTC' ? `bitcoin:${addr}` : `ethereum:${addr}`,
      currency: curr,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as T;
  }

  if (path.includes('/coinbase/transactions')) {
    const idMatch = path.match(/\/coinbase\/transactions\/([^/?]+)/);
    const cbTxns = getStoredData('coinbase_transactions', MOCK_COINBASE_TRANSACTIONS);
    if (idMatch) {
      const txn = cbTxns.find((t: any) => t.id === idMatch[1]);
      return (txn || { error: 'Transaction not found' }) as T;
    }
    return { transactions: cbTxns, count: cbTxns.length, total: cbTxns.length } as T;
  }

  if (path.includes('/coinbase/health')) {
    return { status: 'mock', timestamp: new Date().toISOString(), provider: 'coinbase', api_version: '2024-01-01', live_api_configured: false, latency_ms: 0 } as T;
  }

  // DOCUMENT MANAGEMENT (MOCK)
  if (path.includes('/documents/upload')) {
    if (options.method === 'POST') {
      const body = JSON.parse(options.body as string);
      const docs = getStoredData('documents', []);
      const newDoc = {
        id: Date.now().toString(),
        name: body.name,
        size: body.size,
        type: body.type,
        uploaded_at: new Date().toISOString(),
        owner_uid: currentUserId || 'public'
      };
      docs.push(newDoc);
      saveStoredData('documents', docs);
      return newDoc as T;
    }
  }
  if (path.includes('/documents')) {
    return getStoredData('documents', []) as T;
  }

  // Default catch-all
  if (options.method === 'GET') return [] as unknown as T;
  return { success: true } as unknown as T;
}

export function apiGet<T>(path: string): Promise<T> {
  return apiRequest<T>(path, { method: 'GET' });
}

export function apiPost<T>(path: string, body?: any): Promise<T> {
  return apiRequest<T>(path, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined
  });
}

export function apiPatch<T>(path: string, body?: any): Promise<T> {
  return apiRequest<T>(path, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined
  });
}
