
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { AuthProvider, useAuth } from './services/authService';
import { Loader2 } from 'lucide-react';

const LoadingScreen = () => (
  <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#0B0F19] text-slate-300">
    <Loader2 size={48} className="text-indigo-500 animate-spin mb-4" />
    <h2 className="text-xl font-bold tracking-widest text-white uppercase">Initializing Clear.Flow</h2>
    <p className="text-xs text-slate-500 mt-2 font-mono">Loading Core Modules...</p>
  </div>
);

const AuthenticatedApp = () => {
  const { isLoading, isInitialized } = useAuth();
  if (isLoading || !isInitialized) return <LoadingScreen />;
  return <App />;
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);

  root.render(
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}
