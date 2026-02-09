import React, { useEffect, useState, useCallback } from 'react';
import { UserProfileModal } from './components/modals/UserProfileModal';
import {
  Book,
  Building2,
  ChevronRight,
  HandCoins,
  Settings,
  Shuffle,
  Link as LinkIcon,
  Search,
  MoreVertical,
  CheckCircle2,
  Menu, X, Bell, LayoutGrid, HelpCircle,
  Landmark, Users, Upload, Shield, Lock,
  Loader2, Copy, ArrowUpRight, ArrowDownLeft, Wallet, XCircle
} from 'lucide-react';
import { usePlaidLink } from 'react-plaid-link';
import { useAuth } from './services/authService';
import { useStepUpAuth } from './services/stepUpAuth';
import { apiGet, apiPost, setApiUser } from './services/apiClient';
import {
  listAccounts as cbListAccounts,
  sendCrypto,
  getReceiveAddress,
  listTransactions as cbListTransactions,
  validateAddress as cbValidateAddress
} from './services/coinbaseService';
import type {
  CoinbaseAccount,
  CoinbaseTransaction
} from './services/coinbaseService';

// ─── Toast System ────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info';
type Toast = { id: string; type: ToastType; message: string };

const ToastContext = React.createContext<{
  push: (type: ToastType, message: string) => void;
} | null>(null);

const useToast = () => {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = (type: ToastType, message: string) => {
    const isDuplicate = toasts.some(t => t.message === message && t.type === type);
    if (isDuplicate) return;

    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4200);
  };

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-lg shadow-lg text-sm border ${t.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : t.type === 'error'
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : 'bg-slate-50 text-slate-700 border-slate-200'
              }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

// ─── UI Primitives ───────────────────────────────────────────────────────────

const PageShell: React.FC<{ title: string; subtitle?: string; children: React.ReactNode }> = ({ title, subtitle, children }) => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
      {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
    </div>
    {children}
  </div>
);

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white border border-slate-200 rounded-xl shadow-sm ${className}`}>{children}</div>
);

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="text-xs uppercase tracking-wide text-slate-500 font-semibold">{children}</label>
);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    {...props}
    className={`w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 ${props.className || ''}`}
  />
);

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
  <select
    {...props}
    className={`w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 ${props.className || ''}`}
  />
);

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' }> = ({
  variant = 'primary',
  className,
  ...props
}) => {
  const base =
    variant === 'primary'
      ? 'bg-slate-900 text-white hover:bg-slate-800'
      : variant === 'danger'
        ? 'bg-rose-600 text-white hover:bg-rose-500'
        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50';
  return (
    <button {...props} className={`px-4 py-2 rounded-lg text-sm font-semibold ${base} ${className || ''}`}>
      {props.children}
    </button>
  );
};

const Table: React.FC<{ columns: string[]; rows: any[]; empty?: string; renderCell?: (row: any, col: string) => React.ReactNode }> = ({
  columns,
  rows,
  empty = 'No records found.',
  renderCell
}) => (
  <div className="overflow-hidden rounded-xl border border-slate-200">
    <table className="min-w-full text-sm">
      <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
        <tr>
          {columns.map(col => (
            <th key={col} className="px-4 py-3 text-left font-semibold">
              {col.replace(/_/g, ' ')}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.length === 0 && (
          <tr>
            <td colSpan={columns.length} className="px-4 py-6 text-center text-slate-400">
              {empty}
            </td>
          </tr>
        )}
        {rows.map((row, idx) => (
          <tr key={row.id || idx} className="hover:bg-slate-50">
            {columns.map(col => (
              <td key={col} className="px-4 py-3 text-slate-700">
                {renderCell ? renderCell(row, col) : row[col]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const ChartCard: React.FC<{ title: string; series: any[] }> = ({ title, series }) => (
  <Card>
    <div className="text-sm uppercase text-slate-400 font-semibold">{title}</div>
    <div className="grid grid-cols-12 gap-1 items-end h-32">
      {series.slice(-12).map((point, idx) => (
        <div
          key={idx}
          className="bg-slate-900/80 rounded-sm"
          style={{ height: `${Math.min(100, Math.max(6, (point?.y ?? point?.value ?? 0) / 10))}%` }}
        />
      ))}
    </div>
  </Card>
);

// ─── Plaid Link Button ───────────────────────────────────────────────────────

const PlaidLinkButton: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const { push } = useToast();
  const [linkToken, setLinkToken] = useState<string | null>(null);

  useEffect(() => {
    const fetchLinkToken = async () => {
      try {
        const data = await apiPost<any>('/banking/plaid/create-link-token');
        setLinkToken(data.link_token);
      } catch (err: any) {
        console.error('Failed to fetch link token:', err);
        push('error', 'Failed to initialize bank connection.');
      }
    };
    fetchLinkToken();
  }, [push]);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: async (public_token, metadata) => {
      try {
        await apiPost('/banking/plaid/exchange-public-token', {
          public_token,
          institution_name: metadata.institution?.name
        });
        push('success', `Successfully connected to ${metadata.institution?.name}!`);
        onSuccess();
      } catch (err: any) {
        push('error', 'Failed to connect bank account.');
      }
    },
    onExit: (err, metadata) => {
      if (err) console.error('Plaid Link Exit Error:', err);
    },
  });

  return (
    <Button
      onClick={() => open()}
      disabled={!ready}
      variant="ghost"
      className="flex items-center gap-2"
    >
      <LinkIcon className="w-4 h-4" />
      Connect Bank
    </Button>
  );
};

// ─── Sub-Tab Components (prop-driven) ────────────────────────────────────────

const LedgerTabs: React.FC<{ activeTab: string; onTabChange: (tab: string) => void }> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { label: 'Accounts', id: 'accounts' },
    { label: 'Journal', id: 'journal' },
    { label: 'Reports', id: 'reports' }
  ];
  return (
    <div className="flex gap-3 border-b border-slate-200 pb-3">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`text-sm font-semibold ${activeTab === tab.id ? 'text-slate-900' : 'text-slate-400 hover:text-slate-700'}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

