import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SettingsModal } from './SettingsModal';

const createStore = (overrides: Record<string, any> = {}) => ({
  irsCreds: [],
  entities: [{ id: 'entity-1', name: 'Alpha' }],
  updateIrsCredential: vi.fn(),
  addIrsCredential: vi.fn(),
  deleteIrsCredential: vi.fn(),
  isCloudEnabled: false,
  connectToFirebase: vi.fn().mockResolvedValue(true),
  pushLocalToCloud: vi.fn(),
  settings: {
    firebaseConfig: {
      apiKey: 'api-key',
      authDomain: 'domain',
      projectId: 'project',
      storageBucket: '',
      messagingSenderId: '',
      appId: '',
    },
  },
  updateSettings: vi.fn(),
  ...overrides,
});

let storeState = createStore();

vi.mock('../../services/ledgerService', () => ({
  useLedgerStore: () => storeState,
}));

describe('SettingsModal', () => {
  beforeEach(() => {
    storeState = createStore();
  });

  const renderModal = () =>
    render(
      <SettingsModal
        onClose={vi.fn()}
        onExport={vi.fn(() => '{}')}
        onImport={vi.fn()}
        onReset={vi.fn()}
      />
    );

  it('connects to Firebase when Initialize Connection is pressed', async () => {
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: /Initialize Connection/i }));

    await waitFor(() => {
      expect(storeState.connectToFirebase).toHaveBeenCalled();
    });
  });

  it('allows switching to the Storage tab and shows usage information', () => {
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Storage' }));

    expect(screen.getByText('Browser LocalStorage')).toBeInTheDocument();
    expect(screen.getByText(/Used Space/i)).toBeInTheDocument();
  });

  it('adds a new IRS credential from the Credentials tab', () => {
    renderModal();
    const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(1700000000000);

    fireEvent.click(screen.getByRole('button', { name: 'Credentials' }));
    fireEvent.click(screen.getByRole('button', { name: /Add New/i }));

    expect(storeState.addIrsCredential).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'CRE-1700000000000' })
    );

    dateSpy.mockRestore();
  });
});
