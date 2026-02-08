/**
 * Production Environment Configuration
 * Fail-fast validation for all required environment variables
 * 
 * Sections:
 * - GOOGLE_AUTH: Firebase/Gmail OAuth configuration
 * - GCP_CORE: Google Cloud Platform project settings
 * - GCS_STORAGE: Google Cloud Storage bucket configuration
 * - GEMINI_AI: Gemini API configuration
 * - GITHUB_CI: GitHub Actions/CI configuration
 * - IRS_IRIS: IRS IRIS A2A API credentials
 * - KEYSTORE: JWT signing key configuration
 * - NETWORK: IP address and domain configuration
 */

const logger = {
    info: (msg) => console.info(`[CONFIG:INFO] ${msg}`),
    error: (msg) => console.error(`[CONFIG:ERROR] ${msg}`),
    warn: (msg) => console.warn(`[CONFIG:WARN] ${msg}`)
};

/**
 * Fail-fast environment variable loader
 * @param {string} name - Environment variable name
 * @param {object} options - Configuration options
 * @param {boolean} options.required - If true, throws on missing value
 * @param {string} options.default - Default value if not required
 * @param {string} options.section - Section name for logging
 * @returns {string} Environment variable value
 */
function env(name, options = {}) {
    const { required = false, default: defaultValue, section = 'GENERAL' } = options;
    const value = process.env[name];

    if (value === undefined || value === '') {
        if (required) {
            const msg = `[${section}] Required environment variable ${name} is not set. Deploy will fail.`;
            logger.error(msg);
            throw new Error(msg);
        }
        if (defaultValue !== undefined) {
            logger.warn(`[${section}] ${name} not set, using default: ${defaultValue.substring(0, 20)}${defaultValue.length > 20 ? '...' : ''}`);
            return defaultValue;
        }
        return undefined;
    }

    // Mask sensitive values in logs
    const sensitive = ['KEY', 'SECRET', 'PASSWORD', 'TOKEN', 'PRIVATE', 'CREDENTIAL'];
    const isSensitive = sensitive.some(s => name.toUpperCase().includes(s));
    const logValue = isSensitive ? '****' : value.substring(0, 30) + (value.length > 30 ? '...' : '');
    logger.info(`[${section}] ${name} = ${logValue}`);

    return value;
}

/**
 * Parse boolean environment variable
 */
function envBool(name, options = {}) {
    const value = env(name, options);
    if (value === undefined) return options.default === 'true';
    return value === 'true' || value === '1' || value === 'yes';
}

// ============================================================================
// GOOGLE_AUTH: Firebase/Gmail OAuth Configuration
// ============================================================================
const GOOGLE_AUTH = {
    // Firebase Admin SDK service account (JSON string or path)
    FIREBASE_SERVICE_ACCOUNT: env('FIREBASE_SERVICE_ACCOUNT', {
        section: 'GOOGLE_AUTH',
        required: false, // Falls back to ADC in production
        default: ''
    }),

    // Gmail OAuth Client ID for frontend (optional - frontend handles this)
    VITE_GMAIL_CLIENT_ID: env('VITE_GMAIL_CLIENT_ID', {
        section: 'GOOGLE_AUTH',
        required: false,
        default: ''
    }),

    // Enable Firebase Auth
    VITE_FIREBASE_ENABLED: envBool('VITE_FIREBASE_ENABLED', {
        section: 'GOOGLE_AUTH',
        default: 'true'
    }),

    // Enable Gmail OAuth
    VITE_GMAIL_AUTH_ENABLED: envBool('VITE_GMAIL_AUTH_ENABLED', {
        section: 'GOOGLE_AUTH',
        default: 'true'
    }),

    // Gemini API Key (for AI features)
    GEMINI_API_KEY: env('GEMINI_API_KEY', {
        section: 'GOOGLE_AUTH',
        required: false,
        default: ''
    })
};

// ============================================================================
// GCP_CORE: Google Cloud Platform Project Settings
// ============================================================================
// Auto-detect from K_SERVICE (Cloud Run) or CLOUDSDK_CORE_PROJECT
const detectedProject = process.env.GOOGLE_CLOUD_PROJECT
    || process.env.CLOUDSDK_CORE_PROJECT
    || process.env.GCP_PROJECT_ID;

const GCP_CORE = {
    // GCP Project ID (auto-detected in Cloud Run)
    GCP_PROJECT_ID: env('GCP_PROJECT_ID', {
        section: 'GCP_CORE',
        required: false,
        default: detectedProject
    }),

    // GCP Project Number (for IAM bindings)
    GCP_PROJECT_NUMBER: env('GCP_PROJECT_NUMBER', {
        section: 'GCP_CORE',
        required: false,
        default: ''
    }),

    // Cloud Run region
    GCP_REGION: env('GCP_REGION', {
        section: 'GCP_CORE',
        required: false,
        default: 'us-central1'
    }),

    // Service name for Cloud Run
    SERVICE_NAME: env('SERVICE_NAME', {
        section: 'GCP_CORE',
        required: false,
        default: 'trust-ledger-fullstack'
    })
};

