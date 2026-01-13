/**
 * Playwright Global Setup
 *
 * Runs once before all tests.
 * Used for:
 * - Environment validation
 * - Database seeding
 * - Authentication state setup
 */

import { FullConfig } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Playwright Global Setup');

  // Ensure test-results directory exists
  const resultsDir = path.join(process.cwd(), 'test-results');
  await fs.mkdir(resultsDir, { recursive: true });

  // Ensure screenshots directory exists
  const screenshotsDir = path.join(process.cwd(), 'test', 'screenshots');
  await fs.mkdir(screenshotsDir, { recursive: true });

  // Create session storage directory for state persistence
  const sessionDir = path.join(process.cwd(), 'test', 'session-storage');
  await fs.mkdir(sessionDir, { recursive: true });

  console.log('✅ Test directories created');
  console.log(`   - Results: ${resultsDir}`);
  console.log(`   - Screenshots: ${screenshotsDir}`);
  console.log(`   - Session storage: ${sessionDir}`);

  // Environment check
  const requiredEnvVars = [
    // Add required env vars for IRS portal testing
    // 'IRS_TEST_USERNAME',
    // 'IRS_TEST_PASSWORD',
  ];

  const missingVars = requiredEnvVars.filter(v => !process.env[v]);
  if (missingVars.length > 0) {
    console.warn('⚠️  Missing environment variables:', missingVars.join(', '));
    console.warn('   Some tests may be skipped');
  }

  console.log('✅ Global setup complete\n');
}

export default globalSetup;