const RailTabs: React.FC<{ activeTab: string; onTabChange: (tab: string) => void }> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { label: 'Payees', id: 'payees' },
    { label: 'Payment Orders', id: 'payment-orders' },
    { label: 'Bank Mirror', id: 'bank' },
    { label: 'Reconcile', id: 'reconcile' },
    { label: 'Crypto', id: 'crypto' },
    { label: 'Documents', id: 'documents' },
    { label: 'Webhook Tester', id: 'webhook-tester' }
  ];
  return (
    <div className="flex flex-wrap gap-3 border-b border-slate-200 pb-3">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`text-sm font-semibold ${activeTab === tab.id ? 'text-slate-900' : 'text-slate-400 hover:text-slate-700'}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

// ─── Page Components ─────────────────────────────────────────────────────────

// --- Functional Wrappers ---

const PaymentCenter: React.FC = () => {
  return (
    <PageShell title="Payment Center" subtitle="ACH/EFT and FedWire origination.">
      <RailPage />
    </PageShell>
  );
};

const LoanManager: React.FC = () => {
  return (
    <PageShell title="Loan Manager" subtitle="Credit Defense and Collateral Management.">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 space-y-4">
          <h3 className="font-bold text-slate-700 flex items-center gap-2"><Shield size={18} /> Credit Defense</h3>
          <p className="text-sm text-slate-500">Automated credit instrument validation and asset acquisition.</p>
        </Card>
        <Card className="p-6 space-y-4">
          <h3 className="font-bold text-slate-700 flex items-center gap-2"><Building2 size={18} /> Collateral Pools</h3>
          <p className="text-sm text-slate-500">Manage real estate assets and security paper collateral.</p>
        </Card>
      </div>
      <Card className="p-6 space-y-4">
        <h3 className="font-bold text-slate-700 flex items-center gap-2"><Lock size={18} /> Escrow Management</h3>
        <p className="text-sm text-slate-500">Multi-party settlement coordination and fiduciary fee tracking.</p>
      </Card>
    </PageShell>
  );
};

// --- Main Pages ---

const DashboardPage: React.FC = () => {
  const { push } = useToast();
  const [cash, setCash] = useState<any>(null);
  const [transit, setTransit] = useState<any>(null);
  const [ap, setAp] = useState<any>(null);
  const [cashSeries, setCashSeries] = useState<any[]>([]);
  const [transitSeries, setTransitSeries] = useState<any[]>([]);
  const [statementFile, setStatementFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    try {
      const results = await Promise.allSettled([
        apiGet('/ledger/balance/cash'),
        apiGet('/ledger/balance/transit'),
        apiGet('/ledger/balance/ap'),
        apiGet('/ledger/series/cash'),
        apiGet('/ledger/series/transit')
      ]);

      const [c, t, a, cs, ts] = results;

      if (c.status === 'fulfilled') setCash(c.value);
      if (t.status === 'fulfilled') setTransit(t.value);
      if (a.status === 'fulfilled') setAp(a.value);
      if (cs.status === 'fulfilled') setCashSeries(cs.value as any[]);
      if (ts.status === 'fulfilled') setTransitSeries(ts.value as any[]);

      const failures = results.filter(r => r.status === 'rejected');
      if (failures.length > 0) {
        push('error', 'Dashboard partially failed to load live data.');
      }
    } catch (e: any) {
      push('error', 'Failed to load dashboard');
    }
  }, [push]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStatementUpload = async () => {
    if (!statementFile) return;
    try {
      const text = await statementFile.text();
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const idx = (name: string) => headers.findIndex(h => h.includes(name));

      const items = lines.slice(1).map(line => {
        const cols = line.split(',');
        return {
          bank_txn_id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          posted_at: cols[idx('date')] || new Date().toISOString().split('T')[0],
          amount: Number(cols[idx('amount')] || 0),
          memo: cols[idx('memo')] || 'Imported Transaction',
          counterparty: cols[idx('counterparty')] || 'Unknown'
        };
      });

      await apiPost('/rail/bank/import/batch', { items });
      push('success', `Successfully imported ${items.length} transactions.`);
      load();
      setStatementFile(null);
    } catch (e) {
      push('error', 'Failed to process statement file.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Personal Overview</h1>
          <p className="text-sm text-slate-500 mt-1">Your financial health at a glance.</p>
        </div>
        <PlaidLinkButton onSuccess={load} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[{ label: 'Net Liquidity', value: cash }, { label: 'In Flight', value: transit }, { label: 'Credit Debt', value: ap }].map(item => (
          <Card key={item.label} className="p-5">
            <div className="text-xs uppercase text-slate-400 font-semibold">{item.label}</div>
            <div className="text-2xl font-semibold text-slate-900 mt-2">
              ${(typeof item.value === 'number' && !isNaN(item.value)) ? item.value.toLocaleString() : '0'}
            </div>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Liquidity Trend" series={cashSeries} />
        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-4">Quick Import</h3>
          <div className="space-y-3">
            <div className="border border-dashed border-slate-300 rounded-lg p-6 bg-slate-50 text-center">
              <Upload className="mx-auto h-8 w-8 text-slate-400 mb-2" />
              <p className="text-xs text-slate-500 mb-4">Upload CSV bank statements</p>
              <input
                type="file"
                accept=".csv"
                onChange={e => setStatementFile(e.target.files?.[0] || null)}
                className="text-xs text-slate-500 w-full mb-3"
              />
              <button
                onClick={handleStatementUpload}
                disabled={!statementFile}
                className="w-full py-2 bg-indigo-600 text-white text-xs font-bold rounded hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                Process Statement
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

const LedgerAccountsPage: React.FC<{ canAdmin: boolean; ledgerTabs: React.ReactNode }> = ({ canAdmin, ledgerTabs }) => {
  const { push } = useToast();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [form, setForm] = useState({ code: '', name: '', type: 'Asset' });

  const load = async () => {
    const data = await apiGet<any[]>('/ledger/accounts');
    setAccounts(data || []);
  };

  useEffect(() => {
    load().catch(() => push('error', 'Failed to load accounts.'));
  }, [push]);

  const handleInit = async () => {
    try {
      await apiPost('/ledger/accounts/init-defaults');
      push('success', 'Default COA initialized.');
      await load();
    } catch (err: any) {
      push('error', err?.payload?.detail || 'COA init failed.');
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await apiPost('/ledger/accounts', form);
      push('success', 'Account created.');
      setForm({ code: '', name: '', type: 'Asset' });
      await load();
    } catch (err: any) {
      push('error', err?.payload?.detail || 'Failed to create account.');
    }
  };

  return (
    <PageShell title="Ledger / Accounts" subtitle="Chart of Accounts and initialization controls.">
      {ledgerTabs}
      <div className="flex items-center gap-3">
        <Button onClick={handleInit} disabled={!canAdmin}>
          Initialize Default COA
        </Button>
        {!canAdmin && <span className="text-xs text-slate-400">Admin role required.</span>}
      </div>
      <Card className="p-6 space-y-4">
        <h3 className="text-sm font-semibold text-slate-700">Chart of Accounts</h3>
        <Table columns={['code', 'name', 'type']} rows={accounts} />
      </Card>
      <Card className="p-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Add Account</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Code</Label>
            <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
              {['Asset', 'Liability', 'Equity', 'Income', 'Expense'].map(t => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>
          <div className="md:col-span-3">
            <Button type="submit">Create</Button>
          </div>
        </form>
      </Card>
    </PageShell>
  );
};

const LedgerJournalPage: React.FC<{ ledgerTabs: React.ReactNode }> = ({ ledgerTabs }) => {
  const { push } = useToast();
  const [entries, setEntries] = useState<any[]>([]);
  const [filters, setFilters] = useState({ search: '', source_module: '', external_ref: '', date_from: '', date_to: '' });
  const [form, setForm] = useState({
    memo: '',
    source_module: 'ledger',
    external_ref: '',
    entity_id: '',
    entry_date: '',
    lines: [{ account_code: '', debit: 0, credit: 0, description: '' }]
  });

  const load = async () => {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.source_module) params.set('source_module', filters.source_module);
    if (filters.external_ref) params.set('external_ref', filters.external_ref);
    if (filters.date_from) params.set('date_from', filters.date_from);
    if (filters.date_to) params.set('date_to', filters.date_to);
    const data = await apiGet<any[]>(`/ledger/journal?${params.toString()}`);
    setEntries(data || []);
  };

  useEffect(() => {
    load().catch(() => push('error', 'Failed to load journal entries.'));
  }, [push]);

  const updateLine = (index: number, key: string, value: any) => {
    setForm(prev => {
      const lines = [...prev.lines];
      lines[index] = { ...lines[index], [key]: value };
      return { ...prev, lines };
    });
  };

  const addLine = () => setForm(prev => ({ ...prev, lines: [...prev.lines, { account_code: '', debit: 0, credit: 0, description: '' }] }));
  const removeLine = (index: number) => setForm(prev => ({ ...prev, lines: prev.lines.filter((_, i) => i !== index) }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await apiPost('/ledger/journal', {
        ...form,
        entity_id: form.entity_id ? Number(form.entity_id) : undefined
      });
      push('success', 'Journal entry posted.');
      setForm({ memo: '', source_module: 'ledger', external_ref: '', entity_id: '', entry_date: '', lines: [{ account_code: '', debit: 0, credit: 0, description: '' }] });
      await load();
    } catch (err: any) {
      push('error', err?.payload?.detail || 'Failed to post journal entry.');
    }
  };

  return (
    <PageShell title="Ledger / Journal" subtitle="Post obligations and journal entries.">
      {ledgerTabs}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <Input placeholder="Search memo/ref" value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} />
          <Input placeholder="Source module" value={filters.source_module} onChange={e => setFilters({ ...filters, source_module: e.target.value })} />
          <Input placeholder="External ref" value={filters.external_ref} onChange={e => setFilters({ ...filters, external_ref: e.target.value })} />
          <Input type="date" value={filters.date_from} onChange={e => setFilters({ ...filters, date_from: e.target.value })} />
          <Input type="date" value={filters.date_to} onChange={e => setFilters({ ...filters, date_to: e.target.value })} />
        </div>
        <div className="mt-3">
          <Button type="button" variant="ghost" onClick={() => load()}>
            Apply Filters
          </Button>
        </div>
      </Card>
      <Card className="p-6 space-y-4">
        <h3 className="text-sm font-semibold text-slate-700">Journal Entries</h3>
        <Table columns={['id', 'entry_date', 'memo', 'source_module', 'external_ref', 'entity_id']} rows={entries} />
      </Card>
      <Card className="p-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Post Journal Entry</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Memo</Label>
              <Input value={form.memo} onChange={e => setForm({ ...form, memo: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Source Module</Label>
              <Input value={form.source_module} onChange={e => setForm({ ...form, source_module: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>External Ref</Label>
              <Input value={form.external_ref} onChange={e => setForm({ ...form, external_ref: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Entity ID</Label>
              <Input value={form.entity_id} onChange={e => setForm({ ...form, entity_id: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Entry Date</Label>
              <Input type="date" value={form.entry_date} onChange={e => setForm({ ...form, entry_date: e.target.value })} />
            </div>
          </div>
          <div className="space-y-3">
            <Label>Lines</Label>
            {form.lines.map((line, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                <Input placeholder="Account Code" value={line.account_code} onChange={e => updateLine(idx, 'account_code', e.target.value)} required />
                <Input type="number" placeholder="Debit" value={line.debit} onChange={e => updateLine(idx, 'debit', Number(e.target.value))} />
                <Input type="number" placeholder="Credit" value={line.credit} onChange={e => updateLine(idx, 'credit', Number(e.target.value))} />
                <Input placeholder="Description" value={line.description} onChange={e => updateLine(idx, 'description', e.target.value)} />
                <Button type="button" variant="ghost" onClick={() => removeLine(idx)}>
                  Remove
                </Button>
              </div>
            ))}
            <Button type="button" variant="ghost" onClick={addLine}>
              Add Line
            </Button>
          </div>
          <Button type="submit">Post Entry</Button>
        </form>
      </Card>
    </PageShell>
  );
};

const LedgerReportsPage: React.FC<{ ledgerTabs: React.ReactNode }> = ({ ledgerTabs }) => {
  const { push } = useToast();
  const [entityId, setEntityId] = useState('');
  const [report, setReport] = useState<any>(null);
  const [statementFile, setStatementFile] = useState<File | null>(null);
  const [ledgerFile, setLedgerFile] = useState<File | null>(null);

  const loadReport = async (type: 'trial-balance' | 'balance-sheet' | 'pl') => {
    try {
      const data = await apiGet(`/ledger/reports/${type}?entity_id=${entityId}`);
      setReport(data);
    } catch (err: any) {
      push('error', err?.payload?.detail || 'Failed to load report.');
    }
  };

  const parseCsv = (text: string) => {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (!lines.length) return { headers: [], rows: [] };
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const rows = lines.slice(1).map(line => {
      const cols = line.split(',');
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = (cols[idx] || '').trim();
      });
      return row;
    });
    return { headers, rows };
  };

  const importStatements = async () => {
    if (!statementFile) return;
    try {
      const text = await statementFile.text();
      const { rows } = parseCsv(text);
      const items = rows.map((row, idx) => ({
        bank_txn_id: row.bank_txn_id || row.id || `stmt-${Date.now()}-${idx}`,
        posted_at: row.posted_at || row.date || row.posted || '',
        amount: Number(row.amount || 0),
        counterparty: row.counterparty || row.name || '',
        memo: row.memo || row.description || ''
      }));
      await apiPost('/rail/bank/import/batch', { items });
      push('success', `Imported ${items.length} bank transactions.`);
      setStatementFile(null);
    } catch (err: any) {
      push('error', err?.payload?.detail || 'Statement import failed.');
    }
  };

  const importLedger = async () => {
    if (!ledgerFile) return;
    try {
      const text = await ledgerFile.text();
      const { rows } = parseCsv(text);
      const grouped: Record<string, any[]> = {};
      rows.forEach((row, idx) => {
        const key = row.entry_id || row.entry || `row-${idx}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(row);
      });
      const entries = Object.entries(grouped).map(([key, lines]) => {
        const first = lines[0] || {};
        return {
          memo: first.memo || `Ledger import ${key}`,
          source_module: 'ledger',
          external_ref: first.external_ref || key,
          entity_id: first.entity_id ? Number(first.entity_id) : (entityId ? Number(entityId) : undefined),
          entry_date: first.entry_date || first.date || new Date().toISOString().split('T')[0],
          lines: lines.map((line) => ({
            account_code: line.account_code || line.account || '',
            debit: Number(line.debit || 0),
            credit: Number(line.credit || 0),
            description: line.description || line.memo || ''
          }))
        };
      });
      for (const entry of entries) {
        await apiPost('/ledger/journal', entry);
      }
      push('success', `Imported ${entries.length} ledger entries.`);
      setLedgerFile(null);
    } catch (err: any) {
      push('error', err?.payload?.detail || 'Ledger import failed.');
    }
  };

  return (
    <PageShell title="Ledger / Reports" subtitle="Trial balance, balance sheet, and P&L.">
      {ledgerTabs}
      <Card className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="space-y-2">
            <Label>Entity ID</Label>
            <Input value={entityId} onChange={e => setEntityId(e.target.value)} />
          </div>
          <Button type="button" onClick={() => loadReport('trial-balance')}>Trial Balance</Button>
          <Button type="button" onClick={() => loadReport('balance-sheet')}>Balance Sheet</Button>
          <Button type="button" onClick={() => loadReport('pl')}>Profit & Loss</Button>
        </div>
        <pre className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-600 overflow-auto">{report ? JSON.stringify(report, null, 2) : 'Run a report to view output.'}</pre>
      </Card>

      <Card className="p-6 space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">Upload Statements</h3>
        <div className="text-xs text-slate-500">CSV columns supported: date/posted_at, amount, memo/description, counterparty/name, bank_txn_id.</div>
        <input type="file" accept=".csv" onChange={e => setStatementFile(e.target.files?.[0] || null)} className="text-xs text-slate-500" />
        <Button type="button" variant="ghost" onClick={importStatements} disabled={!statementFile}>Import Statements</Button>
      </Card>

      <Card className="p-6 space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">Upload Ledger CSV</h3>
        <div className="text-xs text-slate-500">CSV columns supported: entry_id, entry_date/date, memo, account_code/account, debit, credit, description, entity_id.</div>
        <input type="file" accept=".csv" onChange={e => setLedgerFile(e.target.files?.[0] || null)} className="text-xs text-slate-500" />
        <Button type="button" variant="ghost" onClick={importLedger} disabled={!ledgerFile}>Import Ledger</Button>
      </Card>
    </PageShell>
  );
};

