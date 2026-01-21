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
    // Build optimizations - aggressive tree-shaking
    build: {
      minify: 'terser',
      sourcemap: dev,
      terserOptions: {
        compress: {
          drop_console: !dev,
          drop_debugger: !dev,
          pure_funcs: dev ? [] : ['console.log', 'console.debug'],
        },
      },
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // React ecosystem
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('react-router') || id.includes('react-hook-form')) {
              return 'react-vendor';
            }
            // UI libraries
            if (id.includes('lucide-react') || id.includes('clsx') || id.includes('tailwind-merge') || id.includes('class-variance-authority')) {
              return 'ui-vendor';
            }
            // Heavy data processing (lazy load)
            if (id.includes('d3') || id.includes('d3-')) {
              return 'charts-vendor';
            }
            if (id.includes('xlsx')) {
              return 'xlsx-vendor';
            }
            if (id.includes('mammoth')) {
              return 'docs-vendor';
            }
            if (id.includes('mermaid')) {
              return 'diagrams-vendor';
            }
            if (id.includes('fast-xml-parser')) {
              return 'xml-vendor';
            }
            if (id.includes('yjs') || id.includes('y-indexeddb')) {
              return 'collab-vendor';
            }
            // Firebase (lazy load)
            if (id.includes('firebase') || id.includes('@firebase')) {
              return 'firebase-vendor';
            }
            // AI/GenAI
            if (id.includes('@google/generat') || id.includes('genai')) {
              return 'ai-vendor';
            }
            // Utilities
            if (id.includes('date-fns') || id.includes('uuid') || id.includes('zod')) {
              return 'utils-vendor';
            }
          }
        }
      },
      chunkSizeWarningLimit: 600,
    }
  };
});
