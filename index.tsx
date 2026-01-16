
import React, { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { LedgerProvider } from './services/ledgerService';
import { AuthProvider, useAuth } from './services/authService';
import { Loader2 } from 'lucide-react';

const LoadingScreen = () => (
  <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#0B0F19] text-slate-300">
    <Loader2 size={48} className="text-indigo-500 animate-spin mb-4" />
    <h2 className="text-xl font-bold tracking-widest text-white uppercase">Initializing Node</h2>
    <p className="text-xs text-slate-500 mt-2 font-mono">Loading Core Modules...</p>
  </div>
);

const AuthenticatedApp = () => {
  const { user, encryptionKey, isLoading, signIn } = useAuth();

  if (isLoading) return <LoadingScreen />;

  if (!user) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#0B0F19] p-4 text-center">
        <div className="max-w-md space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tighter text-white sm:text-5xl">TRUST LEDGER</h1>
            <p className="text-slate-400">Secure, event-driven ledgering for fiduciary governance.</p>
          </div>
          <button
            onClick={signIn}
            className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20"
          >
            Sign in with Google OIDC
          </button>
        </div>
      </div>
    );
  }

  return (
    <LedgerProvider encryptionKey={encryptionKey as CryptoKey}>
      <App />
    </LedgerProvider>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <AuthProvider>
      <Suspense fallback={<LoadingScreen />}>
        <AuthenticatedApp />
      </Suspense>
    </AuthProvider>
  );
}