const RailPayeesPage: React.FC<{ railTabs: React.ReactNode }> = ({ railTabs }) => {
  const { push } = useToast();
  const [payees, setPayees] = useState<any[]>([]);
  const [form, setForm] = useState({
    legal_name: '',
    payout_method: 'ACH',
    token_ref: '',
    last4: '',
    bank_name: '',
    status: 'active',
    entity_id: '',
    memo: ''
  });

  const load = async () => {
    const data = await apiGet<any[]>('/rail/payees');
    setPayees(data || []);
  };

  useEffect(() => {
    load().catch(() => push('error', 'Failed to load payees.'));
  }, [push]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await apiPost('/rail/payees', {
        ...form,
        entity_id: form.entity_id ? Number(form.entity_id) : undefined
      });
      push('success', 'Payee created.');
      setForm({ legal_name: '', payout_method: 'ACH', token_ref: '', last4: '', bank_name: '', status: 'active', entity_id: '', memo: '' });
      await load();
    } catch (err: any) {
      push('error', err?.payload?.detail || 'Failed to create payee.');
    }
  };

  return (
    <PageShell title="Rail / Payees" subtitle="Tokenized payout recipients.">
      {railTabs}
      <Card className="p-6 space-y-4">
        <h3 className="text-sm font-semibold text-slate-700">Payees</h3>
        <Table columns={['id', 'legal_name', 'payout_method', 'token_ref', 'last4', 'bank_name', 'status', 'entity_id']} rows={payees} />
      </Card>
      <Card className="p-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Add Payee (Tokenized)</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Legal Name</Label>
            <Input value={form.legal_name} onChange={e => setForm({ ...form, legal_name: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label>Payout Method</Label>
            <Select value={form.payout_method} onChange={e => setForm({ ...form, payout_method: e.target.value })}>
              {['ACH', 'WIRE', 'CHECK'].map(t => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Token Ref</Label>
            <Input value={form.token_ref} onChange={e => setForm({ ...form, token_ref: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label>Last4</Label>
            <Input value={form.last4} onChange={e => setForm({ ...form, last4: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Bank Name</Label>
            <Input value={form.bank_name} onChange={e => setForm({ ...form, bank_name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Entity ID</Label>
            <Input value={form.entity_id} onChange={e => setForm({ ...form, entity_id: e.target.value })} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Memo</Label>
            <Input value={form.memo} onChange={e => setForm({ ...form, memo: e.target.value })} />
          </div>
          <div className="md:col-span-3">
            <Button type="submit">Create Payee</Button>
          </div>
        </form>
      </Card>
    </PageShell>
  );
};

const RailPaymentOrdersPage: React.FC<{ railTabs: React.ReactNode }> = ({ railTabs }) => {
  const { push } = useToast();
  const stepUp = useStepUpAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [orderFilters, setOrderFilters] = useState({ status: '', payee_id: '', date_from: '', date_to: '' });
  const [submitProvider, setSubmitProvider] = useState('mock');
  const [providers, setProviders] = useState<any[]>([]);
  const [billPay, setBillPay] = useState({
    legal_name: '',
    payout_method: 'ACH',
    token_ref: '',
    last4: '',
    bank_name: '',
    amount: '',
    memo: '',
    entity_id: '',
    opening_balance: '',
    add_opening_balance: false,
    create_payment_order: true,
    kyc_full_name: '',
    kyc_tax_id_last4: '',
    kyc_address: '',
    kyc_email: '',
    kyc_phone: '',
    doc_types: [] as string[],
    doc_notes: '',
    auth_terms_accepted: false,
    privacy_notice_accepted: false
  });
  const [billPayFiles, setBillPayFiles] = useState<File[]>([]);

  const load = async () => {
    const params = new URLSearchParams();
    if (orderFilters.status) params.set('status', orderFilters.status);
    if (orderFilters.payee_id) params.set('payee_id', orderFilters.payee_id);
    if (orderFilters.date_from) params.set('date_from', orderFilters.date_from);
    if (orderFilters.date_to) params.set('date_to', orderFilters.date_to);
    const data = await apiGet<any[]>(`/rail/payment-orders?${params.toString()}`);
    setOrders(data || []);
  };

  useEffect(() => {
    load().catch(() => push('error', 'Failed to load payment orders.'));
    apiGet<any[]>('/rail/providers')
      .then(setProviders)
      .catch(() => setProviders([]));
  }, [push]);

  const action = async (label: string, path: string) => {
    try {
      await apiPost(path);
      push('success', `${label} completed.`);
      await load();
    } catch (err: any) {
      push('error', err?.payload?.detail || `${label} failed.`);
    }
  };

  return (
    <PageShell title="Rail / Payment Orders" subtitle="Approve, submit, and reconcile settlements.">
      {railTabs}
      <Card className="p-6 space-y-6">
        <div>
          <h3 className="text-base font-semibold text-slate-800">Online Bill Pay (Create Obligation)</h3>
          <p className="text-xs text-slate-500 mt-1">Add payee, capture KYC + documents, and post the A/P obligation in one flow.</p>
        </div>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            try {
              if (!billPay.auth_terms_accepted || !billPay.privacy_notice_accepted) {
                push('error', 'Please accept ACH authorization and privacy notice.');
                return;
              }
              const ok = await stepUp.verify();
              if (!ok) return;
              const docs = billPayFiles.map(file => ({ name: file.name, size: file.size, type: file.type }));
              const payeePayload = {
                legal_name: billPay.legal_name,
                payout_method: billPay.payout_method,
                token_ref: billPay.token_ref,
                last4: billPay.last4,
                bank_name: billPay.bank_name,
                entity_id: billPay.entity_id ? Number(billPay.entity_id) : undefined,
                memo: billPay.memo,
                auth_terms: billPay.auth_terms_accepted ? 'accepted' : 'declined',
                privacy_notice: billPay.privacy_notice_accepted ? 'acknowledged' : 'declined',
                communications: billPay.memo ? [{ text: billPay.memo, channel: 'ui', created_at: new Date().toISOString() }] : [],
                documents: docs.map(d => ({ ...d, category: billPay.doc_types.join(','), notes: billPay.doc_notes }))
              };
              const payee = await apiPost<any>('/rail/payees', payeePayload);

              const obligationPayload = {
                memo: billPay.memo || `AP Bill - ${billPay.legal_name}`,
                source_module: 'rail',
                external_ref: `AP_BILL_${Date.now()}`,
                entity_id: billPay.entity_id ? Number(billPay.entity_id) : undefined,
                entry_date: new Date().toISOString().split('T')[0],
                lines: [
                  { account_code: '5000', debit: Number(billPay.amount), credit: 0, description: 'Expense' },
                  { account_code: '2000', debit: 0, credit: Number(billPay.amount), description: 'Accounts Payable' }
                ]
              };
              const obligation = await apiPost<any>('/ledger/journal', obligationPayload);

              if (billPay.add_opening_balance && billPay.opening_balance) {
                await apiPost('/ledger/journal', {
                  memo: `Opening balance for ${billPay.legal_name}`,
                  source_module: 'ledger',
                  external_ref: `OPEN_BAL_${Date.now()}`,
                  entity_id: billPay.entity_id ? Number(billPay.entity_id) : undefined,
                  entry_date: new Date().toISOString().split('T')[0],
                  lines: [
                    { account_code: '2000', debit: Number(billPay.opening_balance), credit: 0, description: 'Opening A/P' },
                    { account_code: '1000', debit: 0, credit: Number(billPay.opening_balance), description: 'Cash/Bank' }
                  ]
                });
              }

              if (billPay.create_payment_order) {
                await apiPost('/rail/payment-orders', {
                  source_type: 'AP_BILL',
                  source_id: obligation?.id || obligation?.entry_id || obligation?.external_ref,
                  payee_id: payee?.id,
                  payee_name: billPay.legal_name,
                  amount: Number(billPay.amount),
                  direction: 'OUTBOUND',
                  rail_type: 'ACH_CREDIT',
                  sec_code: 'CCD',
                  memo: billPay.memo,
                  idempotency_key: `billpay-${Date.now()}`,
                  use_clearing: true
                });
              }

              push('success', 'Bill pay created: payee + obligation + payment order.');
              setBillPay({
                legal_name: '',
                payout_method: 'ACH',
                token_ref: '',
                last4: '',
                bank_name: '',
                amount: '',
                memo: '',
                entity_id: '',
                opening_balance: '',
                add_opening_balance: false,
                create_payment_order: true,
                kyc_full_name: '',
                kyc_tax_id_last4: '',
                kyc_address: '',
                kyc_email: '',
                kyc_phone: '',
                doc_types: [],
                doc_notes: '',
                auth_terms_accepted: false,
                privacy_notice_accepted: false
              });
              setBillPayFiles([]);
              await load();
            } catch (err: any) {
              push('error', err?.payload?.detail || 'Bill pay flow failed.');
            }
          }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          <div className="space-y-4 lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payee Legal Name</Label>
                <Input value={billPay.legal_name} onChange={e => setBillPay({ ...billPay, legal_name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Payout Method</Label>
                <Select value={billPay.payout_method} onChange={e => setBillPay({ ...billPay, payout_method: e.target.value })}>
                  {['ACH', 'EFT', 'WIRE'].map(t => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Token Ref</Label>
                <Input value={billPay.token_ref} onChange={e => setBillPay({ ...billPay, token_ref: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Bank Name</Label>
                <Input value={billPay.bank_name} onChange={e => setBillPay({ ...billPay, bank_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Account Last4</Label>
                <Input value={billPay.last4} onChange={e => setBillPay({ ...billPay, last4: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Entity ID</Label>
                <Input value={billPay.entity_id} onChange={e => setBillPay({ ...billPay, entity_id: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input type="number" value={billPay.amount} onChange={e => setBillPay({ ...billPay, amount: e.target.value })} required />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Memo / Communications</Label>
                <Input value={billPay.memo} onChange={e => setBillPay({ ...billPay, memo: e.target.value })} />
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4 space-y-3">
              <div className="text-xs font-semibold uppercase text-slate-500">KYC Data (Payee)</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input placeholder="Full Name" value={billPay.kyc_full_name} onChange={e => setBillPay({ ...billPay, kyc_full_name: e.target.value })} />
                <Input placeholder="Tax ID Last4" value={billPay.kyc_tax_id_last4} onChange={e => setBillPay({ ...billPay, kyc_tax_id_last4: e.target.value })} />
                <Input placeholder="Address" value={billPay.kyc_address} onChange={e => setBillPay({ ...billPay, kyc_address: e.target.value })} />
                <Input placeholder="Email" value={billPay.kyc_email} onChange={e => setBillPay({ ...billPay, kyc_email: e.target.value })} />
                <Input placeholder="Phone" value={billPay.kyc_phone} onChange={e => setBillPay({ ...billPay, kyc_phone: e.target.value })} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="border border-slate-200 rounded-lg p-4 space-y-3">
              <div className="text-xs font-semibold uppercase text-slate-500">Documents</div>
              <div className="flex flex-wrap gap-2">
                {['Contract', 'Bill', 'Agreement', 'Application'].map(label => (
                  <button
                    key={label}
                    type="button"
                    onClick={() =>
                      setBillPay(prev => ({
                        ...prev,
                        doc_types: prev.doc_types.includes(label) ? prev.doc_types.filter(d => d !== label) : [...prev.doc_types, label]
                      }))
                    }
                    className={`px-3 py-1 rounded-full text-xs font-semibold border ${billPay.doc_types.includes(label) ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-500'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <input
                type="file"
                multiple
                onChange={e => setBillPayFiles(Array.from(e.target.files || []))}
                className="text-xs text-slate-500"
              />
              <Input placeholder="Document notes" value={billPay.doc_notes} onChange={e => setBillPay({ ...billPay, doc_notes: e.target.value })} />
            </div>

            <div className="border border-slate-200 rounded-lg p-4 space-y-3">
              <div className="text-xs font-semibold uppercase text-slate-500">Opening Balance</div>
              <Select
                value={billPay.add_opening_balance ? 'true' : 'false'}
                onChange={e => setBillPay({ ...billPay, add_opening_balance: e.target.value === 'true' })}
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </Select>
              {billPay.add_opening_balance && (
                <Input
                  type="number"
                  placeholder="Opening balance amount"
                  value={billPay.opening_balance}
                  onChange={e => setBillPay({ ...billPay, opening_balance: e.target.value })}
                />
              )}
            </div>

            <div className="border border-slate-200 rounded-lg p-4 space-y-3">
              <div className="text-xs font-semibold uppercase text-slate-500">Payment Order</div>
              <Select
                value={billPay.create_payment_order ? 'true' : 'false'}
                onChange={e => setBillPay({ ...billPay, create_payment_order: e.target.value === 'true' })}
              >
                <option value="true">Create payment order</option>
                <option value="false">Skip (obligation only)</option>
              </Select>
            </div>

            <div className="border border-slate-200 rounded-lg p-4 space-y-2">
              <div className="text-xs font-semibold uppercase text-slate-500">Agreements</div>
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={billPay.auth_terms_accepted}
                  onChange={e => setBillPay({ ...billPay, auth_terms_accepted: e.target.checked })}
                />
                I authorize ACH/EFT debit/credit per the terms.
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={billPay.privacy_notice_accepted}
                  onChange={e => setBillPay({ ...billPay, privacy_notice_accepted: e.target.checked })}
                />
                I acknowledge the privacy notice and data retention policy.
              </label>
            </div>

            <Button type="submit">Create Obligation + Payee</Button>
          </div>
        </form>
      </Card>

      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Payment Orders</h3>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => load()}>
              Refresh
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label>Submit Provider</Label>
            <Select value={submitProvider} onChange={e => setSubmitProvider(e.target.value)}>
              {(providers.length ? providers : [{ id: 'mock', label: 'Mock Provider' }]).map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.label || p.id}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input placeholder="Status" value={orderFilters.status} onChange={e => setOrderFilters({ ...orderFilters, status: e.target.value })} />
          <Input placeholder="Payee ID" value={orderFilters.payee_id} onChange={e => setOrderFilters({ ...orderFilters, payee_id: e.target.value })} />
          <Input type="date" value={orderFilters.date_from} onChange={e => setOrderFilters({ ...orderFilters, date_from: e.target.value })} />
          <Input type="date" value={orderFilters.date_to} onChange={e => setOrderFilters({ ...orderFilters, date_to: e.target.value })} />
        </div>
        <div>
          <Button type="button" variant="ghost" onClick={() => load()}>
            Apply Filters
          </Button>
        </div>
        <Table
          columns={[
            'id',
            'status',
            'source_type',
            'source_id',
            'payee_id',
            'payee_name',
            'amount',
            'rail_type',
            'sec_code',
            'use_clearing',
            'approved_at',
            'submitted_at',
            'settled_at',
            'settlement_entry_id'
          ]}
          rows={orders}
          renderCell={(row, col) => {
            if (col === 'status') {
              const paid = row.settlement_entry_id && row.bank_txn_matched;
              return (
                <span className={`px-2 py-1 text-xs rounded-full ${paid ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                  {paid ? 'Paid' : row.status}
                </span>
              );
            }
            return row[col];
          }}
        />
        <div className="flex flex-wrap gap-2">
          {orders.map(order => (
            <div key={order.id} className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">{order.id}</span>
              <Button
                type="button"
                variant="ghost"
                disabled={order.status !== 'created'}
                onClick={() => action('Approve', `/rail/payment-orders/${order.id}/approve`)}
              >
                Approve
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={order.status !== 'approved' || order.rail_type === 'INTERNAL_LEDGER_TRANSFER'}
                onClick={async () => { const ok = await stepUp.verify(); if (!ok) return; action('Submit', `/rail/payment-orders/${order.id}/submit?provider=${submitProvider}`); }}
              >
                Submit
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={order.status === 'created'}
                onClick={() => action('Reconcile', `/rail/reconcile/${order.id}`)}
              >
                Reconcile
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </PageShell>
  );
};

const RailBankPage: React.FC<{ railTabs: React.ReactNode }> = ({ railTabs }) => {
  const { push } = useToast();
  const [txns, setTxns] = useState<any[]>([]);
  const [matchedFilter, setMatchedFilter] = useState('');
  const [plaidStatus, setPlaidStatus] = useState('not_connected');
  const [wellsFargoStatus, setWellsFargoStatus] = useState('not_connected');
  const [providers, setProviders] = useState<any[]>([]);
  const [bankProvider, setBankProvider] = useState('wellsfargo');
  const [providerStatus, setProviderStatus] = useState('not_connected');
  const [statementFile, setStatementFile] = useState<File | null>(null);
  const [manualBank, setManualBank] = useState({
    bank_name: '',
    account_holder: '',
    routing_number: '',
    account_number_last4: '',
    account_type: 'checking',
    authorization: false
  });
  const [form, setForm] = useState({
    bank_txn_id: '',
    posted_at: '',
    amount: '',
    counterparty: '',
    memo: ''
  });

  const load = async () => {
    const params = new URLSearchParams();
    if (matchedFilter) params.set('matched', matchedFilter);
    const data = await apiGet<any[]>(`/rail/bank/txns?${params.toString()}`);
    setTxns(data || []);
  };

  useEffect(() => {
    load().catch(() => push('error', 'Failed to load bank transactions.'));
    apiGet<any[]>('/rail/providers')
      .then((data) => {
        setProviders(data || []);
        if (data?.length) setBankProvider(data[0].id);
      })
      .catch(() => setProviders([]));
  }, [push]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await apiPost('/rail/bank/import', { ...form, amount: Number(form.amount) });
      push('success', 'Bank transaction imported.');
      setForm({ bank_txn_id: '', posted_at: '', amount: '', counterparty: '', memo: '' });
      await load();
    } catch (err: any) {
      push('error', err?.payload?.detail || 'Failed to import bank transaction.');
    }
  };

  return (
    <PageShell title="Rail / Bank Mirror" subtitle="Import bank postings and match to settlements.">
      {railTabs}
      <Card className="p-6 space-y-4">
        <h3 className="text-sm font-semibold text-slate-700">Add Bank</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div className="space-y-2">
            <Label>Provider</Label>
            <Select value={bankProvider} onChange={e => setBankProvider(e.target.value)}>
              {(providers.length ? providers : [{ id: 'wellsfargo', label: 'Wells Fargo Gateway' }]).map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.label || p.id}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={async () => {
                try {
                  const result = await apiPost<any>(`/rail/providers/${bankProvider}/connect`);
                  setProviderStatus(result?.status || 'connected');
                  push('success', `Connected ${bankProvider} (${result?.status}).`);
                } catch (err: any) {
                  push('error', err?.payload?.detail || err?.message || 'Provider connect failed.');
                }
              }}
            >
              Connect Provider
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={async () => {
                try {
                  await apiPost(`/rail/providers/${bankProvider}/refresh`);
                  push('success', 'Provider refresh initiated (stub).');
                } catch (err: any) {
                  push('error', err?.payload?.detail || err?.message || 'Provider refresh failed.');
                }
              }}
            >
              Refresh Feed
            </Button>
          </div>
          <div className="text-xs text-slate-500">Status: {providerStatus}</div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            onClick={async () => {
              try {
                const result = await apiPost<any>('/rail/bank/wellsfargo/connect');
                setWellsFargoStatus(result?.status || 'connected');
                push('success', `Wells Fargo Gateway ${result?.status === 'connected' ? 'connected' : 'registered'} (stub).`);
              } catch (err: any) {
                push('error', err?.payload?.detail || err?.message || 'Wells Fargo connect failed.');
              }
            }}
          >
            Connect Wells Fargo Gateway
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={async () => {
              try {
                await apiPost('/rail/bank/wellsfargo/refresh');
                push('success', 'Wells Fargo refresh initiated (stub).');
              } catch (err: any) {
                push('error', err?.payload?.detail || err?.message || 'Wells Fargo refresh failed.');
              }
            }}
          >
            Refresh Wells Fargo Feed
          </Button>
          <span className="text-xs text-slate-500">Status: {wellsFargoStatus}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            onClick={async () => {
              try {
                const link = await apiPost<any>('/rail/bank/plaid/link-token');
                await apiPost('/rail/bank/plaid/exchange', { connection_id: link.connection_id, public_token: 'mock' });
                setPlaidStatus('connected');
                push('success', 'Plaid connection created (mock).');
              } catch (err: any) {
                push('error', err?.payload?.detail || 'Plaid connect failed.');
              }
            }}
          >
            Connect via Plaid
          </Button>
          <span className="text-xs text-slate-500">Status: {plaidStatus}</span>
        </div>
        <div className="border-t border-slate-200 pt-4 space-y-2">
          <div className="text-xs text-slate-500">Upload statements (CSV/OFX/QFX). CSV columns expected: date, amount, memo, counterparty.</div>
          <input
            type="file"
            accept=".csv"
            onChange={e => setStatementFile(e.target.files?.[0] || null)}
            className="text-xs text-slate-500"
          />
          <Button
            type="button"
            variant="ghost"
            onClick={async () => {
              if (!statementFile) return;
              const text = await statementFile.text();
              const lines = text.split(/\r?\n/).filter(l => l.trim());
              const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
              const idx = (name: string) => headers.findIndex(h => h.includes(name));
              const dateIdx = idx('date');
              const amountIdx = idx('amount');
              const memoIdx = idx('memo');
              const counterIdx = idx('counterparty');
              const items = lines.slice(1).map(line => {
                const cols = line.split(',');
                return {
                  bank_txn_id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                  posted_at: cols[dateIdx] || '',
                  amount: Number(cols[amountIdx] || 0),
                  memo: cols[memoIdx] || '',
                  counterparty: cols[counterIdx] || ''
                };
              });
              await apiPost('/rail/bank/import/batch', { items });
              push('success', `Imported ${items.length} transactions.`);
              await load();
            }}
          >
            Upload Statement
          </Button>
        </div>
        <div className="border-t border-slate-200 pt-4 space-y-3">
          <div className="text-xs text-slate-500">Manual connection (for ACH/EFT). Requires authorization + later verification.</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input placeholder="Bank name" value={manualBank.bank_name} onChange={e => setManualBank({ ...manualBank, bank_name: e.target.value })} />
            <Input placeholder="Account holder" value={manualBank.account_holder} onChange={e => setManualBank({ ...manualBank, account_holder: e.target.value })} />
            <Input placeholder="Routing number" value={manualBank.routing_number} onChange={e => setManualBank({ ...manualBank, routing_number: e.target.value })} />
            <Input placeholder="Account last 4" value={manualBank.account_number_last4} onChange={e => setManualBank({ ...manualBank, account_number_last4: e.target.value })} />
            <Select value={manualBank.account_type} onChange={e => setManualBank({ ...manualBank, account_type: e.target.value })}>
              <option value="checking">checking</option>
              <option value="savings">savings</option>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={manualBank.authorization}
              onChange={e => setManualBank({ ...manualBank, authorization: e.target.checked })}
            />
            I authorize ACH/EFT debit/credit for this account.
          </label>
          <Button
            type="button"
            onClick={async () => {
              if (!manualBank.authorization) {
                push('error', 'Authorization is required.');
                return;
              }
              try {
                await apiPost('/rail/bank/manual', manualBank);
                push('success', 'Manual bank connection submitted (pending verification).');
                setManualBank({
                  bank_name: '',
                  account_holder: '',
                  routing_number: '',
                  account_number_last4: '',
                  account_type: 'checking',
                  authorization: false
                });
              } catch (err: any) {
                push('error', err?.payload?.detail || 'Manual bank connect failed.');
              }
            }}
          >
            Add Manual Bank
          </Button>
        </div>
      </Card>
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <Select value={matchedFilter} onChange={e => setMatchedFilter(e.target.value)}>
            <option value="">All</option>
            <option value="true">Matched</option>
            <option value="false">Unmatched</option>
          </Select>
          <Button type="button" variant="ghost" onClick={() => load()}>
            Apply Filters
          </Button>
        </div>
      </Card>
      <Card className="p-6 space-y-4">
        <h3 className="text-sm font-semibold text-slate-700">Bank Transactions</h3>
        <Table columns={['id', 'posted_at', 'amount', 'counterparty', 'memo', 'matched', 'matched_entry_id']} rows={txns} />
      </Card>
      <Card className="p-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Import Bank Transaction (Test)</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Bank Txn ID</Label>
            <Input value={form.bank_txn_id} onChange={e => setForm({ ...form, bank_txn_id: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label>Posted At</Label>
            <Input type="datetime-local" value={form.posted_at} onChange={e => setForm({ ...form, posted_at: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Amount</Label>
            <Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label>Counterparty</Label>
            <Input value={form.counterparty} onChange={e => setForm({ ...form, counterparty: e.target.value })} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Memo</Label>
            <Input value={form.memo} onChange={e => setForm({ ...form, memo: e.target.value })} />
          </div>
          <div className="md:col-span-3">
            <Button type="submit">Import</Button>
          </div>
        </form>
      </Card>
    </PageShell>
  );
};

const RailReconcilePage: React.FC<{ railTabs: React.ReactNode }> = ({ railTabs }) => {
  const { push } = useToast();
  const runBatch = async () => {
    try {
      await apiPost('/rail/reconcile/run?limit=50');
      push('success', 'Batch reconcile started.');
    } catch (err: any) {
      push('error', err?.payload?.detail || 'Batch reconcile failed.');
    }
  };

  return (
    <PageShell title="Rail / Reconciliation" subtitle="Post settlement journal entries and match bank transactions.">
      {railTabs}
      <Button onClick={runBatch}>Run Batch Reconcile</Button>
    </PageShell>
  );
};

const DocumentsPage: React.FC<{ railTabs: React.ReactNode }> = ({ railTabs }) => {
  const { push } = useToast();
  const { user } = useAuth();
  const [docs, setDocs] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(() => {
    return apiGet<any[]>('/documents').then(setDocs);
  }, []);

  useEffect(() => {
    load().catch(() => push('error', 'Failed to load documents.'));
  }, [load, push]);

  const handleUpload = async () => {
    setUploading(true);
    try {
      await new Promise(r => setTimeout(r, 1000));
      const name = `receipt_${Date.now()}.pdf`;
      await apiPost('/documents/upload', {
        name,
        size: Math.floor(Math.random() * 1024 * 1024),
        type: 'application/pdf'
      });
      push('success', `Uploaded ${name}`);
      await load();
    } catch (e) {
      push('error', 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <PageShell title="Rail / Documents" subtitle="Manage receipts and evidential documents.">
      {railTabs}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="font-semibold text-slate-900">My Files</h3>
            <p className="text-xs text-slate-500">Secure storage isolated to {user?.email}</p>
          </div>
          <Button onClick={handleUpload} disabled={uploading}>
            {uploading ? 'Uploading...' : 'Upload Receipt'}
          </Button>
        </div>

        <div className="space-y-3">
          {docs.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-xl">
              No documents found. Upload one to see ACLs in action.
            </div>
          ) : (
            docs.map(doc => (
              <div key={doc.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded flex items-center justify-center">
                    <Book className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 text-sm">{doc.name}</div>
                    <div className="text-xs text-slate-500">
                      {(doc.size / 1024).toFixed(1)} KB • {new Date(doc.uploaded_at).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs rounded font-medium border border-emerald-100 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Owner: Me
                  </span>
                  <Button variant="ghost" className="text-xs h-8">Download</Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </PageShell>
  );
};

const RailWebhookTesterPage: React.FC<{ railTabs: React.ReactNode }> = ({ railTabs }) => {
  const { push } = useToast();
  const [form, setForm] = useState({
    provider: 'mock',
    provider_payment_id: '',
    event_type: 'payment.settled',
    provider_status: 'settled',
    trace_number: '',
    return_code: '',
    payload: ''
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const payload = form.payload ? JSON.parse(form.payload) : {};
      await apiPost('/rail/webhooks/provider', { ...form, payload });
      push('success', 'Webhook sent.');
    } catch (err: any) {
      push('error', err?.payload?.detail || err?.message || 'Webhook failed.');
    }
  };

  return (
    <PageShell title="Rail / Webhook Tester" subtitle="Simulate provider callbacks for testing.">
      {railTabs}
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Provider</Label>
            <Input value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Provider Payment ID</Label>
            <Input value={form.provider_payment_id} onChange={e => setForm({ ...form, provider_payment_id: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label>Event Type</Label>
            <Select value={form.event_type} onChange={e => setForm({ ...form, event_type: e.target.value })}>
              {['payment.processing', 'payment.settled', 'payment.returned', 'payment.failed'].map(t => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Provider Status</Label>
            <Select value={form.provider_status} onChange={e => setForm({ ...form, provider_status: e.target.value })}>
              {['processing', 'settled', 'returned', 'failed'].map(t => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Trace Number</Label>
            <Input value={form.trace_number} onChange={e => setForm({ ...form, trace_number: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Return Code</Label>
            <Input value={form.return_code} onChange={e => setForm({ ...form, return_code: e.target.value })} />
          </div>
          <div className="space-y-2 md:col-span-3">
            <Label>Payload (JSON)</Label>
            <Input value={form.payload} onChange={e => setForm({ ...form, payload: e.target.value })} placeholder='{"meta":"optional"}' />
          </div>
          <div className="md:col-span-3">
            <Button type="submit">Send Webhook</Button>
          </div>
        </form>
      </Card>
    </PageShell>
  );
};

const UserProfileWrapper: React.FC = () => {
  const { user, signIn, signOut } = useAuth();
  const profileUser = {
    id: user?.uid || 'guest',
    name: user?.displayName || 'Guest User',
    email: user?.email || 'Not signed in',
    role: user ? 'Member' : 'Guest',
    avatarInitials: (user?.email || 'GU').slice(0, 2).toUpperCase(),
    isPrivate: false,
    _version: '1',
    lastActive: new Date().toISOString()
  };

  return (
    <PageShell title="User Profile" subtitle={user ? 'Manage your account.' : 'Sign in to access your data.'}>
      {!user ? (
        <Card className="p-8 flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center text-2xl font-bold text-slate-400">GU</div>
          <p className="text-sm text-slate-500">You are browsing as a guest.</p>
          <button
            onClick={() => signIn().catch(() => {})}
            className="flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="" />
            Sign in with Google
          </button>
        </Card>
      ) : (
        <Card className="p-6">
          <div className="flex items-center gap-4 mb-6">
            {user.photoURL ? (
              <img src={user.photoURL} alt="" className="w-16 h-16 rounded-full" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-xl font-bold text-indigo-600">
                {(user.email || 'U').slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{user.displayName || 'User'}</h3>
              <p className="text-sm text-slate-500">{user.email}</p>
              {user.emailVerified && (
                <span className="inline-flex items-center gap-1 mt-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  Verified
                </span>
              )}
            </div>
          </div>
          <div className="border-t border-slate-200 pt-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">User ID</span>
              <span className="text-slate-700 font-mono text-xs">{user.uid}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Role</span>
              <span className="text-slate-700">Member</span>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => signOut()}
              className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </Card>
      )}
    </PageShell>
  );
};

const SettingsWrapper: React.FC = () => {
  return (
    <PageShell title="Settings" subtitle="System configuration.">
      <Card className="p-6">
        <p className="text-sm text-slate-500">Global system settings are managed by the administrator.</p>
      </Card>
    </PageShell>
  );
};
const EntitiesPage: React.FC = () => {
  const { push } = useToast();
  const [entities, setEntities] = useState<any[]>([]);
  const [form, setForm] = useState({
    entity_name: '',
    entity_type: 'MEMBER',
    is_affiliated: true,
    lending_enabled: true,
    memo: '',
    w9_on_file: false,
    cot_on_file: false,
    coe_on_file: false,
    cp575_on_file: false,
    doc_refs: '',
    verify_email: '',
    verify_phone: '',
    verify_auth_app: false
  });

  const load = async () => {
    const data = await apiGet<any[]>('/entities');
    setEntities(data || []);
  };

  useEffect(() => {
    load().catch(() => push('error', 'Failed to load entities.'));
  }, [push]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await apiPost('/entities', {
        ...form,
        doc_refs: form.doc_refs ? form.doc_refs.split(',').map(s => s.trim()) : []
      });
      push('success', 'Entity created.');
      setForm({
        entity_name: '',
        entity_type: 'MEMBER',
        is_affiliated: true,
        lending_enabled: true,
        memo: '',
        w9_on_file: false,
        cot_on_file: false,
        coe_on_file: false,
        cp575_on_file: false,
        doc_refs: '',
        verify_email: '',
        verify_phone: '',
        verify_auth_app: false
      });
      await load();
    } catch (err: any) {
      push('error', err?.payload?.detail || 'Failed to create entity.');
    }
  };

  return (
    <PageShell title="Entities" subtitle="Onboarded participants for rail and lending.">
      <Card className="p-6 space-y-4">
        <h3 className="text-sm font-semibold text-slate-700">Entities</h3>
        <Table columns={['id', 'entity_name', 'entity_type', 'status', 'is_affiliated', 'lending_enabled', 'memo']} rows={entities} />
        <div className="flex flex-wrap gap-2">
          {entities.map(entity => (
            <div key={entity.id} className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">{entity.entity_name}</span>
              <Button type="button" variant="ghost" onClick={async () => { await apiPost(`/entities/${entity.id}/verify`); await load(); }}>
                Mark Verified
              </Button>
              <Button type="button" variant="ghost" onClick={async () => { await apiPost(`/entities/${entity.id}/approve`); await load(); }}>
                Approve Treasury
              </Button>
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Add Entity</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Entity Name</Label>
            <Input value={form.entity_name} onChange={e => setForm({ ...form, entity_name: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label>Entity Type</Label>
            <Select value={form.entity_type} onChange={e => setForm({ ...form, entity_type: e.target.value })}>
              {['TRUST', 'LLC', 'MEMBER', 'BENEFICIARY'].map(t => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>W-9 On File</Label>
            <Select value={form.w9_on_file ? 'true' : 'false'} onChange={e => setForm({ ...form, w9_on_file: e.target.value === 'true' })}>
              <option value="true">true</option>
              <option value="false">false</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>COT On File</Label>
            <Select value={form.cot_on_file ? 'true' : 'false'} onChange={e => setForm({ ...form, cot_on_file: e.target.value === 'true' })}>
              <option value="true">true</option>
              <option value="false">false</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>COE On File</Label>
            <Select value={form.coe_on_file ? 'true' : 'false'} onChange={e => setForm({ ...form, coe_on_file: e.target.value === 'true' })}>
              <option value="true">true</option>
              <option value="false">false</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>CP-575 On File</Label>
            <Select value={form.cp575_on_file ? 'true' : 'false'} onChange={e => setForm({ ...form, cp575_on_file: e.target.value === 'true' })}>
              <option value="true">true</option>
              <option value="false">false</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Affiliated</Label>
            <Select value={form.is_affiliated ? 'true' : 'false'} onChange={e => setForm({ ...form, is_affiliated: e.target.value === 'true' })}>
              <option value="true">true</option>
              <option value="false">false</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Lending Enabled</Label>
            <Select value={form.lending_enabled ? 'true' : 'false'} onChange={e => setForm({ ...form, lending_enabled: e.target.value === 'true' })}>
              <option value="true">true</option>
              <option value="false">false</option>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Memo</Label>
            <Input value={form.memo} onChange={e => setForm({ ...form, memo: e.target.value })} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Doc Refs (comma separated)</Label>
            <Input value={form.doc_refs} onChange={e => setForm({ ...form, doc_refs: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Verify Email</Label>
            <Input value={form.verify_email} onChange={e => setForm({ ...form, verify_email: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Verify Phone</Label>
            <Input value={form.verify_phone} onChange={e => setForm({ ...form, verify_phone: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Auth App Required</Label>
            <Select value={form.verify_auth_app ? 'true' : 'false'} onChange={e => setForm({ ...form, verify_auth_app: e.target.value === 'true' })}>
              <option value="true">true</option>
              <option value="false">false</option>
            </Select>
          </div>
          <div className="md:col-span-3">
            <Button type="submit">Create Entity</Button>
          </div>
        </form>
      </Card>
    </PageShell>
  );
};

const PlaceholderPage: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => (
  <PageShell title={title} subtitle={subtitle}>
    <Card className="p-6 text-sm text-slate-500">
      This module is scaffolded for phase 2. Continue to the next prompt to expand.
    </Card>
  </PageShell>
);

// ─── Wrapper Components (manage sub-tab state) ──────────────────────────────

const LedgerPage: React.FC<{ canAdmin: boolean }> = ({ canAdmin }) => {
  const [subTab, setSubTab] = useState('accounts');
  const tabs = <LedgerTabs activeTab={subTab} onTabChange={setSubTab} />;

  switch (subTab) {
    case 'journal':
      return <LedgerJournalPage ledgerTabs={tabs} />;
    case 'reports':
      return <LedgerReportsPage ledgerTabs={tabs} />;
    default:
      return <LedgerAccountsPage canAdmin={canAdmin} ledgerTabs={tabs} />;
  }
};

// ─── Coinbase Crypto Page ────────────────────────────────────────────────────

const CoinbaseCryptoPage: React.FC<{ railTabs: React.ReactNode }> = ({ railTabs }) => {
  const { push } = useToast();
  const stepUp = useStepUpAuth();

  // ── Shared account list state ──
  const [accounts, setAccounts] = useState<CoinbaseAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);

  // ── Send form state ──
  const [sendForm, setSendForm] = useState({ accountId: '', to: '', amount: '', currency: '', memo: '' });
  const [addressValid, setAddressValid] = useState<boolean | null>(null);
  const [validating, setValidating] = useState(false);
  const [sending, setSending] = useState(false);

  // ── Receive state ──
  const [receiveAccountId, setReceiveAccountId] = useState('');
  const [receiveCurrency, setReceiveCurrency] = useState('');
  const [receiveAddress, setReceiveAddress] = useState('');
  const [receiveLoading, setReceiveLoading] = useState(false);

  // ── Transactions state ──
  const [transactions, setTransactions] = useState<CoinbaseTransaction[]>([]);
  const [txLoading, setTxLoading] = useState(true);

  // ── Load accounts on mount ──
  const loadAccounts = useCallback(async () => {
    setAccountsLoading(true);
    try {
      const resp = await cbListAccounts();
      setAccounts(resp.accounts || []);
    } catch {
      push('error', 'Failed to load crypto accounts.');
    } finally {
      setAccountsLoading(false);
    }
  }, [push]);

  // ── Load transactions on mount ──
  const loadTransactions = useCallback(async () => {
    setTxLoading(true);
    try {
      const resp = await cbListTransactions({ limit: 50 });
      setTransactions(resp.transactions || []);
    } catch {
      push('error', 'Failed to load transactions.');
    } finally {
      setTxLoading(false);
    }
  }, [push]);

  useEffect(() => {
    loadAccounts();
    loadTransactions();
  }, [loadAccounts, loadTransactions]);

  // ── Address validation on blur ──
  const handleAddressBlur = async () => {
    if (!sendForm.to || !sendForm.currency) {
      setAddressValid(null);
      return;
    }
    setValidating(true);
    try {
      const result = await cbValidateAddress(sendForm.to, sendForm.currency);
      setAddressValid(result.valid);
    } catch {
      setAddressValid(false);
    } finally {
      setValidating(false);
    }
  };

  // ── Send crypto ──
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sendForm.accountId || !sendForm.to || !sendForm.amount || !sendForm.currency) {
      push('error', 'Please fill in all required fields.');
      return;
    }
    const ok = await stepUp.verify();
    if (!ok) {
      push('error', 'Step-up authentication failed.');
      return;
    }
    setSending(true);
    try {
      await sendCrypto({
        accountId: sendForm.accountId,
        to: sendForm.to,
        amount: sendForm.amount,
        currency: sendForm.currency,
        description: sendForm.memo || undefined
      });
      push('success', `Sent ${sendForm.amount} ${sendForm.currency} successfully.`);
      setSendForm({ accountId: '', to: '', amount: '', currency: '', memo: '' });
      setAddressValid(null);
      await Promise.all([loadAccounts(), loadTransactions()]);
    } catch (err: any) {
      push('error', err?.payload?.detail || 'Failed to send crypto.');
    } finally {
      setSending(false);
    }
  };

  // ── Fetch receive address ──
  const handleReceiveSelect = async (accountId: string, currency: string) => {
    setReceiveAccountId(accountId);
    setReceiveCurrency(currency);
    setReceiveAddress('');
    if (!accountId) return;
    setReceiveLoading(true);
    try {
      const addr = await getReceiveAddress(accountId, currency);
      setReceiveAddress(addr.address);
    } catch {
      push('error', 'Failed to fetch receive address.');
    } finally {
      setReceiveLoading(false);
    }
  };

  // ── Copy to clipboard ──
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => push('success', 'Address copied to clipboard.'),
      () => push('error', 'Failed to copy address.')
    );
  };

  // ── Format currency amount ──
  const formatCryptoAmount = (amount: string, currency: string) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return `${amount} ${currency}`;
    if (['USD', 'USDC', 'USDT', 'EUR', 'GBP'].includes(currency.toUpperCase())) {
      return `${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
    }
    return `${num.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })} ${currency}`;
  };

  // ── Truncate address ──
  const truncateAddress = (addr: string) => {
    if (addr.length <= 14) return addr;
    return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
  };

  // ── Status badge ──
  const statusBadge = (status: CoinbaseTransaction['status']) => {
    const styles: Record<string, string> = {
      completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      pending: 'bg-amber-50 text-amber-700 border-amber-200',
      failed: 'bg-rose-50 text-rose-700 border-rose-200',
      canceled: 'bg-slate-100 text-slate-500 border-slate-200'
    };
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded border ${styles[status] || styles.canceled}`}>
        {status}
      </span>
    );
  };

  // ── Tx type icon ──
  const txTypeIcon = (type: CoinbaseTransaction['type']) => {
    switch (type) {
      case 'send': return <ArrowUpRight className="w-4 h-4 text-rose-500" />;
      case 'receive': return <ArrowDownLeft className="w-4 h-4 text-emerald-500" />;
      case 'deposit': return <ArrowDownLeft className="w-4 h-4 text-indigo-500" />;
      case 'withdrawal': return <ArrowUpRight className="w-4 h-4 text-amber-500" />;
      default: return <Wallet className="w-4 h-4 text-slate-400" />;
    }
  };

  // ── Update send form currency when account changes ──
  const handleSendAccountChange = (accountId: string) => {
    const acct = accounts.find(a => a.id === accountId);
    setSendForm(prev => ({
      ...prev,
      accountId,
      currency: acct ? acct.currency.code : ''
    }));
    setAddressValid(null);
  };

  return (
    <PageShell title="Rail / Crypto" subtitle="Coinbase wallet management, send/receive, and transaction history.">
      {railTabs}

      {/* ── Balances Card ── */}
      <Card className="p-6 space-y-4">
        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <Wallet className="w-4 h-4" /> Crypto Balances
        </h3>
        {accountsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            <span className="ml-2 text-sm text-slate-400">Loading accounts...</span>
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-xl">
            No crypto accounts found.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {accounts.map(acct => (
              <div key={acct.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-xs font-bold">
                    {acct.currency.code.slice(0, 3)}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-900">{acct.name}</div>
                    <div className="text-xs text-slate-400">{acct.type} &middot; {acct.currency.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-slate-900">
                    {formatCryptoAmount(acct.balance.amount, acct.balance.currency)}
                  </div>
                  {acct.native_balance && (
                    <div className="text-xs text-slate-400">
                      ${parseFloat(acct.native_balance.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {acct.native_balance.currency}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── Send & Receive (side by side) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Send Form ── */}
        <Card className="p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4" /> Send Crypto
          </h3>
          <form onSubmit={handleSend} className="space-y-4">
            <div className="space-y-2">
              <Label>From Account</Label>
              <Select value={sendForm.accountId} onChange={e => handleSendAccountChange(e.target.value)}>
                <option value="">Select account...</option>
                {accounts.filter(a => a.type === 'wallet').map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({formatCryptoAmount(a.balance.amount, a.balance.currency)})
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Recipient Address</Label>
              <div className="relative">
                <Input
                  value={sendForm.to}
                  onChange={e => {
                    setSendForm(prev => ({ ...prev, to: e.target.value }));
                    setAddressValid(null);
                  }}
                  onBlur={handleAddressBlur}
                  placeholder="0x... or bc1..."
                  required
                />
                {validating && (
                  <div className="absolute right-3 top-2.5">
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                  </div>
                )}
                {!validating && addressValid === true && (
                  <div className="absolute right-3 top-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                )}
                {!validating && addressValid === false && (
                  <div className="absolute right-3 top-2.5">
                    <XCircle className="w-4 h-4 text-rose-500" />
                  </div>
                )}
              </div>
              {addressValid === false && (
                <p className="text-xs text-rose-500">Invalid address for {sendForm.currency}.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="any"
                  min="0"
                  value={sendForm.amount}
                  onChange={e => setSendForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.00"
                  required
                  className="flex-1"
                />
                <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 font-medium min-w-[60px] text-center">
                  {sendForm.currency || '---'}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Memo (optional)</Label>
              <Input
                value={sendForm.memo}
                onChange={e => setSendForm(prev => ({ ...prev, memo: e.target.value }))}
                placeholder="Payment note..."
              />
            </div>
            <Button type="submit" disabled={sending || addressValid === false}>
              {sending ? 'Sending...' : 'Send Crypto'}
            </Button>
          </form>
        </Card>

        {/* ── Receive Card ── */}
        <Card className="p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <ArrowDownLeft className="w-4 h-4" /> Receive Crypto
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select
                value={receiveAccountId}
                onChange={e => {
                  const acct = accounts.find(a => a.id === e.target.value);
                  handleReceiveSelect(e.target.value, acct?.currency.code || '');
                }}
              >
                <option value="">Select account...</option>
                {accounts.filter(a => a.type === 'wallet').map(a => (
                  <option key={a.id} value={a.id}>
                    {a.currency.code} - {a.name}
                  </option>
                ))}
              </Select>
            </div>

            {receiveLoading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                <span className="ml-2 text-sm text-slate-400">Generating address...</span>
              </div>
            )}

            {receiveAddress && !receiveLoading && (
              <div className="space-y-3">
                <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
                  {receiveCurrency} Deposit Address
                </div>
                <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <code className="flex-1 text-sm font-mono text-slate-800 break-all">
                    {receiveAddress}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(receiveAddress)}
                    className="p-2 hover:bg-slate-200 rounded-lg transition-colors shrink-0"
                    title="Copy address"
                  >
                    <Copy className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
                <p className="text-xs text-slate-400">
                  Only send {receiveCurrency} to this address. Sending other assets may result in permanent loss.
                </p>
              </div>
            )}

            {!receiveAccountId && !receiveLoading && (
              <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-xl">
                Select a currency to generate a deposit address.
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* ── Transaction History ── */}
      <Card className="p-6 space-y-4">
        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <Book className="w-4 h-4" /> Transaction History
        </h3>
        {txLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            <span className="ml-2 text-sm text-slate-400">Loading transactions...</span>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-xl">
            No transactions yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Type</th>
                  <th className="px-4 py-3 text-left font-semibold">Amount</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Date</th>
                  <th className="px-4 py-3 text-left font-semibold">Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700">
                      <div className="flex items-center gap-2">
                        {txTypeIcon(tx.type)}
                        <span className="capitalize">{tx.type}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium">
                      {formatCryptoAmount(tx.amount.amount, tx.amount.currency)}
                    </td>
                    <td className="px-4 py-3">{statusBadge(tx.status)}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {new Date(tx.created_at).toLocaleDateString()}{' '}
                      {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                      {tx.to?.address
                        ? truncateAddress(tx.to.address)
                        : tx.from?.address
                          ? truncateAddress(tx.from.address)
                          : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </PageShell>
  );
};

const RailPage: React.FC = () => {
  const [subTab, setSubTab] = useState('payees');
  const tabs = <RailTabs activeTab={subTab} onTabChange={setSubTab} />;

  switch (subTab) {
    case 'payment-orders':
      return <RailPaymentOrdersPage railTabs={tabs} />;
    case 'bank':
      return <RailBankPage railTabs={tabs} />;
    case 'reconcile':
      return <RailReconcilePage railTabs={tabs} />;
    case 'crypto':
      return <CoinbaseCryptoPage railTabs={tabs} />;
    case 'documents':
      return <DocumentsPage railTabs={tabs} />;
    case 'webhook-tester':
      return <RailWebhookTesterPage railTabs={tabs} />;
    default:
      return <RailPayeesPage railTabs={tabs} />;
  }
};

// ─── Navigation Items ────────────────────────────────────────────────────────

const primaryNav = [
  { id: 'dashboard', label: 'Home', icon: LayoutGrid },
  { id: 'banking', label: 'Banking', icon: Landmark },
  { id: 'payments', label: 'Payments', icon: Shuffle },
  { id: 'loans', label: 'Loans', icon: HandCoins },
  { id: 'more', label: 'More', icon: MoreVertical },
];

const allNavItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
  { id: 'banking', label: 'Banking', icon: Landmark },
  { id: 'payments', label: 'Payments', icon: Shuffle },
  { id: 'loans', label: 'Loans', icon: HandCoins },
  { id: 'profile', label: 'Profile', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
];

// ─── QB Shell (export App) ───────────────────────────────────────────────────

export const App: React.FC = () => {
  const { user, signIn, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    setApiUser(user?.uid || null);
  }, [user]);

  // Hash routing
  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash && allNavItems.some(i => i.id === hash)) {
        setActiveTab(hash);
      }
    };
    onHashChange();
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (window.location.hash.slice(1) !== activeTab) {
      window.history.replaceState(null, '', `#${activeTab}`);
    }
  }, [activeTab]);

  const role = ((user as any)?.role || (user as any)?.user_role || (user as any)?.role_name || 'viewer').toLowerCase();
  const canAdmin = role === 'admin';

  const tabTitle = allNavItems.find(i => i.id === activeTab)?.label || 'Clear.Flow';

  const handleNavClick = (id: string) => {
    if (id === 'more') {
      setMenuOpen(true);
      return;
    }
    setActiveTab(id);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage />;
      case 'banking':
        return <LedgerPage canAdmin={canAdmin} />;
      case 'payments':
        return <PaymentCenter />;
      case 'loans':
        return <LoanManager />;
      case 'profile':
        return <UserProfileWrapper />;
      case 'settings':
        return <SettingsWrapper />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <ToastProvider>
      <div className="flex flex-col h-screen w-screen bg-slate-100 text-slate-900 font-sans pb-16">
        {/* Indigo Header */}
        <header className="bg-indigo-600 text-white px-4 py-3 flex items-center justify-between shrink-0 shadow-md z-[50]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Open navigation menu"
              className="p-1 hover:bg-white/10 rounded-md transition-colors"
            >
              <Menu size={24} />
            </button>
            <div className="flex flex-col">
              <h1 className="text-sm font-bold leading-tight">
                {tabTitle}
              </h1>
              <p className="text-[10px] text-white/80 uppercase tracking-wider font-medium">
                Clear.Flow
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              aria-label="Toggle quick search"
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <Search size={20} />
            </button>
            <button
              className="p-2 hover:bg-white/10 rounded-full transition-colors relative"
              aria-label="View notifications"
            >
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full border border-indigo-600"></span>
            </button>
            <button
              onClick={() => user ? setActiveTab('profile') : signIn().catch(() => {})}
              className="w-8 h-8 rounded-full bg-white/20 border border-white/30 flex items-center justify-center font-bold text-xs ml-1 hover:bg-white/30 transition-colors overflow-hidden"
              title={user ? (user.email || 'Profile') : 'Sign in with Google'}
            >
              {user?.photoURL ? (
                <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
              ) : (
                (user?.email || 'G').slice(0, 2).toUpperCase()
              )}
            </button>
          </div>
        </header>

        {/* Quick Search */}
        {searchOpen && (
          <div className="bg-white border-b border-slate-200 px-4 py-2 shadow-sm z-40">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Find transactions, entities, reports..."
                className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-indigo-600 outline-none"
                autoFocus
              />
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="px-4 py-6 md:px-8">
            {renderContent()}
          </div>
        </main>

        {/* Bottom Nav */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-1 flex justify-around items-center z-[50] shadow-[0_-2px_10px_rgba(0,0,0,0.05)] pb-safe">
          {primaryNav.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`flex flex-col items-center gap-1 p-2 min-w-[64px] transition-colors ${activeTab === item.id ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              <item.icon size={20} strokeWidth={activeTab === item.id ? 2.5 : 2} />
              <span className={`text-[10px] font-medium ${activeTab === item.id ? 'font-bold' : ''}`}>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Side Drawer */}
        {menuOpen && (
          <div className="fixed inset-0 z-[100]">
            <div
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setMenuOpen(false)}
            />
            <aside className="absolute inset-y-0 left-0 w-4/5 max-w-sm bg-white shadow-2xl flex flex-col">
              <div className="p-6 bg-indigo-600 text-white shrink-0">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center font-bold text-xl">
                    {(user?.email || 'U').slice(0, 2).toUpperCase()}
                  </div>
                  <button onClick={() => setMenuOpen(false)} className="p-1 hover:bg-white/10 rounded-md">
                    <X size={24} />
                  </button>
                </div>
                <h2 className="text-xl font-bold">{user?.displayName || user?.email || 'Guest'}</h2>
                <p className="text-xs text-white/70">{user?.email || 'Not signed in'}</p>
              </div>

              <div className="flex-1 overflow-y-auto py-4">
                <nav className="space-y-1">
                  {allNavItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-6 py-3 hover:bg-slate-50 transition-colors group"
                    >
                      <div className="flex items-center gap-4 text-slate-600 group-hover:text-indigo-600">
                        <item.icon size={20} />
                        <span className="text-sm font-bold">{item.label}</span>
                      </div>
                      <ChevronRight size={16} className="text-slate-300" />
                    </button>
                  ))}
                </nav>

                <div className="mt-8 px-6 pt-6 border-t border-slate-100 space-y-4">
                  <button className="flex items-center gap-4 text-slate-500 hover:text-slate-800 text-sm font-medium">
                    <HelpCircle size={18} />
                    Help & Support
                  </button>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Clear.Flow v4.2.0</span>
                {user ? (
                  <button onClick={() => signOut()} className="text-xs font-bold text-red-600 hover:text-red-700">Sign Out</button>
                ) : (
                  <button onClick={() => signIn().catch(() => {})} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 h-4" alt="" />
                    Sign in with Google
                  </button>
                )}
              </div>
            </aside>
          </div>
        )}

        <style>{`
          .pb-safe {
            padding-bottom: env(safe-area-inset-bottom);
          }
        `}</style>
      </div>
    </ToastProvider>
  );
};
