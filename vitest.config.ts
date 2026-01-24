import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    // Hard timeout for all tests (10 seconds max per test)
    testTimeout: 10000,
    hookTimeout: 10000,
    // Exclude Playwright tests and retired/archived tests - they use different runners or are archived
    exclude: ['**/node_modules/**', '**/dist/**', 'test/*.spec.ts', '**/.retired/**', '**/.archive/**', '**/.retired_tests/**'],
    // CI mode: non-interactive, single run
    watch: process.env.CI !== 'true',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      include: [
        'server/lib/jsonlSerializer.ts',
        'server/lib/lsmCompactor.ts',
        'server/lib/jsonlStream.ts',
        'server/lib/mapReduceViews.ts',
        'server/lib/materializedViews.ts',
        'server/lib/migrateStateToJSONL.ts',
        'server/lib/walMetadata.ts',
        'server/lib/walHandle.ts',
        'services/bofaCashProService.ts',
        'services/bofaAuthService.ts',
        'services/bofaSecretManager.ts',
      ],
      // Coverage thresholds
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80
      },
      exclude: [
        'node_modules/',
        'test/',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        'public/',
        'conductor/',
        'dist/',
      ],
    },
  },
  // Define DEV for tests (treat tests as development mode)
  define: {
    'import.meta.env.DEV': true
  }
});
