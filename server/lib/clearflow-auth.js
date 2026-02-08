import crypto from 'crypto';
import { loadAuthState, saveAuthState } from './clearflow-store.js';
import { verifyFirebaseTokenValue } from './firebase-auth.js';

const BOOTSTRAP_EMAIL = 'lastrust8808@gmail.com';
const BOOTSTRAP_PASSWORD = 'Khlas8808$$';
const BOOTSTRAP_ROLE = 'admin';

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generateToken() {
  return crypto.randomUUID();
}

export async function ensureBootstrapUser() {
  const state = await loadAuthState();
  if (state.users.length === 0) {
    state.users.push({
      id: crypto.randomUUID(),
      email: BOOTSTRAP_EMAIL,
      password_hash: hashPassword(BOOTSTRAP_PASSWORD),
      role: BOOTSTRAP_ROLE,
      created_at: new Date().toISOString(),
      is_active: true
    });
    await saveAuthState(state);
  }
}

export async function createUser({ email, password, role = 'viewer' }) {
  const state = await loadAuthState();
  if (state.users.find(u => u.email === email)) {
    throw new Error('User already exists');
  }
  const user = {
    id: crypto.randomUUID(),
    email,
    password_hash: hashPassword(password),
    role,
    created_at: new Date().toISOString(),
    is_active: true
  };
  state.users.push(user);
  await saveAuthState(state);
  return user;
}

export async function authenticate(email, password) {
  const state = await loadAuthState();
  const user = state.users.find(u => u.email === email && u.is_active);
  if (!user) return null;
  if (user.password_hash !== hashPassword(password)) return null;
  const token = generateToken();
  const session = {
    id: crypto.randomUUID(),
    user_id: user.id,
    token,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  };
  state.sessions.push(session);
  await saveAuthState(state);
  return { user, token };
}

export async function findSession(token) {
  const state = await loadAuthState();
  const session = state.sessions.find(s => s.token === token);
  if (!session) return null;
  if (new Date(session.expires_at) < new Date()) return null;
  const user = state.users.find(u => u.id === session.user_id);
  if (!user) return null;
  return { user, session };
}

export async function revokeSession(token) {
  const state = await loadAuthState();
  state.sessions = state.sessions.filter(s => s.token !== token);
  await saveAuthState(state);
}

export function requireRole(requiredRole = 'admin') {
  const order = ['viewer', 'operator', 'admin'];
  return (req, res, next) => {
    const role = req.user?.role || 'viewer';
    if (order.indexOf(role) < order.indexOf(requiredRole)) {
      return res.status(403).json({ error: 'forbidden' });
    }
    next();
  };
}

export function authMiddleware() {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    try {
      const session = await findSession(token);
      if (session) {
        req.user = {
          id: session.user.id,
          email: session.user.email,
          role: session.user.role,
          uid: session.user.id
        };
        return next();
      }

      const decoded = await verifyFirebaseTokenValue(token);
      req.user = {
        id: decoded.uid,
        email: decoded.email || 'google-user',
        role: 'viewer',
        uid: decoded.uid
      };
      return next();
    } catch (err) {
      res.status(401).json({ error: 'unauthorized' });
    }
  };
}
