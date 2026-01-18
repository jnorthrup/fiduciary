/**
 * Session Storage Tests
 *
 * Tests for IRS portal session persistence, encryption, and restoration.
 * Verifies cookie storage, session file I/O, and cross-request session reuse.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionStorage } from './session-storage';
import fs from 'fs/promises';
import path from 'path';
import type { Cookie } from 'playwright';

describe('Session Storage', () => {
  let storage: SessionStorage;
  let testSessionDir: string;

  beforeEach(async () => {
    // Use temporary directory for tests
    testSessionDir = path.join(process.cwd(), 'test', 'session-storage-test');
    await fs.mkdir(testSessionDir, { recursive: true });

    storage = new SessionStorage({
      sessionDir: testSessionDir,
      encryptionKey: 'test-key-for-unit-tests-only',
    });
  });

  afterEach(async () => {
    // Cleanup test files
    try {
      await fs.rm(testSessionDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Cookie/Session Storage', () => {
    it('should save session with cookies to disk', async () => {
      // This test will fail until SessionStorage is implemented
      const mockCookies: Cookie[] = [
        {
          name: 'JSESSIONID',
          value: 'abc123xyz789',
          domain: '.irs.gov',
          path: '/',
          expires: Date.now() / 1000 + 3600,
          httpOnly: true,
          secure: true,
          sameSite: 'Lax',
        },
      ];

      const session = {
        username: 'testuser@example.com',
        authenticated: true,
        cookies: mockCookies,
        createdAt: Date.now(),
        expiresAt: Date.now() + 8 * 60 * 60 * 1000,
      };

      const result = await storage.saveSession(session);

      expect(result.success).toBe(true);
      expect(result.filePath).toBeDefined();
      expect(result.filePath).toContain('testuser');
    });

    it('should verify session file exists after save', async () => {
      const session = {
        username: 'testuser@example.com',
        authenticated: true,
        cookies: [],
        createdAt: Date.now(),
        expiresAt: Date.now() + 8 * 60 * 60 * 1000,
      };

      const result = await storage.saveSession(session);
      expect(result.success).toBe(true);

      // Verify file exists
      const fileExists = await fs
        .access(result.filePath!)
        .then(() => true)
        .catch(() => false);

      expect(fileExists).toBe(true);
    });

    it('should load session from disk', async () => {
      const originalSession = {
        username: 'testuser@example.com',
        authenticated: true,
        cookies: [
          {
            name: 'TEST_COOKIE',
            value: 'test_value',
            domain: '.irs.gov',
            path: '/',
            expires: -1,
            httpOnly: false,
            secure: true,
            sameSite: 'Lax' as const,
          },
        ],
        createdAt: Date.now(),
        expiresAt: Date.now() + 8 * 60 * 60 * 1000,
      };

      await storage.saveSession(originalSession);
      const loadedSession = await storage.loadSession('testuser@example.com');

      expect(loadedSession.success).toBe(true);
      expect(loadedSession.session).toBeDefined();
      expect(loadedSession.session!.username).toBe('testuser@example.com');
      expect(loadedSession.session!.authenticated).toBe(true);
      expect(loadedSession.session!.cookies).toHaveLength(1);
      expect(loadedSession.session!.cookies[0].name).toBe('TEST_COOKIE');
    });

    it('should handle non-existent session gracefully', async () => {
      const result = await storage.loadSession('nonexistent@example.com');

      expect(result.success).toBe(false);
      expect(result.session).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(result.error?.type).toBe('file_not_found');
    });

    it('should encrypt session data before saving', async () => {
      const session = {
        username: 'testuser@example.com',
        authenticated: true,
        cookies: [],
        createdAt: Date.now(),
        expiresAt: Date.now() + 8 * 60 * 60 * 1000,
      };

      const result = await storage.saveSession(session);
      expect(result.success).toBe(true);

      // Read raw file contents
      const rawData = await fs.readFile(result.filePath!, 'utf-8');

      // Should not contain plaintext username or cookie data
      expect(rawData).not.toContain('testuser@example.com');
      expect(rawData).toContain('iv'); // Encryption metadata
      expect(rawData).toContain('data'); // Encrypted payload
      expect(rawData).toContain('authTag'); // GCM auth tag
    });

    it('should decrypt session data when loading', async () => {
      const originalSession = {
        username: 'testuser@example.com',
        authenticated: true,
        cookies: [],
        createdAt: Date.now(),
        expiresAt: Date.now() + 8 * 60 * 60 * 1000,
      };

      await storage.saveSession(originalSession);
      const result = await storage.loadSession('testuser@example.com');

      expect(result.success).toBe(true);
      expect(result.session?.username).toBe('testuser@example.com');
    });

    it('should fail to decrypt with wrong key', async () => {
      const session = {
        username: 'testuser@example.com',
        authenticated: true,
        cookies: [],
        createdAt: Date.now(),
        expiresAt: Date.now() + 8 * 60 * 60 * 1000,
      };

      await storage.saveSession(session);

      // Create new storage with different key
      const wrongKeyStorage = new SessionStorage({
        sessionDir: testSessionDir,
        encryptionKey: 'wrong-key',
      });

      const result = await wrongKeyStorage.loadSession('testuser@example.com');

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('decryption_error');
    });

    it('should sanitize username in filename', async () => {
      const session = {
        username: 'test/user@exam"ple.com', // Special characters
        authenticated: true,
        cookies: [],
        createdAt: Date.now(),
        expiresAt: Date.now() + 8 * 60 * 60 * 1000,
      };

      const result = await storage.saveSession(session);

      expect(result.success).toBe(true);
      expect(result.filePath).toBeDefined();
      // Extract just the filename (basename) to check sanitization
      const fileName = result.filePath!.split('/').pop()!.split('\\').pop()!;
      // Username "test/user@exam"ple.com" should be sanitized to "test_user@exam_ple.com"
      expect(fileName).toContain('test_user@exam_ple.com');
      // Filename should not contain unsafe characters (only in filename portion)
      expect(fileName).not.toContain('/');
      expect(fileName).not.toContain('"');
    });
  });

  describe('Session Reuse Across Requests', () => {
    it('should maintain session validity across multiple loads', async () => {
      const session = {
        username: 'testuser@example.com',
        authenticated: true,
        cookies: [],
        createdAt: Date.now(),
        expiresAt: Date.now() + 8 * 60 * 60 * 1000,
      };

      await storage.saveSession(session);

      // Load multiple times
      const load1 = await storage.loadSession('testuser@example.com');
      const load2 = await storage.loadSession('testuser@example.com');
      const load3 = await storage.loadSession('testuser@example.com');

      expect(load1.success).toBe(true);
      expect(load2.success).toBe(true);
      expect(load3.success).toBe(true);

      // All loads should return same session data
      expect(load1.session?.username).toBe(load2.session?.username);
      expect(load2.session?.username).toBe(load3.session?.username);
    });

    it('should detect expired sessions', async () => {
      const expiredSession = {
        username: 'testuser@example.com',
        authenticated: true,
        cookies: [],
        createdAt: Date.now() - 10 * 60 * 60 * 1000, // 10 hours ago
        expiresAt: Date.now() - 1000, // Expired 1 second ago
      };

      await storage.saveSession(expiredSession);
      const result = await storage.loadSession('testuser@example.com');

      expect(result.success).toBe(true);
      expect(result.session).toBeDefined();

      const isValid = storage.isSessionValid(result.session!);
      expect(isValid).toBe(false);
    });

    it('should validate active sessions', async () => {
      const activeSession = {
        username: 'testuser@example.com',
        authenticated: true,
        cookies: [],
        createdAt: Date.now(),
        expiresAt: Date.now() + 8 * 60 * 60 * 1000, // Expires in 8 hours
      };

      await storage.saveSession(activeSession);
      const result = await storage.loadSession('testuser@example.com');

      expect(result.success).toBe(true);

      const isValid = storage.isSessionValid(result.session!);
      expect(isValid).toBe(true);
    });

    it('should handle concurrent session loads', async () => {
      const session = {
        username: 'testuser@example.com',
        authenticated: true,
        cookies: [],
        createdAt: Date.now(),
        expiresAt: Date.now() + 8 * 60 * 60 * 1000,
      };

      await storage.saveSession(session);

      // Load concurrently
      const results = await Promise.all([
        storage.loadSession('testuser@example.com'),
        storage.loadSession('testuser@example.com'),
        storage.loadSession('testuser@example.com'),
      ]);

      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.session?.username).toBe('testuser@example.com');
      });
    });
  });

  describe('Session Restoration Logic', () => {
    it('should restore cookies to browser context', async () => {
      const mockCookies: Cookie[] = [
        {
          name: 'JSESSIONID',
          value: 'restored_session_123',
          domain: '.irs.gov',
          path: '/',
          expires: Date.now() / 1000 + 3600,
          httpOnly: true,
          secure: true,
          sameSite: 'Lax',
        },
      ];

      const session = {
        username: 'testuser@example.com',
        authenticated: true,
        cookies: mockCookies,
        createdAt: Date.now(),
        expiresAt: Date.now() + 8 * 60 * 60 * 1000,
      };

      await storage.saveSession(session);
      const loadedSession = await storage.loadSession('testuser@example.com');

      expect(loadedSession.success).toBe(true);
      expect(loadedSession.session!.cookies).toHaveLength(1);
      expect(loadedSession.session!.cookies[0].value).toBe('restored_session_123');
    });

    it('should preserve cookie attributes during restoration', async () => {
      const cookieWithAttributes: Cookie = {
        name: 'SECURE_COOKIE',
        value: 'secure_value',
        domain: '.irs.gov',
        path: '/e-services',
        expires: Date.now() / 1000 + 7200,
        httpOnly: true,
        secure: true,
        sameSite: 'Strict',
      };

      const session = {
        username: 'testuser@example.com',
        authenticated: true,
        cookies: [cookieWithAttributes],
        createdAt: Date.now(),
        expiresAt: Date.now() + 8 * 60 * 60 * 1000,
      };

      await storage.saveSession(session);
      const result = await storage.loadSession('testuser@example.com');

      const restoredCookie = result.session!.cookies[0];
      expect(restoredCookie.name).toBe('SECURE_COOKIE');
      expect(restoredCookie.httpOnly).toBe(true);
      expect(restoredCookie.secure).toBe(true);
      expect(restoredCookie.sameSite).toBe('Strict');
      expect(restoredCookie.path).toBe('/e-services');
    });

    it('should update session on restoration', async () => {
      const session = {
        username: 'testuser@example.com',
        authenticated: true,
        cookies: [],
        createdAt: Date.now(),
        expiresAt: Date.now() + 8 * 60 * 60 * 1000,
      };

      await storage.saveSession(session);

      // Load and update
      const result = await storage.loadSession('testuser@example.com');
      expect(result.success).toBe(true);

      // Update session with new cookie
      const updatedSession = {
        ...result.session!,
        cookies: [
          {
            name: 'NEW_COOKIE',
            value: 'new_value',
            domain: '.irs.gov',
            path: '/',
            expires: -1,
            httpOnly: false,
            secure: true,
            sameSite: 'Lax' as const,
          },
        ],
      };

      await storage.saveSession(updatedSession);

      // Reload and verify update
      const reloadedResult = await storage.loadSession('testuser@example.com');
      expect(reloadedResult.success).toBe(true);
      expect(reloadedResult.session!.cookies).toHaveLength(1);
      expect(reloadedResult.session!.cookies[0].name).toBe('NEW_COOKIE');
    });
  });

  describe('Session Cleanup', () => {
    it('should delete expired sessions', async () => {
      const expiredSession = {
        username: 'expired@example.com',
        authenticated: true,
        cookies: [],
        createdAt: Date.now() - 10 * 60 * 60 * 1000,
        expiresAt: Date.now() - 1000,
      };

      await storage.saveSession(expiredSession);

      const result = await storage.deleteSession('expired@example.com');
      expect(result.success).toBe(true);

      // Verify file is deleted
      const loadResult = await storage.loadSession('expired@example.com');
      expect(loadResult.success).toBe(false);
    });

    it('should list all stored sessions', async () => {
      await storage.saveSession({
        username: 'user1@example.com',
        authenticated: true,
        cookies: [],
        createdAt: Date.now(),
        expiresAt: Date.now() + 8 * 60 * 60 * 1000,
      });

      await storage.saveSession({
        username: 'user2@example.com',
        authenticated: true,
        cookies: [],
        createdAt: Date.now(),
        expiresAt: Date.now() + 8 * 60 * 60 * 1000,
      });

      const sessions = await storage.listSessions();
      expect(sessions.length).toBeGreaterThanOrEqual(2);
      expect(sessions.some(s => s.username === 'user1@example.com')).toBe(true);
      expect(sessions.some(s => s.username === 'user2@example.com')).toBe(true);
    });

    it('should clean up all expired sessions', async () => {
      // Create expired session
      await storage.saveSession({
        username: 'expired@example.com',
        authenticated: true,
        cookies: [],
        createdAt: Date.now() - 10 * 60 * 60 * 1000,
        expiresAt: Date.now() - 1000,
      });

      // Create valid session
      await storage.saveSession({
        username: 'valid@example.com',
        authenticated: true,
        cookies: [],
        createdAt: Date.now(),
        expiresAt: Date.now() + 8 * 60 * 60 * 1000,
      });

      const result = await storage.cleanupExpiredSessions();
      expect(result.deleted).toBeGreaterThanOrEqual(1);

      // Verify expired session is deleted
      const expiredResult = await storage.loadSession('expired@example.com');
      expect(expiredResult.success).toBe(false);

      // Verify valid session still exists
      const validResult = await storage.loadSession('valid@example.com');
      expect(validResult.success).toBe(true);
    });
  });
});
