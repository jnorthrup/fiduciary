import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const isDev = (mode: string) => mode === 'development';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const dev = isDev(mode);

  return {
    server: {
      port: Number(env.VITE_PORT) || 3000,
      host: env.VITE_HOST || '0.0.0.0',
    },
    plugins: [react()],
    define: {
      // Compile-time constant for development mode check
      // This enables tree-shaking of demo code in production
      'import.meta.env.DEV': dev,
      // Legacy process.env support (deprecated, use import.meta.env.VITE_* instead)
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || ''),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    // Build optimizations
    build: {
      minify: 'terser',
      sourcemap: dev,
      rollupOptions: {
        output: {
          manualChunks: {
            // Separate vendor chunks for better caching
            'react-vendor': ['react', 'react-dom'],
            'ui-vendor': ['lucide-react'],
          }
        }
      }
    }
  };
});
