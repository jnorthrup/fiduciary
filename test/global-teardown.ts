/**
 * Playwright Global Teardown
 *
 * Runs once after all tests.
 * Used for:
 * - Cleanup of test artifacts
 * - Session state archival
 * - Summary reporting
 */

import { FullConfig } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

async function globalTeardown(config: FullConfig) {
  console.log('\n🧹 Playwright Global Teardown');

  // Archive session recordings if CI environment
  if (process.env.CI) {
    const sessionDir = path.join(process.cwd(), 'test', 'session-storage');
    const archiveDir = path.join(process.cwd(), 'test-results', 'session-archive');

    try {
      await fs.mkdir(archiveDir, { recursive: true });
      const files = await fs.readdir(sessionDir);

      for (const file of files) {
        const srcPath = path.join(sessionDir, file);
        const destPath = path.join(archiveDir, file);
        await fs.copyFile(srcPath, destPath);
      }

      console.log(`✅ Archived ${files.length} session files`);
    } catch (error) {
      console.warn('⚠️  Failed to archive session files:', error);
    }
  }

  console.log('✅ Global teardown complete');
}

export default globalTeardown;
