/**
 * ThemeContext - React context for theme management
 * Provides light/dark/auto theme switching with system preference detection
 * and localStorage persistence.
 */

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useMemo,
} from 'react';
import { lightTheme, darkTheme, ThemeColors } from '../types/theme';

// Types
export type ThemePreference = 'light' | 'dark' | 'auto';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeContextValue {
    /** The resolved theme (light or dark) */
    theme: ResolvedTheme;
    /** The user's theme preference (light, dark, or auto) */
    themePreference: ThemePreference;
    /** Whether the current resolved theme is dark */
    isDark: boolean;
    /** Set the theme preference */
    setTheme: (preference: ThemePreference) => void;
    /** Toggle between light and dark */
    toggleTheme: () => void;
    /** Current theme tokens */
    tokens: ThemeColors;
}

// Constants
const STORAGE_KEY = 'theme-preference';
const MEDIA_QUERY = '(prefers-color-scheme: dark)';

// Create context with undefined default (forces provider usage)
export const ThemeContext = createContext<ThemeContextValue | undefined>(
    undefined
);
ThemeContext.displayName = 'ThemeContext';

/**
 * Get system color scheme preference
 */
function getSystemTheme(): ResolvedTheme {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia(MEDIA_QUERY).matches ? 'dark' : 'light';
}

/**
 * Resolve theme preference to actual theme
 */
function resolveTheme(preference: ThemePreference): ResolvedTheme {
    if (preference === 'auto') {
        return getSystemTheme();
    }
    return preference;
}

/**
 * Get initial theme preference from localStorage
 */
function getStoredPreference(): ThemePreference {
    if (typeof window === 'undefined') return 'auto';
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'auto') {
        return stored;
    }
    return 'auto';
}

/**
 * Apply theme to document element
 */
function applyTheme(theme: ResolvedTheme): void {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', theme);
}

/**
 * ThemeProvider component
 * Manages theme state and provides context to children
 */
export function ThemeProvider({
    children,
}: {
    children: React.ReactNode;
}): React.ReactElement {
    // Initialize with stored preference and resolved theme
    const [themePreference, setThemePreference] = useState<ThemePreference>(
        getStoredPreference
    );

    // Compute resolved theme directly from preference
    const resolvedTheme = useMemo(
        () => resolveTheme(themePreference),
        [themePreference]
    );

    // Apply theme to DOM when preference changes
    useEffect(() => {
        applyTheme(resolvedTheme);
        localStorage.setItem(STORAGE_KEY, themePreference);
    }, [themePreference, resolvedTheme]);

    // Listen to system preference changes when using 'auto'
    useEffect(() => {
        if (themePreference !== 'auto') return;

        const mediaQuery = window.matchMedia(MEDIA_QUERY);

        const handleChange = (e: MediaQueryListEvent) => {
            const newTheme = e.matches ? 'dark' : 'light';
            applyTheme(newTheme);
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [themePreference]);

    // Initial DOM setup to prevent flash
    useEffect(() => {
        // Add no-transition class to prevent FOUC
        document.documentElement.classList.add('no-transition');
        applyTheme(resolvedTheme);

        // Remove after a tick
        const timer = requestAnimationFrame(() => {
            document.documentElement.classList.remove('no-transition');
        });

        return () => cancelAnimationFrame(timer);
    }, [resolvedTheme]);

    // Set theme preference
    const setTheme = useCallback((preference: ThemePreference) => {
        setThemePreference(preference);
    }, []);

    // Toggle between light and dark
    const toggleTheme = useCallback(() => {
        setThemePreference((current) => {
            // If auto, resolve to actual and then toggle
            const currentResolved = resolveTheme(current);
            return currentResolved === 'light' ? 'dark' : 'light';
        });
    }, []);

    // Get current theme tokens
    const tokens = useMemo((): ThemeColors => {
        return resolvedTheme === 'dark' ? darkTheme : lightTheme;
    }, [resolvedTheme]);

    // Context value
    const value = useMemo(
        (): ThemeContextValue => ({
            theme: resolvedTheme,
            themePreference,
            isDark: resolvedTheme === 'dark',
            setTheme,
            toggleTheme,
            tokens,
        }),
        [resolvedTheme, themePreference, setTheme, toggleTheme, tokens]
    );

    return (
        <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
    );
}

/**
 * useTheme hook
 * Access theme context from any component
 * @throws Error if used outside ThemeProvider
 */
export function useTheme(): ThemeContextValue {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
