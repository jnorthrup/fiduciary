
import React, { createContext, useContext, useState, useEffect } from 'react';

// Simplified Interfaces reusing the authService ones
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

export const MockAuthProvider: React.FC<{ children: React.ReactNode, initialUser?: string }> = ({ children, initialUser }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Retrieve test user override from URL if present (e.g. ?__test_user=user_a)
        const params = new URLSearchParams(window.location.search);
        const testUser = params.get('__test_user') || initialUser;

        if (testUser) {
            setUser({
                uid: testUser,
                displayName: `Test User ${testUser}`,
                email: `${testUser}@example.com`,
                photoURL: null,
                emailVerified: true
            });
        }
        setIsLoading(false);
    }, [initialUser]);

    const signIn = async () => {
        // Mock sign in - just sets a default test user
        setUser({
            uid: 'test_user_default',
            displayName: 'Test User Default',
            email: 'test@example.com',
            photoURL: null,
            emailVerified: true
        });
    };

    const signOut = async () => {
        setUser(null);
    };

    return (
        // We use the same Context Provider as the real app if we exported the Context, 
        // but since AuthContext is not exported from authService, we have to patch authService 
        // OR rely on the fact that `useAuth` imports it. 
        // WAIT: `AuthContext` is NOT exported. `useAuth` uses it internally.
        // We need to modify `authService.tsx` to allow injecting a Mock Provider OR export the Context.
        // Let's modify `authService.tsx` to handle this gracefully.
        <div data - mock - auth= "true" > { children } </div>
    );
};
