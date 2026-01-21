
import React, { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { LedgerProvider } from './services/ledgerService';
import { AuthProvider, useAuth } from './services/authService';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Loader2 } from 'lucide-react';

// Environment-based feature flags
const FIREBASE_ENABLED = import.meta.env.VITE_FIREBASE_ENABLED !== 'false';
const GMAIL_AUTH_ENABLED = import.meta.env.VITE_GMAIL_AUTH_ENABLED !== 'false';

const LoadingScreen = () => (
  <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#0B0F19] text-slate-300">
    <Loader2 size={48} className="text-indigo-500 animate-spin mb-4" />
    <h2 className="text-xl font-bold tracking-widest text-white uppercase">Initializing Node</h2>
    <p className="text-xs text-slate-500 mt-2 font-mono">Loading Core Modules...</p>
  </div>
);

const AuthenticatedApp = () => {
  const { user, encryptionKey, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;

  // We render the App (which contains LaunchScreen) regardless of auth state.
  // LaunchScreen handles the "not logged in" state gracefully.
  return (
    <LedgerProvider encryptionKey={encryptionKey as CryptoKey}>
      <App />
    </LedgerProvider>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);

  // Load Firebase config only if enabled
  const firebaseConfig = FIREBASE_ENABLED
    ? (import.meta.env.VITE_FIREBASE_CONFIG ? JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG) : undefined)
    : undefined;

  root.render(
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GMAIL_CLIENT_ID}>
      <AuthProvider config={firebaseConfig}>
        <Suspense fallback={<LoadingScreen />}>
          <AuthenticatedApp />
        </Suspense>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
