
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const IS_PROD = process.env.NODE_ENV === 'production';

/**
 * Structured logger to replace console.log
 * Relays production logs to backend telemetry
 */
const sendRemoteLog = (level: LogLevel, message: string, details?: any) => {
    if (!IS_PROD) return;

    // Fire and forget to avoid blocking UI
    fetch('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level, message, details: details || null })
    }).catch(() => { /* Silent failure for telemetry */ });
};

export const logger = {
    debug: (message: string, ...args: any[]) => {
        if (!IS_PROD) {
            console.debug(`[DEBUG] ${message}`, ...args);
        }
    },

    info: (message: string, ...args: any[]) => {
        console.info(`[INFO] ${message}`, ...args);
        sendRemoteLog('info', message, args[0]);
    },

    warn: (message: string, ...args: any[]) => {
        console.warn(`[WARN] ${message}`, ...args);
        sendRemoteLog('warn', message, args[0]);
    },

    error: (message: string, ...args: any[]) => {
        console.error(`[ERROR] ${message}`, ...args);
        sendRemoteLog('error', message, args[0]);
    }
};

/**
 * Mask sensitive data for logging (simple version - shows last 4 chars)
 */
export const maskSensitiveData = (data: string): string => {
    if (!data) return '';
    if (data.length <= 4) return '****';
    return `****${data.slice(-4)}`;
};

/**
 * Sanitize sensitive data from log messages
 * Removes TCC, bearer tokens, JWT tokens, EINs, SSNs, API keys
 */
export const sanitizeSensitiveData = (message: string): string => {
    if (!message) return message;

    let sanitized = message;

    // Sanitize TCC (T followed by 9 digits)
    sanitized = sanitized.replace(/T\d{9}/g, 'T*********');

    // Sanitize Bearer tokens
    sanitized = sanitized.replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/g, 'Bearer ***');

    // Sanitize JWT tokens (may have partial or full format)
    sanitized = sanitized.replace(/eyJ[A-Za-z0-9\-._~+/]+(\.?eyJ[A-Za-z0-9\-._~+/]*)?(\.[A-Za-z0-9\-._~+/]*)?/g, '***');

    // Sanitize EIN format (XX-XXXXXXX)
    sanitized = sanitized.replace(/\d{2}-\d{7}/g, '**-*******');

    // Sanitize SSN format (XXX-XX-XXXX)
    sanitized = sanitized.replace(/\d{3}-\d{2}-\d{4}/g, '***-**-****');

    // Sanitize API keys
    sanitized = sanitized.replace(/api[_-]?key[=\s]+[A-Za-z0-9_\-]+/gi, 'api_key=***');
    sanitized = sanitized.replace(/sk_[a-zA-Z0-9]+/g, 'sk_***');
    sanitized = sanitized.replace(/["\']?x-api-key["\']?\s*:\s*["\']?[A-Za-z0-9_\-]+["\']?/gi, '"x-api-key": "***"');

    return sanitized;
};
