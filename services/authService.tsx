import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { cryptoService } from './cryptoService';
import { logger } from './logger';

// ─── GSI type shim ──────────────────────────────────────────────────────────
declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize: (config: any) => void;
                    prompt: (callback?: (notification: any) => void) => void;
                    disableAutoSelect: () => void;
                    revoke: (hint: string, callback?: () => void) => void;
                };
            };
        };
    }
}

// ─── Minimal JWT decode (no dependency needed for header.payload.sig) ────────
function decodeJwt(token: string): Record<string, any> {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
}

interface AuthUser {
    uid: string;
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
    emailVerified: boolean;
}

interface AuthContextType {
    user: AuthUser | null;
    encryptionKey: CryptoKey | null;
    isLoading: boolean;
    signIn: () => Promise<void>;
    signOut: () => Promise<void>;
    isInitialized: boolean;
    getIdToken: () => Promise<string | null>;
    reauthenticate: () => Promise<string>;
    getLastAuthTime: () => Date | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = 'google_id_token';
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isInitialized, setIsInitialized] = useState(false);
    const gsiReadyRef = useRef(false);

    // Pending credential promise — signIn() and reauthenticate() store their
    // resolve/reject here so the GSI callback (set once in initialize) can
    // fulfill them.
    const pendingRef = useRef<{
        resolve: (credential: string) => void;
        reject: (err: Error) => void;
    } | null>(null);

    // ─── Credential handler (single callback given to GSI initialize) ───
    const handleCredential = useCallback(async (credential: string) => {
        const claims = decodeJwt(credential);

        const authUser: AuthUser = {
            uid: claims.sub,
            displayName: claims.name ?? null,
            email: claims.email ?? null,
            photoURL: claims.picture ?? null,
            emailVerified: !!claims.email_verified,
        };

        sessionStorage.setItem(SESSION_KEY, credential);
        setUser(authUser);

        const salt = new TextEncoder().encode('ledger-static-salt-' + authUser.uid);
        const key = await cryptoService.deriveKey(authUser.uid, salt);
        setEncryptionKey(key);

        logger.info('User authenticated', {
            uid: authUser.uid,
            email: authUser.email,
            photoURL: authUser.photoURL ? 'present' : 'none'
        });

        // Resolve any pending signIn / reauthenticate promise
        pendingRef.current?.resolve(credential);
        pendingRef.current = null;
    }, []);

    // ─── Initialize GSI exactly once + restore session ──────────────────
    useEffect(() => {
        // BACKDOOR FOR AUTOMATED TESTING
        const params = new URLSearchParams(window.location.search);
        const testUser = params.get('__test_user');
        if (testUser) {
            logger.warn('USING TEST USER BACKDOOR', { testUser });
            setUser({
                uid: testUser,
                displayName: `Test User ${testUser}`,
                email: `${testUser}@example.com`,
                photoURL: null,
                emailVerified: true
            });
            setIsLoading(false);
            setIsInitialized(true);
            return;
        }

        if (!CLIENT_ID) {
            setIsLoading(false);
            setIsInitialized(true);
            return;
        }

        // Try restoring session from stored JWT before touching GSI
        const stored = sessionStorage.getItem(SESSION_KEY);
        let restoredFromStorage = false;
        if (stored) {
            try {
                const claims = decodeJwt(stored);
                if (Date.now() < claims.exp * 1000) {
                    restoredFromStorage = true;
                    handleCredential(stored).finally(() => {
                        setIsLoading(false);
                        setIsInitialized(true);
                    });
                } else {
                    sessionStorage.removeItem(SESSION_KEY);
                }
            } catch {
                sessionStorage.removeItem(SESSION_KEY);
            }
        }

        // Initialize GSI exactly once. The callback handles ALL future
        // credential responses (auto-select, prompt, reauthenticate).
        const doInit = () => {
            window.google!.accounts.id.initialize({
                client_id: CLIENT_ID,
                callback: (response: any) => {
                    if (response.credential) {
                        handleCredential(response.credential).then(() => {
                            // Ensure loading/init flags are set (matters for first auto-select)
                            setIsLoading(false);
                            setIsInitialized(true);
                        });
                    }
                },
                auto_select: true,
                use_fedcm_for_prompt: true,
            });
            gsiReadyRef.current = true;

            // If we already restored from storage, don't auto-prompt
            if (restoredFromStorage) return;

            // Try silent auto-select on page load
            window.google!.accounts.id.prompt((notification: any) => {
                // FedCM-safe: isNotDisplayed() is removed. Use getMomentType()
                // or the retained methods isSkippedMoment / isDismissedMoment.
                if (notification.isSkippedMoment() || notification.isDismissedMoment()) {
                    // No auto-credential — finish loading so login screen shows
                    setIsLoading(false);
                    setIsInitialized(true);
                }
            });
        };

        if (window.google?.accounts?.id) {
            doInit();
        } else {
            const interval = setInterval(() => {
                if (window.google?.accounts?.id) {
                    clearInterval(interval);
                    doInit();
                }
            }, 100);
            const timeout = setTimeout(() => {
                clearInterval(interval);
                if (!gsiReadyRef.current) {
                    logger.warn('GSI script did not load in time');
                    setIsLoading(false);
                    setIsInitialized(true);
                }
            }, 5000);
            return () => { clearInterval(interval); clearTimeout(timeout); };
        }
    }, [handleCredential]);

    // ─── requestCredential: shared plumbing for signIn / reauthenticate ─
    const requestCredential = useCallback((): Promise<string> => {
        return new Promise<string>((resolve, reject) => {
            pendingRef.current = { resolve, reject };

            // prompt() shows One Tap; credential arrives via the initialize callback
            window.google?.accounts.id.prompt((notification: any) => {
                if (notification.isSkippedMoment()) {
                    pendingRef.current = null;
                    reject(new Error('Sign-in was cancelled'));
                }
                // isDismissedMoment with credential_returned → callback already fired → pendingRef resolved
            });

            setTimeout(() => {
                if (pendingRef.current) {
                    pendingRef.current = null;
                    reject(new Error('Sign-in timed out'));
                }
            }, 30000);
        });
    }, []);

    // ─── signIn ─────────────────────────────────────────────────────────
    const signIn = useCallback(async () => {
        if (!CLIENT_ID) {
            logger.warn('Google Client ID missing. Falling back to Mock Auth.');
            await new Promise(resolve => setTimeout(resolve, 800));

            const mockUser: AuthUser = {
                uid: 'mock-user-' + Math.floor(Math.random() * 1000),
                displayName: 'Dev User',
                email: 'dev@local.test',
                photoURL: null,
                emailVerified: true
            };

            setUser(mockUser);
            const salt = new TextEncoder().encode('ledger-static-salt-' + mockUser.uid);
            const key = await cryptoService.deriveKey(mockUser.uid, salt);
            setEncryptionKey(key);
            setIsLoading(false);
            return;
        }

        // Check stored JWT first
        const stored = sessionStorage.getItem(SESSION_KEY);
        if (stored) {
            try {
                const claims = decodeJwt(stored);
                if (Date.now() < claims.exp * 1000) {
                    await handleCredential(stored);
                    setIsLoading(false);
                    return;
                }
                sessionStorage.removeItem(SESSION_KEY);
            } catch {
                sessionStorage.removeItem(SESSION_KEY);
            }
        }

        setIsLoading(true);
        try {
            await requestCredential();
        } finally {
            setIsLoading(false);
        }
    }, [handleCredential, requestCredential]);

    // ─── signOut ────────────────────────────────────────────────────────
    const signOut = useCallback(async () => {
        sessionStorage.removeItem(SESSION_KEY);
        window.google?.accounts.id.disableAutoSelect();

        if (user?.email) {
            window.google?.accounts.id.revoke(user.email, () => {
                logger.info('Google session revoked');
            });
        }

        setUser(null);
        setEncryptionKey(null);
    }, [user?.email]);

    // ─── getIdToken ─────────────────────────────────────────────────────
    const getIdToken = useCallback(async (): Promise<string | null> => {
        return sessionStorage.getItem(SESSION_KEY);
    }, []);

    // ─── reauthenticate ─────────────────────────────────────────────────
    const reauthenticate = useCallback(async (): Promise<string> => {
        if (!CLIENT_ID) {
            logger.warn('reauthenticate: Google Client ID not available, returning mock token');
            return 'mock-reauth-token';
        }
        // Same flow as signIn — just call prompt(), credential comes via
        // the single initialize callback → handleCredential → resolves pendingRef
        return requestCredential();
    }, [requestCredential]);

    // ─── getLastAuthTime ────────────────────────────────────────────────
    const getLastAuthTime = useCallback((): Date | null => {
        const token = sessionStorage.getItem(SESSION_KEY);
        if (!token) return null;
        try {
            const claims = decodeJwt(token);
            return claims.iat ? new Date(claims.iat * 1000) : null;
        } catch {
            return null;
        }
    }, []);

    return (
        <AuthContext.Provider value={{
            user,
            encryptionKey,
            isLoading,
            signIn,
            signOut,
            isInitialized,
            getIdToken,
            reauthenticate,
            getLastAuthTime
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};
