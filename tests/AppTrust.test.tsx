
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { App } from '../App'; // App.tsx

// Mock modules
vi.mock('../services/authService', () => ({
    useAuth: () => ({
        user: {
            uid: 'test-user-trust',
            email: 'trust@example.com',
            displayName: 'Trust User'
        },
        signIn: vi.fn(),
        signOut: vi.fn(),
        isLoading: false
    })
}));

vi.mock('../services/ledgerService', () => ({
    useLedgerStore: () => ({
        entities: [{ id: 'ent-1', name: 'Test Entity', type: 'Trust' }],
        accounts: [],
        journals: [],
        currentUser: { name: 'Trust User', email: 'trust@example.com', role: 'Owner' },
        onOriginate: vi.fn(),
        postJournal: vi.fn(),
        updateUser: vi.fn(),
        deleteUser: vi.fn(),
        setInitialOwner: vi.fn(),
        // Mock specific store methods used in App
        connectToFirebase: vi.fn(),
        originateACH: vi.fn(),
        completeCreditDefense: vi.fn(),
        addEscrow: vi.fn(),
        updateEscrow: vi.fn(),
        fedWires: [],
        crmPeople: [],
        contracts: [],
        modules: [],
        transmissions: [],
        documents: [],
        wallets: [],
        isCloudEnabled: false
    })
}));

// Mock dynamic imports or complex components to speed up test
vi.mock('../components/Dashboard', () => ({
    Dashboard: () => <div>Mock Dashboard Component</div>
}));

vi.mock('../components/SystemOverview', () => ({
    SystemOverview: () => <div>Mock System Overview</div>
}));

// Mock API client
vi.mock('../services/apiClient', () => ({
    apiGet: vi.fn().mockResolvedValue({}),
    apiPost: vi.fn().mockResolvedValue({}),
    setApiUser: vi.fn()
}));

describe('Trust Ledger Standalone App', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the main layout with sidebar', async () => {
        render(<App />);
        // Sidebar usually has "Entities" or similar text.
        // Or wait for the Dashboard/Overview
        await waitFor(() => {
            // Since activeEntityId is null initially, it shows SystemOverview
            expect(screen.getByText('Mock System Overview')).toBeInTheDocument();
        });
    });
});
