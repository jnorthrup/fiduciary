/**
 * Integration Test: Step-Up Authentication System
 *
 * Tests the step-up auth providers that gate high-risk operations
 * (wire origination, ACH submission, payment order submission)
 * behind a freshness check or Google re-authentication.
 *
 * Covers:
 * - StubProvider: always returns true, logs a warning
 * - GoogleReauthProvider: freshness window logic, reauth success/failure
 * - useStepUpAuth hook: returns a verify function (React context)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ─── Mock Firebase before any source imports ───────────────────────────────

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => []),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  signInWithPopup: vi.fn(),
  reauthenticateWithPopup: vi.fn(),
  signOut: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  onAuthStateChanged: vi.fn(),
}));

vi.mock('../../services/cryptoService', () => ({
  cryptoService: {
    deriveKey: vi.fn().mockResolvedValue({ algorithm: { name: 'AES-GCM' } }),
    encrypt: vi.fn(),
    decrypt: vi.fn(),
    generateSalt: vi.fn(() => new Uint8Array(16)),
  },
  CryptoService: vi.fn(),
}));

vi.mock('../../services/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { StubProvider, GoogleReauthProvider } from '../../services/stepUpAuth';

// ============================================================================
// StubProvider
// ============================================================================

describe('StubProvider', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('verify() returns true', async () => {
    const stub = new StubProvider();
    const result = await stub.verify();
    expect(result).toBe(true);
  });

  it('verify() logs a warning about bypassed auth', async () => {
    const stub = new StubProvider();
    await stub.verify();
    expect(warnSpy).toHaveBeenCalledWith(
      'StubProvider: step-up auth bypassed (dev/test mode)'
    );
  });

  it('verify() returns true on repeated calls', async () => {
    const stub = new StubProvider();
    expect(await stub.verify()).toBe(true);
    expect(await stub.verify()).toBe(true);
    expect(await stub.verify()).toBe(true);
    expect(warnSpy).toHaveBeenCalledTimes(3);
  });
});

// ============================================================================
// GoogleReauthProvider
// ============================================================================

describe('GoogleReauthProvider', () => {
  let reauthenticate: ReturnType<typeof vi.fn>;
  let getLastAuthTime: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    reauthenticate = vi.fn().mockResolvedValue('fresh-token');
    getLastAuthTime = vi.fn();
  });

  it('verify() returns true when last auth was recent (< 5 min)', async () => {
    // Auth happened 2 minutes ago
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    getLastAuthTime.mockReturnValue(twoMinutesAgo);

    const provider = new GoogleReauthProvider(reauthenticate, getLastAuthTime);
    const result = await provider.verify();

    expect(result).toBe(true);
    expect(reauthenticate).not.toHaveBeenCalled();
  });

  it('verify() returns true when last auth was exactly at the boundary (just under 5 min)', async () => {
    // Auth happened 4 min 59 sec ago -- still within the 5-minute window
    const justUnder = new Date(Date.now() - (5 * 60 * 1000 - 1000));
    getLastAuthTime.mockReturnValue(justUnder);

    const provider = new GoogleReauthProvider(reauthenticate, getLastAuthTime);
    const result = await provider.verify();

    expect(result).toBe(true);
    expect(reauthenticate).not.toHaveBeenCalled();
  });

  it('verify() calls reauthenticate when auth is stale (> 5 min)', async () => {
    // Auth happened 10 minutes ago
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    getLastAuthTime.mockReturnValue(tenMinutesAgo);

    const provider = new GoogleReauthProvider(reauthenticate, getLastAuthTime);
    const result = await provider.verify();

    expect(reauthenticate).toHaveBeenCalledTimes(1);
    expect(result).toBe(true);
  });

  it('verify() returns true when reauthenticate succeeds', async () => {
    // Stale auth -- forces reauth path
    getLastAuthTime.mockReturnValue(new Date(Date.now() - 10 * 60 * 1000));
    reauthenticate.mockResolvedValue('new-token-abc');

    const provider = new GoogleReauthProvider(reauthenticate, getLastAuthTime);
    const result = await provider.verify();

    expect(result).toBe(true);
  });

  it('verify() returns false when reauthenticate throws', async () => {
    getLastAuthTime.mockReturnValue(new Date(Date.now() - 10 * 60 * 1000));
    reauthenticate.mockRejectedValue(new Error('popup closed by user'));

    const provider = new GoogleReauthProvider(reauthenticate, getLastAuthTime);
    const result = await provider.verify();

    expect(result).toBe(false);
  });

  it('verify() returns false when reauthenticate rejects with non-Error', async () => {
    getLastAuthTime.mockReturnValue(new Date(Date.now() - 10 * 60 * 1000));
    reauthenticate.mockRejectedValue('string-error');

    const provider = new GoogleReauthProvider(reauthenticate, getLastAuthTime);
    const result = await provider.verify();

    expect(result).toBe(false);
  });

  it('verify() returns true when getLastAuthTime returns null (forces reauth)', async () => {
    getLastAuthTime.mockReturnValue(null);

    const provider = new GoogleReauthProvider(reauthenticate, getLastAuthTime);
    const result = await provider.verify();

    // null lastAuth means no recent auth -- must reauth
    expect(reauthenticate).toHaveBeenCalledTimes(1);
    expect(result).toBe(true);
  });

  it('verify() calls reauthenticate when auth time is exactly 5 min ago', async () => {
    // Exactly at the boundary -- elapsed === FRESHNESS_WINDOW_MS, NOT < it
    const exactlyFiveMin = new Date(Date.now() - 5 * 60 * 1000);
    getLastAuthTime.mockReturnValue(exactlyFiveMin);

    const provider = new GoogleReauthProvider(reauthenticate, getLastAuthTime);
    await provider.verify();

    expect(reauthenticate).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// useStepUpAuth hook (React context test)
// ============================================================================

describe('useStepUpAuth hook', () => {
  it('returns an object with a verify function (via StubProvider fallback)', async () => {
    // When Firebase is not initialized (getApps returns []), the hook
    // falls back to StubProvider. We test this by importing the hook
    // in a React render context.

    // We need to dynamically import to get the hook after mocks are set up
    const { useStepUpAuth } = await import('../../services/stepUpAuth');

    // The hook uses useAuth() internally, which requires AuthProvider context.
    // We mock useAuth to avoid needing the full provider tree.
    const authServiceModule = await import('../../services/authService');
    vi.spyOn(authServiceModule, 'useAuth').mockReturnValue({
      user: null,
      encryptionKey: null,
      isLoading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
      isInitialized: true,
      getIdToken: vi.fn(),
      reauthenticate: vi.fn().mockResolvedValue('mock-token'),
      getLastAuthTime: vi.fn().mockReturnValue(null),
    });

    // Use React to render a component that calls the hook
    const React = await import('react');
    const { render, screen, waitFor } = await import('@testing-library/react');

    let hookResult: { verify: () => Promise<boolean> } | null = null;

    function TestComponent() {
      hookResult = useStepUpAuth();
      return React.createElement('div', { 'data-testid': 'hook-loaded' }, 'ready');
    }

    render(React.createElement(TestComponent));

    await waitFor(() => {
      expect(screen.getByTestId('hook-loaded')).toBeTruthy();
    });

    expect(hookResult).toBeTruthy();
    expect(typeof hookResult!.verify).toBe('function');

    // Since getApps() returns [] (mocked), it should use StubProvider
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await hookResult!.verify();
    expect(result).toBe(true);
    expect(warnSpy).toHaveBeenCalledWith(
      'StubProvider: step-up auth bypassed (dev/test mode)'
    );
    warnSpy.mockRestore();
  });
});
