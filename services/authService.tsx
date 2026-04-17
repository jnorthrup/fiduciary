import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
    getAuth,
    signInWithPopup,
    GoogleAuthProvider,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    User as FirebaseUser,
    IdTokenResult
} from 'firebase/auth';
import { cryptoService } from './cryptoService';
import { logger } from './logger';

// ─── Firebase Config ─────────────────────────────────────────────────────
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDummyKeyForDev",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "fiduciary-prod.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "fiduciary-prod",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "fiduciary-prod.appspot.com",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789:web:abcdef"
};

// Initialize Firebase (singleton)
const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(firebaseApp);
auth.useDeviceLanguage();

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

// Convert Firebase User to AuthUser
const firebaseUserToAuthUser = (fbUser: FirebaseUser | null): AuthUser | null => {
    if (!fbUser) return null;
    return {
        uid: fbUser.uid,
        displayName: fbUser.displayName,
        email: fbUser.email,
        photoURL: fbUser.photoURL,
        emailVerified: fbUser.emailVerified,
    };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isInitialized, setIsInitialized] = useState(false);

    // ─── Initialize Firebase Auth listener ─────────────────────────────
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

        // Firebase Auth state listener
        const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
            if (fbUser) {
                const authUser = firebaseUserToAuthUser(fbUser);
                setUser(authUser);

                // Derive encryption key from UID
                const salt = new TextEncoder().encode('ledger-static-salt-' + fbUser.uid);
                const key = await cryptoService.deriveKey(fbUser.uid, salt);
                setEncryptionKey(key);

                logger.info('User authenticated via Firebase', {
                    uid: fbUser.uid,
                    email: fbUser.email,
                    emailVerified: fbUser.emailVerified
                });
            } else {
                setUser(null);
                setEncryptionKey(null);
            }

            setIsLoading(false);
            setIsInitialized(true);
        });

        return () => unsubscribe();
    }, []);

    // ─── signIn with Google Popup ───────────────────────────────────────
    const signIn = useCallback(async () => {
        const provider = new GoogleAuthProvider();
        provider.addScope('email');
        provider.addScope('profile');

        try {
            const result = await signInWithPopup(auth, provider);
            logger.info('Signed in with Google', { uid: result.user.uid });
        } catch (error: any) {
            logger.error('Sign-in error', { code: error.code, message: error.message });
            throw error;
        }
    }, []);

    // ─── signOut ────────────────────────────────────────────────────────
    const signOut = useCallback(async () => {
        await firebaseSignOut(auth);
        logger.info('User signed out');
        setUser(null);
        setEncryptionKey(null);
    }, []);

    // ─── getIdToken ─────────────────────────────────────────────────────
    const getIdToken = useCallback(async (): Promise<string | null> => {
        const currentUser = auth.currentUser;
        if (!currentUser) return null;

        try {
            const idTokenResult: IdTokenResult = await currentUser.getIdToken(true);
            return idTokenResult.token;
        } catch (error) {
            logger.error('Error getting ID token', error);
            return null;
        }
    }, []);

    // ─── reauthenticate ─────────────────────────────────────────────────
    const reauthenticate = useCallback(async (): Promise<string> => {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('No user to reauthenticate');
        }

        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);

        const idTokenResult: IdTokenResult = await result.user.getIdToken(true);
        logger.info('User reauthenticated');
        return idTokenResult.token;
    }, []);

    // ─── getLastAuthTime ────────────────────────────────────────────────
    const getLastAuthTime = useCallback((): Date | null => {
        const currentUser = auth.currentUser;
        if (!currentUser) return null;

        // Firebase doesn't expose auth time directly, use metadata.lastSignInTime
        return currentUser.metadata.lastSignInTime ? new Date(currentUser.metadata.lastSignInTime) : null;
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
    if (context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};
