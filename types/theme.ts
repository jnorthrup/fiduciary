/**
 * Theme token definitions for light and dark modes
 */

export interface ThemeColors {
  background: {
    primary: string;
    secondary: string;
    tertiary: string;
    elevated: string;
    surface: string;
  };
  text: {
    primary: string;
    secondary: string;
    muted: string;
    inverse: string;
    disabled: string;
  };
  border: {
    default: string;
    subtle: string;
    focus: string;
    error: string;
  };
  accent: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  status: {
    paid: string;
    pending: string;
    failed: string;
    reconciled: string;
    disputed: string;
  };
}

export interface ThemeTokens {
  light: ThemeColors;
  dark: ThemeColors;
}

export const lightTheme: ThemeColors = {
  background: {
    primary: '#ffffff',      // Main background
    secondary: '#f8fafc',    // Panel background (slate-50)
    tertiary: '#f1f5f9',     // Hover background (slate-100)
    elevated: '#ffffff',     // Raised surface (cards, modals)
    surface: '#e2e8f0'       // Input background (slate-200)
  },
  text: {
    primary: '#0f172a',      // Main text (slate-900)
    secondary: '#475569',    // Secondary text (slate-600)
    muted: '#94a3b8',        // Muted text (slate-400)
    inverse: '#ffffff',      // On dark backgrounds
    disabled: '#cbd5e1'      // Disabled text (slate-300)
  },
  border: {
    default: '#cbd5e1',      // Default border (slate-300)
    subtle: '#e2e8f0',       // Subtle border (slate-200)
    focus: '#3b82f6',        // Focus border (blue-500)
    error: '#ef4444'         // Error border (red-500)
  },
  accent: {
    primary: '#3b82f6',      // Primary blue (blue-500)
    secondary: '#8b5cf6',    // Secondary purple (violet-500)
    success: '#10b981',      // Success green (emerald-500)
    warning: '#f59e0b',      // Warning amber (amber-500)
    error: '#ef4444',        // Error red (red-500)
    info: '#06b6d4'          // Info cyan (cyan-500)
  },
  status: {
    paid: '#10b981',         // emerald-500
    pending: '#f59e0b',      // amber-500
    failed: '#ef4444',       // red-500
    reconciled: '#3b82f6',   // blue-500
    disputed: '#f97316'      // orange-500
  }
};

export const darkTheme: ThemeColors = {
  background: {
    primary: '#0f172a',      // Main background (slate-900)
    secondary: '#1e293b',    // Panel background (slate-800)
    tertiary: '#334155',     // Hover background (slate-700)
    elevated: '#1e293b',     // Raised surface (slate-800)
    surface: '#0f172a'       // Input background (slate-900)
  },
  text: {
    primary: '#f8fafc',      // Main text (slate-50)
    secondary: '#cbd5e1',    // Secondary text (slate-300)
    muted: '#64748b',        // Muted text (slate-500)
    inverse: '#0f172a',      // On light backgrounds (slate-900)
    disabled: '#475569'      // Disabled text (slate-600)
  },
  border: {
    default: '#475569',      // Default border (slate-600)
    subtle: '#334155',       // Subtle border (slate-700)
    focus: '#60a5fa',        // Focus border (blue-400)
    error: '#f87171'         // Error border (red-400)
  },
  accent: {
    primary: '#60a5fa',      // Primary blue (blue-400)
    secondary: '#a78bfa',    // Secondary purple (violet-400)
    success: '#34d399',      // Success green (emerald-400)
    warning: '#fbbf24',      // Warning amber (amber-400)
    error: '#f87171',        // Error red (red-400)
    info: '#22d3ee'          // Info cyan (cyan-400)
  },
  status: {
    paid: '#34d399',         // emerald-400
    pending: '#fbbf24',      // amber-400
    failed: '#f87171',       // red-400
    reconciled: '#60a5fa',   // blue-400
    disputed: '#fb923c'      // orange-400
  }
};

export const themeTokens: ThemeTokens = {
  light: lightTheme,
  dark: darkTheme
};
