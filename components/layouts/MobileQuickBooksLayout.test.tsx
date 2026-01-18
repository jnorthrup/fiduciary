import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileQuickBooksLayout } from './MobileQuickBooksLayout';

const createStore = (overrides: Record<string, any> = {}) => ({
  currentUser: { name: 'User', email: 'user@example.com', avatarInitials: 'UU' },
  entities: [
    { id: 'entity-1', name: 'Alpha Holdings', role: 'HOLDING_TRUST' },
    { id: 'entity-2', name: 'Beta Advisors', role: 'OPERATING_LLC' },
  ],
  ...overrides,
});

let storeState = createStore();

vi.mock('../../services/ledgerService', () => ({
  useLedgerStore: () => storeState,
}));

describe('MobileQuickBooksLayout', () => {
  beforeEach(() => {
    storeState = createStore();
  });

  it('shows the active entity context in the header', () => {
    render(
      <MobileQuickBooksLayout activeEntityId="entity-1" onSelectEntity={vi.fn()}>
        <div>content</div>
      </MobileQuickBooksLayout>
    );

    expect(screen.getByText('Alpha Holdings')).toBeInTheDocument();
    expect(screen.getByText(/HOLDING TRUST/i)).toBeInTheDocument();
  });

  it('toggles the quick search overlay when tapping the search icon', () => {
    render(
      <MobileQuickBooksLayout activeEntityId={null} onSelectEntity={vi.fn()}>
        <div>content</div>
      </MobileQuickBooksLayout>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Toggle quick search' }));

    expect(screen.getByPlaceholderText('Find transactions, entities, reports...')).toBeInTheDocument();
  });

  it('hides the navigation rail when focus mode is enabled', () => {
    render(
      <MobileQuickBooksLayout activeEntityId={null} onSelectEntity={vi.fn()}>
        <div>content</div>
      </MobileQuickBooksLayout>
    );

    expect(screen.getByRole('navigation')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Toggle focus mode' }));

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('allows selecting a different entity from the menu drawer', async () => {
    const handleSelect = vi.fn();

    render(
      <MobileQuickBooksLayout activeEntityId={null} onSelectEntity={handleSelect}>
        <div>content</div>
      </MobileQuickBooksLayout>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }));

    const select = await screen.findByLabelText('Active entity selection');
    fireEvent.change(select, { target: { value: 'entity-2' } });

    expect(handleSelect).toHaveBeenCalledWith('entity-2');
  });
});
