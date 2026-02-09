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
    const signInResolveRef = useRef<(() => void) | null>(null);
    const signInRejectRef = useRef<((err: Error) => void) | null>(null);

    // ─── Credential handler (shared by auto-select and prompt) ──────────
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

        // Derive encryption key from uid
        const salt = new TextEncoder().encode('ledger-static-salt-' + authUser.uid);
        const key = await cryptoService.deriveKey(authUser.uid, salt);
        setEncryptionKey(key);

        logger.info('User authenticated', {
            uid: authUser.uid,
            email: authUser.email,
            photoURL: authUser.photoURL ? 'present' : 'none'
        });

        // Resolve pending signIn() promise if any
        signInResolveRef.current?.();
        signInResolveRef.current = null;
        signInRejectRef.current = null;
    }, []);

    // ─── Initialize GSI + restore session ───────────────────────────────
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
            // No Google client ID configured — dev/mock mode
            setIsLoading(false);
            setIsInitialized(true);
            return;
        }

        // Try restoring session from stored JWT
        const stored = sessionStorage.getItem(SESSION_KEY);
        if (stored) {
            try {
                const claims = decodeJwt(stored);
                const expiry = claims.exp * 1000;
                if (Date.now() < expiry) {
                    // Token still valid — restore without re-prompting
                    handleCredential(stored).finally(() => {
                        setIsLoading(false);
                        setIsInitialized(true);
                    });
                    return;
                }
                // Expired — clear it
                sessionStorage.removeItem(SESSION_KEY);
            } catch {
                sessionStorage.removeItem(SESSION_KEY);
            }
        }

        // Initialize GSI
        const initGsi = () => {
            window.google?.accounts.id.initialize({
                client_id: CLIENT_ID,
                callback: (response: any) => {
                    if (response.credential) {
                        handleCredential(response.credential).finally(() => {
                            setIsLoading(false);
                            setIsInitialized(true);
                        });
                    }
                },
                auto_select: true,
            });

            // Try silent auto-select on page load
            window.google?.accounts.id.prompt((notification: any) => {
                // If auto-select didn't fire (user dismissed, or no session), just finish loading
                if (notification.isNotDisplayed() || notification.isSkippedMoment() || notification.isDismissedMoment()) {
                    setIsLoading(false);
                    setIsInitialized(true);
                }
            });
        };

        // GSI script may still be loading
        if (window.google?.accounts?.id) {
            initGsi();
        } else {
            // Wait for the script to load
            const interval = setInterval(() => {
                if (window.google?.accounts?.id) {
                    clearInterval(interval);
                    initGsi();
                }
            }, 100);
            // Timeout: if GSI script never loads, proceed without auth
            const timeout = setTimeout(() => {
                clearInterval(interval);
                if (!isInitialized) {
                    logger.warn('GSI script did not load in time');
                    setIsLoading(false);
                    setIsInitialized(true);
                }
            }, 5000);
            return () => { clearInterval(interval); clearTimeout(timeout); };
        }
    }, [handleCredential]);

    // ─── signIn ─────────────────────────────────────────────────────────
    const signIn = async () => {
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

        setIsLoading(true);

        return new Promise<void>((resolve, reject) => {
            // Check if already signed in from stored JWT
            const stored = sessionStorage.getItem(SESSION_KEY);
            if (stored) {
                try {
                    const claims = decodeJwt(stored);
                    const expiry = claims.exp * 1000;
                    if (Date.now() < expiry) {
                        // Valid stored session
                        handleCredential(stored).then(() => {
                            setIsLoading(false);
                            resolve();
                        });
                        return;
                    } else {
                        sessionStorage.removeItem(SESSION_KEY);
                    }
                } catch {
                    sessionStorage.removeItem(SESSION_KEY);
                }
            }

            // Prompt for sign-in
            window.google?.accounts.id.initialize({
                client_id: CLIENT_ID,
                callback: (response: any) => {
                    if (response.credential) {
                        handleCredential(response.credential).then(() => {
                            setIsLoading(false);
                            resolve();
                        }).catch((err) => {
                            setIsLoading(false);
                            reject(err);
                        });
                    } else {
                        setIsLoading(false);
                        reject(new Error('No credential received'));
                    }
                },
            });

            // The prompt() method handles both:
            // - Showing One Tap popup for automatic sign-in
            // - Returning immediately if user is already signed in (credential comes via callback)
            window.google?.accounts.id.prompt((notification: any) => {
                // Don't reject on isSkippedMoment() - the callback may still fire with a credential
                // Only reject if truly not displayed and no callback fires
                if (notification.isNotDisplayed()) {
                    setIsLoading(false);
                    reject(new Error('Sign-in prompt was not displayed'));
                }
                // isSkippedMoment() is okay - user is already signed in, callback will fire
            });

            // Timeout fallback: if callback doesn't fire within 10 seconds, reject
            setTimeout(() => {
                if (signInResolveRef.current) {
                    setIsLoading(false);
                    reject(new Error('Sign-in timed out'));
                }
            }, 10000);
        });
    };

    // ─── signOut ────────────────────────────────────────────────────────
    const signOut = async () => {
        sessionStorage.removeItem(SESSION_KEY);
        window.google?.accounts.id.disableAutoSelect();

        // Revoke if we have an email hint
        if (user?.email) {
            window.google?.accounts.id.revoke(user.email, () => {
                logger.info('Google session revoked');
            });
        }

        setUser(null);
        setEncryptionKey(null);
    };

    // ─── getIdToken ─────────────────────────────────────────────────────
    const getIdToken = async (): Promise<string | null> => {
        return sessionStorage.getItem(SESSION_KEY);
    };

    // ─── reauthenticate ─────────────────────────────────────────────────
    const reauthenticate = async (): Promise<string> => {
        if (!CLIENT_ID) {
            logger.warn('reauthenticate: Google Client ID not available, returning mock token');
            return 'mock-reauth-token';
        }

        return new Promise<string>((resolve, reject) => {
            window.google?.accounts.id.initialize({
                client_id: CLIENT_ID,
                callback: (response: any) => {
                    if (response.credential) {
                        sessionStorage.setItem(SESSION_KEY, response.credential);
                        logger.info('User re-authenticated successfully');
                        resolve(response.credential);
                    } else {
                        reject(new Error('Re-authentication failed'));
                    }
                },
            });
            window.google?.accounts.id.prompt((notification: any) => {
                if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                    reject(new Error('Re-auth prompt was not displayed'));
                }
            });
        });
    };

    // ─── getLastAuthTime ────────────────────────────────────────────────
    const getLastAuthTime = (): Date | null => {
        const token = sessionStorage.getItem(SESSION_KEY);
        if (!token) return null;
        try {
            const claims = decodeJwt(token);
            return claims.iat ? new Date(claims.iat * 1000) : null;
        } catch {
            return null;
        }
    };

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
