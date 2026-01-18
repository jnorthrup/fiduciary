/**
 * IRS Portal Backend API Live Test
 *
 * Tests the backend API endpoints (/api/irs-portal/auth/*) with real credentials.
 * Requires the Express server to be running on localhost:3001.
 *
 * Usage:
 *   # Start server first
 *   node server/index.js
 *
 *   # In another terminal
 *   IRS_USERNAME="user@example.com" IRS_PASSWORD="pass" npm run test:live-api
 */

import readline from 'readline';

const API_BASE = process.env.API_URL || 'http://localhost:3001';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function testLogin(username: string, password: string): Promise<any> {
  console.log('\n[1/3] Testing POST /api/irs-portal/auth/login...');

  const response = await fetch(`${API_BASE}/api/irs-portal/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Login failed: ${data.error} - ${data.message}`);
  }

  console.log('✓ Login successful');
  console.log(`  - Session ID: ${data.sessionId}`);
  console.log(`  - Reused: ${data.reused}`);
  console.log(`  - Available 2FA methods: ${data.available2FAMethods?.join(', ') || 'N/A'}`);

  return data;
}

async function test2FA(sessionId: string, code: string): Promise<any> {
  console.log('\n[2/3] Testing POST /api/irs-portal/auth/2fa...');

  const response = await fetch(`${API_BASE}/api/irs-portal/auth/2fa`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sessionId, code }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`2FA failed: ${data.error} - ${data.message}`);
  }

  console.log('✓ 2FA verification successful');
  console.log(`  - Authenticated: ${data.authenticated}`);
  console.log(`  - TCC: ${data.tcc || 'N/A'}`);

  return data;
}

async function testHealthCheck(): Promise<void> {
  console.log('\n[0/3] Testing GET /api/health...');

  const response = await fetch(`${API_BASE}/api/health`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error('Health check failed');
  }

  console.log('✓ Server is healthy');
  console.log(`  - Status: ${data.status}`);
  console.log(`  - Timestamp: ${new Date(data.timestamp).toLocaleString()}`);
}

async function testSessionStatus(sessionId: string): Promise<void> {
  console.log('\n[3/3] Testing GET /api/irs-portal/auth/session/:sessionId...');

  const response = await fetch(`${API_BASE}/api/irs-portal/auth/session/${sessionId}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Session status check failed: ${data.error}`);
  }

  console.log('✓ Session status retrieved');
  console.log(`  - Status: ${data.status}`);
  console.log(`  - Authenticated: ${data.authenticated}`);
  console.log(`  - Expires: ${data.expiresAt ? new Date(data.expiresAt).toLocaleString() : 'N/A'}`);
}

async function runLiveAPITest() {
  console.log('\n=== IRS Portal Backend API Live Test ===\n');
  console.log('This test validates the backend API endpoints.');
  console.log(`API Base URL: ${API_BASE}\n`);

  // Get credentials
  let username = process.env.IRS_USERNAME;
  let password = process.env.IRS_PASSWORD;

  if (!username) {
    username = await ask('IRS e-Services Username: ');
  }

  if (!password) {
    password = await ask('IRS e-Services Password: ');
  }

  if (!username || !password) {
    console.error('Error: Username and password are required');
    process.exit(1);
  }

  try {
    // Health check
    await testHealthCheck();

    // Login
    const loginData = await testLogin(username, password);
    const sessionId = loginData.sessionId;

    // If 2FA is required
    if (!loginData.reused && loginData.available2FAMethods?.length > 0) {
      const twoFACode = await ask('\nEnter your 6-digit 2FA code: ');
      await test2FA(sessionId, twoFACode);
    }

    // Check session status
    await testSessionStatus(sessionId);

    console.log('\n=== All API Tests Passed ===\n');
    console.log('The backend API is working correctly.');
    console.log(`Session ${sessionId} is active and can be used for subsequent requests.\n`);

  } catch (error: any) {
    console.error('\n✗ API Test Failed:', error.message);

    if (error.cause) {
      console.error('Cause:', error.cause);
    }

    console.error('\nTroubleshooting:');
    console.error('1. Ensure the server is running: node server/index.js');
    console.error('2. Check that the API_URL is correct (default: http://localhost:3001)');
    console.error('3. Verify your IRS e-Services credentials are valid');

    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run if called directly
if (require.main === module) {
  runLiveAPITest().catch(console.error);
}

export { runLiveAPITest };
