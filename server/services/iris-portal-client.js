/**
 * IRS Portal Client Stub for Cloud Run
 * 
 * The real IRSPortalClient requires Playwright which cannot run in Cloud Run.
 * This stub provides a mock implementation that returns appropriate errors.
 */

export class IRSPortalClient {
    constructor(options = {}) {
        this.options = options;
        console.warn('[IRSPortalClient] Using stub implementation - Playwright not available in Cloud Run');
    }

    async navigateToLogin() {
        return {
            success: false,
            error: {
                type: 'not_available',
                message: 'IRS Portal automation not available in serverless environment'
            }
        };
    }

    async fillUsername(username) {
        return { success: false };
    }

    async fillPassword(password) {
        return { success: false };
    }

    async submitLogin() {
        return { success: false };
    }

    async detect2FAPrompt() {
        return false;
    }

    async get2FAMethods() {
        return [];
    }

    async enter2FACode(code) {
        return { success: false };
    }

    async select2FAMethod(method) {
        return { success: false };
    }

    async getSession() {
        return { cookies: [] };
    }

    async saveSession(username) {
        return;
    }

    async close() {
        return;
    }
}

export default IRSPortalClient;
