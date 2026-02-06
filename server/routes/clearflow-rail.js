import express from 'express';
import { randomUUID } from 'crypto';
import { loadUserState, saveUserState } from '../lib/clearflow-store.js';
import { appendAudit } from '../lib/clearflow-audit.js';

const router = express.Router();

const wellsFargoConfig = () => ({
  baseUrl: process.env.WELLS_FARGO_BASE_URL || '',
  clientId: process.env.WELLS_FARGO_CLIENT_ID || '',
  clientSecret: process.env.WELLS_FARGO_CLIENT_SECRET || '',
  partnerId: process.env.WELLS_FARGO_PARTNER_ID || '',
  orgId: process.env.WELLS_FARGO_ORG_ID || '',
  certPath: process.env.WELLS_FARGO_CERT_PATH || '',
  keyPath: process.env.WELLS_FARGO_KEY_PATH || ''
});

const hasWellsFargoConfig = () => {
  const cfg = wellsFargoConfig();
  return Boolean(cfg.baseUrl && cfg.clientId && cfg.clientSecret);
};

const providerCatalog = [
  { id: 'mock', label: 'Mock Provider', type: 'test', rails: ['ach', 'webhook'] },
  { id: 'wellsfargo', label: 'Wells Fargo Gateway', type: 'bank_gateway', rails: ['ach', 'wire', 'data'] },
  { id: 'bofa', label: 'Bank of America CashPro', type: 'bank_gateway', rails: ['ach', 'wire', 'data'] },
  { id: 'jpmc', label: 'JPMorgan Treasury', type: 'bank_gateway', rails: ['ach', 'wire', 'data'] },
  { id: 'citi', label: 'Citi Treasury', type: 'bank_gateway', rails: ['ach', 'wire', 'data'] },
  { id: 'usbank', label: 'U.S. Bank Treasury', type: 'bank_gateway', rails: ['ach', 'wire', 'data'] },
  { id: 'modern_treasury', label: 'Modern Treasury', type: 'platform', rails: ['ach', 'wire', 'data'] },
  { id: 'dwolla', label: 'Dwolla', type: 'platform', rails: ['ach'] },
  { id: 'stripe_ach_debit', label: 'Stripe ACH Debit', type: 'platform', rails: ['ach_debit'] },
  { id: 'stripe_treasury', label: 'Stripe Treasury/Payouts', type: 'platform', rails: ['ach', 'wire'] },
  { id: 'fednow', label: 'FedNow (via FI)', type: 'network', rails: ['instant'] }
];

const hasProviderConfig = (providerId) => {
  switch (providerId) {
    case 'wellsfargo':
      return hasWellsFargoConfig();
    case 'bofa':
      return Boolean(process.env.BOFA_TOKEN_URL && process.env.GOOGLE_CLOUD_PROJECT);
    case 'modern_treasury':
      return Boolean(process.env.MODERN_TREASURY_API_KEY);
    case 'dwolla':
      return Boolean(process.env.DWOLLA_KEY && process.env.DWOLLA_SECRET);
    case 'stripe_ach_debit':
    case 'stripe_treasury':
      return Boolean(process.env.STRIPE_SECRET_KEY);
    default:
      return false;
  }
};

router.get('/payees', async (req, res) => {
  const state = await loadUserState(req.user.uid);
  const { search, status } = req.query;
  let payees = state.payees || [];
  if (status) payees = payees.filter(p => String(p.status || '').toLowerCase() === String(status).toLowerCase());
  if (search) {
    const s = String(search).toLowerCase();
    payees = payees.filter(p => String(p.legal_name || '').toLowerCase().includes(s));
  }
  res.json(payees);
});

// --- Plaid connect (stubbed until keys are provided) ---
router.post('/bank/plaid/link-token', async (req, res) => {
  const state = await loadUserState(req.user.uid);
  state.bank_connections = state.bank_connections || [];
  const connection = {
    id: randomUUID(),
    provider: 'plaid',
    status: 'pending',
    created_at: new Date().toISOString()
  };
  state.bank_connections.push(connection);
  await saveUserState(req.user.uid, state);
  res.json({ link_token: `mock-link-${Date.now()}`, connection_id: connection.id });
});

router.post('/bank/plaid/exchange', async (req, res) => {
  const state = await loadUserState(req.user.uid);
  const { connection_id } = req.body || {};
  const conn = (state.bank_connections || []).find(c => c.id === connection_id);
  if (!conn) return res.status(404).json({ error: 'not_found' });
  conn.status = 'connected';
  conn.connected_at = new Date().toISOString();
  await saveUserState(req.user.uid, state);
  res.json({ ok: true });
});

