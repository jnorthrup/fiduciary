/**
 * IRS Portal Client
 *
 * Playwright-based automation for IRS e-Services portal authentication.
 * Handles username/password + 2FA login with session persistence.
 */

import { chromium, Browser, BrowserContext, Page, Cookie } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export interface IRSPortalConfig {
  headless?: boolean;
  timeout?: number;
  testMode?: boolean;
  baseUrl?: string;
  sessionDir?: string;
}

export interface AuthResult {
  success: boolean;
  url?: string;
  error?: {
    type: string;
    message: string;
  };
  reused?: boolean;
  reauthenticated?: boolean;
}

export interface Session {
  authenticated: boolean;
  username?: string;
  expiresAt?: number;
  cookies: Cookie[];
  createdAt: number;
}

export interface ReauthCredentials {
  username: string;
  password: string;
  twoFACode: string;
}

type TwoFAMethod = 'sms' | 'email' | 'app' | 'backup';

export class IRSPortalClient {
  private config: Required<IRSPortalConfig>;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private circuitBreakerFailures = 0;
  private circuitBreakerThreshold = 3;
  private currentSession: Session | null = null;

  constructor(config: IRSPortalConfig = {}) {
    this.config = {
      headless: config.headless ?? true,
      timeout: config.timeout ?? 30000,
      testMode: config.testMode ?? false,
      baseUrl: config.baseUrl || (config.testMode
        ? 'https://fire.irs.gov/'
        : 'https://la.www4.irs.gov/e-services/'),
      sessionDir: config.sessionDir || path.join(process.cwd(), 'test', 'session-storage'),
    };
  }

  /**
   * Navigate to IRS e-Services login page
   */
  async navigateToLogin(): Promise<AuthResult> {
    try {
      if (this.circuitBreakerFailures >= this.circuitBreakerThreshold) {
        return {
          success: false,
          error: {
            type: 'circuit_breaker_open',
            message: 'Circuit breaker is open due to repeated failures',
          },
        };
      }

      await this.ensureBrowser();

      await this.page!.goto(this.config.baseUrl, {
        timeout: this.config.timeout,
        waitUntil: 'networkidle',
      });

      this.circuitBreakerFailures = 0; // Reset on success

      return {
        success: true,
        url: this.page!.url(),
      };
    } catch (error: any) {
      this.circuitBreakerFailures++;

      if (error.message?.includes('timeout')) {
        throw new Error('timeout');
      }

      return {
        success: false,
        error: {
          type: 'navigation_error',
          message: error.message || 'Failed to navigate to login page',
        },
      };
    }
  }