// ============================================================================
// GCS_STORAGE: Google Cloud Storage Configuration
// ============================================================================
const GCS_STORAGE = {
    // GCS bucket for user data persistence
    GCS_BUCKET: env('GCS_BUCKET', {
        section: 'GCS_STORAGE',
        required: false,
        default: `${GCP_CORE.GCP_PROJECT_ID}-trust-data`
    }),

    // GCS bucket for static hosting (backup)
    GCS_STATIC_BUCKET: env('GCS_STATIC_BUCKET', {
        section: 'GCS_STORAGE',
        required: false,
        default: `${GCP_CORE.GCP_PROJECT_ID}-fullstack-static`
    }),

    // GCS bucket for WAL (Write-Ahead Log)
    GCS_WAL_BUCKET: env('GCS_WAL_BUCKET', {
        section: 'GCS_STORAGE',
        required: false,
        default: `${GCP_CORE.GCP_PROJECT_ID}-wal`
    })
};

// ============================================================================
// GEMINI_AI: Gemini API Configuration
// ============================================================================
const GEMINI_AI = {
    // Gemini API Key
    GEMINI_API_KEY: env('GEMINI_API_KEY', {
        section: 'GEMINI_AI',
        required: false,
        default: ''
    }),

    // Gemini Model (default: gemini-2.5-flash)
    GEMINI_MODEL: env('GEMINI_MODEL', {
        section: 'GEMINI_AI',
        required: false,
        default: 'gemini-2.5-flash'
    })
};

// ============================================================================
// GITHUB_CI: GitHub Actions/CI Configuration
// ============================================================================
const GITHUB_CI = {
    // GitHub PAT for Copilot/Actions
    COPILOT_TOKEN: env('COPILOT_TOKEN', {
        section: 'GITHUB_CI',
        required: false,
        default: ''
    }),

    // GitHub Actions environment
    CI: envBool('CI', {
        section: 'GITHUB_CI',
        default: 'false'
    })
};

// ============================================================================
// IRS_IRIS: IRS IRIS A2A API Credentials
// ============================================================================
const IRS_IRIS = {
    // IRIS Client ID
    IRIS_CLIENT_ID: env('IRIS_CLIENT_ID', {
        section: 'IRS_IRIS',
        required: false,
        default: ''
    }),

    // IRIS User ID
    IRIS_USER_ID: env('IRIS_USER_ID', {
        section: 'IRS_IRIS',
        required: false,
        default: ''
    }),

    // Transmitter Control Code
    IRIS_TCC: env('IRIS_TCC', {
        section: 'IRS_IRIS',
        required: false,
        default: ''
    }),

    // IRIS Key ID for JWT signing
    IRIS_KEY_ID: env('IRIS_KEY_ID', {
        section: 'IRS_IRIS',
        required: false,
        default: ''
    }),

    // IRIS Private Key (PEM format, newlines as \n)
    IRIS_PRIVATE_KEY: env('IRIS_PRIVATE_KEY', {
        section: 'IRS_IRIS',
        required: false,
        default: ''
    }),

    // Test mode flag
    IRIS_TEST_MODE: envBool('IRIS_TEST_MODE', {
        section: 'IRS_IRIS',
        default: 'true'
    }),

    // Mock mode (bypass real API calls)
    IRIS_MOCK_MODE: envBool('IRIS_MOCK_MODE', {
        section: 'IRS_IRIS',
        default: 'true'
    })
};

// ============================================================================
// KEYSTORE: JWT Signing Key Configuration
// ============================================================================
const KEYSTORE = {
    // Path to keystore or Secret Manager resource
    KEYSTORE_PATH: env('KEYSTORE_PATH', {
        section: 'KEYSTORE',
        required: false,
        default: '/secrets/keystore.json'
    }),

    // Keystore password (for encrypted keystores)
    KEYSTORE_PASSWORD: env('KEYSTORE_PASSWORD', {
        section: 'KEYSTORE',
        required: false,
        default: ''
    }),

    // JWT signing algorithm
    JWT_ALGORITHM: env('JWT_ALGORITHM', {
        section: 'KEYSTORE',
        required: false,
        default: 'RS256'
    }),

    // JWT issuer
    JWT_ISSUER: env('JWT_ISSUER', {
        section: 'KEYSTORE',
        required: false,
        default: 'trust-ledger-system'
    }),

    // JWT audience
    JWT_AUDIENCE: env('JWT_AUDIENCE', {
        section: 'KEYSTORE',
        required: false,
        default: 'trust-ledger-api'
    }),

    // JWT expiration (seconds)
    JWT_EXPIRATION: parseInt(env('JWT_EXPIRATION', {
        section: 'KEYSTORE',
        required: false,
        default: '3600'
    }), 10)
};

