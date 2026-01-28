// @ts-nocheck - Tailwind v4 config
type Config = any;

const config: Config = {
  content: [
    './index.html',
    './**/*.{js,ts,jsx,tsx}',
    '!./node_modules/**'
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Background colors using CSS variables
        background: {
          primary: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          tertiary: 'var(--bg-tertiary)',
          elevated: 'var(--bg-elevated)',
          surface: 'var(--bg-surface)'
        },
        // Text colors
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          inverse: 'var(--text-inverse)',
          disabled: 'var(--text-disabled)'
        },
        // Border colors
        border: {
          DEFAULT: 'var(--border-default)',
          subtle: 'var(--border-subtle)',
          focus: 'var(--border-focus)',
          error: 'var(--border-error)'
        },
        // Accent colors
        accent: {
          primary: 'var(--accent-primary)',
          secondary: 'var(--accent-secondary)',
          success: 'var(--accent-success)',
          warning: 'var(--accent-warning)',
          error: 'var(--accent-error)',
          info: 'var(--accent-info)'
        },
        // Status colors
        status: {
          paid: 'var(--status-paid)',
          pending: 'var(--status-pending)',
          failed: 'var(--status-failed)',
          reconciled: 'var(--status-reconciled)',
          disputed: 'var(--status-disputed)'
        }
      },
      backgroundColor: {
        primary: 'var(--bg-primary)',
        secondary: 'var(--bg-secondary)',
        tertiary: 'var(--bg-tertiary)',
        elevated: 'var(--bg-elevated)',
        surface: 'var(--bg-surface)'
      },
      textColor: {
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        muted: 'var(--text-muted)',
        inverse: 'var(--text-inverse)',
        disabled: 'var(--text-disabled)'
      },
      borderColor: {
        DEFAULT: 'var(--border-default)',
        subtle: 'var(--border-subtle)',
        focus: 'var(--border-focus)',
        error: 'var(--border-error)'
      }
    }
  },
  plugins: []
};

export default config;
