import persistence from './gcs-persistence.js';

const COMPONENT = 'clearflow';
const AUTH_COMPONENT = 'clearflow-auth';

export async function loadUserState(uid) {
  const data = await persistence.loadData(uid, COMPONENT);
  return data || {
    entities: [],
    accounts: [],
    journal_entries: [],
    payees: [],
    payment_orders: [],
    provider_payments: [],
    rail_events: [],
    bank_connections: [],
    bank_transactions: [],
    reconciliation_links: [],
    profiles: [],
    kyc_cases: [],
    documents: [],
    communications: []
  };
}

export async function saveUserState(uid, state) {
  await persistence.saveData(uid, COMPONENT, state);
}

export async function loadAuthState() {
  const data = await persistence.loadData('system', AUTH_COMPONENT);
  return data || { users: [], sessions: [] };
}

export async function saveAuthState(state) {
  await persistence.saveData('system', AUTH_COMPONENT, state);
}
