import { useAuth } from './authService';

// ─── Step-Up Auth Provider Interface ────────────────────────────────────────

export interface StepUpAuthProvider {
  verify(): Promise<boolean>;
}

// ─── Google Reauth Provider (production) ────────────────────────────────────

const FRESHNESS_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export class GoogleReauthProvider implements StepUpAuthProvider {
  private reauthenticate: () => Promise<string>;
  private getLastAuthTime: () => Date | null;

  constructor(
    reauthenticate: () => Promise<string>,
    getLastAuthTime: () => Date | null
  ) {
    this.reauthenticate = reauthenticate;
    this.getLastAuthTime = getLastAuthTime;
  }

  async verify(): Promise<boolean> {
    const lastAuth = this.getLastAuthTime();
    if (lastAuth) {
      const elapsed = Date.now() - lastAuth.getTime();
      if (elapsed < FRESHNESS_WINDOW_MS) {
        return true;
      }
    }

    try {
      await this.reauthenticate();
      return true;
    } catch {
      return false;
    }
  }
}

// ─── Stub Provider (dev / test / mock mode) ─────────────────────────────────

export class StubProvider implements StepUpAuthProvider {
  async verify(): Promise<boolean> {
    console.warn('StubProvider: step-up auth bypassed (dev/test mode)');
    return true;
  }
}

// ─── React Hook ─────────────────────────────────────────────────────────────

export function useStepUpAuth(): { verify: () => Promise<boolean> } {
  const { reauthenticate, getLastAuthTime } = useAuth();

  const googleAvailable = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const provider: StepUpAuthProvider = googleAvailable
    ? new GoogleReauthProvider(reauthenticate, getLastAuthTime)
    : new StubProvider();

  return { verify: () => provider.verify() };
}
