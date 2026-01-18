/**
 * React Hook for Gmail OAuth
 * Provides UI components and state management for Gmail OAuth flow
 */

import { useState, useEffect, useCallback } from 'react';
import { GmailOAuthService, GmailOAuthConfig, loadGIS, GmailOAuthService } from '../services/gmailOAuth';
import { getGmailClient, GmailClient } from '../services/gmailClient';

export interface UseGmailOAuthResult {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  profile: any | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  getClient: () => GmailClient;
}

export interface UseGmailOAuthOptions {
  clientId: string;
  scopes?: string[];
  autoLoad?: boolean;
}

/**
 * Hook for Gmail OAuth integration
 *
 * @example
 * ```tsx
 * const { isConnected, connect, disconnect, getClient } = useGmailOAuth({
 *   clientId: 'YOUR_CLIENT_ID',
 *   scopes: [
 *     'https://www.googleapis.com/auth/gmail.readonly',
 *     'https://www.googleapis.com/auth/gmail.send'
 *   ]
 * });
 * ```
 */
export const useGmailOAuth = (options: UseGmailOAuthOptions): UseGmailOAuthResult => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [service, setService] = useState<GmailOAuthService | null>(null);
  const [profile, setProfile] = useState<any>(null);

  // Initialize service
  useEffect(() => {
    const init = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load Google Identity Services
        await loadGIS();

        // Create and initialize OAuth service
        const config: GmailOAuthConfig = {
          client_id: options.clientId,
          scope: options.scopes || [GmailOAuthService.SCOPES.READ_ONLY],
        };

        const oauthService = new GmailOAuthService(config);
        oauthService.initialize();
        setService(oauthService);

        // Check if already connected
        if (oauthService.hasGrantedToken()) {
          setIsConnected(true);
          await loadProfile();
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to initialize Gmail OAuth');
        console.error('Gmail OAuth init error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (options.autoLoad !== false) {
      init();
    }
  }, [options.clientId, options.scopes, options.autoLoad]);

  const loadProfile = useCallback(async () => {
    try {
      const client = getGmailClient();
      const profile = await client.getProfile();
      setProfile(profile);
    } catch (err: any) {
      console.error('Failed to load Gmail profile:', err);
    }
  }, []);

  const connect = useCallback(async () => {
    if (!service) {
      setError('Gmail OAuth service not initialized');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      await service.requestToken();
      setIsConnected(true);
      await loadProfile();
    } catch (err: any) {
      const errorMsg = err?.message || err?.error || 'Failed to connect to Gmail';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [service, loadProfile]);

  const disconnect = useCallback(() => {
    if (!service) return;

    service.revokeToken();
    setIsConnected(false);
    setProfile(null);
    setError(null);
  }, [service]);

  const getClient = useCallback(() => {
    return getGmailClient();
  }, []);

  return {
    isConnected,
    isLoading,
    error,
    profile,
    connect,
    disconnect,
    getClient,
  };
};

/**
 * Gmail Connect Button Component
 */
export const GmailConnectButton: React.FC<{
  isConnected: boolean;
  isLoading?: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  className?: string;
}> = ({ isConnected, isLoading, onConnect, onDisconnect, className = '' }) => {
  return (
    <button
      onClick={isConnected ? onDisconnect : onConnect}
      disabled={isLoading}
      className={`gmail-connect-btn ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        borderRadius: '4px',
        border: '1px solid #dadce0',
        background: 'white',
        color: '#3c4043',
        fontSize: '14px',
        fontWeight: '500',
        cursor: isLoading ? 'not-allowed' : 'pointer',
        opacity: isLoading ? 0.7 : 1,
      }}
    >
      <svg width="18" height="18" viewBox="0 0 18 18">
        <path
          fill="#EA4335"
          d="M9 3.5c1.7 0 3.2.6 4.4 1.6L15.7 3C13.8 1.5 11.5 1 9 1 5.6 1 2.6 2.6 1.2 5.2l3.2 2.5c.6-1.8 2.4-3.2 4.6-3.2z"
        />
        <path
          fill="#34A853"
          d="M17.6 9.2c0-.8-.1-1.6-.2-2.3H9v4.5h4.9c-.2 1.1-.8 2.1-1.7 2.8l3.9 3c2.3-2.1 3.6-5.2 3.6-8.8z"
        />
        <path
          fill="#4A90E2"
          d="M3.9 10.8c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2L.7 5.2C.2 6.3 0 7.6 0 9s.2 2.7.7 3.8l3.2-2z"
        />
        <path
          fill="#FBBC05"
          d="M9 18c2.4 0 4.5-.8 6-2.2l-3.9-3c-.8.6-1.9.9-3.1.9-2.2 0-4.1-1.5-4.7-3.5L1.2 13c1.4 2.9 4.3 5 7.8 5z"
        />
      </svg>
      {isLoading ? 'Connecting...' : isConnected ? 'Disconnect Gmail' : 'Connect Gmail'}
    </button>
  );
};

/**
 * Gmail Status Display Component
 */
export const GmailStatus: React.FC<{
  isConnected: boolean;
  profile: any | null;
  error: string | null;
}> = ({ isConnected, profile, error }) => {
  if (error) {
    return (
      <div style={{ color: '#d93025', fontSize: '13px', marginTop: '4px' }}>
        {error}
      </div>
    );
  }

  if (isConnected && profile) {
    return (
      <div style={{ fontSize: '13px', color: '#3c4043', marginTop: '4px' }}>
        Connected as {profile.emailAddress}
      </div>
    );
  }

  return null;
};
