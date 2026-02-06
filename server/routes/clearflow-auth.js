import express from 'express';
import { randomUUID } from 'crypto';
import { authenticate, authMiddleware, createUser, ensureBootstrapUser, revokeSession } from '../lib/clearflow-auth.js';
import { appendAudit } from '../lib/clearflow-audit.js';
import { loadUserState, saveUserState } from '../lib/clearflow-store.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    await ensureBootstrapUser();
    const { email, password, role } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'validation', message: 'email and password required' });
    }
    if (!req.body.termsAccepted) {
      return res.status(400).json({ error: 'validation', message: 'termsAccepted required' });
    }
    const user = await createUser({ email, password, role });
    const state = await loadUserState(user.id);
    state.profiles.push({
      id: randomUUID(),
      type: 'INDIVIDUAL',
      entity_id: user.id,
      fields_json: { email: user.email },
      status: 'submitted'
    });
    state.kyc_cases.push({
      id: randomUUID(),
      profile_id: state.profiles[state.profiles.length - 1].id,
      provider: 'internal',
      provider_case_id: `kyc-${Date.now()}`,
      status: 'submitted'
    });
    await saveUserState(user.id, state);
    await appendAudit(user.id, { type: 'user.registered', ref_id: user.id, actor: user.email, payload: { role: user.role } });
    res.status(201).json({ id: user.id, email: user.email, role: user.role });
  } catch (err) {
    res.status(400).json({ error: 'register_failed', message: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    await ensureBootstrapUser();
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'validation', message: 'email and password required' });
    }
    const result = await authenticate(email, password);
    if (!result) return res.status(401).json({ error: 'unauthorized' });
    await appendAudit(result.user.id, { type: 'auth.login', ref_id: result.user.id, actor: result.user.email });
    res.json({ token: result.token, user: { id: result.user.id, email: result.user.email, role: result.user.role } });
  } catch (err) {
    res.status(500).json({ error: 'login_failed', message: err.message });
  }
});

router.post('/logout', authMiddleware(), async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '').trim();
  await revokeSession(token);
  await appendAudit(req.user.id, { type: 'auth.logout', ref_id: req.user.id, actor: req.user.email });
  res.json({ ok: true });
});

router.get('/me', authMiddleware(), async (req, res) => {
  res.json({ id: req.user.id, email: req.user.email, role: req.user.role });
});

export default router;
