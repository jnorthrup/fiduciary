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

const mockComponent = (testId: string) => () => <div data-testid={testId}></div>;

vi.mock('./components/LaunchScreen', () => ({ LaunchScreen: mockComponent('launch-screen') }));
vi.mock('./components/Sidebar', () => ({ Sidebar: mockComponent('sidebar') }));
vi.mock('./components/SystemOverview', () => ({ SystemOverview: mockComponent('system-overview') }));
vi.mock('./components/Dashboard', () => ({ Dashboard: mockComponent('dashboard') }));
vi.mock('./components/modals/SettingsModal', () => ({ SettingsModal: mockComponent('settings-modal') }));
vi.mock('./components/IRSApiConsole', () => ({ IRSApiConsole: mockComponent('irs-console') }));
vi.mock('./components/IRMTreeWidget', () => ({ IRMTreeWidget: mockComponent('irm-tree') }));
vi.mock('./components/modals/UserProfileModal', () => ({ UserProfileModal: mockComponent('user-modal') }));
vi.mock('./components/modals/TwoFactorAuthModal', () => ({ TwoFactorAuthModal: mockComponent('twofactor-modal') }));
vi.mock('./components/ReceiptCaptureWizard', () => ({ ReceiptCaptureWizard: mockComponent('receipt-wizard') }));
vi.mock('./components/FedGateway', () => ({ FedGateway: mockComponent('fed-gateway') }));
vi.mock('./components/ACHMovementWizard', () => ({ ACHMovementWizard: mockComponent('ach-wizard') }));
vi.mock('./components/forms/LLCContractorForm', () => ({ LLCContractorForm: mockComponent('llc-form') }));
vi.mock('./components/IRIS1099Wizard', () => ({ IRIS1099Wizard: mockComponent('iris-wizard') }));
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
