import { describe, it, expect, beforeEach, vi } from 'vitest';
import { apiRequest, apiGet, apiPost, setApiUser } from './apiClient';

// Mock localStorage
const localStorageMock = (function () {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => {
            store[key] = value.toString();
        }),
        removeItem: vi.fn((key: string) => {
            delete store[key];
        }),
        clear: vi.fn(() => {
            store = {};
        })
    };
})();

Object.defineProperty(global, 'localStorage', {
    value: localStorageMock
});

describe('Data ACLs & Isolation', () => {
    beforeEach(() => {
        localStorage.clear();
        setApiUser(null);
        vi.clearAllMocks();
    });

    it('should store data separately for different users', async () => {
        // 1. User A logs in
        setApiUser('user_A');

        // 2. User A creates a journal entry
        const entryA = {
            id: 101,
            entry_date: '2023-01-01',
            memo: 'User A Secret',
            source_module: 'manual',
            entity_id: 1,
            external_ref: 'A-001'
        };

        // We override the default mock data by POSTing to the journal endpoint in our mock client logic
        // But wait, the mock client implementation for POST /ledger/journal just returns { success: true }. 
        // It doesn't actually store the POSTed data in the journal array for retrieval (unlike accounts).
        // Let's check Accounts, which HAS that logic.

        const accountA = { code: '9000', name: 'User A Asset', type: 'Asset' };
        await apiPost('/ledger/accounts', accountA);

        // 3. Verify User A can see it
        const accountsA = await apiGet<any[]>('/ledger/accounts');
        expect(accountsA).toContainEqual(accountA);
        expect(localStorage.getItem('mock_data_user_A_accounts')).toBeTruthy();

        // 4. User B logs in
        setApiUser('user_B');

        // 5. Verify User B CANNOT see User A's account
        const accountsB = await apiGet<any[]>('/ledger/accounts');
        expect(accountsB).not.toContainEqual(accountA);
        // It SHOULD verify that we have defaults stored now
        expect(localStorage.getItem('mock_data_user_B_accounts')).toBeTruthy();

        // 6. User B creates their own account
        const accountB = { code: '9001', name: 'User B Asset', type: 'Asset' };
        await apiPost('/ledger/accounts', accountB);

        // 7. Verify User B sees their account
        const accountsB_new = await apiGet<any[]>('/ledger/accounts');
        expect(accountsB_new).toContainEqual(accountB);
        expect(accountsB_new).not.toContainEqual(accountA);

        // 8. user A logs back in
        setApiUser('user_A');
        const accountsA_back = await apiGet<any[]>('/ledger/accounts');
        expect(accountsA_back).toContainEqual(accountA);
        expect(accountsA_back).not.toContainEqual(accountB);
    });

    it('should default to public/anon if no user set', async () => {
        setApiUser(null);
        const accountAnon = { code: '8000', name: 'Public Asset', type: 'Asset' };
        await apiPost('/ledger/accounts', accountAnon);

        const accounts = await apiGet<any[]>('/ledger/accounts');
        expect(accounts).toContainEqual(accountAnon);
        expect(localStorage.getItem('public_accounts')).toBeTruthy();
    });
});
