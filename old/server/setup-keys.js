#!/usr/bin/env node

/**
 * Generate RSA key pair for IRS IRIS A2A OAuth
 *
 * Usage:
 *   node setup-keys.js
 *
 * This generates:
 *   - private-key.pem: Your private key (KEEP SECRET)
 *   - public-key.pem: Your public key
 *   - public-key.jwk: Public key in JWK format (upload to IRS e-Services)
 */

import { generateKeyPairSync } from 'crypto';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

console.log('Generating RSA key pair for IRS IRIS A2A OAuth...\n');

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
});

// Write keys to files
const privateKeyPath = resolve('./private-key.pem');
const publicKeyPath = resolve('./public-key.pem');

writeFileSync(privateKeyPath, privateKey);
writeFileSync(publicKeyPath, publicKey);

console.log('Keys generated successfully!\n');
console.log(`Private key: ${privateKeyPath}`);
console.log('  -> KEEP THIS SECRET! Add to .env as IRS_PRIVATE_KEY\n');
console.log(`Public key: ${publicKeyPath}`);
console.log('  -> Upload as JWK to IRS e-Services API Client application\n');
console.log('Next steps:');
console.log('1. Convert public-key.pem to JWK format');
console.log('2. Upload JWK to your IRS e-Services API Client application');
console.log('3. Copy the Key ID assigned by IRS');
console.log('4. Add credentials to .env file\n');

// Export public key to JWK format (basic)
console.log('Public key (PEM):');
console.log(publicKey);
console.log('\nTo convert to JWK, use: https://russellb.com/projects/jwk_converter/ or similar tool');
