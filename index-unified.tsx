/**
 * Unified Entry Point
 * Shows Google OAuth login, then dual-entry splash to select skin
 */

import React, { Suspense, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Loader2, Mail } from 'lucide-react';
import { DualEntrySplash } from './components/DualEntrySplash';
import { AuthProvider } from './services/authService';

// Dynamic imports for lazy loading - wrap with AuthProvider
const AppClassic = React.lazy(() => import('./App').then(m => ({ default: m.App })));
const AppLastrust = React.lazy(() => import('./App-lastrust').then(m => ({ default: m.App })));


const LoadingScreen = () => (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#0B0F19] text-slate-300">
        <Loader2 size={48} className="text-indigo-500 animate-spin mb-4" />
        <h2 className="text-xl font-bold tracking-widest text-white uppercase">Initializing</h2>
        <p className="text-xs text-slate-500 mt-2 font-mono">Loading Modules...</p>
    </div>
);

interface GoogleUser {
    email: string;
    name: string;
    picture?: string;
}

const SKIN_STORAGE_KEY = 'fiduciary_selected_skin';
const USER_STORAGE_KEY = 'fiduciary_google_user';

const UnifiedApp: React.FC = () => {
    const [user, setUser] = useState<GoogleUser | null>(null);
    const [selectedSkin, setSelectedSkin] = useState<'jnorthrup' | 'lastrust' | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loginError, setLoginError] = useState<string | null>(null);

    // Check for existing session or dev bypass
    useEffect(() => {
        const storedUser = localStorage.getItem(USER_STORAGE_KEY);
        const storedSkin = localStorage.getItem(SKIN_STORAGE_KEY) as 'jnorthrup' | 'lastrust' | null;

        // Dev mode bypass: ?dev=1 skips OAuth for testing
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('dev') === '1' && !storedUser) {
            const devUser: GoogleUser = {
                email: 'dev@test.local',
                name: 'Dev User',
            };
            setUser(devUser);
            // Set auth token and local user so AuthProvider recognizes the session
            localStorage.setItem('clearflow_token', 'local-dev-bypass');
            localStorage.setItem('clearflow_current_user', JSON.stringify({
                email: 'dev@test.local',
                role: 'admin'
            }));
            setIsLoading(false);
            return;
        }

        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
                if (storedSkin) {
                    setSelectedSkin(storedSkin);
                }
            } catch (e) {
                localStorage.removeItem(USER_STORAGE_KEY);
            }
        }
        setIsLoading(false);
    }, []);

    // Initialize Google Sign-In
    useEffect(() => {
        if (user) return;

        const loadGoogleSignIn = async () => {
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.onload = () => {
                const clientId = import.meta.env.VITE_GMAIL_CLIENT_ID;
                if (!clientId || clientId.includes('PLACEHOLDER')) {
                    console.warn('Google OAuth Client ID not configured');
                    return;
                }

                (window as any).google?.accounts?.id?.initialize({
                    client_id: clientId,
                    callback: handleCredentialResponse,
                });

                (window as any).google?.accounts?.id?.renderButton(
                    document.getElementById('google-signin-btn'),
                    { theme: 'outline', size: 'large', width: 300 }
                );
            };
            document.head.appendChild(script);
        };

        loadGoogleSignIn();
    }, [user]);

    const handleCredentialResponse = (response: any) => {
        try {
            // Decode JWT to get user info
            const payload = JSON.parse(atob(response.credential.split('.')[1]));
            const googleUser: GoogleUser = {
                email: payload.email,
                name: payload.name,
                picture: payload.picture,
            };
            setUser(googleUser);
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(googleUser));
            setLoginError(null);
        } catch (e) {
            setLoginError('Failed to process login');
        }
    };

    const handleSelectSkin = (skin: 'jnorthrup' | 'lastrust') => {
        setSelectedSkin(skin);
        localStorage.setItem(SKIN_STORAGE_KEY, skin);
    };

    const handleLogout = () => {
        setUser(null);
        setSelectedSkin(null);
        localStorage.removeItem(USER_STORAGE_KEY);
        localStorage.removeItem(SKIN_STORAGE_KEY);
        (window as any).google?.accounts?.id?.disableAutoSelect();
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

                    <div id="google-signin-btn" className="flex justify-center mb-4" />

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
                userEmail={user.email}
                userPhoto={user.picture}
                onSelectSkin={handleSelectSkin}
            />
        );
    }

    // Render selected skin wrapped with AuthProvider
    return (
        <AuthProvider>
            <Suspense fallback={<LoadingScreen />}>
                {selectedSkin === 'jnorthrup' ? <AppClassic /> : <AppLastrust />}
            </Suspense>
        </AuthProvider>
    );
};

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<UnifiedApp />);
}