router.get('/providers', async (req, res) => {
  res.json(providerCatalog);
});

router.post('/providers/:id/connect', async (req, res) => {
  const state = await loadUserState(req.user.uid);
  state.bank_connections = state.bank_connections || [];
  const providerId = req.params.id;
  const known = providerCatalog.find(p => p.id === providerId);
  if (!known) return res.status(404).json({ error: 'not_found' });
  const status = hasProviderConfig(providerId) ? 'connected' : 'pending_credentials';
  const connection = {
    id: randomUUID(),
    provider: providerId,
    status,
    created_at: new Date().toISOString()
  };
  state.bank_connections.push(connection);
  await saveUserState(req.user.uid, state);
  await appendAudit(req.user.uid, { type: 'rail.provider_connected', ref_id: connection.id, actor: req.user.email, payload: { provider: providerId, status } });
  res.json({ connection_id: connection.id, status });
});

router.post('/providers/:id/refresh', async (req, res) => {
  const state = await loadUserState(req.user.uid);
  const providerId = req.params.id;
  const connection = (state.bank_connections || []).find(c => c.provider === providerId);
  if (!connection) return res.status(404).json({ error: 'not_found' });
  if (!hasProviderConfig(providerId)) return res.status(409).json({ error: 'missing_credentials', message: 'Provider credentials not configured.' });
  await appendAudit(req.user.uid, { type: 'rail.provider_refresh', ref_id: connection.id, actor: req.user.email, payload: { provider: providerId } });
  res.json({ ok: true, message: 'Refresh initiated (stub).' });
});

// --- Wells Fargo Gateway (stubbed until credentials are provided) ---
router.post('/bank/wellsfargo/connect', async (req, res) => {
  const state = await loadUserState(req.user.uid);
  state.bank_connections = state.bank_connections || [];
  const connection = {
    id: randomUUID(),
    provider: 'wellsfargo',
    status: hasWellsFargoConfig() ? 'connected' : 'pending_credentials',
    created_at: new Date().toISOString()
  };
  state.bank_connections.push(connection);
  await saveUserState(req.user.uid, state);
  await appendAudit(req.user.uid, { type: 'rail.bank_wellsfargo_connected', ref_id: connection.id, actor: req.user.email, payload: { status: connection.status } });
  res.json({ connection_id: connection.id, status: connection.status });
});

router.post('/bank/wellsfargo/refresh', async (req, res) => {
  const state = await loadUserState(req.user.uid);
  const connection = (state.bank_connections || []).find(c => c.provider === 'wellsfargo');
  if (!connection) return res.status(404).json({ error: 'not_found' });
  if (!hasWellsFargoConfig()) return res.status(409).json({ error: 'missing_credentials', message: 'Wells Fargo credentials not configured.' });
  await appendAudit(req.user.uid, { type: 'rail.bank_wellsfargo_refresh', ref_id: connection.id, actor: req.user.email });
  res.json({ ok: true, message: 'Refresh initiated (stub).' });
});

