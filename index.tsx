import './app.css';
import React, { Suspense, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Loader2 } from 'lucide-react';
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
  // Track whether user just authenticated (to show splash for skin choice)
  const [justAuthenticated, setJustAuthenticated] = useState(false);

  // On mount: load stored skin preference
  useEffect(() => {
    const storedSkin = localStorage.getItem(SKIN_STORAGE_KEY) as 'jnorthrup' | 'lastrust' | null;
    if (storedSkin) {
      setSelectedSkin(storedSkin);
    }
  }, []);

  // When user authenticates via Google, show splash if no stored skin
  useEffect(() => {
    if (user && justAuthenticated) {
      const storedSkin = localStorage.getItem(SKIN_STORAGE_KEY) as 'jnorthrup' | 'lastrust' | null;
      if (storedSkin) {
        setSelectedSkin(storedSkin);
      }
      // else: selectedSkin stays null → DualEntrySplash will show
      setJustAuthenticated(false);
    }
  }, [user, justAuthenticated]);

  const handleSelectSkin = (skin: 'jnorthrup' | 'lastrust') => {
    setSelectedSkin(skin);
    localStorage.setItem(SKIN_STORAGE_KEY, skin);
  };

  // Brief loading only for GSI auto-select check
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Authenticated user with no stored skin → show splash to pick
  if (user && !selectedSkin) {
    return (
      <DualEntrySplash
        userEmail={user.email || ''}
        userPhoto={user.photoURL || undefined}
        onSelectSkin={handleSelectSkin}
      />
    );
  }

  // Render the selected skin (or default to Clear.Flow for anonymous users)
  const skin = selectedSkin || 'lastrust';

  return (
    <Suspense fallback={<LoadingScreen />}>
      {skin === 'jnorthrup' ? <AppClassic /> : <AppLastrust />}
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
