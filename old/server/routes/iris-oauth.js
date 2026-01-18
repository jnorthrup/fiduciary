/**
 * IRS IRIS A2A OAuth Routes
 * Handles JWT-based authentication and token management
 */

import express from 'express';
import { generateClientJWT, generateUserJWT, validateTCC, generateUTID } from '../jwt-utils.js';

const router = express.Router();

// In-memory token store (production: use Redis)
const tokenStore = new Map();
const submissionStore = new Map();

/**
 * Middleware to validate X-IRS-TCC header
 */
function validateTCCHeader(req, res, next) {
  const tcc = req.headers['x-irs-tcc'];

  if (!tcc) {
    return res.status(401).json({
      error: 'invalid_client',
      error_description: 'Missing X-IRS-TCC header'
    });
  }

  if (!validateTCC(tcc)) {
    return res.status(401).json({
      error: 'invalid_client',
      error_description: 'Invalid TCC format. Must be 5 characters starting with D or T'
    });
  }

  req.tcc = tcc;
  next();
}

/**
 * POST /api/iris/auth/oauth/v2/token
 * OAuth 2.0 Token Endpoint (JWT Bearer Grant)
 *
 * Request body (application/x-www-form-urlencoded):
 * - grant_type: urn:ietf:params:oauth:grant-type:jwt-bearer
 * - assertion: User JWT
 * - client_assertion_type: urn:ietf:params:oauth:client-assertion-type:jwt-bearer
 * - client_assertion: Client JWT
 */
router.post('/auth/oauth/v2/token', validateTCCHeader, async (req, res) => {
  try {
    const {
      grant_type,
      assertion,
      client_assertion_type,
      client_assertion
    } = req.body;

    // Validate grant type
    if (grant_type !== 'urn:ietf:params:oauth:grant-type:jwt-bearer') {
      return res.status(400).json({
        error: 'unsupported_grant_type',
        error_description: 'Only JWT bearer grant is supported'
      });
    }

    // Validate client assertion type
    if (client_assertion_type !== 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer') {
      return res.status(400).json({
        error: 'invalid_client_assertion',
        error_description: 'Invalid client assertion type'
      });
    }

    // Parse JWTs (format: header.payload.signature)
    if (!assertion || !client_assertion) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Missing assertion or client_assertion'
      });
    }

    const userPayload = parseJWT(assertion);
    const clientPayload = parseJWT(client_assertion);

    // Validate JWT structure
    if (!userPayload || !clientPayload) {
      return res.status(401).json({
        error: 'invalid_grant',
        error_description: 'Invalid JWT format'
      });
    }

    // Validate JWT claims
    const now = Math.floor(Date.now() / 1000);

    if (clientPayload.exp < now) {
      return res.status(401).json({
        error: 'invalid_client',
        error_description: 'Client JWT expired'
      });
    }

    if (userPayload.exp < now) {
      return res.status(401).json({
        error: 'invalid_grant',
        error_description: 'User JWT expired'
      });
    }

    if (clientPayload.aud !== 'https://api.irs.gov') {
      return res.status(401).json({
        error: 'invalid_client',
        error_description: 'Invalid audience in client JWT'
      });
    }

    if (userPayload.aud !== 'https://api.irs.gov') {
      return res.status(401).json({
        error: 'invalid_grant',
        error_description: 'Invalid audience in user JWT'
      });
    }

    // Generate access token (15 minute expiry)
    const accessToken = generateAccessToken(clientPayload, userPayload);
    const refreshToken = generateRefreshToken();

    const tokenResponse = {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 900, // 15 minutes
      refresh_token: refreshToken
    };

    // Store token for later validation
    tokenStore.set(accessToken, {
      clientPayload,
      userPayload,
      expiresAt: now + 900,
      tcc: req.tcc
    });

    res.json(tokenResponse);

  } catch (error) {
    console.error('[OAuth] Token error:', error);
    res.status(500).json({
      error: 'server_error',
      error_description: error.message
    });
  }
});

