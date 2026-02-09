import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Feedback loop plugin with optional import for dev mode
let feedbackLoop: any, constructionTasks: any;
if (process.env.NODE_ENV !== 'production') {
  try {
    const plugin = require('./vite-plugin-feedback-loop.ts');
    feedbackLoop = plugin.feedbackLoop || plugin.default;
    constructionTasks = plugin.constructionTasks;
  } catch {
    // Plugin not available, will skip
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const plugins = [tailwindcss(), react()];

  // Add feedback loop in development
  if (mode === 'development' && feedbackLoop && constructionTasks) {
    plugins.push(
      feedbackLoop({
        enabled: true,
        wsPort: 3555,
        showOverlay: true,
        constructionTasks: [
          constructionTasks.countComponents(),
          constructionTasks.complexityAnalysis(),
          constructionTasks.validateExports(),
          constructionTasks.textAnalysisObserver(),
        ],
      })
    );
  }

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins,
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      minify: 'esbuild',
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
        },
        output: {
          entryFileNames: 'assets/[hash:8].js',
          chunkFileNames: 'assets/[hash:8].js',
          assetFileNames: 'assets/[hash:8][extname]',
        },
      },
    }
  };
});