router.post('/payees', async (req, res) => {
  const state = await loadUserState(req.user.uid);
  const payoutMethod = req.body.payout_method || 'ACH';
  if (!req.body.token_ref && ['ACH', 'EFT'].includes(payoutMethod)) {
    return res.status(400).json({ error: 'validation', message: 'token_ref required for ACH/EFT' });
  }
  if (['ACH', 'EFT'].includes(payoutMethod)) {
    if (!req.body.auth_terms || !req.body.privacy_notice) {
      return res.status(400).json({ error: 'validation', message: 'auth_terms and privacy_notice required' });
    }
  }
  const payee = {
    id: randomUUID(),
    legal_name: req.body.legal_name,
    payout_method: req.body.payout_method || 'ACH',
    token_ref: req.body.token_ref,
    last4: req.body.last4 || '',
    bank_name: req.body.bank_name || '',
    status: req.body.status || 'active',
    entity_id: req.body.entity_id || null,
    memo: req.body.memo || '',
    created_at: new Date().toISOString()
  };
  state.payees.push(payee);
  const communications = Array.isArray(req.body.communications) ? req.body.communications : [];
  const documents = Array.isArray(req.body.documents) ? req.body.documents : [];
  communications.forEach(comm => {
    state.communications.push({
      id: randomUUID(),
      payee_id: payee.id,
      text: comm.text || '',
      channel: comm.channel || 'ui',
      created_at: comm.created_at || new Date().toISOString()
    });
  });
  documents.forEach(doc => {
    state.documents.push({
      id: randomUUID(),
      payee_id: payee.id,
      name: doc.name,
      size: doc.size,
      type: doc.type,
      category: doc.category || '',
      notes: doc.notes || '',
      created_at: new Date().toISOString()
    });
  });

  // Generate KYC profile/case on payee creation
  const profileId = randomUUID();
  state.profiles.push({
    id: profileId,
    type: 'BUSINESS',
    entity_id: payee.entity_id,
    fields_json: {
      legal_name: payee.legal_name,
      payout_method: payee.payout_method,
      bank_name: payee.bank_name,
      last4: payee.last4,
      auth_terms: req.body.auth_terms || 'authorized',
      privacy_notice: req.body.privacy_notice || 'acknowledged'
    },
    status: 'submitted'
  });
  state.kyc_cases.push({
    id: randomUUID(),
    profile_id: profileId,
    provider: 'internal',
    provider_case_id: `kyc-${Date.now()}`,
    status: 'submitted'
  });

  await saveUserState(req.user.uid, state);
  await appendAudit(req.user.uid, { type: 'rail.payee_created', ref_id: payee.id, actor: req.user.email, payload: { legal_name: payee.legal_name } });
  if (communications.length) {
    await appendAudit(req.user.uid, { type: 'rail.communication_logged', ref_id: payee.id, actor: req.user.email, payload: { count: communications.length } });
  }
  if (documents.length) {
    await appendAudit(req.user.uid, { type: 'rail.documents_logged', ref_id: payee.id, actor: req.user.email, payload: { count: documents.length } });
  }
  res.status(201).json(payee);
});

router.get('/payment-orders', async (req, res) => {
  const state = await loadUserState(req.user.uid);
  const { status, payee_id, date_from, date_to } = req.query;
  let orders = state.payment_orders || [];
  if (status) orders = orders.filter(o => String(o.status || '').toLowerCase() === String(status).toLowerCase());
  if (payee_id) orders = orders.filter(o => String(o.payee_id || '') === String(payee_id));
  if (date_from) orders = orders.filter(o => String(o.created_at || '') >= String(date_from));
  if (date_to) orders = orders.filter(o => String(o.created_at || '') <= String(date_to));
  res.json(orders);
});

router.post('/payment-orders', async (req, res) => {
  const state = await loadUserState(req.user.uid);
  const order = {
    id: randomUUID(),
    source_type: req.body.source_type,
    source_id: req.body.source_id,
    payee_id: req.body.payee_id,
    payee_name: req.body.payee_name,
    amount: req.body.amount,
    direction: req.body.direction || 'OUTBOUND',
    rail_type: req.body.rail_type || 'ACH_CREDIT',
    sec_code: req.body.sec_code || 'CCD',
    effective_date: req.body.effective_date || null,
    memo: req.body.memo || '',
    idempotency_key: req.body.idempotency_key,
    use_clearing: req.body.use_clearing !== false,
    status: 'created',
    created_at: new Date().toISOString()
  };
  state.payment_orders.push(order);
  await saveUserState(req.user.uid, state);
  await appendAudit(req.user.uid, { type: 'rail.payment_order_created', ref_id: order.id, actor: req.user.email, payload: { amount: order.amount } });
  res.status(201).json(order);
});

router.post('/payment-orders/:id/approve', async (req, res) => {
  const state = await loadUserState(req.user.uid);
  const order = state.payment_orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'not_found' });
  if (order.status !== 'created') return res.status(400).json({ error: 'invalid_state' });
  order.status = 'approved';
  order.approved_at = new Date().toISOString();

  if (order.use_clearing) {
    const entry = {
      id: randomUUID(),
      memo: `Clearing for ${order.id}`,
      source_module: 'rail',
      external_ref: order.id,
      entry_date: new Date().toISOString().split('T')[0],
      entity_id: order.entity_id || null,
      lines: [
        { account_code: '1100', debit: Number(order.amount), credit: 0, description: 'Payments in Transit' },
        { account_code: '1000', debit: 0, credit: Number(order.amount), description: 'Cash' }
      ]
    };
    state.journal_entries.push(entry);
    order.clearing_entry_id = entry.id;
  }

  await saveUserState(req.user.uid, state);
  await appendAudit(req.user.uid, { type: 'rail.payment_order_approved', ref_id: order.id, actor: req.user.email, payload: { clearing_entry_id: order.clearing_entry_id } });
  res.json(order);
});