/**
 * Middleware to validate Bearer token
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'invalid_token',
      error_description: 'Missing or invalid Authorization header'
    });
  }

  const token = authHeader.substring(7);
  const tokenData = tokenStore.get(token);

  if (!tokenData) {
    return res.status(401).json({
      error: 'invalid_token',
      error_description: 'Token not found or expired'
    });
  }

  const now = Math.floor(Date.now() / 1000);
  if (tokenData.expiresAt < now) {
    tokenStore.delete(token);
    return res.status(401).json({
      error: 'invalid_token',
      error_description: 'Token expired'
    });
  }

  req.token = token;
  req.tokenData = tokenData;
  next();
}

/**
 * POST /api/iris/intake-acceptance
 * Submit 1099 transmission to IRS
 */
router.post('/intake-acceptance', authenticateToken, async (req, res) => {
  try {
    const formData = req.body;
    const tcc = req.tokenData.tcc;

    // Validate multipart/form-data with XML file
    if (!formData || !formData.file) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Missing XML file submission'
      });
    }

    // Generate receipt ID and UTID
    const receiptId = crypto.randomUUID();
    const utid = generateUTID(tcc);

    // Store submission
    submissionStore.set(receiptId, {
      utid,
      tcc,
      status: 'Processing',
      submittedAt: new Date().toISOString(),
      userId: req.tokenData.userPayload.sub,
      clientId: req.tokenData.clientPayload.iss
    });

    // Return XML response per IRS spec
    const xmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<IRISReceipt>
  <ReceiptId>${receiptId}</ReceiptId>
  <UTID>${utid}</UTID>
  <Timestamp>${new Date().toISOString()}</Timestamp>
  <Status>Processing</Status>
</IRISReceipt>`;

    res.set('Content-Type', 'application/xml');
    res.send(xmlResponse);

  } catch (error) {
    console.error('[IRIS] Submission error:', error);
    res.status(500).json({
      error: 'server_error',
      error_description: error.message
    });
  }
});

/**
 * POST /api/iris/transstatusorack
 * Get transmission status or acknowledgment
 */
router.post('/transstatusorack', authenticateToken, async (req, res) => {
  try {
    const body = req.body;

    // Parse XML request body
    // For now, expect SearchId in body
    const searchId = body?.IRISStatusRequest?.SearchId || body?.SearchId;

    if (!searchId) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Missing SearchId in request'
      });
    }

    // Look up submission
    const submission = submissionStore.get(searchId);

    if (!submission) {
      return res.status(404).json({
        error: 'not_found',
        error_description: `Submission ${searchId} not found`
      });
    }

    // Return XML response per IRS spec
    const xmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<IRISStatusResponse>
  <SearchId>${searchId}</SearchId>
  <TCC>${submission.tcc}</TCC>
  <UTID>${submission.utid}</UTID>
  <TransmissionStatusCd>${submission.status}</TransmissionStatusCd>
  <SubmittedAt>${submission.submittedAt}</SubmittedAt>
</IRISStatusResponse>`;

    res.set('Content-Type', 'application/xml');
    res.send(xmlResponse);

  } catch (error) {
    console.error('[IRIS] Status error:', error);
    res.status(500).json({
      error: 'server_error',
      error_description: error.message
    });
  }
});

/**
 * POST /api/iris/token/refresh
 * Refresh access token using refresh token
 */
router.post('/token/refresh', (req, res) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    return res.status(400).json({
      error: 'invalid_request',
      error_description: 'Missing refresh_token'
    });
  }

  // In production, validate refresh token and generate new access token
  // For demo, just generate new token
  const accessToken = generateAccessToken({}, {});

  res.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 900
  });
});

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Parse JWT (without signature verification for demo)
 */
function parseJWT(jwt) {
  try {
    const parts = jwt.split('.');
    if (parts.length !== 3) return null;

    const payload = parts[1];
    // Add padding if needed
    const padded = payload + '='.repeat((4 - payload.length % 4) % 4);
    const decoded = Buffer.from(padded, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Generate mock access token
 */
function generateAccessToken(clientPayload, userPayload) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: 'https://api.irs.gov',
    sub: userPayload.sub || 'user',
    aud: clientPayload.iss || 'client',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 900,
    jti: crypto.randomUUID()
  };

  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.randomUUID(); // Mock signature

  return `${headerB64}.${payloadB64}.${signature}`;
}

/**
 * Generate mock refresh token
 */
function generateRefreshToken() {
  return crypto.randomUUID().replace(/-/g, '');
}

export { router as irisOAuthRouter, authenticateToken };
