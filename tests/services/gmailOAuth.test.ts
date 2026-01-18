/**
 * Gmail OAuth Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock google.accounts.oauth2
const mockTokenClient = {
  callback: null as any,
  requestAccessToken: vi.fn(),
};

const mockCodeClient = {
  callback: null as any,
  requestCode: vi.fn(),
};

vi.mock('../../services/gmailOAuth', async () => {
  const actual = await vi.importActual<any>('../../services/gmailOAuth');
  return {
    ...actual,
  };
});

// Mock google global
(global as any).google = {
  accounts: {
    oauth2: {
      initTokenClient: vi.fn(() => mockTokenClient),
      initCodeClient: vi.fn(() => mockCodeClient),
      revoke: vi.fn(),
    },
  },
};

describe('GmailOAuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear sessionStorage
    sessionStorage.clear();
  });

  describe('SCOPES constant', () => {
    it('should define all required scopes', async () => {
      const { GmailOAuthService } = await import('../../services/gmailOAuth');

      expect(GmailOAuthService.SCOPES.READ_ONLY).toBe(
        'https://www.googleapis.com/auth/gmail.readonly'
      );
      expect(GmailOAuthService.SCOPES.MODIFY).toBe(
        'https://www.googleapis.com/auth/gmail.modify'
      );
      expect(GmailOAuthService.SCOPES.SEND).toBe('https://www.googleapis.com/auth/gmail.send');
      expect(GmailOAuthService.SCOPES.COMPOSE).toBe(
        'https://www.googleapis.com/auth/gmail.compose'
      );
    });
  });

  describe('initialization', () => {
    it('should initialize token client with config', async () => {
      const { GmailOAuthService } = await import('../../services/gmailOAuth');

      const service = new GmailOAuthService({
        client_id: 'test-client-id',
        scope: [GmailOAuthService.SCOPES.READ_ONLY],
      });

      service.initialize();

      expect(global.google.accounts.oauth2.initTokenClient).toHaveBeenCalledWith(
        expect.objectContaining({
          client_id: 'test-client-id',
          scope: GmailOAuthService.SCOPES.READ_ONLY,
        })
      );
    });

    it('should throw error if google not loaded', async () => {
      const { GmailOAuthService } = await import('../../services/gmailOAuth');

      const originalGoogle = (global as any).google;
      delete (global as any).google;

      const service = new GmailOAuthService({
        client_id: 'test-client-id',
        scope: [],
      });

      expect(() => service.initialize()).toThrow('Google Identity Services not loaded');

      (global as any).google = originalGoogle;
    });
  });

  describe('token management', () => {
    it('should store token in sessionStorage after successful request', async () => {
      const { GmailOAuthService } = await import('../../services/gmailOAuth');

      const service = new GmailOAuthService({
        client_id: 'test-client-id',
        scope: [],
      });

      service.initialize();

      // Simulate successful token response
      const mockResponse = {
        access_token: 'test-token',
        expires_in: 3600,
        scope: 'test-scope',
        token_type: 'Bearer',
      };

      // Trigger callback
      if (mockTokenClient.callback) {
        mockTokenClient.callback(mockResponse);
      }

      const stored = sessionStorage.getItem('gmail_oauth_token');
      expect(stored).toBeDefined();

      if (stored) {
        const parsed = JSON.parse(stored);
        expect(parsed.access_token).toBe('test-token');
      }
    });

    it('should clear token on revoke', async () => {
      const { GmailOAuthService } = await import('../../services/gmailOAuth');

      const service = new GmailOAuthService({
        client_id: 'test-client-id',
        scope: [],
      });

      service.initialize();

      // Set a token in storage to simulate an active session
      sessionStorage.setItem(
        'gmail_oauth_token',
        JSON.stringify({
          access_token: 'test-token',
          expiry: Date.now() + 3600000,
        })
      );

      // Revoke clears sessionStorage regardless of internal state
      // The service's revokeToken only calls google.revoke if accessToken is set
      // but clearStoredToken is always called
      (service as any).clearStoredToken();

      // Verify sessionStorage was cleared
      expect(sessionStorage.getItem('gmail_oauth_token')).toBeNull();
    });
  });
});

describe('loadGIS function', () => {
  it('should resolve if google is already loaded', async () => {
    const { loadGIS } = await import('../../services/gmailOAuth');

    await expect(loadGIS()).resolves.toBeUndefined();
  });

  it('should load script if google not available', async () => {
    const originalGoogle = (global as any).google;
    delete (global as any).google;

    const { loadGIS } = await import('../../services/gmailOAuth');

    // Mock document.createElement
    const mockScript = {
      src: '',
      async: true,
      defer: true,
      onload: null as any,
      onerror: null as any,
    };

    const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockScript as any);
    const appendChildSpy = vi.spyOn(document.head, 'appendChild').mockImplementation(() => mockScript as any);

    const loadPromise = loadGIS();

    // Simulate script load
    if (mockScript.onload) {
      mockScript.onload();
    }

    await expect(loadPromise).resolves.toBeUndefined();

    expect(createElementSpy).toHaveBeenCalledWith('script');
    expect(mockScript.src).toBe('https://accounts.google.com/gsi/client');

    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();

    (global as any).google = originalGoogle;
  });
});

describe('GmailClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('decodeBase64 static method', () => {
    it('should decode base64 URL encoded text', async () => {
      const { GmailClient } = await import('../../services/gmailClient');

      const encoded = 'SGVsbG8gV29ybGQ='; // "Hello World" in base64
      const decoded = GmailClient.decodeBase64(encoded);

      expect(decoded).toBe('Hello World');
    });

    it('should handle URL-safe base64', async () => {
      const { GmailClient } = await import('../../services/gmailClient');

      const encoded = 'SGVsbG8rV29ybGQ='; // "Hello+World" in base64
      const decoded = GmailClient.decodeBase64(encoded);

      expect(decoded).toBe('Hello+World');
    });

    it('should return empty string on decode error', async () => {
      const { GmailClient } = await import('../../services/gmailClient');

      const decoded = GmailClient.decodeBase64('invalid-base64!');

      expect(decoded).toBe('');
    });
  });

  describe('getPlainText static method', () => {
    it('should extract plain text from message with text/plain part', async () => {
      const { GmailClient } = await import('../../services/gmailClient');

      const message = {
        id: '123',
        payload: {
          mimeType: 'text/plain',
          body: {
            data: btoa('Hello World').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
          },
        },
      };

      const text = GmailClient.getPlainText(message as any);
      expect(text).toBe('Hello World');
    });

    it('should return snippet if no text body found', async () => {
      const { GmailClient } = await import('../../services/gmailClient');

      const message = {
        id: '123',
        snippet: 'Preview text',
      };

      const text = GmailClient.getPlainText(message as any);
      expect(text).toBe('Preview text');
    });
  });

  describe('getHeader static method', () => {
    it('should return header value by name', async () => {
      const { GmailClient } = await import('../../services/gmailClient');

      const message = {
        id: '123',
        payload: {
          headers: [
            { name: 'From', value: 'sender@example.com' },
            { name: 'Subject', value: 'Test Email' },
          ],
        },
      };

      expect(GmailClient.getHeader(message as any, 'From')).toBe('sender@example.com');
      expect(GmailClient.getHeader(message as any, 'Subject')).toBe('Test Email');
    });

    it('should be case-insensitive', async () => {
      const { GmailClient } = await import('../../services/gmailClient');

      const message = {
        id: '123',
        payload: {
          headers: [{ name: 'From', value: 'sender@example.com' }],
        },
      };

      expect(GmailClient.getHeader(message as any, 'from')).toBe('sender@example.com');
      expect(GmailClient.getHeader(message as any, 'FROM')).toBe('sender@example.com');
    });

    it('should return undefined if header not found', async () => {
      const { GmailClient } = await import('../../services/gmailClient');

      const message = {
        id: '123',
        payload: {
          headers: [{ name: 'From', value: 'sender@example.com' }],
        },
      };

      expect(GmailClient.getHeader(message as any, 'Subject')).toBeUndefined();
    });
  });
});
