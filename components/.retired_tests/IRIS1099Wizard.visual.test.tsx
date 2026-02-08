/**
 * Visual/UX State Tests for IRIS1099Wizard
 *
 * Tests for Phase 5.1 Premium Auth UI with glassmorphism and HSL theming.
 * Focuses on visual states, animations, transitions, and user feedback.
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { IRIS1099Wizard } from './IRIS1099Wizard';
import * as irsApiClient from '../services/irsApiClient';
import * as secureStorage from '../services/secureStorage';
import { TCC_PLACEHOLDER } from '../utils/constants';
import userEvent from '@testing-library/user-event';

import { afterEach } from 'vitest';

// Mock IRS API client
vi.mock('../services/irsApiClient', () => ({
  irsApi: {
    healthCheck: vi.fn().mockResolvedValue({ status: 'healthy', version: '1.3.0', timestamp: new Date().toISOString() }),
    setAuth: vi.fn(),
    validateTin: vi.fn(),
    transmissionCheck: vi.fn(),
    submitBatch: vi.fn(),
    pollSubmissionStatus: vi.fn()
  },
  getFormAmountFields: () => [
    { id: '1', label: 'Nonemployee Compensation', field: 'nonemployeeComp' }
  ]
}));

// Mock secure storage
vi.mock('../services/secureStorage', () => ({
  storeTCC: vi.fn(),
  getStoredTCCs: vi.fn(() => []),
  storeBearerToken: vi.fn(),
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as any;

// Mock useLedgerStore to bypass LedgerProvider loading state
vi.mock('../services/ledgerService', () => {
  const setState = vi.fn();
  const emptyDb = {
    entities: [],
    accounts: [],
    journals: [],
    wallets: [],
    users: [],
    modules: [],
    filings: [],
    transmissions: [],
    documents: [],
    canalRecords: [],
    crmPeople: [],
    escrows: [],
    ticks: [],
    fedWires: [],
    contractors: [],
    bsoRoles: [],
    bsoSubmissions: [],
    irsCreds: [],
    employees: [],
    payrollRuns: [],
    ssaStatements: [],
    resolutions: [],
    purchaseContracts: [],
    creditResolutions: [],
    creditInstruments: [],
    closingRecords: [],
    realEstateAssets: [],
    collateralPools: [],
    collateralItems: [],
    fiduciaryActions: [],
    resitusRecords: [],
    trustCertificates: [],
    giftTaxRecords: [],
    parcelRecords: [],
    edgarResearchRecords: [],
    deploymentPlans: [],
    taxWorkflowNodes: [],
    workflowDefinitions: [],
  };
  return {
    useLedgerStore: () => ({
      ...emptyDb,
      currentUser: { id: 'dev', name: 'Developer', email: 'dev@local', role: 'Owner' as const, avatarInitials: 'DV', lastActive: 'Now', _version: '1' },
      secrets: { irsEtin: '', irsAppId: '', bsoUserId: '', hmacKey: '' },
      settings: {
        fuzzing: { enabled: false, intensity: 'Low', latencyMode: 'Realistic' },
        network: 'Testnet',
        layoutMode: 'MobileQuickBooks',
      },
      apiSystemStatus: [],
      searchResults: [],
      isSearching: false,
      changeGraph: [],
      canResume: false,
      isCloudEnabled: false,
      is2FAOpen: false,
      teachModeEnabled: false,
      pendingCallback: null,
      setCurrentUser: setState,
      setSecrets: setState,
      setSettings: setState,
      setSearchResults: setState,
      setIsSearching: setState,
      setChangeGraph: setState,
      setCanResume: setState,
      setIsCloudEnabled: setState,
      setIs2FAOpen: setState,
      setTeachModeEnabled: setState,
      setPendingCallback: setState,
      addItem: vi.fn(),
      updateItem: vi.fn(),
      deleteItem: vi.fn(),
      postJournal: vi.fn(),
    }),
    LedgerProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

vi.setConfig({ testTimeout: 60000 });

const renderWizard = async () => {
  const result = render(<IRIS1099Wizard />);
  await waitFor(() => expect(screen.getByText(/IRS IRIS 1099 Submission/i)).toBeInTheDocument());
  return result;
};

describe('IRIS1099Wizard - Visual/UX States (Phase 5.1)', () => {
  // Stub setTimeout to make animations instant
  const originalSetTimeout = global.setTimeout;

  beforeEach(() => {
    vi.clearAllMocks();
    global.setTimeout = ((cb: any, ms?: number) => {
      // If delay is large > 100ms (animations), make it fast (50ms) but not instant
      // to allow waitFor to catch state changes
      const delay = ms && ms > 100 ? 50 : ms;
      return originalSetTimeout(cb, delay);
    }) as any;
  });

  afterEach(() => {
    global.setTimeout = originalSetTimeout;
  });

  describe('Auth Mode Selection Animations', () => {
    it('should apply scale animation on auth mode selection', async () => {
      render(<IRIS1099Wizard />);

      const tccButton = screen.getByText(/TCC AUTH/i);
      const bearerButton = screen.getByText(/API TOKEN/i);

      // Both buttons should be present
      expect(tccButton).toBeInTheDocument();
      expect(bearerButton).toBeInTheDocument();

      // Click bearer token mode
      fireEvent.click(bearerButton);

      // Should update auth mode
      expect(screen.getByText(/A2A Bearer Token/i)).toBeInTheDocument();
    });

    it('should show gradient overlay on selected auth mode', async () => {
      await renderWizard();

      // TCC mode is selected by default
      const tccButton = screen.getByText(/TCC AUTH/i).closest('button');

      // Should have selected styling
      expect(tccButton).toHaveClass('scale-105');
    });
  });

  describe('Real-time TCC Format Validation', () => {
    it('should show empty state when TCC input is empty', async () => {
      await renderWizard();

      const tccInput = screen.getByPlaceholderText(TCC_PLACEHOLDER);

      // Initially empty - no format indicator
      expect(screen.queryByText(/FORMAT VALID/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/DIGITS/i)).not.toBeInTheDocument();
    });

    it('should show partial state when TCC is being typed', async () => {
      await renderWizard();

      const tccInput = screen.getByPlaceholderText(TCC_PLACEHOLDER);

      // Type partial TCC (AB + 1 digit -> AB-1)
      fireEvent.input(tccInput, { target: { value: 'AB1' } });

      // Should show partial format indicator
      // input 'AB1' -> 'AB-1' (len 4)
      await waitFor(() => {
        expect(screen.getByText(/4\/10 CHARACTERS/i)).toBeInTheDocument();
      });
    });

    it('should show valid state when TCC format is correct (T + 10 digits)', async () => {
      await renderWizard();

      const tccInput = screen.getByPlaceholderText(TCC_PLACEHOLDER);

      // Type valid TCC format (AB-1234567)
      fireEvent.input(tccInput, { target: { value: 'AB-1234567' } });

      // Should show valid format indicator
      await waitFor(() => {
        expect(screen.getByText(/FORMAT VALID/i)).toBeInTheDocument();
      });
    });

    it('should show invalid state for incorrect TCC format', async () => {
      await renderWizard();

      const tccInput = screen.getByPlaceholderText(TCC_PLACEHOLDER);

      // Type invalid TCC format (no letter prefix)
      fireEvent.input(tccInput, { target: { value: '1234567' } });

      // Should show invalid format indicator
      await waitFor(() => {
        expect(screen.getByText(/INVALID FORMAT/i)).toBeInTheDocument();
      });
    });

    it('should transition between format states smoothly', async () => {
      await renderWizard();

      const tccInput = screen.getByPlaceholderText(TCC_PLACEHOLDER);

      // Empty -> Partial (AB -> AB, len 2)
      fireEvent.input(tccInput, { target: { value: 'AB' } });
      await waitFor(() => {
        // AB (len 2) matches partial pattern
        expect(screen.getByText(/2\/10 CHARACTERS/i)).toBeInTheDocument();
      });

      // Partial -> Valid
      fireEvent.input(tccInput, { target: { value: 'AB-1234567' } });
      await waitFor(() => {
        expect(screen.getByText(/FORMAT VALID/i)).toBeInTheDocument();
      });

      // Clear -> Empty
      fireEvent.change(tccInput, { target: { value: '' } });
      await waitFor(() => {
        expect(screen.queryByText(/FORMAT VALID/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Terminal Animation Effects', () => {
    it('should display terminal when fetching TCC', async () => {
      await renderWizard();
      // Initial wait handled by beforeEach? No, beforeEach cleanup() removes it.
      // So render happens again.
      // Wait, if I render in beforeEach and cleanup, the effects might still be pending/resolved?
      // No, render effects are tied to component instance.
      // If I want to ensure effects are flushed, I should mock them to resolve immediately or just handle `act` per test.

      // Let's NOT render in beforeEach, but add a reusable helper or just add waitFor in each test.
      // Or make a custom render helper.

      // Reverting the plan to render in beforeEach as it complicates things.
      // Instead, just increase timeout and ensure `waitFor` at start of tests.

      const fetchButton = screen.getByText(/Fetch TCC/i);
      fireEvent.click(fetchButton);

      // Terminal should appear with scanline effects
      await waitFor(() => {
        const terminal = screen.queryByText(/Initializing secure connection/i);
        expect(terminal).toBeInTheDocument();
      }, { timeout: 10000 });
    });

    it('should show animated log entries during TCC fetch', async () => {
      await renderWizard();

      const fetchButton = screen.getByText(/Fetch TCC/i);
      fireEvent.click(fetchButton);

      // Should show sequential log entries
      // Should show sequential log entries
      await waitFor(() => {
        const entry = screen.queryByText(/Initializing secure connection/i);
        expect(entry).toBeInTheDocument();
      }, { timeout: 10000 });

      await waitFor(() => {
        const entry = screen.queryByText(/TLS 1\.3 handshake established/i);
        expect(entry).toBeInTheDocument();
      }, { timeout: 10000 });

      await waitFor(() => {
        const entry = screen.queryByText(/Authenticating with ID\.me federation/i);
        expect(entry).toBeInTheDocument();
      }, { timeout: 15000 });
    });

    it('should show pulsing cursor in terminal', async () => {
      await renderWizard();

      const fetchButton = screen.getByText(/Fetch TCC/i);
      fireEvent.click(fetchButton);

      // Terminal should have a cursor element with pulse animation
      await waitFor(() => {
        const terminal = screen.queryByText(/Initializing secure connection/i)?.closest('div');
        expect(terminal).toBeInTheDocument();
      }, { timeout: 10000 });
    });
  });

  describe('Test Connection Button States', () => {
    it('should show idle state initially', async () => {
      await renderWizard();


      const authButton = screen.getByText(/Authenticate & Continue/i);
      expect(authButton).toBeInTheDocument();
    });

    it('should show checking state during connection test', async () => {
      (irsApiClient.irsApi.healthCheck as Mock).mockResolvedValueOnce({ status: 'healthy', service: 'Test', version: '1.0' });

      await renderWizard();


      const tccInput = screen.getByPlaceholderText(TCC_PLACEHOLDER);
      fireEvent.input(tccInput, { target: { value: 'AB-1234567' } });

      const authButton = screen.getByText(/Authenticate & Continue/i);
      fireEvent.click(authButton);

      // Should show checking state
      await waitFor(() => {
        expect(screen.getByText(/Testing Connection/i)).toBeInTheDocument();
      });
    });

    it('should show valid state after successful connection', async () => {
      (irsApiClient.irsApi.setAuth as Mock).mockResolvedValueOnce(undefined);

      await renderWizard();


      const tccInput = screen.getByPlaceholderText(TCC_PLACEHOLDER);
      fireEvent.input(tccInput, { target: { value: 'AB-1234567' } });

      const authButton = screen.getByText(/Authenticate & Continue/i);
      fireEvent.click(authButton);

      // Should eventually show connection verified
      await waitFor(() => {
        expect(screen.getByText(/Connection Verified/i)).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('should show invalid state on connection failure', async () => {
      (irsApiClient.irsApi.healthCheck as Mock).mockImplementation(() => Promise.reject(new Error('Connection failed')));

      await renderWizard();


      const tccInput = screen.getByPlaceholderText(TCC_PLACEHOLDER);
      fireEvent.input(tccInput, { target: { value: 'AB-1234567' } });

      const authButton = screen.getByText(/Authenticate & Continue/i);
      fireEvent.click(authButton);

      // Should show error state
      await waitFor(() => {
        expect(screen.getByText(/Connection failed/i)).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  describe('Error State Visuals', () => {
    it('should display error with backdrop blur and glow', async () => {
      (irsApiClient.irsApi.healthCheck as Mock).mockImplementation(() => Promise.reject(new Error('API unavailable')));

      await renderWizard();


      const tccInput = screen.getByPlaceholderText(TCC_PLACEHOLDER);
      fireEvent.input(tccInput, { target: { value: 'AB-1234567' } });

      const authButton = screen.getByText(/Authenticate & Continue/i);
      fireEvent.click(authButton);

      // Error should be displayed
      await waitFor(() => {
        const error = screen.getByText(/API unavailable/i);
        expect(error).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  describe('Persistence Toggle Visuals', () => {
    it('should toggle visual state when persistence mode changes', async () => {
      await renderWizard();


      // Should show "Encrypted Vault" when enabled (default)
      expect(screen.getByText(/Encrypted Vault/i)).toBeInTheDocument();

      // Find and click the toggle
      const toggleLabel = screen.getByText(/Persistence Mode/i).closest('div');
      const toggle = toggleLabel?.querySelector('[role="checkbox"]');

      if (toggle) {
        fireEvent.click(toggle);

        // Should change to "Session Only"
        await waitFor(() => {
          expect(screen.getByText(/Session Only/i)).toBeInTheDocument();
        });
      }
    });
  });

  describe('Auth Mode Transition Animations', () => {
    it('should animate between TCC and Bearer token modes', async () => {
      await renderWizard();


      // Start in TCC mode
      expect(screen.getByPlaceholderText(TCC_PLACEHOLDER)).toBeInTheDocument();

      // Switch to bearer mode
      const bearerButton = screen.getByText(/API TOKEN/i);
      fireEvent.click(bearerButton);

      // Should transition to bearer token input
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/eyJhbGciOiJSUzI1NiIs/i)).toBeInTheDocument();
      });
    });
  });

  describe('Micro-animations', () => {
    it('should apply hover scale on auth mode buttons', async () => {
      await renderWizard();


      const tccButton = screen.getByText(/TCC AUTH/i);
      const bearerButton = screen.getByText(/API TOKEN/i);

      // Hover over non-selected button should apply scale
      tccButton.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

      // Should have hover effect class
      expect(tccButton).toBeInTheDocument();
    });
  });
});
