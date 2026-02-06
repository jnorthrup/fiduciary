import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

import { createLogger } from './lib/logger.js';
import { verifyFirebaseToken } from './lib/firebase-auth.js';

import { irisOAuthRouter } from './routes/iris-oauth.js';
import irsPortalAuthRouter from './routes/irs-portal-auth.js';
import auditRouter from './routes/audit.js';
import bankingRouter from './routes/banking.js';
import bsoRouter from './routes/bso.js';
import ledgerRouter from './routes/ledger.js';
import clearflowAuthRouter from './routes/clearflow-auth.js';
import clearflowEntitiesRouter from './routes/clearflow-entities.js';
import clearflowLedgerRouter from './routes/clearflow-ledger.js';
import clearflowRailRouter from './routes/clearflow-rail.js';
import clearflowChartsRouter from './routes/clearflow-charts.js';
import { authMiddleware } from './lib/clearflow-auth.js';

import migrationRouter from './routes/migration.js';

import nachaRouter from './routes/nacha.js';
import settlementRouter from './routes/settlement.js';
import trustsRouter from './routes/trusts.js';

import { createProxyMiddleware } from 'http-proxy-middleware';

const logger = createLogger('SERVER');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---- Config (minimal / safe defaults) ----
const PORT = Number(process.env.PORT || 3001);
const CORS_ORIGINS = process.env.CORS_ORIGINS || '*';
const SERVICE_NAME = process.env.SERVICE_NAME || 'monolith'; // "ledger" in some deployments

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', CORS_ORIGINS);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
}

const app = express();

// ---- Middleware ----
app.use((req, res, next) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

app.use(express.json({
  limit: '50mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static (if present)
app.use(express.static(path.join(__dirname, 'public')));

// ---- Public Routes ----
app.use('/api/iris', irisOAuthRouter);
app.use('/api/irs-portal/auth', irsPortalAuthRouter);
app.use('/api/auth', clearflowAuthRouter);
app.use('/api/entities', authMiddleware(), clearflowEntitiesRouter);
app.use('/api/ledger', authMiddleware(), clearflowLedgerRouter);
app.use('/api/rail', authMiddleware(), clearflowRailRouter);
app.use('/api/charts', authMiddleware(), clearflowChartsRouter);

// Non /api aliases for frontend convenience
app.use('/auth', clearflowAuthRouter);
app.use('/entities', authMiddleware(), clearflowEntitiesRouter);
app.use('/ledger', authMiddleware(), clearflowLedgerRouter);
app.use('/rail', authMiddleware(), clearflowRailRouter);
app.use('/charts', authMiddleware(), clearflowChartsRouter);

// ---- Protected Routers ----
app.use('/api/audit', verifyFirebaseToken, auditRouter);
app.use('/api/banking', verifyFirebaseToken, bankingRouter);
app.use('/api/bso', verifyFirebaseToken, bsoRouter);
app.use('/api/settlement', verifyFirebaseToken, settlementRouter);
app.use('/api/trusts', verifyFirebaseToken, trustsRouter);
app.use('/api/nacha', verifyFirebaseToken, nachaRouter);

app.use('/api/migration', verifyFirebaseToken, migrationRouter);

// ---- Ledger router / proxy (depending on SERVICE_NAME) ----
if (SERVICE_NAME === 'ledger') {
  app.use('/api/ledger', verifyFirebaseToken, ledgerRouter);
} else {
  // If another service is hosting ledger routes, proxy to it (defaults to same host)
  const LEDGER_TARGET = process.env.LEDGER_TARGET || `http://localhost:${PORT}`;
  app.use(
    '/api/ledger',
    createProxyMiddleware({
      target: LEDGER_TARGET,
      changeOrigin: true,
      pathRewrite: { '^/api/ledger': '/api/ledger' },
      logLevel: 'silent',
    })
  );
}

// ---- Root API index ----
app.get('/api', (req, res) => {
  res.json({
    ok: true,
    routes: {
      health: '/api/health',
      irs: '/api/irs',
      iris: '/api/iris',
      bso: '/api/bso',
      ledger: '/api/ledger',
      trusts: '/api/trusts',
      docs: '/api/docs',
      openapi: '/api/openapi.yaml',
    },
  });
});

// ---- Health ----
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: { irs: 'operational', bso: 'operational', ledger: 'operational' },
  });
});

// ---- Basic docs/openapi placeholders ----
app.get('/api/openapi.yaml', (req, res) => {
  res.status(404).send('openapi.yaml not configured in this build');
});

app.get('/api/docs', (req, res) => {
  res.status(404).send('docs not configured in this build');
});

// ---- API error handler ----
app.use('/api', (err, req, res, next) => {
  logger.error('API error', err);
  res.status(err?.status || 500).json({
    error: 'server_error',
    message: err?.message || 'Internal Server Error',
  });
});

// ---- 404 for /api ----
app.use('/api', (req, res) => {
  res.status(404).json({
    error: 'not_found',
    path: req.path,
    method: req.method,
    ts: new Date().toISOString(),
  });
});

// ---- Start ----
app.listen(PORT, () => {
  logger.info(`IRS IRIS A2A API Server running on http://localhost:${PORT}`);
  logger.info(`Health: http://localhost:${PORT}/api/health`);
});
