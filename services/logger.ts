
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const IS_PROD = process.env.NODE_ENV === 'production';

/**
 * Structured logger to replace console.log
 */
export const logger = {
    debug: (message: string, ...args: any[]) => {
        if (!IS_PROD) {
            console.debug(`[DEBUG] ${message}`, ...args);
        }
    },

    info: (message: string, ...args: any[]) => {
        console.info(`[INFO] ${message}`, ...args);
    },

    warn: (message: string, ...args: any[]) => {
        console.warn(`[WARN] ${message}`, ...args);
    },

    error: (message: string, ...args: any[]) => {
        console.error(`[ERROR] ${message}`, ...args);
    }
};

/**
 * Mask sensitive data for logging
 */
export const maskSensitiveData = (data: string): string => {
    if (!data) return '';
    if (data.length <= 4) return '****';
    return `****${data.slice(-4)}`;
};
