import type { ThemeTokens } from '../types/theme';

export const lightThemeTokens: ThemeTokens = {
  colors: {
    bg: '#f8fafc',
    bgMuted: '#f1f5f9',
    surface: '#ffffff',
    surfaceAlt: '#e2e8f0',
    text: '#0f172a',
    textMuted: '#475569',
    primary: '#2563eb',
    primaryHover: '#1d4ed8',
    accent: '#14b8a6',
    border: '#cbd5e1',
    ring: '#93c5fd',
    success: '#16a34a',
    warning: '#d97706',
    danger: '#dc2626'
  },
  typography: {
    fontSans: 'Inter',
    fontMono: 'JetBrains Mono'
  },
  radius: {
    sm: '6px',
    md: '10px',
    lg: '14px',
    xl: '18px'
  },
  shadow: {
    sm: '0 1px 2px rgba(15, 23, 42, 0.08)',
    md: '0 8px 20px rgba(15, 23, 42, 0.12)',
    lg: '0 20px 45px rgba(15, 23, 42, 0.18)'
  }
};

export const darkThemeTokens: ThemeTokens = {
  colors: {
    bg: '#0b1220',
    bgMuted: '#0f172a',
    surface: '#111827',
    surfaceAlt: '#1f2937',
    text: '#f8fafc',
    textMuted: '#94a3b8',
    primary: '#60a5fa',
    primaryHover: '#3b82f6',
    accent: '#2dd4bf',
    border: '#1e293b',
    ring: '#38bdf8',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#f87171'
  },
  typography: {
    fontSans: 'Inter',
    fontMono: 'JetBrains Mono'
  },
  radius: {
    sm: '6px',
    md: '10px',
    lg: '14px',
    xl: '18px'
  },
  shadow: {
    sm: '0 1px 2px rgba(2, 6, 23, 0.4)',
    md: '0 10px 26px rgba(2, 6, 23, 0.5)',
    lg: '0 24px 48px rgba(2, 6, 23, 0.6)'
  }
};

export const THEME_TOKENS = {
  light: lightThemeTokens,
  dark: darkThemeTokens
} as const;
