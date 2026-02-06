
import React, { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { LedgerProvider } from './services/ledgerService';
import { ThemeProvider } from './contexts/ThemeContext';
import { SkinProvider } from './contexts/SkinContext';
import { Loader2 } from 'lucide-react';
import './styles/theme.css';

const LoadingScreen = () => (
  <div className="fixed inset-0 flex flex-col items-center justify-center bg-[--bg-primary] text-[--text-secondary]">
    <Loader2 size={48} className="text-[--accent-primary] animate-spin mb-4" />
    <h2 className="text-xl font-bold tracking-widest text-[--text-primary] uppercase">Initializing Node</h2>
    <p className="text-xs text-[--text-muted] mt-2 font-mono">Loading Core Modules...</p>
  </div>
);

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <Suspense fallback={<LoadingScreen />}>
      <ThemeProvider>
        <LedgerProvider>
          <SkinProvider>
            <App />
          </SkinProvider>
        </LedgerProvider>
      </ThemeProvider>
    </Suspense>
  );
}
