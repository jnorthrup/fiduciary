import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MobileQuickBooksLayout } from './MobileQuickBooksLayout';
import React from 'react';

// Mock the ledger store
vi.mock('../../services/ledgerService', () => ({
    useLedgerStore: () => ({
        entities: [{ id: 'entity-1', name: 'Alpha', role: 'OPERATING_LLC' }],
        currentUser: { name: 'Test User', avatarInitials: 'TU' },
        crmPeople: [],
        journals: [],
        accounts: [],
        addCRMPerson: vi.fn(),
        updateCRMPerson: vi.fn(),
        deleteCRMPerson: vi.fn(),
        addInteraction: vi.fn(),
        getAccounts: () => [],
    }),
}));

// Mock the components that were integrated
vi.mock('../CRMManager', () => ({ CRMManager: () => <div data-testid="crm-manager">CRM Manager</div> }));
vi.mock('../APDashboard', () => ({ APDashboard: () => <div data-testid="ap-dashboard">AP Dashboard</div> }));
vi.mock('../JournalRegister', () => ({ JournalRegister: () => <div data-testid="journal-register">Journal Register</div> }));
vi.mock('../W2ReportingWizard', () => ({ W2ReportingWizard: () => <div data-testid="w2-wizard">W2 Wizard</div> }));
vi.mock('../mobile/MobileAccountList', () => ({ MobileAccountList: () => <div data-testid="account-list">Account List</div> }));

describe('MobileQuickBooksLayout Plumbing', () => {
    it('renders correctly and allows switching between new tabs', () => {
        render(
            <MobileQuickBooksLayout
                activeEntityId="entity-1"
                onSelectEntity={vi.fn()}
                onQuickAction={vi.fn()}
            >
                <div data-testid="dashboard-content">Dashboard Content</div>
            </MobileQuickBooksLayout>
        );

        // Click Home (Dashboard) - already active
        expect(screen.getByTestId('dashboard-content')).toBeInTheDocument();

        // Click Banking
        fireEvent.click(screen.getAllByText('Banking')[0]); // Use getAllByText as it might be in multiple places
        expect(screen.getByTestId('account-list')).toBeInTheDocument();

        // Click Sales
        fireEvent.click(screen.getAllByText('Sales')[0]);
        expect(screen.getByTestId('crm-manager')).toBeInTheDocument();

        // Click Expenses
        fireEvent.click(screen.getAllByText('Expenses')[0]);
        expect(screen.getByTestId('ap-dashboard')).toBeInTheDocument();

        // Open Menu for hidden items
        fireEvent.click(screen.getByLabelText('Open navigation menu'));

        // Click Reports in the drawer
        fireEvent.click(screen.getAllByText('Reports')[0]);
        expect(screen.getByTestId('journal-register')).toBeInTheDocument();

        // Open Menu again
        fireEvent.click(screen.getByLabelText('Open navigation menu'));

        // Click Payroll in the drawer
        fireEvent.click(screen.getAllByText('Payroll')[0]);
        expect(screen.getByTestId('w2-wizard')).toBeInTheDocument();
    });
});
