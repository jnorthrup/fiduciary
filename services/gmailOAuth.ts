/**
 * Gmail OAuth Service
 * Handles Google Identity Services OAuth 2.0 flow for Gmail API access
 */

export interface GmailTokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

export interface GmailOAuthConfig {
  client_id: string;
  scope: string[];
  redirect_uri?: string;
}

export class GmailOAuthService {
  private tokenClient: any = null;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private config: GmailOAuthConfig;

  // Gmail API scopes
  static readonly SCOPES = {
    READ_ONLY: 'https://www.googleapis.com/auth/gmail.readonly',
    MODIFY: 'https://www.googleapis.com/auth/gmail.modify',
    SEND: 'https://www.googleapis.com/auth/gmail.send',
    COMPOSE: 'https://www.googleapis.com/auth/gmail.compose',
  } as const;

  constructor(config: GmailOAuthConfig) {
    this.config = {
      ...config,
      scope: config.scope || [GmailOAuthService.SCOPES.READ_ONLY],
    };
  }

  /**
   * Initialize Google Identity Services token client
   * Must be called after GIS script is loaded
   */
  initialize(): void {
    if (typeof google === 'undefined' || !google.accounts) {
      throw new Error('Google Identity Services not loaded. Include GIS script in HTML head.');
    }

    this.tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: this.config.client_id,
      scope: this.config.scope.join(' '),
      callback: (response: GmailTokenResponse) => {
        if (response.access_token) {
          this.accessToken = response.access_token;
          this.tokenExpiry = Date.now() + (response.expires_in * 1000);
          this.storeToken(response);
        }
      },
      error_callback: (error: any) => {
        console.error('Gmail OAuth error:', error);
      },
    });
  }

  /**
   * Request OAuth token - opens popup for user consent
   */
  async requestToken(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.tokenClient) {
        reject(new Error('Gmail OAuth not initialized. Call initialize() first.'));
        return;
      }

      // Check if we have a valid cached token
      if (this.accessToken && Date.now() < this.tokenExpiry) {
        resolve(this.accessToken);
        return;
      }

      // Override callback for this request
      const originalCallback = this.tokenClient.callback;
      this.tokenClient.callback = (response: GmailTokenResponse) => {
        if (response.access_token) {
          this.accessToken = response.access_token;
          this.tokenExpiry = Date.now() + (response.expires_in * 1000);
          this.storeToken(response);
          resolve(response.access_token);
        } else if (response.error) {
          reject(new Error(response.error || 'OAuth request failed'));
        }
        // Restore original callback
        this.tokenClient.callback = originalCallback;
      };

      this.tokenClient.requestAccessToken();
    });
  }

  /**
   * Get current access token (cached if valid)
   */
  async getToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    // Try to restore from storage
    const stored = this.loadToken();
    if (stored && Date.now() < stored.expiry) {
      this.accessToken = stored.access_token;
      this.tokenExpiry = stored.expiry;
      return this.accessToken;
    }

    // Request new token
    return this.requestToken();
  }

  /**
   * Revoke current token (sign out)
   */
  revokeToken(): void {
    if (this.accessToken) {
      google.accounts.oauth2.revoke(this.accessToken, () => {
        console.log('Gmail token revoked');
      });
      this.accessToken = null;
      this.tokenExpiry = 0;
      this.clearStoredToken();
    }
  }

  /**
   * Check if user has granted consent
   */
  hasGrantedToken(): boolean {
    return !!this.accessToken && Date.now() < this.tokenExpiry;
  }

  /**
   * Store token in sessionStorage for persistence
   */
  private storeToken(response: GmailTokenResponse): void {
    const data = {
      access_token: response.access_token,
      expiry: Date.now() + (response.expires_in * 1000),
      scope: response.scope,
    };
    sessionStorage.setItem('gmail_oauth_token', JSON.stringify(data));
  }

  /**
   * Load token from sessionStorage
   */
  private loadToken(): { access_token: string; expiry: number } | null {
    const stored = sessionStorage.getItem('gmail_oauth_token');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Clear stored token
   */
  private clearStoredToken(): void {
    sessionStorage.removeItem('gmail_oauth_token');
  }

  /**
   * Get authorization code (for server-side flow)
   */
  async getAuthorizationCode(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (typeof google === 'undefined' || !google.accounts) {
        reject(new Error('Google Identity Services not loaded'));
        return;
      }

      const codeClient = google.accounts.oauth2.initCodeClient({
        client_id: this.config.client_id,
        scope: this.config.scope.join(' '),
        redirect_uri: this.config.redirect_uri || window.location.origin + '/oauth/callback',
        callback: (response: any) => {
          if (response.code) {
            resolve(response.code);
          } else {
            reject(new Error(response.error || 'Authorization failed'));
          }
        },
        error_callback: (error: any) => {
          reject(error);
        },
      });

      codeClient.requestCode();
    });
  }
}

/**
 * Load Google Identity Services script
 * Call this before using GmailOAuthService
 */
export function loadGIS(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof google !== 'undefined' && google.accounts) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
}

// Singleton instance
let gmailOAuthService: GmailOAuthService | null = null;

export const getGmailOAuthService = (config?: GmailOAuthConfig): GmailOAuthService => {
  if (!gmailOAuthService && config) {
    gmailOAuthService = new GmailOAuthService(config);
  }
  if (!gmailOAuthService) {
    throw new Error('GmailOAuthService not initialized. Pass config on first call.');
  }
  return gmailOAuthService;
};
