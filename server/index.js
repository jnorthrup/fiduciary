import express from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { irisOAuthRouter, authenticateToken } from './routes/iris-oauth.js';
import { generateClientJWT, generateUserJWT } from './jwt-utils.js';
import irsPortalAuthRouter from './routes/irs-portal-auth.js';
import auditRouter from './routes/audit.js';
import bankingRouter from './routes/banking.js';
import baselaneRouter from './routes/baselane.js';
import bsoRouter from './routes/bso.js';
import ledgerRouter from './routes/ledger.js';
import migrationRouter from './routes/migration.js';
import nachaRouter from './routes/nacha.js';
import settlementRouter from './routes/settlement.js';
import trustsRouter from './routes/trusts.js';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { connect as connectBus, subscribe } from './lib/event-bus.js';
import { initializeSettlementConsumer } from './lib/settlement-events.js';
import admin from 'firebase-admin';
import persistence from './lib/gcs-persistence.js';
import config from './config/env-config.js';

// =============================================================================
// Firebase Admin Initialization (using config module)
// =============================================================================
const initFirebase = () => {
  const { GOOGLE_AUTH } = config;

  if (GOOGLE_AUTH.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const serviceAccount = typeof GOOGLE_AUTH.FIREBASE_SERVICE_ACCOUNT === 'string'
        ? JSON.parse(GOOGLE_AUTH.FIREBASE_SERVICE_ACCOUNT)
        : GOOGLE_AUTH.FIREBASE_SERVICE_ACCOUNT;
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.info("[GOOGLE_AUTH] Firebase Admin initialized with service account");
    } catch (e) {
      console.error("[GOOGLE_AUTH] Failed to parse FIREBASE_SERVICE_ACCOUNT:", e.message);
      // Fall through to ADC
      admin.initializeApp();
      console.info("[GOOGLE_AUTH] Firebase Admin initialized with Application Default Credentials");
    }
  } else {
    // Fallback to Application Default Credentials (ADC)
    // In Cloud Run, this uses the service account attached to the revision
    admin.initializeApp();
    console.info("[GOOGLE_AUTH] Firebase Admin initialized with Application Default Credentials");
  }
};

