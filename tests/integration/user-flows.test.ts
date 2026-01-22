import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup, waitFor } from '@testing-library/react';
import React from 'react';
import { LedgerProvider, useLedgerStore } from '../../services/ledgerService';
import * as types from '../../types';

describe('User Critical Flows Integration', () => {
    // Clear any potential side effects
    afterEach(() => {
        cleanup();
        localStorage.clear();
        sessionStorage.clear();
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
        React.createElement(LedgerProvider, {}, children)
    );

    it('should handle full Login and Create Account flow', async () => {
        const { result } = renderHook(() => useLedgerStore(), { wrapper });

        // --- STEP 1: INITIAL STATE ---
        // Wait for the hook to be called (provider finishes loading)
        await waitFor(() => {
            expect(result.current).not.toBe(null);
            // 'entities' is a safe property to check existence of context
            expect(result.current.entities).toBeDefined();
        }, { timeout: 2000 });

        // Verify initial connection status
        // 'isLoaded' is not exposed, but we know it's loaded if we are here (children rendered)

        // --- STEP 2: LOG IN ---
        const mockProfile = {
            sub: 'google-oauth-123456789',
            name: 'Integration Tester',
            email: 'tester@integration.local',
            given_name: 'Integration',
            family_name: 'Tester',
            picture: 'https://example.com/photo.jpg'
        };

        await act(async () => {
            const user = await result.current.signInWithGoogle(mockProfile);
            expect(user).not.toBeNull();
            expect(user?.email).toBe(mockProfile.email);
        });

        // Verify Store State updated
        expect(result.current.currentUser).toBeDefined();
        expect(result.current.currentUser.id).toBe(mockProfile.sub);
        expect(result.current.currentUser.email).toBe(mockProfile.email);

        // --- STEP 3: CREATE ENTITY (Operating Company) ---
        // Accounts usually need an entity
        let entityId = '';
        await act(async () => {
            // Check if default entity exists, otherwise create one
            if (result.current.entities.length > 0) {
                entityId = result.current.entities[0].id;
            } else {
                const entity = await result.current.addEntity(
                    'root', // no parent
                    types.EntityType.LLC,
                    types.EntityRole.OPERATING_LLC,
                    'Test Operating LLC'
                );
                entityId = entity.id;
            }
        });
        expect(entityId).toBeTruthy();

        // --- STEP 4: CREATE ACCOUNT ---
        const accountInput = {
            entityId: entityId,
            code: '1000',
            name: 'Test Cash Account',
            type: types.AccountType.ASSET,
            description: 'Main operating account',
            beginningBalance: 5000
        };

        let createdAccount: types.Account | null = null;
        await act(async () => {
            const { account, errors } = result.current.createAccount(accountInput);
            expect(errors).toHaveLength(0);
            expect(account).not.toBeNull();
            createdAccount = account;
        });

        // Verify Account creation
        expect(createdAccount).toBeTruthy();
        expect(createdAccount?.code).toBe('1000');
        expect(createdAccount?.balance).toBe(5000);

        // Verify it exists in the store list
        const foundInList = result.current.accounts.find(a => a.id === createdAccount?.id);
        expect(foundInList).toBeDefined();
        expect(foundInList?.name).toBe('Test Cash Account');

        // Verify Retrieval via getAccount
        const retrieved = result.current.getAccount(createdAccount!.id);
        expect(retrieved).not.toBeNull();
        expect(retrieved?.id).toBe(createdAccount?.id);

        // --- STEP 5: CREATE CHILD ACCOUNT ---
        const childInput = {
            entityId: entityId,
            code: '1000-01',
            name: 'Petty Cash',
            type: types.AccountType.ASSET,
            parentAccountId: createdAccount!.id
        };

        await act(async () => {
            const { account, errors } = result.current.createAccount(childInput);
            expect(errors).toHaveLength(0);
            expect(account).toBeTruthy();
        });

        // Verify Hierarchy
        // We might need to refresh "accounts" if the getter does logic, but getAccountHierarchy computes on fly
        const hierarchy = result.current.getAccountHierarchy(entityId);
        // Should find the parent
        const parentNode = hierarchy.find(a => a.id === createdAccount?.id);
        expect(parentNode).toBeDefined();
        expect(parentNode?.children).toHaveLength(1);
        expect(parentNode?.children![0].code).toBe('1000-01');

        // --- STEP 6: ORIGINATE ACH PAYMENT ---
        // Create an ACH record for a vendor payment
        const achRecord: types.ACHRecord = {
            id: 'ach-test-1',
            entityId: entityId,
            type: 'Debit', // Debiting our account? No, usually Credit 'push' or Debit 'pull'
            // If we are paying a vendor, it's a Credit to them (we push money).
            // But NACHA terms: PPD Credit vs Debit.
            // Let's assume a vendor payment (CCD)
            secCode: 'CCD',
            amount: 125050, // $1,250.50 in cents
            counterparty: {
                name: 'Strategic Vendor Inc',
                routing: '121000248', // Test routing
                account: '9988776655'
            },
            entryDescription: 'INV-2024-01',
            traceNumber: '0000001',
            status: 'Pending',
            nachaSummary: 'Pending Generation',
            effectiveDate: new Date().toISOString(),
            _version: '1'
        };

        await act(async () => {
            result.current.originateACH(achRecord);
        });

        // Verify it's in the store
        const storedAch = result.current.achRecords.find(r => r.id === 'ach-test-1');
        expect(storedAch).toBeDefined();
        expect(storedAch?.amount).toBe(125050);

        // --- STEP 7: GENERATE NACHA FILE ---
        // Simulate the "Export" action by constructing a NachaFile from store data
        // This validates that we have sufficient data in the store to generate the file.

        // 1. Get Originator (Our Entity/Account)
        // We need our routing number. Account usually has banking details or entity does.
        // For this test, we'll mock the missing banking details usually found in a 'BankConnection' or similar.
        const fileCreationDate = new Date();
        const originator = {
            name: 'Test Operating LLC',
            routingNumber: '011000015', // Mock Fed routing
            accountNumber: createdAccount!.code, // Using internal code as mock account #
            companyId: '1234567890',
            companyName: 'TEST OPERATING LLC'
        };

        // 2. Map ACH Record to Entry
        const entry = {
            // transactionCode: '27', // Checking Debit (wait, if we pay vendor, is it credit?)
            // If we pay vendor: We ORIGINATE a CREDIT (22).
            // If we pull from customer: We ORIGINATE a DEBIT (27).
            // Let's assume we are paying: Credit (22)
            transactionCode: '22',
            rdfiRoutingNumber: storedAch!.counterparty.routing,
            rdfiAccountNumber: storedAch!.counterparty.account,
            amount: storedAch!.amount,
            receiverName: storedAch!.counterparty.name,
            receiverId: 'VEND001',
            discretionaryData: 'S'
        };

        // 3. Construct File
        const nachaFile = {
            fileCreationDate,
            immediateDestination: '121000248', // Fed
            immediateOrigin: originator.routingNumber,
            originator: originator,
            batches: [{
                serviceClassCode: '220', // Credits Only
                secCode: storedAch!.secCode,
                companyEntryDescription: storedAch!.entryDescription,
                effectiveEntryDate: new Date(storedAch!.effectiveDate),
                entries: [entry as any] // Cast to any matching Nacha types if slightly different
            }]
        };

        // 4. Generate - dynamically import to avoid top-level dependency if needed, or import at top
        const { generateNachaFile } = await import('../../services/nachaService');
        const fileContent = generateNachaFile(nachaFile as any);

        // Header line: 101 + Destination(10) + Origin(10) ...
        // Destination: 121000248 (9) -> 0121000248
        // Origin: 011000015 (9) -> 0011000015
        expect(fileContent).toContain('10101210002480011000015'); // Header check without spaces
        expect(fileContent).toContain('TEST OPERATING LLC');
        expect(fileContent).toContain('Strategic Vendor Inc');
        const lines = fileContent.split('\r\n').filter(l => l.length > 0);
        expect(lines.length).toBeGreaterThanOrEqual(10); // At least one block (10 records)
        expect(lines.length % 10).toBe(0); // Multiple of 10
        lines.forEach(line => {
            expect(line.length).toBe(94);
        });
    });
});
