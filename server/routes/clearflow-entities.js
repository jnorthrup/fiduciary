import express from 'express';
import { randomUUID } from 'crypto';
import { loadUserState, saveUserState } from '../lib/clearflow-store.js';
import { appendAudit } from '../lib/clearflow-audit.js';
import { requireRole } from '../lib/clearflow-auth.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const state = await loadUserState(req.user.uid);
  res.json(state.entities);
});

router.post('/', requireRole('admin'), async (req, res) => {
  const state = await loadUserState(req.user.uid);
  const entity = {
    id: randomUUID(),
    entity_name: req.body.entity_name,
    entity_type: req.body.entity_type,
    status: req.body.status || 'active',
    treasury_status: req.body.treasury_status || 'submitted',
    is_affiliated: !!req.body.is_affiliated,
    lending_enabled: !!req.body.lending_enabled,
    memo: req.body.memo || '',
    compliance_docs: {
      w9_on_file: !!req.body.w9_on_file,
      cot_on_file: !!req.body.cot_on_file,
      coe_on_file: !!req.body.coe_on_file,
      cp575_on_file: !!req.body.cp575_on_file,
      doc_refs: req.body.doc_refs || []
    },
    verification: {
      email: req.body.verify_email || null,
      phone: req.body.verify_phone || null,
      auth_app: !!req.body.verify_auth_app,
      status: 'submitted'
    },
    created_at: new Date().toISOString()
  };
  state.entities.push(entity);

  state.profiles.push({
    id: randomUUID(),
    type: 'BUSINESS',
    entity_id: entity.id,
    fields_json: {
      entity_name: entity.entity_name,
      entity_type: entity.entity_type,
      memo: entity.memo
    },
    status: 'submitted'
  });

  state.kyc_cases.push({
    id: randomUUID(),
    profile_id: state.profiles[state.profiles.length - 1].id,
    provider: 'internal',
    provider_case_id: `kyc-${Date.now()}`,
    status: 'submitted'
  });

  await saveUserState(req.user.uid, state);
  await appendAudit(req.user.uid, { type: 'entity.created', ref_id: entity.id, actor: req.user.email, payload: { entity_name: entity.entity_name } });
  res.status(201).json(entity);
});

router.patch('/:id', requireRole('admin'), async (req, res) => {
  const state = await loadUserState(req.user.uid);
  const idx = state.entities.findIndex(e => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not_found' });
  state.entities[idx] = { ...state.entities[idx], ...req.body };
  await saveUserState(req.user.uid, state);
  await appendAudit(req.user.uid, { type: 'entity.updated', ref_id: req.params.id, actor: req.user.email, payload: req.body });
  res.json(state.entities[idx]);
});

router.post('/:id/verify', requireRole('admin'), async (req, res) => {
  const state = await loadUserState(req.user.uid);
  const entity = state.entities.find(e => e.id === req.params.id);
  if (!entity) return res.status(404).json({ error: 'not_found' });
  entity.verification = { ...(entity.verification || {}), status: 'verified', verified_at: new Date().toISOString() };
  await saveUserState(req.user.uid, state);
  await appendAudit(req.user.uid, { type: 'entity.verified', ref_id: entity.id, actor: req.user.email });
  res.json(entity);
});

router.post('/:id/approve', requireRole('admin'), async (req, res) => {
  const state = await loadUserState(req.user.uid);
  const entity = state.entities.find(e => e.id === req.params.id);
  if (!entity) return res.status(404).json({ error: 'not_found' });
  entity.treasury_status = 'approved';
  entity.approved_at = new Date().toISOString();
  await saveUserState(req.user.uid, state);
  await appendAudit(req.user.uid, { type: 'entity.approved', ref_id: entity.id, actor: req.user.email });
  res.json(entity);
});

export default router;
