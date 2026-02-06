
import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiGet, apiPost, clearAuthToken, getAuthToken, setAuthToken } from './apiClient';

const LOCAL_USERS_KEY = 'clearflow_users';
const LOCAL_CURRENT_USER_KEY = 'clearflow_current_user';
const LOCAL_BOOTSTRAP_USER = {
    email: 'lastrust8808@gmail.com',
    password: 'Khlas8808$$',
    role: 'admin'
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
    signOut: () => Promise<void>;
    isInitialized: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode, config?: any }> = ({ children, config }) => {
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
            setIsInitialized(true);
            return;
        }

        try {
            setIsLoading(true);
            const me = await apiGet<any>('/auth/me');
            setUser(me);
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
            return;
        } catch (err) {
            // Fallback to local dev auth when backend is not ready.
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
        <AuthContext.Provider value={{ user, isLoading, signIn, signOut, isInitialized }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};
