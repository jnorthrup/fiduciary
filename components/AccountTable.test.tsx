/**
 * AccountTable Tests
 * Tests for keyboard navigation, touch gestures, and inline editing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AccountTable } from './AccountTable';
import * as types from '../types';

// Mock the ledger store
const mockAccounts: types.Account[] = [
    {
        id: 'acc-1',
        entityId: 'entity-1',
        code: '1000',
        name: 'Cash',
        type: types.AccountType.ASSET,
        normalBalance: types.DCFlag.Debit,
        balance: 10000,
        isActive: true,
        _version: '1.0'
    },
    {
        id: 'acc-2',
        entityId: 'entity-1',
        code: '2000',
        name: 'Accounts Payable',
        type: types.AccountType.LIABILITY,
        normalBalance: types.DCFlag.Credit,
        balance: 5000,
        isActive: true,
        _version: '1.0'
    },
    {
        id: 'acc-3',
        entityId: 'entity-1',
        code: '4000',
        name: 'Revenue',
        type: types.AccountType.INCOME,
        normalBalance: types.DCFlag.Credit,
        balance: 25000,
        isActive: true,
        _version: '1.0'
    }
];

const mockUpdateAccount = vi.fn();
const mockDeleteAccount = vi.fn();

vi.mock('../services/ledgerService', () => ({
    useLedgerStore: () => ({
        accounts: mockAccounts,
        updateAccount: mockUpdateAccount,
        deleteAccount: mockDeleteAccount
    })
}));

describe('AccountTable', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Rendering', () => {
        it('renders the table with accounts', () => {
            render(<AccountTable entityId="entity-1" />);

            expect(screen.getByText('Chart of Accounts')).toBeInTheDocument();
            expect(screen.getByText('Cash')).toBeInTheDocument();
            expect(screen.getByText('Accounts Payable')).toBeInTheDocument();
            expect(screen.getByText('Revenue')).toBeInTheDocument();
        });

        it('displays account count in footer', () => {
            render(<AccountTable entityId="entity-1" />);

            expect(screen.getByText('3 accounts')).toBeInTheDocument();
        });
    });

    describe('Keyboard Navigation', () => {
        it('highlights first row by default (cursorIndex = 0)', () => {
            render(<AccountTable entityId="entity-1" />);

            const rows = screen.getAllByRole('row');
            expect(rows[0]).toHaveClass('bg-indigo-50');
        });

        it('moves cursor down with ArrowDown', () => {
            render(<AccountTable entityId="entity-1" />);

            const container = screen.getByRole('grid');
            fireEvent.keyDown(container, { key: 'ArrowDown' });

            // Second row should now have cursor styling
            const rows = screen.getAllByRole('row');
            expect(rows[1]).toHaveClass('bg-indigo-50');
        });

        it('moves cursor up with ArrowUp', () => {
            render(<AccountTable entityId="entity-1" />);

            const container = screen.getByRole('grid');
            // Move down first, then up
            fireEvent.keyDown(container, { key: 'ArrowDown' });
            fireEvent.keyDown(container, { key: 'ArrowUp' });

            const rows = screen.getAllByRole('row');
            expect(rows[0]).toHaveClass('bg-indigo-50');
        });

        it('selects account on Enter key', () => {
            const onSelect = vi.fn();
            render(<AccountTable entityId="entity-1" onAccountSelect={onSelect} />);

            const container = screen.getByRole('grid');
            fireEvent.keyDown(container, { key: 'Enter' });

            expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({
                id: 'acc-1',
                name: 'Cash'
            }));
        });

        it('enters edit mode with E key', () => {
            render(<AccountTable entityId="entity-1" />);

            const container = screen.getByRole('grid');
            fireEvent.keyDown(container, { key: 'e' });

            // Should show edit form
            expect(screen.getByPlaceholderText('Account Name')).toBeInTheDocument();
        });

        it('cancels edit with Escape key', () => {
            render(<AccountTable entityId="entity-1" />);

            const container = screen.getByRole('grid');

            // Enter edit mode
            fireEvent.keyDown(container, { key: 'e' });
            expect(screen.getByPlaceholderText('Account Name')).toBeInTheDocument();

            // Cancel with Escape
            fireEvent.keyDown(container, { key: 'Escape' });
            expect(screen.queryByPlaceholderText('Account Name')).not.toBeInTheDocument();
        });

        it('does not go negative on ArrowUp at top', () => {
            render(<AccountTable entityId="entity-1" />);

            const container = screen.getByRole('grid');

            // Try to go up when already at top
            fireEvent.keyDown(container, { key: 'ArrowUp' });
            fireEvent.keyDown(container, { key: 'ArrowUp' });

            const rows = screen.getAllByRole('row');
            // Should still be on first row
            expect(rows[0]).toHaveClass('bg-indigo-50');
        });
    });

    describe('Search and Filtering', () => {
        it('filters accounts by search term', () => {
            render(<AccountTable entityId="entity-1" />);

            const searchInput = screen.getByPlaceholderText('Search by name or code...');
            fireEvent.change(searchInput, { target: { value: 'Cash' } });

            expect(screen.getByText('Cash')).toBeInTheDocument();
            expect(screen.queryByText('Accounts Payable')).not.toBeInTheDocument();
            expect(screen.queryByText('Revenue')).not.toBeInTheDocument();
        });

        it('filters accounts by type', () => {
            render(<AccountTable entityId="entity-1" />);

            const assetFilter = screen.getByRole('button', { name: 'Asset' });
            fireEvent.click(assetFilter);

            expect(screen.getByText('Cash')).toBeInTheDocument();
            expect(screen.queryByText('Accounts Payable')).not.toBeInTheDocument();
        });
    });

    describe('Inline Editing', () => {
        it('saves changes on Save button click', () => {
            render(<AccountTable entityId="entity-1" />);

            const container = screen.getByRole('grid');

            // Enter edit mode
            fireEvent.keyDown(container, { key: 'e' });

            // Change the name
            const nameInput = screen.getByPlaceholderText('Account Name');
            fireEvent.change(nameInput, { target: { value: 'Updated Cash Account' } });

            // Save
            const saveButton = screen.getByRole('button', { name: /save/i });
            fireEvent.click(saveButton);

            expect(mockUpdateAccount).toHaveBeenCalledWith(expect.objectContaining({
                id: 'acc-1',
                name: 'Updated Cash Account'
            }));
        });
    });

    describe('Touch Gestures', () => {
        it('selects row on click', () => {
            const onSelect = vi.fn();
            render(<AccountTable entityId="entity-1" onAccountSelect={onSelect} />);

            const cashRow = screen.getByText('Cash').closest('[role="row"]');
            fireEvent.click(cashRow!);

            expect(onSelect).toHaveBeenCalled();
        });
    });

    describe('Accessibility', () => {
        it('has proper ARIA roles', () => {
            render(<AccountTable entityId="entity-1" />);

            expect(screen.getByRole('grid')).toBeInTheDocument();
            expect(screen.getByRole('rowgroup')).toBeInTheDocument();
            expect(screen.getAllByRole('row').length).toBeGreaterThan(0);
        });

        it('has accessible search input', () => {
            render(<AccountTable entityId="entity-1" />);

            expect(screen.getByLabelText('Search accounts')).toBeInTheDocument();
        });
    });
});
