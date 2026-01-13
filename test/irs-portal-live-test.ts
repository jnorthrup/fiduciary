/**
 * IRS Portal Live Integration Test
 *
 * This script performs a live test of the IRS Portal Authentication system
 * using real credentials. It can be run manually to verify the full flow.
 *
 * Usage:
 *   IRS_USERNAME="user@example.com" IRS_PASSWORD="pass" npm run test:live-portal
 *
 * Or interactively:
 *   npm run test:live-portal
 */

import { IRSPortalClient } from '../services/iris-portal-client';
import readline from 'readline';

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

async function runLiveTest() {
  console.log('\n=== IRS Portal Live Integration Test ===\n');
  console.log('This test will authenticate with the IRS e-Services portal.');
  console.log('You will need valid IRS e-Services credentials.\n');

  // Get credentials from env or prompt
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

  console.log('\n[1/5] Initializing IRS Portal Client...');
  const client = new IRSPortalClient({
    headless: false, // Show browser for debugging
    timeout: 60000,
    testMode: false, // Use production IRS portal
  });

  try {
    console.log('[2/5] Navigating to IRS e-Services login page...');
    const navResult = await client.navigateToLogin();
    if (!navResult.success) {
      throw new Error(`Navigation failed: ${navResult.error?.message}`);
    }
    console.log(`✓ Navigated to: ${navResult.url}`);

    console.log('[3/5] Filling username...');
    const usernameResult = await client.fillUsername(username);
    if (!usernameResult.success) {
      throw new Error(`Username fill failed: ${usernameResult.error?.message}`);
    }
    console.log('✓ Username filled');

    console.log('[4/5] Filling password...');
    const passwordResult = await client.fillPassword(password);
    if (!passwordResult.success) {
      throw new Error(`Password fill failed: ${passwordResult.error?.message}`);
    }
    console.log('✓ Password filled');

    console.log('[5/5] Submitting login...');
    const submitResult = await client.submitLogin();
    if (!submitResult.success) {
      throw new Error(`Login failed: ${submitResult.error?.type} - ${submitResult.error?.message}`);
    }
    console.log('✓ Login submitted successfully');

    // Check for 2FA
    console.log('\n[6/8] Checking for 2FA prompt...');
    const has2FA = await client.detect2FAPrompt();
    if (has2FA) {
      console.log('✓ 2FA detected');

      console.log('[7/8] Getting available 2FA methods...');
      const methods = await client.get2FAMethods();
      console.log(`✓ Available methods: ${methods.join(', ')}`);

      const twoFACode = await ask('\nEnter your 6-digit 2FA code: ');

      console.log('[8/8] Submitting 2FA code...');
      const twoFAResult = await client.enter2FACode(twoFACode);
      if (!twoFAResult.success) {
        throw new Error(`2FA failed: ${twoFAResult.error?.type} - ${twoFAResult.error?.message}`);
      }
      console.log('✓ 2FA successful');
    } else {
      console.log('✓ No 2FA required (or not detected)');
    }

    // Get session
    console.log('\n[Final] Retrieving session...');
    const session = await client.getSession();
    console.log('✓ Session established');
    console.log(`  - Authenticated: ${session.authenticated}`);
    console.log(`  - Username: ${session.username}`);
    console.log(`  - Cookies: ${session.cookies.length} cookies stored`);
    console.log(`  - Expires: ${session.expiresAt ? new Date(session.expiresAt).toLocaleString() : 'N/A'}`);

    // Save session
    console.log('\nSaving session to disk...');
    await client.saveSession();
    console.log('✓ Session saved');

    console.log('\n=== Test Completed Successfully ===\n');
    console.log('Session is now stored and can be reused for future requests.');
    console.log('The session will remain valid until expiry or manual logout.\n');

  } catch (error: any) {
    console.error('\n✗ Test Failed:', error.message);
    process.exit(1);
  } finally {
    // Cleanup
    await client.close();
    rl.close();
  }
}

// Run if called directly
if (require.main === module) {
  runLiveTest().catch(console.error);
}

export { runLiveTest };
