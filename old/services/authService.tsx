
import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    getAuth,
    onAuthStateChanged,
    signInWithPopup,
    GoogleAuthProvider,
    User as FirebaseUser,
    signOut as firebaseSignOut
} from 'firebase/auth';
import { getApps, initializeApp } from 'firebase/app';
import { cryptoService } from './cryptoService';
import { logger } from './logger';

interface AuthContextType {
    user: FirebaseUser | null;
    encryptionKey: CryptoKey | null;
    isLoading: boolean;
    signIn: () => Promise<void>;
    signOut: () => Promise<void>;
    isInitialized: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode, config?: any }> = ({ children, config }) => {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        if (!config) {
            setIsLoading(false);
            return;
        }

        try {
            if (!getApps().length) {
                initializeApp(config);
            }
            const auth = getAuth();
            setIsInitialized(true);

            const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
                setUser(firebaseUser);

                if (firebaseUser) {
                    // Derive encryption key from UID + a static salt (for now)
                    // In production, we might use a user-provided pass or WebAuthn.
                    const salt = new TextEncoder().encode('ledger-static-salt-' + firebaseUser.uid.substring(0, 8));
                    const key = await cryptoService.deriveKey(firebaseUser.uid, salt);
                    setEncryptionKey(key);
                    logger.info("Encryption key derived for user:", firebaseUser.uid);
                } else {
                    setEncryptionKey(null);
                }

                setIsLoading(false);
            });

            return () => unsubscribe();
        } catch (error) {
            logger.error("Auth initialization failed:", error);
            setIsLoading(false);
        }
    }, [config]);

    const signIn = async () => {
        if (!isInitialized) {
            const mockUser = {
                uid: 'dev-user-123',
                displayName: 'Developer',
                email: 'dev@localhost.local',
                photoURL: null,
            } as any;

            setUser(mockUser);
            const salt = new TextEncoder().encode('ledger-static-salt-' + mockUser.uid.substring(0, 8));
            const key = await cryptoService.deriveKey(mockUser.uid, salt);
            setEncryptionKey(key);
            logger.info("Mock sign-in successful");
            return;
        }

        const auth = getAuth();
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
    };

    const signOut = async () => {
        if (!isInitialized) {
            setUser(null);
            setEncryptionKey(null);
            return;
        }
        const auth = getAuth();
        await firebaseSignOut(auth);
    };

    return (
        <AuthContext.Provider value={{ user, encryptionKey, isLoading, signIn, signOut, isInitialized }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};
