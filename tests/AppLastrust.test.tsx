
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { App } from '../App-lastrust'; // Adjust path as needed

// Mock modules
vi.mock('../services/authService', () => ({
    useAuth: () => ({
        user: {
            uid: 'test-user-123',
            email: 'test@example.com',
            displayName: 'Test User',
            role: 'owner'
        },
        signIn: vi.fn(),
        signOut: vi.fn(),
        isLoading: false
    })
}));

vi.mock('../services/ledgerService', () => ({
    useLedgerStore: () => ({
        entities: [],
        accounts: [],
        journals: [],
        currentUser: { name: 'Test User', email: 'test@example.com', role: 'Owner' },
        onOriginate: vi.fn(),
        postJournal: vi.fn(),
        updateUser: vi.fn(),
        deleteUser: vi.fn(),
        // Mock other necessary store methods used in App-lastrust
        originateACH: vi.fn(),
        completeCreditDefense: vi.fn(),
        addEscrow: vi.fn(),
        updateEscrow: vi.fn(),
        fedWires: [],
        crmPeople: [],
        escrows: []
    })
}));

// Mock react-plaid-link
vi.mock('react-plaid-link', () => ({
    usePlaidLink: () => ({
        open: vi.fn(),
        ready: true
    })
}));

// Mock API client to avoid network calls
vi.mock('../services/apiClient', () => ({
    apiGet: vi.fn((url) => {
        if (url.includes('series')) return Promise.resolve([]); // Return array for charts
        if (url.includes('balance')) return Promise.resolve({ value: 1000 }); // Return number for balances
        return Promise.resolve({});
    }),
    apiPost: vi.fn().mockResolvedValue({}),
    setApiUser: vi.fn()
}));

describe('Clear.Flow Standalone App', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset window location hash
        window.location.hash = '';
    });

    it('renders the dashboard by default', async () => {
        render(<App />);
        // Expect "Personal Overview" which is on the dashboard
        await waitFor(() => {
            expect(screen.getByText(/Personal Overview/i)).toBeInTheDocument();
        });
    });

    it('renders navigation tabs', async () => {
        render(<App />);
        await waitFor(() => {
            expect(screen.getByText('Banking')).toBeInTheDocument();
        });
        expect(screen.getByText('Payments')).toBeInTheDocument();
        expect(screen.getByText('Loans')).toBeInTheDocument();
    });
});