// Initialize Firebase
initFirebase();


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-project logger is TS, but server is JS.
// For JS server, we'll implement a simple structured logger or just clean up console calls.
const logger = {
  info: (msg, ...args) => console.info(`[INFO] ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[ERROR] ${msg}`, ...args),
  debug: (msg, ...args) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[DEBUG] ${msg}`, ...args);
    }
  }
};

const ERROR_CODES = {
  AUTH_MISSING_TCC: 'AUTH_MISSING_TCC',
  INVALID_EIN_FORMAT: 'INVALID_EIN_FORMAT',
  INVALID_PAYEE_TIN: 'INVALID_PAYEE_TIN',
  INVALID_TIN_FORMAT: 'INVALID_TIN_FORMAT',
  NO_PAYEES: 'NO_PAYEES',
  BATCH_TOO_LARGE: 'BATCH_TOO_LARGE',
  MISSING_TRANSMITTER_ID: 'MISSING_TRANSMITTER_ID',
  MISSING_FILER_EIN: 'MISSING_FILER_EIN',
  RECEIPT_NOT_FOUND: 'RECEIPT_NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
};

const PORT = process.env.PORT || 3001;

// Initialize Express app
const app = express();

// Middleware
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const tcc = req.headers['x-irs-tcc'];
  const auth = req.headers.authorization;
  const maskedTcc = tcc ? `****${String(tcc).slice(-4)}` : 'N/A';
  const maskedAuth = auth ? 'Bearer ****' : 'N/A';

  logger.info(`${req.method} ${req.path} [TCC: ${maskedTcc}, Auth: ${maskedAuth}]`);
  next();
});

/**
 * Middleware to verify Firebase ID Token
 * In development mode, accepts 'dev-token' for local testing
 */
const verifyFirebaseToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'unauthorized', message: 'No ID token provided' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  // Development mode bypass for local testing
  if (process.env.NODE_ENV !== 'production' && idToken === 'dev-token') {
    req.user = { uid: 'dev-user-local', email: 'dev@localhost' };
    logger.debug('Using development mode auth bypass');
    return next();
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    logger.error('Firebase token verification failed:', error.message);
    res.status(403).json({ error: 'forbidden', message: 'Invalid ID token' });
  }
};

// Serve static files from 'public' directory (built React app)
app.use(express.static(path.join(__dirname, 'public')));

// Apply auth to ledger/banking routes (preserving bypass for health/iris-oauth)
const protectedRoutes = ['/api/banking', '/api/audit', '/api/bso'];
protectedRoutes.forEach(route => {
  // For now, we'll selectively apply to these routers or within the routers themselves
  // For simplicity here, we'll just define the middleware and note that routers should use it
});

// Safe to remove in-memory maps
// const submissions = new Map();
// const tinValidationCache = new Map();

// ============================================================================
// IRS IRIS A2A OAuth Routes (Production API)
// ============================================================================

// Mount OAuth router at /api/iris
app.use('/api/iris', irisOAuthRouter);

// ============================================================================
// IRS Portal Authentication Routes (Playwright-based)
// ============================================================================

// Mount portal auth router at /api/irs-portal/auth
app.use('/api/irs-portal/auth', irsPortalAuthRouter);

// Protected Routes
app.use('/api/audit', verifyFirebaseToken, auditRouter);

// ============================================================================
// Banking API Routes
// ============================================================================

// Mount banking router at /api/banking
app.use('/api/banking', verifyFirebaseToken, bankingRouter);

// Mount BSO router at /api/bso
app.use('/api/bso', verifyFirebaseToken, bsoRouter);

// Mount Settlement router (Payment Orders)
app.use('/api/settlement', verifyFirebaseToken, settlementRouter);

// Mount Trusts router (LAS Trust ERP)
app.use('/api/trusts', verifyFirebaseToken, trustsRouter);

// Mount NACHA router (ACH file submission)
app.use('/api/nacha', verifyFirebaseToken, nachaRouter);

// Mount Migration router (state.json rollback)
app.use('/api/migration', verifyFirebaseToken, migrationRouter);

// Mount Baselane router (Baselane API integration)
app.use('/api/baselane', verifyFirebaseToken, baselaneRouter);

// Mount Ledger router
if (!process.env.SERVICE_NAME || process.env.SERVICE_NAME === 'ledger-service') {
  // For demo, we skip auth on this specific route for easier testing, or use verifyFirebaseToken
  app.use('/api/ledger', verifyFirebaseToken, ledgerRouter);
} else if (process.env.SERVICE_NAME === 'api-gateway' && process.env.LEDGER_SERVICE_URL) {
  // Proxy to Ledger Service
  app.use('/api/ledger', createProxyMiddleware({
    target: process.env.LEDGER_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/api/ledger': '/api/ledger' }
  }));
}

if (process.env.SERVICE_NAME === 'api-gateway' && process.env.AUDIT_SERVICE_URL) {
  // Proxy to Audit Service
  app.use('/api/audit', createProxyMiddleware({
    target: process.env.AUDIT_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/api/audit': '/api/audit' }
  }));
}


/**
 * POST /api/irs/demo/authenticate
 * Demo endpoint: Generate JWTs for testing without real credentials
 */
app.post('/api/iris/demo/authenticate', (req, res) => {
  try {
    const { clientId, userId, tcc, privateKey, keyId } = req.body;

    if (!clientId || !userId || !tcc || !privateKey || !keyId) {
      return res.status(400).json({
        error: 'missing_credentials',
        message: 'clientId, userId, tcc, privateKey, and keyId are required'
      });
    }

    const credentials = { clientId, userId, tcc, privateKey, keyId };
    const clientJWT = generateClientJWT(credentials);
    const userJWT = generateUserJWT(credentials);

    res.json({
      clientJWT,
      userJWT,
      expiresIn: 900,
      message: 'Use these JWTs with /api/iris/auth/oauth/v2/token'
    });

  } catch (error) {
    logger.error('[Demo] Auth error:', error);
    res.status(500).json({
      error: 'generation_failed',
      message: error.message
    });
  }
});

// ============================================================================
// Legacy Mock Routes (for backward compatibility)
// ============================================================================

/**
 * GET /api/irs/health
 * Health check endpoint
 */
app.get('/api/irs/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'IRS IRIS A2A API Server',
    version: '2.0.0',
    features: [
      'OAuth 2.0 JWT Bearer Authentication',
      'IRIS Production API Endpoints',
      'Legacy Mock Endpoints'
    ],
    endpoints: {
      oauth: '/api/iris/auth/oauth/v2/token',
      submission: '/api/iris/intake-acceptance',
      status: '/api/iris/transstatusorack',
      demo: '/api/iris/demo/authenticate',
      openapi: '/api/openapi.yaml',
      docs: '/api/docs'
    }
  });
});

/**
 * GET /api/openapi.yaml
 * Serve OpenAPI 3.1 specification
 */
app.get('/api/openapi.yaml', (req, res) => {
  try {
    const specPath = path.join(__dirname, '../specs/unified-api-openapi.yaml');
    const spec = fs.readFileSync(specPath, 'utf-8');
    res.setHeader('Content-Type', 'text/yaml');
    res.send(spec);
  } catch (error) {
    logger.error('Failed to read OpenAPI spec:', error);
    res.status(500).json({
      error: 'Failed to load OpenAPI specification',
      message: error.message
    });
  }
});

/**
 * GET /api/docs
 * Redirect to Swagger UI for API documentation
 */
app.get('/api/docs', (req, res) => {
  res.redirect('https://redocly.github.io/redoc/?url=' + encodeURIComponent(`${req.protocol}://${req.get('host')}/api/openapi.yaml`));
});

