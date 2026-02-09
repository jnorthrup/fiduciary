import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'jsdom',
        setupFiles: [], // Explicitly empty to avoid picking up broken global setup
        include: ['services/apiClient.test.ts'],
    },
});
