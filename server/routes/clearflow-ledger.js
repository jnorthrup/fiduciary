import express from 'express';
import { randomUUID } from 'crypto';
import { loadUserState, saveUserState } from '../lib/clearflow-store.js';
import { appendAudit } from '../lib/clearflow-audit.js';
import { requireRole } from '../lib/clearflow-auth.js';

const router = express.Router();

const DEFAULT_COA = [
  { code: '1000', name: 'Cash/Bank', type: 'Asset' },
  { code: '1100', name: 'Payments in Transit', type: 'Asset' },
  { code: '2000', name: 'Accounts Payable', type: 'Liability' },
  { code: '5000', name: 'Expense', type: 'Expense' },
  { code: '1230', name: 'Notes Receivable', type: 'Asset' },
  { code: '1300', name: 'Internal Credit Reserve', type: 'Asset' },
  { code: '1310', name: 'Internal Credit Balance', type: 'Asset' },
  { code: '2350', name: 'Loan Payable / Due to Trust', type: 'Liability' },
  { code: '6100', name: 'Bank Fees', type: 'Expense' }
];

function ensureAccounts(state) {
  state.accounts = state.accounts || [];
}

router.post('/accounts/init-defaults', requireRole('admin'), async (req, res) => {
  const state = await loadUserState(req.user.uid);
  ensureAccounts(state);
  DEFAULT_COA.forEach(acc => {
    if (!state.accounts.find(a => a.code === acc.code)) {
      state.accounts.push({ id: randomUUID(), ...acc });
    }
  });
  await saveUserState(req.user.uid, state);
  await appendAudit(req.user.uid, { type: 'ledger.coa_initialized', ref_id: 'coa', actor: req.user.email, payload: { count: state.accounts.length } });
  res.json({ ok: true, count: state.accounts.length });
});

router.get('/accounts', async (req, res) => {
  const state = await loadUserState(req.user.uid);
  res.json(state.accounts || []);
});

router.post('/accounts', async (req, res) => {
  const state = await loadUserState(req.user.uid);
  ensureAccounts(state);
  const { code, name, type } = req.body || {};
  if (!code || !name || !type) {
    return res.status(400).json({ error: 'validation', message: 'code, name, type required' });
  }
  if (state.accounts.find(a => a.code === code)) {
    return res.status(409).json({ error: 'conflict', message: 'account exists' });
  }
  const account = { id: randomUUID(), code, name, type };
  state.accounts.push(account);
  await saveUserState(req.user.uid, state);
  await appendAudit(req.user.uid, { type: 'ledger.account_created', ref_id: account.id, actor: req.user.email, payload: { code: account.code } });
  res.status(201).json(account);
});

router.get('/journal', async (req, res) => {
  const state = await loadUserState(req.user.uid);
  const { entity_id, limit, search, source_module, external_ref, date_from, date_to } = req.query;
  let entries = state.journal_entries || [];
  if (entity_id) entries = entries.filter(j => String(j.entity_id) === String(entity_id));
  if (source_module) entries = entries.filter(j => String(j.source_module || '').toLowerCase() === String(source_module).toLowerCase());
  if (external_ref) entries = entries.filter(j => String(j.external_ref || '').includes(String(external_ref)));
  if (search) {
    const s = String(search).toLowerCase();
    entries = entries.filter(j =>
      String(j.memo || '').toLowerCase().includes(s) ||
      String(j.external_ref || '').toLowerCase().includes(s)
    );
  }
  if (date_from) entries = entries.filter(j => String(j.entry_date || '') >= String(date_from));
  if (date_to) entries = entries.filter(j => String(j.entry_date || '') <= String(date_to));
  if (limit) entries = entries.slice(0, Number(limit));
  res.json(entries);
});

router.post('/journal', async (req, res) => {
  const state = await loadUserState(req.user.uid);
  const entry = {
    id: randomUUID(),
    memo: req.body.memo || '',
    source_module: req.body.source_module || 'ledger',
    external_ref: req.body.external_ref || null,
    entry_date: req.body.entry_date || new Date().toISOString().split('T')[0],
    entity_id: req.body.entity_id || null,
    lines: req.body.lines || []
  };
  const totalDebit = entry.lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  const totalCredit = entry.lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
  if (Math.abs(totalDebit - totalCredit) > 0.001) {
    return res.status(400).json({ error: 'validation', message: 'entry not balanced' });
  }
  state.journal_entries.push(entry);
  await saveUserState(req.user.uid, state);
  await appendAudit(req.user.uid, { type: 'ledger.journal_created', ref_id: entry.id, actor: req.user.email, payload: { memo: entry.memo } });
  res.status(201).json(entry);
});

function computeBalances(state) {
  const balances = {};
  (state.accounts || []).forEach(acc => {
    balances[acc.code] = { ...acc, debit: 0, credit: 0, net: 0 };
  });
  (state.journal_entries || []).forEach(entry => {
    entry.lines.forEach(line => {
      const code = line.account_code || line.accountCode || line.account;
      if (!balances[code]) {
        balances[code] = { code, name: code, type: 'Unknown', debit: 0, credit: 0, net: 0 };
      }
      balances[code].debit += Number(line.debit) || 0;
      balances[code].credit += Number(line.credit) || 0;
    });
  });
  Object.values(balances).forEach(acc => {
    acc.net = acc.debit - acc.credit;
  });
  return balances;
}

router.get('/reports/trial-balance', async (req, res) => {
  const state = await loadUserState(req.user.uid);
  const balances = computeBalances(state);
  res.json({ accounts: Object.values(balances) });
});

router.get('/reports/balance-sheet', async (req, res) => {
  const state = await loadUserState(req.user.uid);
  const balances = computeBalances(state);
  const assets = [];
  const liabilities = [];
  const equity = [];
  Object.values(balances).forEach(acc => {
    if (acc.type === 'Asset') assets.push(acc);
    if (acc.type === 'Liability') liabilities.push(acc);
    if (acc.type === 'Equity') equity.push(acc);
  });
  res.json({ assets, liabilities, equity });
});

router.get('/reports/pl', async (req, res) => {
  const state = await loadUserState(req.user.uid);
  const balances = computeBalances(state);
  const income = [];
  const expenses = [];
  Object.values(balances).forEach(acc => {
    if (acc.type === 'Income') income.push(acc);
    if (acc.type === 'Expense') expenses.push(acc);
  });
  res.json({ income, expenses });
});

export default router;
