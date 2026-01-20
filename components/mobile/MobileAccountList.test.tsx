
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileAccountList } from './MobileAccountList';
import { vi } from 'vitest';
import * as ledgerService from '../../services/ledgerService';
import { AccountType, AccountClass, Account, DCFlag } from '../../types';

// Mock specific parts of the hook
const mockGetAccounts = vi.fn();

vi.mock('../../services/ledgerService', () => ({
    useLedgerStore: () => ({
        getAccounts: mockGetAccounts,
    }),
}));

describe('MobileAccountList', () => {
    const mockAccounts: Account[] = [
        {
            id: '1',
            entityId: 'ent1',
            code: '100',
            name: 'Checking Account',
            type: AccountType.ASSET,
            normalBalance: DCFlag.Debit,
            balance: 1000,
            accountClass: 'Debit' as AccountClass,
            isActive: true,
            _version: '1'
        },
        {
            id: '2',
            entityId: 'ent1',
            code: '200',
            name: 'Credit Card',
            type: AccountType.LIABILITY,
            normalBalance: DCFlag.Credit,
            balance: -500,
            accountClass: 'Credit' as AccountClass,
            isActive: true,
            _version: '1'
        }
    ];

    beforeEach(() => {
        mockGetAccounts.mockReturnValue(mockAccounts);
    });

    it('renders list of accounts', () => {
        render(<MobileAccountList entityId="ent1" />);
        expect(screen.getByText('Checking Account')).toBeInTheDocument();
        expect(screen.getByText('Credit Card')).toBeInTheDocument();
    });

    it('filters accounts by type when type chip is clicked', () => {
        render(<MobileAccountList entityId="ent1" />);

        // Initial call with 'All' (undefined type)
        expect(mockGetAccounts).toHaveBeenCalledWith(expect.objectContaining({ type: undefined }));

        // Click 'Asset' chip (it's a button)
        const assetChip = screen.getByRole('button', { name: 'Asset' });
        fireEvent.click(assetChip);

        // Should re-render and call getAccounts with type 'Asset'
        expect(mockGetAccounts).toHaveBeenLastCalledWith(expect.objectContaining({ type: AccountType.ASSET }));
    });

    it('updates search term', () => {
        render(<MobileAccountList entityId="ent1" />);
        const searchInput = screen.getByPlaceholderText('Search by name or code...');

        fireEvent.change(searchInput, { target: { value: 'Check' } });

        expect(mockGetAccounts).toHaveBeenLastCalledWith(expect.objectContaining({ searchTerm: 'Check' }));
    });
});
