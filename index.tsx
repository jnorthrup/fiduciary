import React, { Suspense, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Loader2, Mail, Building2, Sparkles, ArrowRight } from 'lucide-react';
import { AuthProvider, useAuth } from './services/authService';
import { LedgerProvider } from './services/ledgerService';
import { DualEntrySplash } from './components/DualEntrySplash';
import { ErrorBoundary } from './components/ErrorBoundary';

// Dynamic imports for lazy loading
const AppClassic = React.lazy(() => import('./App').then(m => ({ default: m.App })));
const AppLastrust = React.lazy(() => import('./App-lastrust').then(m => ({ default: m.App })));

const LoadingScreen = () => (
  <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#0B0F19] text-slate-300">
    <Loader2 size={48} className="text-indigo-500 animate-spin mb-4" />
    <h2 className="text-xl font-bold tracking-widest text-white uppercase">Initializing</h2>
    <p className="text-xs text-slate-500 mt-2 font-mono">Loading Modules...</p>
  </div>
);

const SKIN_STORAGE_KEY = 'fiduciary_skin_v2';

const UnifiedApp: React.FC = () => {
  const { user, signIn, isLoading } = useAuth();
  const [selectedSkin, setSelectedSkin] = useState<'jnorthrup' | 'lastrust' | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Initial load: check local storage for skin preference
  useEffect(() => {
    const storedSkin = localStorage.getItem(SKIN_STORAGE_KEY) as 'jnorthrup' | 'lastrust' | null;
    if (storedSkin) {
      setSelectedSkin(storedSkin);
    }
  }, []);

  const handleSelectSkin = (skin: 'jnorthrup' | 'lastrust') => {
    setSelectedSkin(skin);
    localStorage.setItem(SKIN_STORAGE_KEY, skin);
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  // Not logged in - show login screen
  if (!user) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Mail className="w-10 h-10 text-indigo-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Trust Ledger System</h1>
          <p className="text-slate-400 mb-8">
            Sign in with Google to access your financial dashboard
          </p>

          <button
            onClick={() => signIn().catch(e => setLoginError(e.message))}
            className="bg-white text-slate-700 px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-3 w-full hover:bg-slate-50 transition-colors shadow-lg shadow-indigo-900/20"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="" />
            Sign in with Google
          </button>

          {loginError && (
            <p className="text-rose-400 text-sm mt-4">{loginError}</p>
          )}

          <p className="text-slate-500 text-xs mt-8">
            Your data is encrypted and stored securely
          </p>
        </div>
      </div>
    );
  }

  // Logged in but no skin selected - show splash
  if (!selectedSkin) {
    return (
      <DualEntrySplash
        userEmail={user.email || ''}
        userPhoto={user.photoURL || undefined}
        onSelectSkin={handleSelectSkin}
      />
    );
  }

  // Render selected skin wrapped with AuthProvider
  return (
    <Suspense fallback={<LoadingScreen />}>
      {selectedSkin === 'jnorthrup' ? <AppClassic /> : <AppLastrust />}
    </Suspense>
  );
};



const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <ErrorBoundary>
      <Suspense fallback={<LoadingScreen />}>
        <AuthProvider>
          <LedgerProvider>
            <UnifiedApp />
          </LedgerProvider>
        </AuthProvider>
      </Suspense>
    </ErrorBoundary>
  );
}
