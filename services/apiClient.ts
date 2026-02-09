export const API_BASE_URL = 'http://mock-api';
export const TOKEN_KEY = 'clearflow_token';

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
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

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  console.log(`[MOCK API] ${options.method || 'GET'} ${path} (User: ${currentUserId})`, options.body);

  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate latency

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
