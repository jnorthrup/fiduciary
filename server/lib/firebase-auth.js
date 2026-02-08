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

  try {
    const decoded = await verifyFirebaseTokenValue(token);
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(err?.status || 403).json({
      error: err?.code || 'forbidden',
      message: err?.message || 'Invalid ID token'
    });
  }
}

export async function verifyFirebaseTokenValue(token) {
  if (process.env.NODE_ENV !== 'production' && token === 'dev-token') {
    return { uid: 'dev-user-local', email: 'dev@localhost' };
  }

  ensureFirebaseAdmin();
  if (!firebaseReady) {
    const error = new Error('Firebase auth not initialized. Use dev-token in development.');
    error.code = 'auth_unavailable';
    error.status = 503;
    throw error;
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    return decoded;
  } catch (err) {
    const error = new Error('Invalid ID token');
    error.code = 'forbidden';
    error.status = 403;
    throw error;
  }
}
