
import React, { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { LedgerProvider } from './services/ledgerService';
import { Loader2 } from 'lucide-react';
import './styles/theme.css';

const LoadingScreen = () => (
  <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#0B0F19] text-slate-300">
    <Loader2 size={48} className="text-indigo-500 animate-spin mb-4" />
    <h2 className="text-xl font-bold tracking-widest text-white uppercase">Initializing Node</h2>
    <p className="text-xs text-slate-500 mt-2 font-mono">Loading Core Modules...</p>
  </div>
);

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <Suspense fallback={<LoadingScreen />}>
      <LedgerProvider>
        <App />
      </LedgerProvider>
    </Suspense>
  );
}
