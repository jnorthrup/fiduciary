#!/usr/bin/env node
// Minimal IRIS proxy to perform server-side JWT signing and token exchange.
// Usage: IRIS_MOCK_MODE=1 IRIS_API_KEY=devkey node server/iris-proxy.js

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';
import crypto from 'crypto';
import https from 'https';

dotenv.config();

const PORT = process.env.PORT || 4000;
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

function base64UrlEncode(buffer) {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function createJWT(header, payload, privateKey) {
  const headerB64 = base64UrlEncode(Buffer.from(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(Buffer.from(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;
  // Sign using Node's crypto module (imported at module top)
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();
  const signature = signer.sign(privateKey);
  return `${signingInput}.${base64UrlEncode(signature)}`;
}

// Simple API key middleware for dev safety
app.use((req, res, next) => {
  const apiKey = process.env.IRIS_API_KEY;
  if (!apiKey) return next(); // no api key enforced
  const reqKey = req.header('x-api-key') || req.query.api_key;
  if (reqKey === apiKey) return next();
  res.status(401).json({ error: 'Unauthorized - provide x-api-key header' });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/iris/auth', async (req, res) => {
  // If mock mode enabled, return a mocked token
  if (process.env.IRIS_MOCK_MODE === '1' || req.body.mock) {
    return res.json({ access_token: 'mock-access-token', token_type: 'Bearer', expires_in: 3600 });
  }

  const {
    IRIS_CLIENT_ID: clientId,
    IRIS_USER_ID: userId,
    IRIS_KEY_ID: keyId,
    IRIS_PRIVATE_KEY: rawKey,
    IRIS_TEST_MODE: testMode,
  } = process.env;

  if (!clientId || !userId || !keyId || !rawKey) {
    return res.status(500).json({ error: 'Missing IRIS credentials in env. Set IRIS_CLIENT_ID, IRIS_USER_ID, IRIS_KEY_ID, IRIS_PRIVATE_KEY' });
  }

  // Build JWTs
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 15 * 60;

  const header = { alg: 'RS256', kid: keyId };
  const clientPayload = { iss: clientId, sub: clientId, aud: 'https://api.irs.gov', iat: now, exp, jti: randomUUID() };
  const userPayload = { iss: clientId, sub: userId, aud: 'https://api.irs.gov', iat: now, exp, jti: randomUUID() };

  try {
    const clientJwt = createJWT(header, clientPayload, rawKey);
    const userJwt = createJWT(header, userPayload, rawKey);

    const params = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: userJwt,
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: clientJwt,
    });

    const tokenUrl = process.env.IRIS_TEST_MODE === '1'
      ? 'https://api.alt.www4.irs.gov/RIntakeAcceptanceA2A/1.0/irisa2a/v1/auth/oauth/v2/token'
      : 'https://api.www4.irs.gov/RIntakeAcceptanceA2A/1.0/irisa2a/v1/auth/oauth/v2/token';

    // POST to token endpoint
    const fetch = (await import('node-fetch')).default;

    const resp = await fetch(tokenUrl, {
      method: 'POST',
      body: params.toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const text = await resp.text();
    if (!resp.ok) {
      return res.status(502).json({ error: 'IRIS token endpoint error', status: resp.status, body: text });
    }

    const payload = JSON.parse(text);
    return res.json(payload);
  } catch (err) {
    console.error('IRIS auth error', err);
    return res.status(500).json({ error: 'IRIS auth failed', details: String(err) });
  }
});

async function doAuth(body) {
  if (process.env.IRIS_MOCK_MODE === '1' || body?.mock) {
    return { access_token: 'mock-access-token', token_type: 'Bearer', expires_in: 3600 };
  }

  const {
    IRIS_CLIENT_ID: clientId,
    IRIS_USER_ID: userId,
    IRIS_KEY_ID: keyId,
    IRIS_PRIVATE_KEY: rawKey,
  } = process.env;

  if (!clientId || !userId || !keyId || !rawKey) {
    throw new Error('Missing IRIS credentials in env');
  }

  const now = Math.floor(Date.now() / 1000);
  const exp = now + 15 * 60;
  const header = { alg: 'RS256', kid: keyId };
  const clientPayload = { iss: clientId, sub: clientId, aud: 'https://api.irs.gov', iat: now, exp, jti: randomUUID() };
  const userPayload = { iss: clientId, sub: userId, aud: 'https://api.irs.gov', iat: now, exp, jti: randomUUID() };

  const clientJwt = createJWT(header, clientPayload, rawKey);
  const userJwt = createJWT(header, userPayload, rawKey);

  const params = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: userJwt,
    client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
    client_assertion: clientJwt,
  }).toString();

  const tokenUrl = process.env.IRIS_TEST_MODE === '1'
    ? 'https://api.alt.www4.irs.gov/RIntakeAcceptanceA2A/1.0/irisa2a/v1/auth/oauth/v2/token'
    : 'https://api.www4.irs.gov/RIntakeAcceptanceA2A/1.0/irisa2a/v1/auth/oauth/v2/token';

  const fetch = (await import('node-fetch')).default;
  const resp = await fetch(tokenUrl, { method: 'POST', body: params, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  const txt = await resp.text();
  if (!resp.ok) throw new Error(`Token endpoint returned ${resp.status}: ${txt}`);
  return JSON.parse(txt);
}

app.post('/api/iris/submit', async (req, res) => {
  try {
    const tokenResp = await doAuth(req.body);
    if (!tokenResp.access_token) return res.status(502).json({ error: 'Failed to get access_token', tokenResp });

    const submitUrl = process.env.IRIS_TEST_MODE === '1'
      ? 'https://api.alt.www4.irs.gov/RIntakeAcceptanceA2A/1.0/irisa2a/v1/intake-acceptance'
      : 'https://api.www4.irs.gov/RIntakeAcceptanceA2A/1.0/irisa2a/v1/intake-acceptance';

    const fetch = (await import('node-fetch')).default;
    const form = new (await import('formdata-node')).FormData();
    form.set('file', req.body.xmlPayload, 'submission.xml');

    const resp = await fetch(submitUrl, { method: 'POST', body: form, headers: { Authorization: `Bearer ${tokenResp.access_token}` } });
    const text = await resp.text();
    if (!resp.ok) return res.status(502).json({ error: 'IRIS submit failed', status: resp.status, body: text });
    return res.send(text);
  } catch (err) {
    console.error('IRIS submit error', err);
    return res.status(500).json({ error: 'IRIS submit failed', details: String(err) });
  }
});

// Backwards-compatible endpoints for frontend which expects /api/irs/*
app.post('/api/irs/auth', async (req, res) => {
  try {
    const tokens = await doAuth(req.body);
    res.json(tokens);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.post('/api/irs/submit', async (req, res) => {
  // reuse /api/iris/submit implementation
  return app._router.handle(req, res, () => {}, '/api/iris/submit');
});

app.listen(PORT, () => {
  console.log(`IRIS proxy listening on http://localhost:${PORT} (MOCK=${process.env.IRIS_MOCK_MODE === '1' ? '1' : '0'})`);
});