  /**
   * Fill username field
   */
  async fillUsername(username: string): Promise<AuthResult> {
    try {
      await this.ensurePage();

      // IRS e-Services typically uses 'username' or 'userId' input field
      const usernameSelector = 'input[name="username"], input[name="userId"], input[type="text"]';
      await this.page!.waitForSelector(usernameSelector, { timeout: this.config.timeout });
      await this.page!.fill(usernameSelector, username);

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: {
          type: 'fill_error',
          message: error.message || 'Failed to fill username',
        },
      };
    }
  }

  /**
   * Fill password field (sanitized logging)
   */
  async fillPassword(password: string): Promise<AuthResult> {
    try {
      await this.ensurePage();

      const passwordSelector = 'input[name="password"], input[type="password"]';
      await this.page!.waitForSelector(passwordSelector, { timeout: this.config.timeout });
      await this.page!.fill(passwordSelector, password);

      // Sanitized logging - never log actual password
      console.log('[IRSPortalClient] Password field filled: ***REDACTED***');

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: {
          type: 'fill_error',
          message: error.message || 'Failed to fill password',
        },
      };
    }
  }

  /**
   * Submit login credentials
   */
  async submitLogin(): Promise<AuthResult> {
    try {
      await this.ensurePage();

      const submitSelector = 'button[type="submit"], input[type="submit"], button:has-text("Sign In")';
      await this.page!.click(submitSelector);

      // Wait for either 2FA prompt or error message
      await Promise.race([
        this.page!.waitForURL(/2fa|mfa|verify|otp/i, { timeout: this.config.timeout }),
        this.page!.waitForSelector('.error, .alert, [role="alert"]', { timeout: this.config.timeout }),
      ]).catch(() => {
        // Timeout is acceptable - may have succeeded
      });

      // Check for error messages
      const errorElement = await this.page!.$('.error, .alert, [role="alert"]');
      if (errorElement) {
        const errorText = await errorElement.textContent();

        if (errorText?.toLowerCase().includes('locked')) {
          return {
            success: false,
            error: {
              type: 'account_locked',
              message: 'Account is locked due to too many failed attempts',
            },
          };
        }

        if (errorText?.toLowerCase().includes('invalid') || errorText?.toLowerCase().includes('incorrect')) {
          return {
            success: false,
            error: {
              type: 'invalid_credentials',
              message: 'Invalid username or password',
            },
          };
        }

        return {
          success: false,
          error: {
            type: 'login_error',
            message: errorText || 'Login failed',
          },
        };
      }

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: {
          type: 'submit_error',
          message: error.message || 'Failed to submit login',
        },
      };
    }
  }

  /**
   * Detect if 2FA prompt is present
   */
  async detect2FAPrompt(): Promise<boolean> {
    try {
      await this.ensurePage();
      const twoFASelector = '[data-testid="2fa"], .two-factor, .mfa, input[maxlength="6"]';
      const element = await this.page!.$(twoFASelector);
      return element !== null;
    } catch {
      return false;
    }
  }

  /**
   * Get available 2FA methods
   */
  async get2FAMethods(): Promise<TwoFAMethod[]> {
    try {
      await this.ensurePage();

      const methods: TwoFAMethod[] = [];

      if (await this.page!.$('button:has-text("SMS"), input[value="sms"]')) {
        methods.push('sms');
      }
      if (await this.page!.$('button:has-text("Email"), input[value="email"]')) {
        methods.push('email');
      }
      if (await this.page!.$('button:has-text("App"), button:has-text("Authenticator"), input[value="app"]')) {
        methods.push('app');
      }
      if (await this.page!.$('button:has-text("Backup"), input[value="backup"]')) {
        methods.push('backup');
      }

      return methods.length > 0 ? methods : ['sms']; // Default to SMS if detection fails
    } catch {
      return ['sms'];
    }
  }

  /**
   * Select 2FA method
   */
  async select2FAMethod(method: TwoFAMethod): Promise<AuthResult> {
    try {
      await this.ensurePage();

      const methodSelectors = {
        sms: 'button:has-text("SMS"), input[value="sms"]',
        email: 'button:has-text("Email"), input[value="email"]',
        app: 'button:has-text("App"), button:has-text("Authenticator"), input[value="app"]',
        backup: 'button:has-text("Backup"), input[value="backup"]',
      };

      const selector = methodSelectors[method];
      const element = await this.page!.$(selector);

      if (!element) {
        return {
          success: false,
          error: {
            type: 'method_not_available',
            message: `2FA method "${method}" not available`,
          },
        };
      }

      await element.click();
      await this.page!.waitForTimeout(1000); // Wait for method selection to process

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: {
          type: 'selection_error',
          message: error.message || 'Failed to select 2FA method',
        },
      };
    }
  }

  /**
   * Enter 6-digit 2FA code
   */
  async enter2FACode(code: string): Promise<AuthResult> {
    try {
      await this.ensurePage();

      // Validate format
      if (code.length !== 6 || !/^\d{6}$/.test(code)) {
        return {
          success: false,
          error: {
            type: 'invalid_format',
            message: '2FA code must be 6 digits',
          },
        };
      }

      // Find 2FA code input (single field or 6 separate inputs)
      const singleInputSelector = 'input[type="text"][maxlength="6"], input[name*="code"], input[name*="otp"]';
      const singleInput = await this.page!.$(singleInputSelector);

      if (singleInput) {
        await singleInput.fill(code);
      } else {
        // Handle 6 separate input fields
        const digitInputs = await this.page!.$$('input[maxlength="1"]');
        if (digitInputs.length === 6) {
          for (let i = 0; i < 6; i++) {
            await digitInputs[i].fill(code[i]);
          }
        } else {
          return {
            success: false,
            error: {
              type: 'input_not_found',
              message: 'Could not find 2FA code input field',
            },
          };
        }
      }

      // Submit 2FA code
      const submitSelector = 'button[type="submit"], button:has-text("Verify"), button:has-text("Submit")';
      await this.page!.click(submitSelector);

      // Wait for navigation or error
      await Promise.race([
        this.page!.waitForNavigation({ timeout: this.config.timeout }),
        this.page!.waitForSelector('.error, .alert, [role="alert"]', { timeout: this.config.timeout }),
      ]).catch(() => {});

      // Check for errors
      const errorElement = await this.page!.$('.error, .alert, [role="alert"]');
      if (errorElement) {
        const errorText = await errorElement.textContent();

        if (errorText?.toLowerCase().includes('expired')) {
          return {
            success: false,
            error: {
              type: 'code_expired',
              message: '2FA code has expired',
            },
          };
        }

        if (errorText?.toLowerCase().includes('invalid') || errorText?.toLowerCase().includes('incorrect')) {
          return {
            success: false,
            error: {
              type: 'invalid_code',
              message: 'Incorrect 2FA code',
            },
          };
        }
      }

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: {
          type: 'verification_error',
          message: error.message || 'Failed to verify 2FA code',
        },
      };
    }
  }

  /**
   * Wait for external 2FA code input and submit
   */
  async wait2FACodeAndSubmit(codeProvider: () => Promise<string>): Promise<AuthResult> {
    try {
      const code = await codeProvider();
      return await this.enter2FACode(code);
    } catch (error: any) {
      return {
        success: false,
        error: {
          type: 'code_provider_error',
          message: error.message || 'Failed to get 2FA code from provider',
        },
      };
    }
  }

  /**
   * Get current session
   */
  async getSession(): Promise<Session> {
    if (this.currentSession) {
      return this.currentSession;
    }

    const cookies = await this.getCookies();
    const session: Session = {
      authenticated: cookies.length > 0,
      cookies,
      createdAt: Date.now(),
      expiresAt: Date.now() + (8 * 60 * 60 * 1000), // 8 hours max session
    };

    this.currentSession = session;
    return session;
  }

  /**
   * Get session cookies
   */
  async getCookies(): Promise<Cookie[]> {
    try {
      await this.ensureContext();
      return await this.context!.cookies();
    } catch {
      return [];
    }
  }

  /**
   * Save session to storage
   */
  async saveSession(username: string): Promise<{ success: boolean; filePath?: string }> {
    try {
      const session = await this.getSession();
      session.username = username;

      // Ensure session directory exists
      await fs.mkdir(this.config.sessionDir, { recursive: true });

      // Create filename from username (sanitized)
      const sanitizedUsername = username.replace(/[^a-zA-Z0-9@.-]/g, '_');
      const fileName = `irs-eservices-${sanitizedUsername}.json`;
      const filePath = path.join(this.config.sessionDir, fileName);

      // Encrypt session data (basic encryption for demo)
      const encrypted = this.encryptSession(JSON.stringify(session));

      await fs.writeFile(filePath, encrypted, 'utf-8');

      // Set restrictive permissions (Unix only)
      try {
        await fs.chmod(filePath, 0o600);
      } catch {
        // Windows doesn't support chmod
      }

      return { success: true, filePath };
    } catch (error: any) {
      return { success: false };
    }
  }

  /**
   * Load session from storage
   */
  async loadSession(username: string): Promise<{ success: boolean; session?: Session }> {
    try {
      const sanitizedUsername = username.replace(/[^a-zA-Z0-9@.-]/g, '_');
      const fileName = `irs-eservices-${sanitizedUsername}.json`;
      const filePath = path.join(this.config.sessionDir, fileName);

      const encrypted = await fs.readFile(filePath, 'utf-8');
      const decrypted = this.decryptSession(encrypted);
      const session: Session = JSON.parse(decrypted);

      this.currentSession = session;
      return { success: true, session };
    } catch {
      return { success: false };
    }
  }

  /**
   * Validate if session is still valid
   */
  async isSessionValid(session: Session): Promise<boolean> {
    if (!session.authenticated) return false;
    if (!session.expiresAt) return false;
    if (Date.now() >= session.expiresAt) return false;
    return true;
  }

  /**
   * Restore session to browser context
   */
  async restoreSession(session: Session): Promise<void> {
    await this.ensureContext();
    await this.context!.addCookies(session.cookies);
    this.currentSession = session;
  }

  /**
   * Validate session or re-authenticate
   */
  async validateSessionOrReauth(credentials?: ReauthCredentials): Promise<AuthResult> {
    if (this.currentSession && await this.isSessionValid(this.currentSession)) {
      await this.restoreSession(this.currentSession);
      return { success: true, reused: true };
    }

    if (!credentials) {
      return {
        success: false,
        error: {
          type: 'credentials_required',
          message: 'Session expired and no credentials provided for re-authentication',
        },
      };
    }

    // Perform fresh authentication
    await this.navigateToLogin();
    await this.fillUsername(credentials.username);
    await this.fillPassword(credentials.password);
    await this.submitLogin();
    const result = await this.enter2FACode(credentials.twoFACode);

    if (result.success) {
      await this.saveSession(credentials.username);
      return { success: true, reauthenticated: true };
    }

    return result;
  }

  /**
   * Retry operation with exponential backoff
   */
  async retryOperation<T>(
    operation: () => Promise<T>,
    options: { maxRetries?: number; baseDelay?: number } = {}
  ): Promise<T> {
    const maxRetries = options.maxRetries ?? 3;
    const baseDelay = options.baseDelay ?? 1000;
    const delays = [baseDelay, baseDelay * 2, baseDelay * 4, baseDelay * 8];

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await this.sleep(delays[i]);
      }
    }

    throw new Error('Operation failed after retries');
  }

  /**
   * Close browser and cleanup
   */
  async close(): Promise<{ success: boolean }> {
    try {
      if (this.page) await this.page.close();
      if (this.context) await this.context.close();
      if (this.browser) await this.browser.close();

      this.page = null;
      this.context = null;
      this.browser = null;

      return { success: true };
    } catch {
      return { success: true }; // Graceful failure
    }
  }

  /**
   * Ensure browser is initialized
   */
  private async ensureBrowser(): Promise<void> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: this.config.headless,
        timeout: this.config.timeout,
      });
    }

    if (!this.context) {
      this.context = await this.browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      });
    }

    if (!this.page) {
      this.page = await this.context.newPage();
      this.page.setDefaultTimeout(this.config.timeout);
    }
  }

  private async ensureContext(): Promise<void> {
    if (!this.context) {
      await this.ensureBrowser();
    }
  }

  private async ensurePage(): Promise<void> {
    if (!this.page) {
      await this.ensureBrowser();
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Basic encryption for session storage (AES-256-GCM)
   */
  private encryptSession(data: string): string {
    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    return JSON.stringify({
      iv: iv.toString('hex'),
      data: encrypted,
      authTag: authTag.toString('hex'),
    });
  }

  private decryptSession(encrypted: string): string {
    const key = this.getEncryptionKey();
    const parsed = JSON.parse(encrypted);

    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(parsed.iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(parsed.authTag, 'hex'));

    let decrypted = decipher.update(parsed.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  private getEncryptionKey(): Buffer {
    // In production, use environment variable or secure key management
    const keyString = process.env.SESSION_ENCRYPTION_KEY || 'default-key-for-development-only-change-in-production';
    return crypto.scryptSync(keyString, 'salt', 32);
  }
}
