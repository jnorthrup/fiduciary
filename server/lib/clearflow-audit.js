import crypto from 'crypto';
import { loadAuthState, loadUserState, saveAuthState, saveUserState } from './clearflow-store.js';
import persistence from './gcs-persistence.js';

const AUDIT_COMPONENT = 'clearflow-audit';

function hashPayload(payload) {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

export async function appendAudit(uid, event) {
  const prev = (await persistence.loadData(uid, AUDIT_COMPONENT)) || [];
  const lastHash = prev.length ? prev[prev.length - 1].hash : null;
  const payloadHash = event.payload ? hashPayload(event.payload) : null;
  const record = {
    id: crypto.randomUUID(),
    type: event.type,
    ref_id: event.ref_id,
    actor: event.actor,
    ts: new Date().toISOString(),
    payload_hash: payloadHash,
    prev_hash: lastHash
  };
  record.hash = hashPayload({
    type: record.type,
    ref_id: record.ref_id,
    actor: record.actor,
    ts: record.ts,
    payload_hash: record.payload_hash,
    prev_hash: record.prev_hash
  });
  prev.push(record);
  await persistence.saveData(uid, AUDIT_COMPONENT, prev);
  return record;
}
