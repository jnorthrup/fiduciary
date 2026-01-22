import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from './App';

const noop = vi.fn;

const createStore = (overrides: Record<string, any> = {}) => ({
  entities: [],
  accounts: [],
  journals: [],
  wallets: [],
  modules: [],
  contractors: [],
  transmissions: [],
  apiSystemStatus: [],
  searchResults: [],
  documents: [],
  fedWires: [],
  crmPeople: [],
  currentUser: { name: '', email: '', avatarInitials: 'TU' },
  settings: { layoutMode: 'Desktop' },
  canResume: false,
  isSearching: false,
  is2FAOpen: false,
  setInitialOwner: noop(),
  loadJimProfile: noop(),
  loadSyntheticFuzz: noop(),
  resumePersistent: noop(),
  updateEntity: noop(),
  addEntity: noop(),
  deleteEntity: noop(),
  postJournal: noop(),
  onOriginate: noop(),
  originateACH: noop(),
  updateUser: noop(),
  deleteUser: noop(),
  importData: noop(),
  resetData: noop(),
  performGroundingSearch: noop(),
  verify2FA: noop(),
  cancel2FA: noop(),
  ...overrides,
});

let storeState: ReturnType<typeof createStore>;

vi.mock('./services/ledgerService', () => ({
  useLedgerStore: () => storeState,
}));

// Use inline factory functions to avoid hoisting issues with vi.mock
vi.mock('./components/LaunchScreen', () => ({ LaunchScreen: () => <div data-testid="launch-screen"></div> }));
vi.mock('./components/Sidebar', () => ({ Sidebar: () => <div data-testid="sidebar"></div> }));
vi.mock('./components/SystemOverview', () => ({ SystemOverview: () => <div data-testid="system-overview"></div> }));
vi.mock('./components/Dashboard', () => ({ Dashboard: () => <div data-testid="dashboard"></div> }));
vi.mock('./components/modals/SettingsModal', () => ({ SettingsModal: () => <div data-testid="settings-modal"></div> }));
vi.mock('./components/IRSApiConsole', () => ({ IRSApiConsole: () => <div data-testid="irs-console"></div> }));
vi.mock('./components/IRMTreeWidget', () => ({ IRMTreeWidget: () => <div data-testid="irm-tree"></div> }));
vi.mock('./components/modals/UserProfileModal', () => ({ UserProfileModal: () => <div data-testid="user-modal"></div> }));
vi.mock('./components/modals/TwoFactorAuthModal', () => ({ TwoFactorAuthModal: () => <div data-testid="twofactor-modal"></div> }));
vi.mock('./components/ReceiptCaptureWizard', () => ({ ReceiptCaptureWizard: () => <div data-testid="receipt-wizard"></div> }));
vi.mock('./components/FedGateway', () => ({ FedGateway: () => <div data-testid="fed-gateway"></div> }));
vi.mock('./components/ACHMovementWizard', () => ({ ACHMovementWizard: () => <div data-testid="ach-wizard"></div> }));
vi.mock('./components/forms/LLCContractorForm', () => ({ LLCContractorForm: () => <div data-testid="llc-form"></div> }));
vi.mock('./components/IRIS1099Wizard', () => ({ IRIS1099Wizard: () => <div data-testid="iris-wizard"></div> }));
vi.mock('./components/layouts/MobileQuickBooksLayout', () => ({ MobileQuickBooksLayout: ({ children }: any) => <div data-testid="mobile-layout">{children}</div> }));

describe('App', () => {
  beforeEach(() => {
    storeState = createStore();
  });

  it('renders LaunchScreen when the user has not been initialized', () => {
    render(<App />);

    expect(screen.getByTestId('launch-screen')).toBeInTheDocument();
  });

  it('renders the MobileQuickBooks layout when the mode is enabled', () => {
    storeState = createStore({
      currentUser: { name: 'Test User', email: 'user@example.com', avatarInitials: 'TU' },
      settings: { layoutMode: 'MobileQuickBooks' },
      entities: [{ id: 'entity-1', name: 'Alpha', role: 'HOLDING_TRUST' }],
      accounts: [],
      journals: [],
      wallets: [],
    });

    render(<App />);

    expect(screen.getByTestId('mobile-layout')).toBeInTheDocument();
  });
});
