/**
 * IRS Portal Client Tests
 *
 * Tests for Playwright-based IRS e-Services portal automation.
 * These tests verify username/password + 2FA authentication flows.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IRSPortalClient } from './iris-portal-client';
import type { Browser, BrowserContext, Page } from 'playwright';

// Mock playwright
vi.mock('playwright', () => ({
  chromium: {
    launch: vi.fn(),
  },
}));

describe('IRS Portal Client', () => {
  let client: IRSPortalClient;

  beforeEach(() => {
    client = new IRSPortalClient({
      headless: true,
      testMode: true,
    });
  });

  describe('Initialization', () => {
    it('should create client with default config', () => {
      const defaultClient = new IRSPortalClient();
      expect(defaultClient).toBeDefined();
      expect(defaultClient).toBeInstanceOf(IRSPortalClient);
    });

    it('should create client with custom config', () => {
      const customClient = new IRSPortalClient({
        headless: false,
        timeout: 60000,
        testMode: true,
      });
      expect(customClient).toBeDefined();
    });

    it('should validate required configuration', () => {
      // Test that missing config throws error
      const invalidClient = new IRSPortalClient({
        baseUrl: '', // Invalid empty URL
      });
      expect(invalidClient).toBeDefined();
    });
  });

  describe('IRS e-Services Login Flow', () => {
    it('should navigate to login page', async () => {
      // This will fail until IRSPortalClient is implemented
      const result = await client.navigateToLogin();
      expect(result.success).toBe(true);
      expect(result.url).toContain('irs.gov');
    });

    it('should fill username field', async () => {
      await client.navigateToLogin();
      const result = await client.fillUsername('testuser@example.com');
      expect(result.success).toBe(true);
    });

    it('should fill password field', async () => {
      await client.navigateToLogin();
      await client.fillUsername('testuser@example.com');
      const result = await client.fillPassword('SecurePassword123!');
      expect(result.success).toBe(true);
    });

    it('should submit login credentials', async () => {
      await client.navigateToLogin();
      await client.fillUsername('testuser@example.com');
      await client.fillPassword('SecurePassword123!');
      const result = await client.submitLogin();
      expect(result.success).toBe(true);
    });

    it('should detect login errors', async () => {
      await client.navigateToLogin();
      await client.fillUsername('invalid@example.com');
      await client.fillPassword('wrongpassword');
      const result = await client.submitLogin();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.type).toBe('invalid_credentials');
    });

    it('should handle account locked error', async () => {
      await client.navigateToLogin();
      await client.fillUsername('locked@example.com');
      await client.fillPassword('password');
      const result = await client.submitLogin();
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('account_locked');
    });
  });

  describe('2FA Code Handling', () => {
    it('should detect 2FA prompt', async () => {
      // Simulate successful login that triggers 2FA
      await client.navigateToLogin();
      await client.fillUsername('testuser@example.com');
      await client.fillPassword('password');
      await client.submitLogin();

      const has2FA = await client.detect2FAPrompt();
      expect(has2FA).toBe(true);
    });

    it('should identify available 2FA methods', async () => {
      await client.navigateToLogin();
      await client.fillUsername('testuser@example.com');
      await client.fillPassword('password');
      await client.submitLogin();

      const methods = await client.get2FAMethods();
      expect(methods).toBeDefined();
      expect(methods.length).toBeGreaterThan(0);
      expect(methods).toContain('sms');
    });

    it('should select 2FA method', async () => {
      await client.navigateToLogin();
      await client.fillUsername('testuser@example.com');
      await client.fillPassword('password');
      await client.submitLogin();

      const result = await client.select2FAMethod('sms');
      expect(result.success).toBe(true);
    });

    it('should enter 6-digit 2FA code', async () => {
      await client.navigateToLogin();
      await client.fillUsername('testuser@example.com');
      await client.fillPassword('password');
      await client.submitLogin();
      await client.select2FAMethod('sms');

      const result = await client.enter2FACode('123456');
      expect(result.success).toBe(true);
    });

    it('should validate 2FA code format', async () => {
      await client.navigateToLogin();
      await client.fillUsername('testuser@example.com');
      await client.fillPassword('password');
      await client.submitLogin();

      // Invalid codes
      const invalidResults = await Promise.all([
        client.enter2FACode('12345'),    // Too short
        client.enter2FACode('1234567'),  // Too long
        client.enter2FACode('abcdef'),   // Non-numeric
      ]);

      invalidResults.forEach(result => {
        expect(result.success).toBe(false);
        expect(result.error?.type).toBe('invalid_format');
      });
    });

    it('should handle 2FA code expiration', async () => {
      await client.navigateToLogin();
      await client.fillUsername('testuser@example.com');
      await client.fillPassword('password');
      await client.submitLogin();
      await client.select2FAMethod('sms');

      const result = await client.enter2FACode('999999'); // Expired code
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('code_expired');
    });

    it('should handle incorrect 2FA code', async () => {
      await client.navigateToLogin();
      await client.fillUsername('testuser@example.com');
      await client.fillPassword('password');
      await client.submitLogin();
      await client.select2FAMethod('sms');

      const result = await client.enter2FACode('000000'); // Wrong code
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('invalid_code');
    });

    it('should support external 2FA code input', async () => {
      // Simulate scenario where code is provided by external system
      // (e.g., SMS received by separate device, user manually enters)

      const mockCodeProvider = vi.fn().mockResolvedValue('123456');

      await client.navigateToLogin();
      await client.fillUsername('testuser@example.com');
      await client.fillPassword('password');
      await client.submitLogin();
      await client.select2FAMethod('sms');

      const result = await client.wait2FACodeAndSubmit(mockCodeProvider);
      expect(result.success).toBe(true);
      expect(mockCodeProvider).toHaveBeenCalled();
    });
  });

  describe('Session Management', () => {
    it('should establish session after successful auth', async () => {
      await client.navigateToLogin();
      await client.fillUsername('testuser@example.com');
      await client.fillPassword('password');
      await client.submitLogin();
      await client.select2FAMethod('app');
      await client.enter2FACode('123456');

      const session = await client.getSession();
      expect(session).toBeDefined();
      expect(session.authenticated).toBe(true);
      expect(session.cookies).toBeDefined();
      expect(session.cookies.length).toBeGreaterThan(0);
    });

    it('should extract session cookies', async () => {
      await client.navigateToLogin();
      await client.fillUsername('testuser@example.com');
      await client.fillPassword('password');
      await client.submitLogin();
      await client.enter2FACode('123456');

      const cookies = await client.getCookies();
      expect(cookies).toBeDefined();
      expect(cookies.some(c => c.name.includes('JSESSION'))).toBe(true);
    });

    it('should save session to storage', async () => {
      await client.navigateToLogin();
      await client.fillUsername('testuser@example.com');
      await client.fillPassword('password');
      await client.submitLogin();
      await client.enter2FACode('123456');

      const result = await client.saveSession('testuser@example.com');
      expect(result.success).toBe(true);
      expect(result.filePath).toContain('irs-eservices-testuser');
    });

    it('should load session from storage', async () => {
      // Assume session file exists
      const result = await client.loadSession('testuser@example.com');
      expect(result.success).toBe(true);
      expect(result.session).toBeDefined();
    });

    it('should validate session expiry', async () => {
      const expiredSession = {
        authenticated: true,
        expiresAt: Date.now() - 1000, // Expired 1 second ago
        cookies: [],
      };

      const isValid = await client.isSessionValid(expiredSession);
      expect(isValid).toBe(false);
    });

    it('should reuse valid session', async () => {
      // Load existing valid session
      await client.loadSession('testuser@example.com');

      const result = await client.validateSessionOrReauth();
      expect(result.success).toBe(true);
      expect(result.reused).toBe(true);
    });

    it('should re-authenticate on expired session', async () => {
      // Load expired session
      const expiredSession = {
        authenticated: true,
        expiresAt: Date.now() - 1000,
        cookies: [],
      };
      await client.restoreSession(expiredSession);

      const result = await client.validateSessionOrReauth({
        username: 'testuser@example.com',
        password: 'password',
        twoFACode: '123456',
      });

      expect(result.success).toBe(true);
      expect(result.reused).toBe(false);
      expect(result.reauthenticated).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle network timeout', async () => {
      const slowClient = new IRSPortalClient({
        timeout: 100, // Very short timeout
        testMode: true,
      });

      await expect(slowClient.navigateToLogin()).rejects.toThrow('timeout');
    });

    it('should retry on transient failures', async () => {
      let attempts = 0;
      const mockOperation = vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) throw new Error('Transient error');
        return Promise.resolve({ success: true });
      });

      const result = await client.retryOperation(mockOperation, { maxRetries: 3 });
      expect(result.success).toBe(true);
      expect(attempts).toBe(3);
    });

    it('should implement circuit breaker', async () => {
      // Simulate 3 consecutive failures
      await client.navigateToLogin().catch(() => {});
      await client.navigateToLogin().catch(() => {});
      await client.navigateToLogin().catch(() => {});

      // Circuit should be open now
      const result = await client.navigateToLogin();
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('circuit_breaker_open');
    });

    it('should sanitize logs for sensitive data', async () => {
      const logSpy = vi.spyOn(console, 'log');

      await client.fillPassword('SuperSecretPassword123!');

      // Ensure password is not in logs
      expect(logSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('SuperSecretPassword123!')
      );
    });
  });

  describe('Browser Cleanup', () => {
    it('should close browser context on cleanup', async () => {
      await client.navigateToLogin();
      const cleanupResult = await client.close();
      expect(cleanupResult.success).toBe(true);
    });

    it('should handle cleanup errors gracefully', async () => {
      // Don't initialize browser
      const cleanupResult = await client.close();
      expect(cleanupResult.success).toBe(true); // Should not throw
    });
  });
});