router.post('/payment-orders/:id/submit', async (req, res) => {
  const state = await loadUserState(req.user.uid);
  const order = state.payment_orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'not_found' });
  if (order.status !== 'approved') return res.status(400).json({ error: 'invalid_state' });

  const provider = String(req.query.provider || 'mock').toLowerCase();
  const providerKnown = providerCatalog.some(p => p.id === provider);
  if (!providerKnown) {
    return res.status(400).json({ error: 'unknown_provider' });
  }
  if (provider !== 'mock' && !hasProviderConfig(provider)) {
    return res.status(409).json({ error: 'missing_credentials', message: 'Provider credentials not configured.' });
  }

  const providerPayment = {
    id: randomUUID(),
    payment_order_id: order.id,
    provider,
    provider_payment_id: provider === 'wellsfargo' ? `wf-${Date.now()}` : `prov-${Date.now()}`,
    trace_number: `TR-${Math.floor(Math.random() * 1e7)}`,
    status: 'submitted',
    raw_payload_json: provider === 'wellsfargo'
      ? { mode: 'stub', base_url: wellsFargoConfig().baseUrl || 'unset' }
      : { mode: 'stub' }
  };
  state.provider_payments.push(providerPayment);
  order.status = 'submitted';
  order.submitted_at = new Date().toISOString();

  await saveUserState(req.user.uid, state);
  await appendAudit(req.user.uid, { type: 'rail.payment_order_submitted', ref_id: order.id, actor: req.user.email, payload: { provider_payment_id: providerPayment.provider_payment_id } });
  res.json({ order, providerPayment });
});

router.post('/webhooks/provider', async (req, res) => {
  const secret = process.env.CLEARFLOW_WEBHOOK_SECRET;
  if (secret) {
    const signature = req.headers['x-provider-signature'];
    const crypto = await import('crypto');
    const expected = crypto.createHmac('sha256', secret).update(req.rawBody || '').digest('hex');
    if (!signature || signature !== expected) {
      return res.status(401).json({ error: 'invalid_signature' });
    }
  }
  const state = await loadUserState(req.user.uid);
  const { provider_payment_id, event_type, provider_status, trace_number } = req.body;
  const providerPayment = state.provider_payments.find(p => p.provider_payment_id === provider_payment_id);
  if (!providerPayment) return res.status(404).json({ error: 'not_found' });
  providerPayment.status = provider_status;
  providerPayment.trace_number = trace_number || providerPayment.trace_number;

  const order = state.payment_orders.find(o => o.id === providerPayment.payment_order_id);
  if (order) {
    if (provider_status === 'processing') order.status = 'processing';
    if (provider_status === 'settled') order.status = 'settled';
    if (provider_status === 'returned') order.status = 'returned';
    if (provider_status === 'failed') order.status = 'failed';
    if (provider_status === 'settled') order.settled_at = new Date().toISOString();
  }

  state.rail_events.push({
    id: randomUUID(),
    payment_order_id: providerPayment.payment_order_id,
    provider_payment_id: provider_payment_id,
    event_type,
    provider_status,
    raw_json: req.body,
    event_time: new Date().toISOString()
  });

  await saveUserState(req.user.uid, state);
  await appendAudit(req.user.uid, { type: 'rail.webhook_received', ref_id: provider_payment_id, actor: 'provider', payload: { event_type, provider_status } });
  res.json({ ok: true });
});

router.post('/bank/import', async (req, res) => {
  const state = await loadUserState(req.user.uid);
  const txn = {
    id: randomUUID(),
    bank_txn_id: req.body.bank_txn_id,
    posted_at: req.body.posted_at,
    amount: req.body.amount,
    counterparty: req.body.counterparty,
    memo: req.body.memo,
    matched: false,
    matched_entry_id: null
  };
  state.bank_transactions.push(txn);
  await saveUserState(req.user.uid, state);
  await appendAudit(req.user.uid, { type: 'rail.bank_imported', ref_id: txn.id, actor: req.user.email, payload: { amount: txn.amount } });
  res.status(201).json(txn);
});

router.post('/bank/import/batch', async (req, res) => {
  const state = await loadUserState(req.user.uid);
  const items = Array.isArray(req.body) ? req.body : req.body?.items || [];
  const created = [];
  for (const item of items) {
    const txn = {
      id: randomUUID(),
      bank_txn_id: item.bank_txn_id || randomUUID(),
      posted_at: item.posted_at,
      amount: item.amount,
      counterparty: item.counterparty,
      memo: item.memo,
      matched: false,
      matched_entry_id: null
    };
    state.bank_transactions.push(txn);
    created.push(txn);
  }
  await saveUserState(req.user.uid, state);
  res.status(201).json({ count: created.length, items: created });
});

