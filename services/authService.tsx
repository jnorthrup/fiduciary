import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    getAuth,
    signInWithPopup,
    signOut as firebaseSignOut,
    GoogleAuthProvider,
    onAuthStateChanged,
    User
} from 'firebase/auth';
import { initializeApp, getApps } from 'firebase/app';
import { cryptoService } from './cryptoService';
import { logger } from './logger';

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Firebase config from environment
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase (singleton)
const initFirebaseApp = () => {
    if (getApps().length === 0) {
        if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
            logger.error('Firebase config missing. Check VITE_FIREBASE_* env vars.');
            return null;
        }
        return initializeApp(firebaseConfig);
    }
    return getApps()[0];
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isInitialized, setIsInitialized] = useState(false);
    const [firebaseUser, setFirebaseUser] = useState<User | null>(null);

    useEffect(() => {
        const app = initFirebaseApp();
        if (!app) {
            setIsLoading(false);
            setIsInitialized(true);
            return;
        }

        const auth = getAuth(app);

        // Listen for auth state changes (handles page refresh, session restore)
        const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
            if (fbUser) {
                // Real Google profile data from the wire
                const authUser: AuthUser = {
                    uid: fbUser.uid,
                    displayName: fbUser.displayName,
                    email: fbUser.email,
                    photoURL: fbUser.photoURL,
                    emailVerified: fbUser.emailVerified,
                };
                setUser(authUser);
                setFirebaseUser(fbUser);

                // Derive encryption key from uid
                const salt = new TextEncoder().encode('ledger-static-salt-' + fbUser.uid);
                const key = await cryptoService.deriveKey(fbUser.uid, salt);
                setEncryptionKey(key);

                logger.info('User authenticated', {
                    uid: fbUser.uid,
                    email: fbUser.email,
                    photoURL: fbUser.photoURL ? 'present' : 'none'
                });
            } else {
                setUser(null);
                setFirebaseUser(null);
                setEncryptionKey(null);
            }
            setIsLoading(false);
            setIsInitialized(true);
        });

        return () => unsubscribe();
    }, []);

    const signIn = async () => {
        const app = initFirebaseApp();
        if (!app) {
            logger.error('Cannot sign in: Firebase not initialized');
            return;
        }

        setIsLoading(true);
        try {
            const auth = getAuth(app);
            const provider = new GoogleAuthProvider();

            // Request profile scope to ensure we get photo/name
            provider.addScope('profile');
            provider.addScope('email');

            await signInWithPopup(auth, provider);
            // onAuthStateChanged will handle the user state update
        } catch (error: any) {
            logger.error('Sign in failed', { error: error.message, code: error.code });
            setIsLoading(false);
            throw error;
        }
    };

    const signOut = async () => {
        const app = initFirebaseApp();
        if (!app) return;

        try {
            const auth = getAuth(app);
            await firebaseSignOut(auth);
            // onAuthStateChanged will handle clearing user state
        } catch (error: any) {
            logger.error('Sign out failed', { error: error.message });
        }
    };

    const getIdToken = async (): Promise<string | null> => {
        if (!firebaseUser) return null;
        try {
            return await firebaseUser.getIdToken();
        } catch (error) {
            logger.error('Failed to get ID token', { error });
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
            getIdToken
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
