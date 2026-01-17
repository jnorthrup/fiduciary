/**
 * JWT Utilities for IRS IRIS A2A OAuth
 * Implements RS256 signing using Node.js crypto
 */

import { createSign, createPublicKey } from 'crypto';

/**
 * Sign a payload with RS256 (RSA-SHA256)
 * @param {object} payload - JWT payload
 * @param {string} privateKey - PEM formatted private key
 * @param {string} keyId - Key ID for JWK
 * @returns {string} Signed JWT
 */
export function signRS256(payload, privateKey, keyId) {
  const header = {
    kid: keyId,
    alg: 'RS256'
  };

  // Encode header and payload
  const headerB64 = Buffer.from(JSON.stringify(header))
    .toString('base64url')
    .replace(/=/g, '');
  const payloadB64 = Buffer.from(JSON.stringify(payload))
    .toString('base64url')
    .replace(/=/g, '');

  const signingInput = `${headerB64}.${payloadB64}`;

  // Sign with RSA-SHA256
  const sign = createSign('RSA-SHA256');
  sign.update(signingInput);
  sign.end();

  const signature = sign.sign(privateKey, 'base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return `${signingInput}.${signature}`;
}

/**
 * Generate client JWT for IRS OAuth
 * @param {object} credentials - IRIS credentials
 * @returns {string} Client JWT
 */
export function generateClientJWT(credentials) {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (15 * 60); // 15 minutes

  const payload = {
    iss: credentials.clientId,
    sub: credentials.clientId,
    aud: 'https://api.irs.gov',
    iat: now,
    exp,
    jti: crypto.randomUUID(),
  };

  return signRS256(payload, credentials.privateKey, credentials.keyId);
}

/**
 * Generate user JWT for IRS OAuth
 * @param {object} credentials - IRIS credentials
 * @returns {string} User JWT
 */
export function generateUserJWT(credentials) {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (15 * 60); // 15 minutes

  const payload = {
    iss: credentials.clientId,
    sub: credentials.userId,
    aud: 'https://api.irs.gov',
    iat: now,
    exp,
    jti: crypto.randomUUID(),
  };

  return signRS256(payload, credentials.privateKey, credentials.keyId);
}

/**
 * Verify PEM key format
 * @param {string} privateKey - Private key to validate
 * @returns {boolean} Valid format
 */
export function isValidPrivateKey(privateKey) {
  try {
    const publicKey = createPublicKey(privateKey);
    return publicKey.asymmetricKeyType === 'rsa';
  } catch {
    return false;
  }
}

/**
 * Validate TCC format
 * @param {string} tcc - Transmitter Control Code
 * @returns {boolean} Valid format
 */
export function validateTCC(tcc) {
  return /^[DT][A-Za-z0-9]{4}$/.test(tcc);
}

/**
 * Generate UTID (Unique Transmission Identifier)
 * Format: UUID:IRIS:TCC::A
 * @param {string} tcc - Transmitter Control Code
 * @returns {string} UTID
 */
export function generateUTID(tcc) {
  const uuid = crypto.randomUUID();
  return `${uuid}:IRIS:${tcc}::A`;
}