// ============================================================================
// PLAID: Plaid API Configuration
// ============================================================================
const PLAID = {
    // Plaid Client ID
    PLAID_CLIENT_ID: env('PLAID_CLIENT_ID', {
        section: 'PLAID',
        required: false,
        default: ''
    }),

    // Plaid Secret
    PLAID_SECRET: env('PLAID_SECRET', {
        section: 'PLAID',
        required: false,
        default: ''
    }),

    // Plaid Environment (sandbox, development, production)
    PLAID_ENV: env('PLAID_ENV', {
        section: 'PLAID',
        required: false,
        default: 'sandbox'
    }),

    // Plaid Products (comma-separated: transactions,auth,identity)
    PLAID_PRODUCTS: env('PLAID_PRODUCTS', {
        section: 'PLAID',
        required: false,
        default: 'transactions,auth'
    }),

    // Plaid Country Codes (comma-separated: US,CA,GB)
    PLAID_COUNTRY_CODES: env('PLAID_COUNTRY_CODES', {
        section: 'PLAID',
        required: false,
        default: 'US'
    })
};

// ============================================================================
// NETWORK: IP Address and Domain Configuration
// ============================================================================
const NETWORK = {
    // Public IP/Domain for the service (auto-detected in Cloud Run)
    PUBLIC_URL: env('PUBLIC_URL', {
        section: 'NETWORK',
        required: false,
        default: 'https://trust-ledger-fullstack-388611398406.us-central1.run.app'
    }),

    // API base URL
    VITE_IRS_API_URL: env('VITE_IRS_API_URL', {
        section: 'NETWORK',
        required: false,
        default: '/api'
    }),

    // Server port
    PORT: parseInt(env('PORT', {
        section: 'NETWORK',
        required: false,
        default: '3001'
    }), 10),

    // CORS allowed origins
    CORS_ORIGINS: env('CORS_ORIGINS', {
        section: 'NETWORK',
        required: false,
        default: '*'
    }),

    // Proxy settings (SOCKS/HTTP)
    HTTP_PROXY: env('HTTP_PROXY', {
        section: 'NETWORK',
        required: false,
        default: ''
    }),

    HTTPS_PROXY: env('HTTPS_PROXY', {
        section: 'NETWORK',
        required: false,
        default: ''
    }),

    // Trusted proxy IPs (for X-Forwarded-For)
    TRUSTED_PROXIES: env('TRUSTED_PROXIES', {
        section: 'NETWORK',
        required: false,
        default: '10.0.0.0/8,172.16.0.0/12,192.168.0.0/16'
    })
};

// ============================================================================
// Validation Summary
// ============================================================================

function validateConfig() {
    const errors = [];
    const warnings = [];

    // Critical checks - only fail if absolutely required
    // (most things can use defaults in Cloud Run)

    // Warnings for optional but recommended
    if (!GOOGLE_AUTH.VITE_GMAIL_CLIENT_ID) {
        warnings.push('VITE_GMAIL_CLIENT_ID not set - Gmail OAuth will not work on frontend');
    }

    if (!GOOGLE_AUTH.GEMINI_API_KEY) {
        warnings.push('GEMINI_API_KEY not set - AI features will be disabled');
    }

    if (!IRS_IRIS.IRIS_CLIENT_ID && !IRS_IRIS.IRIS_MOCK_MODE) {
        warnings.push('IRS_IRIS credentials not set and mock mode disabled');
    }


    if (errors.length > 0) {
        logger.error('=== CONFIGURATION ERRORS (Deploy will fail) ===');
        errors.forEach(e => logger.error(`  - ${e}`));
    }

    if (warnings.length > 0) {
        logger.warn('=== CONFIGURATION WARNINGS ===');
        warnings.forEach(w => logger.warn(`  - ${w}`));
    }

    if (errors.length > 0) {
        throw new Error(`Configuration validation failed with ${errors.length} error(s)`);
    }

    logger.info('=== Configuration validated successfully ===');
    return true;
}

// Export configuration
export default {
    GOOGLE_AUTH,
    GCP_CORE,
    GCS_STORAGE,
    GEMINI_AI,
    GITHUB_CI,
    IRS_IRIS,
    KEYSTORE,
    PLAID,
    NETWORK,
    validate: validateConfig
};

// Auto-validate on import if not in test mode
if (process.env.NODE_ENV === 'production') {
    try {
        validateConfig();
    } catch (e) {
        console.error('FATAL: Configuration validation failed');
        console.error(e.message);
        process.exit(1);
    }
}
