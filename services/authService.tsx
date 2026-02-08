import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiGet, apiPost, clearAuthToken, getAuthToken, setAuthToken } from './apiClient';

const LOCAL_USERS_KEY = 'clearflow_users';
const LOCAL_CURRENT_USER_KEY = 'clearflow_current_user';
const LOCAL_BOOTSTRAP_USER = {
    email: 'lastrust8808@gmail.com',
    password: 'Khlas8808$$',
    role: 'admin'
};
const GOOGLE_CLIENT_KEY = 'clearflow_google_client_id';

const CACHED_PROFILE_KEY = 'clearflow_cached_profile';
const CACHED_EMAIL_KEY = 'clearflow_cached_email';
const AUTH_DB_NAME = 'clearflow-auth';
const AUTH_STORE = 'profiles';
const AUTH_PROFILE_KEY = 'current';

const openAuthDb = () => {
    return new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(AUTH_DB_NAME, 1);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(AUTH_STORE)) {
                db.createObjectStore(AUTH_STORE);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const saveCachedProfile = async (profile: any) => {
    if (!profile) return;
    try {
        localStorage.setItem(CACHED_PROFILE_KEY, JSON.stringify(profile));
        if (profile.email) {
            localStorage.setItem(CACHED_EMAIL_KEY, profile.email);
        }
        const db = await openAuthDb();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(AUTH_STORE, 'readwrite');
            tx.objectStore(AUTH_STORE).put(profile, AUTH_PROFILE_KEY);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
        db.close();
    } catch {
        // ignore cache errors
    }
};

const readLocalUsers = () => {
    try {
        const raw = localStorage.getItem(LOCAL_USERS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

const writeLocalUsers = (users: any[]) => {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
};

const setLocalCurrentUser = (user: any) => {
    localStorage.setItem(LOCAL_CURRENT_USER_KEY, JSON.stringify(user));
};

const getLocalCurrentUser = () => {
    try {
        const raw = localStorage.getItem(LOCAL_CURRENT_USER_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

interface AuthContextType {
    user: any | null;
    isLoading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signInWithGoogle: (clientId?: string) => Promise<void>;
    signOut: () => Promise<void>;
    isInitialized: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ensureGoogleScript = () => {
    return new Promise<void>((resolve, reject) => {
        if ((window as any).google?.accounts?.id) {
            resolve();
            return;
        }
        const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
        if (existing) {
            existing.addEventListener('load', () => resolve());
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
        document.head.appendChild(script);
    });
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

    const loadUser = async () => {
        const token = getAuthToken();
        if (!token) {
            setUser(null);
            setIsInitialized(true);
            return;
        }

        if (token.startsWith('local-')) {
            const localUser = getLocalCurrentUser();
            setUser(localUser);
            await saveCachedProfile(localUser);
            setIsInitialized(true);
            return;
        }

        try {
            setIsLoading(true);
            const me = await apiGet<any>('/auth/me');
            setUser(me);
            await saveCachedProfile(me);
        } catch {
            clearAuthToken();
            setUser(null);
        } finally {
            setIsLoading(false);
            setIsInitialized(true);
        }
    };

    useEffect(() => {
        loadUser();
    }, []);

    const signIn = async (email: string, password: string) => {
        setIsLoading(true);
        try {
            const response = await apiPost<any>('/auth/login', { email, password });
            const token = response?.token || response?.access_token || response?.jwt;
            if (!token) {
                throw new Error('Login response missing token');
            }
            setAuthToken(token);
            const me = await apiGet<any>('/auth/me');
            setUser(me);
            setLocalCurrentUser(me);
            await saveCachedProfile(me);
            return;
        } catch (err) {
            const users = readLocalUsers();
            if (users.length === 0) {
                writeLocalUsers([LOCAL_BOOTSTRAP_USER]);
            }
            const updatedUsers = readLocalUsers();
            const matched = updatedUsers.find((u: any) => u.email === email && u.password === password);
            if (!matched) throw err;
            const localUser = { email: matched.email, role: matched.role || 'admin' };
            setAuthToken(`local-${Date.now()}`);
            setLocalCurrentUser(localUser);
            setUser(localUser);
            await saveCachedProfile(localUser);
        } finally {
            setIsLoading(false);
        }
    };

    const signInWithGoogle = async (clientId?: string) => {
        const resolvedClientId = clientId || localStorage.getItem(GOOGLE_CLIENT_KEY) || '';
        if (!resolvedClientId) {
            throw new Error('Google client ID not configured');
        }
        localStorage.setItem(GOOGLE_CLIENT_KEY, resolvedClientId);
        setIsLoading(true);
        try {
            await ensureGoogleScript();
            const google = (window as any).google;
            const credential: string = await new Promise((resolve, reject) => {
                google.accounts.id.initialize({
                    client_id: resolvedClientId,
                    callback: (response: any) => {
                        if (response?.credential) resolve(response.credential);
                        else reject(new Error('No Google credential received'));
                    }
                });
                google.accounts.id.prompt();
            });

            const response = await apiPost<any>('/auth/google', { credential, client_id: resolvedClientId });
            const token = response?.token;
            if (!token) throw new Error('Missing token from Google auth');
            setAuthToken(token);
            const me = await apiGet<any>('/auth/me');
            setUser(me);
            setLocalCurrentUser(me);
            await saveCachedProfile(me);
        } finally {
            setIsLoading(false);
        }
    };

    const signOut = async () => {
        try {
            await apiPost('/auth/logout');
        } catch {
            // ignore
        }
        clearAuthToken();
        setUser(null);
        localStorage.removeItem(LOCAL_CURRENT_USER_KEY);
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, signIn, signInWithGoogle, signOut, isInitialized }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};






