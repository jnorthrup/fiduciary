/// <reference types="vite/client" />

interface Window {
    HEMISPHERE?: 'LASTRUST' | 'JNORTHRUP';
}

interface ImportMetaEnv {
    readonly VITE_GOOGLE_CLIENT_ID: string;
    readonly VITE_DEMO_MODE: string;
    readonly VITE_IRS_API_URL: string;
    readonly VITE_IRS_MOCK_MODE: string;
    readonly VITE_GEMINI_API_KEY: string;
    readonly VITE_PLAID_ENV: string;
    readonly VITE_PLAID_CLIENT_ID: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
