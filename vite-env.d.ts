/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_FIREBASE_API_KEY: string;
    readonly VITE_FIREBASE_AUTH_DOMAIN: string;
    readonly VITE_FIREBASE_PROJECT_ID: string;
    readonly VITE_FIREBASE_STORAGE_BUCKET: string;
    readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
    readonly VITE_FIREBASE_APP_ID: string;
    readonly VITE_GMAIL_CLIENT_ID: string;
    readonly VITE_GMAIL_AUTH_ENABLED: string;
    readonly VITE_FIREBASE_ENABLED: string;
    readonly VITE_DEMO_MODE: string;
    readonly VITE_IRS_API_URL: string;
    readonly VITE_IRS_MOCK_MODE: string;
    readonly VITE_GEMINI_API_KEY: string;
    readonly VITE_ENABLE_GMAIL_OAUTH: string;
    readonly VITE_PLAID_ENV: string;
    readonly VITE_PLAID_CLIENT_ID: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
