import { useAuth } from './authService';
import { initializeApp, getApps } from 'firebase/app';

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

  const firebaseAvailable =
    getApps().length > 0 &&
    !!import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_API_KEY !== 'placeholder' &&
    !import.meta.env.VITE_FIREBASE_API_KEY?.includes('your-');

  const provider: StepUpAuthProvider = firebaseAvailable
    ? new GoogleReauthProvider(reauthenticate, getLastAuthTime)
    : new StubProvider();

  return { verify: () => provider.verify() };
}
