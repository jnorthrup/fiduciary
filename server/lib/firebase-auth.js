import admin from 'firebase-admin';

let firebaseReady = false;

function ensureFirebaseAdmin() {
  if (firebaseReady) return;
  if (admin.apps.length > 0) {
    firebaseReady = true;
    return;
  }

  try {
    const svc = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.GOOGLE_AUTH_FIREBASE_SERVICE_ACCOUNT;
    if (svc) {
      const serviceAccount = typeof svc === 'string' ? JSON.parse(svc) : svc;
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    } else {
      admin.initializeApp();
    }
    firebaseReady = true;
  } catch (err) {
    console.warn('[AUTH] Firebase Admin init failed; dev-token only.', err?.message || err);
    firebaseReady = false;
  }
}

export async function verifyFirebaseToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'unauthorized', message: 'No ID token provided' });
  }

  const token = authHeader.slice('Bearer '.length).trim();

  if (process.env.NODE_ENV !== 'production' && token === 'dev-token') {
    req.user = { uid: 'dev-user-local', email: 'dev@localhost' };
    return next();
  }

  ensureFirebaseAdmin();
  if (!firebaseReady) {
    return res.status(503).json({
      error: 'auth_unavailable',
      message: 'Firebase auth not initialized. Use dev-token in development.',
    });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(403).json({ error: 'forbidden', message: 'Invalid ID token' });
  }
}