router.get('/bank/txns', async (req, res) => {
  const state = await loadUserState(req.user.uid);
  const { matched } = req.query;
  let txns = state.bank_transactions || [];
  if (matched === 'true') txns = txns.filter(t => t.matched);
  if (matched === 'false') txns = txns.filter(t => !t.matched);
  res.json(txns);
});

// Manual bank connection (account/routing) with verification state
router.post('/bank/manual', async (req, res) => {
  const state = await loadUserState(req.user.uid);
  state.bank_connections = state.bank_connections || [];
  const { bank_name, account_holder, routing_number, account_number_last4, account_type, authorization } = req.body || {};
  if (!routing_number || !account_number_last4 || !authorization) {
    return res.status(400).json({ error: 'validation', message: 'routing_number, account_number_last4, authorization required' });
  }
  const connection = {
    id: randomUUID(),
    provider: 'manual',
    bank_name: bank_name || '',
    account_holder: account_holder || '',
    routing_number,
    account_number_last4,
    account_type: account_type || 'checking',
    authorization,
    status: 'pending_verification',
    created_at: new Date().toISOString()
  };
  state.bank_connections.push(connection);
  await saveUserState(req.user.uid, state);
  await appendAudit(req.user.uid, { type: 'rail.bank_manual_added', ref_id: connection.id, actor: req.user.email, payload: { bank_name: connection.bank_name } });
  res.status(201).json(connection);
});

router.post('/bank/manual/:id/verify', async (req, res) => {
  const state = await loadUserState(req.user.uid);
  const connection = (state.bank_connections || []).find(c => c.id === req.params.id && c.provider === 'manual');
  if (!connection) return res.status(404).json({ error: 'not_found' });
  connection.status = 'verified';
  connection.verified_at = new Date().toISOString();
  await saveUserState(req.user.uid, state);
  await appendAudit(req.user.uid, { type: 'rail.bank_manual_verified', ref_id: connection.id, actor: req.user.email });
  res.json(connection);
});

router.post('/reconcile/:id', async (req, res) => {
  const state = await loadUserState(req.user.uid);
  const order = state.payment_orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'not_found' });

  const providerPayment = state.provider_payments.find(p => p.payment_order_id === order.id);
  const match = state.bank_transactions.find(txn =>
    !txn.matched &&
    Number(txn.amount) === Number(order.amount) * -1 &&
    (providerPayment?.trace_number ? (txn.memo || '').includes(providerPayment.trace_number) : true)
  );

  if (!match) return res.status(400).json({ error: 'no_match' });

  const entry = {
    id: randomUUID(),
    memo: `Settlement for ${order.id}`,
    source_module: 'rail',
    external_ref: order.id,
    entry_date: new Date().toISOString().split('T')[0],
    entity_id: order.entity_id || null,
    lines: order.use_clearing
      ? [
          { account_code: '2000', debit: Number(order.amount), credit: 0, description: 'Accounts Payable' },
          { account_code: '1100', debit: 0, credit: Number(order.amount), description: 'Payments in Transit' }
        ]
      : [
          { account_code: '2000', debit: Number(order.amount), credit: 0, description: 'Accounts Payable' },
          { account_code: '1000', debit: 0, credit: Number(order.amount), description: 'Cash' }
        ]
  };
  state.journal_entries.push(entry);
  order.settlement_entry_id = entry.id;
  match.matched = true;
  match.matched_entry_id = entry.id;

  state.reconciliation_links.push({
    id: randomUUID(),
    payment_order_id: order.id,
    provider_payment_id: providerPayment?.provider_payment_id || null,
    bank_txn_id: match.id,
    clearing_journal_entry_id: order.clearing_entry_id || null,
    settlement_journal_entry_id: entry.id,
    reversal_journal_entry_id: null,
    match_score: 1,
    matched_at: new Date().toISOString()
  });

  await saveUserState(req.user.uid, state);
  await appendAudit(req.user.uid, { type: 'rail.reconciled', ref_id: order.id, actor: req.user.email, payload: { settlement_entry_id: entry.id } });
  res.json({ order, match, entry });
});

router.post('/reconcile/run', async (req, res) => {
  res.json({ ok: true, message: 'batch reconcile placeholder' });
});

export default router;
