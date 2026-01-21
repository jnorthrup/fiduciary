import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    // CI mode: non-interactive, single run
    watch: process.env.CI !== 'true',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
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
        'server/',
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