/**
 * GET /api
 * API information and links
 */
app.get('/api', (req, res) => {
  res.json({
    name: 'Trust Ledger System API',
    version: '1.0.0',
    description: 'Unified API for IRS IRIS, SSA BSO, and Ledger management',
    endpoints: {
      health: '/api/health',
      irs: '/api/iris',
      bso: '/api/bso',
      ledger: '/api/ledger',
      docs: '/api/docs',
      openapi: '/api/openapi.yaml'
    },
    documentation: `${req.protocol}://${req.get('host')}/api/docs`,
    openapiSpec: `${req.protocol}://${req.get('host')}/api/openapi.yaml`
  });
});

/**
 * GET /api/health
 * Root health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      irs: 'operational',
      bso: 'operational',
      ledger: 'operational'
    }
  });
});

/**
 * POST /api/irs/submissions
 * Submit information return batch
 */
app.post('/api/irs/submissions', verifyFirebaseToken, async (req, res) => {
  try {
    const uid = req.user.uid;
    const submission = req.body;

    // Basic validation
    const errors = [];

    if (!submission.transmitterId) {
      errors.push({
        code: ERROR_CODES.MISSING_TRANSMITTER_ID,
        message: 'Transmitter ID is required',
        field: 'transmitterId',
        severity: 'ERROR'
      });
    }

    if (!submission.filer?.ein) {
      errors.push({
        code: 'MISSING_FILER_EIN',
        message: 'Filer EIN is required',
        field: 'filer.ein',
        severity: 'ERROR'
      });
    } else {
      const einPattern = /^\d{2}-\d{7}$/;
      if (!einPattern.test(submission.filer.ein)) {
        errors.push({
          code: ERROR_CODES.INVALID_EIN_FORMAT,
          message: 'EIN must be in format XX-XXXXXXX',
          field: 'filer.ein',
          severity: 'ERROR'
        });
      }
    }

    if (!submission.payees || submission.payees.length === 0) {
      errors.push({
        code: ERROR_CODES.NO_PAYEES,
        message: 'At least one payee is required',
        field: 'payees',
        severity: 'ERROR'
      });
    }

    if (submission.payees && submission.payees.length > 1000) {
      errors.push({
        code: ERROR_CODES.BATCH_TOO_LARGE,
        message: 'Maximum 1000 payees per submission',
        field: 'payees',
        severity: 'ERROR'
      });
    }

    // Validate payee TINs
    submission.payees?.forEach((payee, index) => {
      const einPattern = /^\d{2}-\d{7}$/;
      const ssnPattern = /^\d{3}-\d{2}-\d{4}$/;

      if (!einPattern.test(payee.tin) && !ssnPattern.test(payee.tin)) {
        errors.push({
          code: ERROR_CODES.INVALID_PAYEE_TIN,
          message: `Payee ${index + 1}: TIN must be in format XX-XXXXXXX or XXX-XX-XXXX`,
          field: `payees[${index}].tin`,
          severity: 'ERROR'
        });
      }
    });

    // If errors, return 400
    if (errors.length > 0) {
      return res.status(400).json({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Submission validation failed',
        errors,
        timestamp: new Date().toISOString()
      });
    }

    // Generate receipt ID
    const receiptId = randomUUID();

    // Store submission in GCS
    const state = await persistence.loadData(uid, 'iris') || { submissions: {}, tinValidationCache: {} };
    state.submissions[receiptId] = {
      ...submission,
      receiptId,
      status: 'Processing',
      submittedAt: new Date().toISOString(),
      validation: {
        valid: true,
        errors: [],
        warnings: []
      }
    };
    await persistence.saveData(uid, 'iris', state);

    // Return receipt
    res.status(202).json({
      receiptId,
      status: 'Received',
      timestamp: new Date().toISOString(),
      estimatedCompletion: new Date(Date.now() + 10 * 1000).toISOString(),
      message: 'Your submission has been received and is being processed.',
      warnings: [],
      errors: []
    });

  } catch (error) {
    logger.error('Submission error:', error);
    res.status(500).json({
      code: ERROR_CODES.INTERNAL_ERROR,
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/irs/submissions/:receiptId/status
 * Get submission status
 */
app.get('/api/irs/submissions/:receiptId/status', verifyFirebaseToken, async (req, res) => {
  const { receiptId } = req.params;
  const uid = req.user.uid;

  const state = await persistence.loadData(uid, 'iris');
  const submission = state?.submissions?.[receiptId];

  if (!submission) {
    return res.status(404).json({
      code: 'RECEIPT_NOT_FOUND',
      message: `Receipt ${receiptId} not found`,
      timestamp: new Date().toISOString()
    });
  }

  // Simulate processing completion after delay
  const ageMs = Date.now() - new Date(submission.submittedAt).getTime();
  const isComplete = ageMs > 10000; // 10 seconds for demo

  let status = submission.status;
  let completedAt = null;

  if (isComplete && status === 'Processing') {
    status = 'Accepted';
    completedAt = new Date().toISOString();
    submission.status = status;
    submission.completedAt = completedAt;

    state.submissions[receiptId] = submission;
    await persistence.saveData(uid, 'iris', state);
  }

  res.json({
    receiptId,
    status,
    submittedAt: submission.submittedAt,
    completedAt: completedAt || submission.completedAt,
    recordCount: submission.payees?.length || 0,
    acceptedCount: status === 'Accepted' ? (submission.payees?.length || 0) : 0,
    errorCount: submission.validation?.errors?.length || 0,
    warningCount: submission.validation?.warnings?.length || 0,
    errors: submission.validation?.errors || [],
    warnings: submission.validation?.warnings || [],
    processingTime: completedAt ? Math.round(ageMs / 1000) : null
  });
});

/**
 * POST /api/irs/tin-validation
 * Interactive TIN matching
 */
app.post('/api/irs/tin-validation', verifyFirebaseToken, async (req, res) => {
  try {
    const uid = req.user.uid;
    const { tin, name, requests } = req.body;

    const state = await persistence.loadData(uid, 'iris') || { submissions: {}, tinValidationCache: {} };

    // Single TIN validation
    if (tin && name) {
      const cacheKey = `${tin}-${name}`;

      // Check cache
      if (state.tinValidationCache[cacheKey]) {
        return res.json(state.tinValidationCache[cacheKey]);
      }

      // Validate TIN format
      const einPattern = /^\d{2}-\d{7}$/;
      const ssnPattern = /^\d{3}-\d{2}-\d{4}$/;
      const isValidFormat = einPattern.test(tin) || ssnPattern.test(tin);

      if (!isValidFormat) {
        const result = {
          code: 2,
          match: false,
          message: 'Invalid TIN format. Expected XX-XXXXXXX for EIN or XXX-XX-XXXX for SSN.',
          tin,
          name
        };
        state.tinValidationCache[cacheKey] = result;
        await persistence.saveData(uid, 'iris', state);
        return res.json(result);
      }

      // Simulate successful validation for demo
      const result = {
        code: 0,
        match: true,
        message: 'TIN and name combination validated successfully.',
        tin,
        name
      };

      state.tinValidationCache[cacheKey] = result;
      await persistence.saveData(uid, 'iris', state);
      return res.json(result);
    }

    // Batch validation
    if (requests && Array.isArray(requests)) {
      const results = [];
      for (const { tin, name } of requests) {
        const cacheKey = `${tin}-${name}`;

        if (state.tinValidationCache[cacheKey]) {
          results.push(state.tinValidationCache[cacheKey]);
          continue;
        }

        const result = {
          code: 0,
          match: true,
          message: 'Validated successfully',
          tin,
          name
        };

        state.tinValidationCache[cacheKey] = result;
        results.push(result);
      }

      await persistence.saveData(uid, 'iris', state);

      return res.json({
        results,
        requestId: randomUUID()
      });
    }

    res.status(400).json({
      code: 'INVALID_REQUEST',
      message: 'Must provide either tin/name pair or requests array'
    });

  } catch (error) {
    logger.error('TIN validation error:', error);
    res.status(500).json({
      code: ERROR_CODES.INTERNAL_ERROR,
      message: error.message
    });
  }
});

/**
 * POST /api/irs/transmission-check
 * Pre-transmission validation
 */
app.post('/api/irs/transmission-check', (req, res) => {
  try {
    const submission = req.body;
    const errors = [];
    const warnings = [];

    // Basic validation
    if (!submission.transmitterId || !/^\d{10}$/.test(submission.transmitterId)) {
      errors.push({
        code: 'INVALID_TRANSMITTER_ID',
        message: 'Transmitter ID must be 10 digits',
        field: 'transmitterId',
        severity: 'ERROR'
      });
    }

    if (!submission.filer?.ein || !/^\d{2}-\d{7}$/.test(submission.filer.ein)) {
      errors.push({
        code: 'INVALID_EIN',
        message: 'Filer EIN must be in format XX-XXXXXXX',
        field: 'filer.ein',
        severity: 'ERROR'
      });
    }

    if (!submission.taxYear || submission.taxYear < 2020 || submission.taxYear > 2030) {
      errors.push({
        code: 'INVALID_TAX_YEAR',
        message: 'Tax year must be between 2020 and 2030',
        field: 'taxYear',
        severity: 'ERROR'
      });
    }

    // Validate payees
    if (submission.payees && submission.payees.length > 0) {
      if (submission.payees.length > 1000) {
        errors.push({
          code: 'BATCH_TOO_LARGE',
          message: 'Maximum 1000 payees per submission',
          field: 'payees',
          severity: 'ERROR'
        });
      }

      submission.payees.forEach((payee, i) => {
        const einPattern = /^\d{2}-\d{7}$/;
        const ssnPattern = /^\d{3}-\d{2}-\d{4}$/;

        if (!einPattern.test(payee.tin) && !ssnPattern.test(payee.tin)) {
          errors.push({
            code: 'INVALID_TIN_FORMAT',
            message: `Payee ${i + 1}: TIN must be in format XX-XXXXXXX or XXX-XX-XXXX`,
            field: `payees[${i}].tin`,
            severity: 'ERROR'
          });
        }

        if (!payee.name || payee.name.trim().length === 0) {
          errors.push({
            code: 'MISSING_PAYEE_NAME',
            message: `Payee ${i + 1}: Name is required`,
            field: `payees[${i}].name`,
            severity: 'ERROR'
          });
        }
      });
    }

    res.json({
      valid: errors.length === 0,
      warnings,
      errors
    });

  } catch (error) {
    logger.error('Transmission check error:', error);
    res.status(500).json({
      valid: false,
      errors: [{
        code: ERROR_CODES.INTERNAL_ERROR,
        message: error.message,
        severity: 'ERROR'
      }]
    });
  }
});

/**
 * GET /api/irs/schemas/:formType
 * Get form schema
 */
app.get('/api/irs/schemas/:formType', (req, res) => {
  const { formType } = req.params;

  const validForms = ['1099-NEC', '1099-MISC', '1099-INT', '1099-DIV', '1099-B', '1099-R', '1099-S', 'W-2', 'W-2G', '1042-S', '3921', '3922'];

  if (!validForms.includes(formType)) {
    return res.status(404).json({
      code: 'FORM_NOT_FOUND',
      message: `Form type ${formType} not supported`
    });
  }

  const schemas = {
    '1099-NEC': {
      type: 'object',
      title: 'Form 1099-NEC',
      description: 'Nonemployee Compensation',
      required: ['nonemployeeCompensation'],
      properties: {
        nonemployeeCompensation: {
          type: 'number',
          minimum: 0,
          description: 'Box 1: Nonemployee compensation'
        }
      }
    },
    '1099-INT': {
      type: 'object',
      title: 'Form 1099-INT',
      description: 'Interest Income',
      properties: {
        interestIncome: { type: 'number', minimum: 0 },
        earlyWithdrawalPenalty: { type: 'number', minimum: 0 },
        federalIncomeTaxWithheld: { type: 'number', minimum: 0 }
      }
    },
    '1099-DIV': {
      type: 'object',
      title: 'Form 1099-DIV',
      description: 'Dividends and Distributions',
      properties: {
        ordinaryDividends: { type: 'number', minimum: 0 },
        qualifiedDividends: { type: 'number', minimum: 0 },
        capitalGainDistributions: { type: 'number', minimum: 0 }
      }
    },
    'W-2': {
      type: 'object',
      title: 'Form W-2',
      description: 'Wage and Tax Statement',
      properties: {
        wagesTipsOtherComp: { type: 'number', minimum: 0 },
        federalIncomeTaxWithheld: { type: 'number', minimum: 0 },
        socialSecurityWages: { type: 'number', minimum: 0 }
      }
    }
  };

  res.json(schemas[formType] || {
    type: 'object',
    title: `Form ${formType}`,
    description: 'Schema available for production forms'
  });
});

// SPA Catch-all: specific API routes above should be hit first.
// If no API route matched, serve the frontend.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================================================
// Error Handler
// ============================================================================

app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    code: ERROR_CODES.INTERNAL_ERROR,
    message: err.message || 'An unexpected error occurred',
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// Start Server
// ============================================================================

const startServer = async () => {
  // Connect to Event Bus if configured
  if (process.env.RABBITMQ_HOST) {
    try {
      await connectBus(process.env.RABBITMQ_HOST, process.env.RABBITMQ_PORT);

      // Setup Audit Consumer (if this is the audit service or the monolith)
      if (!process.env.SERVICE_NAME || process.env.SERVICE_NAME === 'audit-service') {
        subscribe('journal.entry_created', async (data) => {
          logger.info('AUDIT LOG: Journal Entry Created:', data);
          // In a real implementation, we would write to the audit database here
        }, 'audit_queue');
      }

      // Setup Settlement Event Consumer (auto-create payment orders from journal entries)
      if (!process.env.SERVICE_NAME || process.env.SERVICE_NAME === 'api-gateway') {
        await initializeSettlementConsumer();
      }
    } catch (e) {
      logger.error('Failed to init Event Bus:', e);
    }
  }

  app.listen(PORT, async () => {
    try {
      await persistence.ensureBucket();
      logger.info("GCS bucket verified");
    } catch (e) {
      logger.error("Failed to verify GCS bucket:", e.message);
    }
    logger.info(`IRS IRIS A2A API Server running on http://localhost:${PORT}`);
    logger.info(`OAuth: http://localhost:${PORT}/api/iris/auth/oauth/v2/token`);
    logger.info(`Demo JWT Gen: http://localhost:${PORT}/api/iris/demo/authenticate`);
  });
};

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
