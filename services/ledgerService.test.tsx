
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { LedgerProvider, useLedgerStore } from './ledgerService';
import * as types from '../types';

// Mock types if needed, or rely on real ones if simple
const EMPTY_DB_STATE = JSON.stringify({
    entities: [], accounts: [], journals: [], wallets: [], users: [], modules: [], filings: [], transmissions: [],
    documents: [], canalRecords: [], crmPeople: [], escrows: [], ticks: [], fedWires: [],
    contractors: [], bsoRoles: [], bsoSubmissions: [],
    irsCreds: [], employees: [], payrollRuns: [],
    ssaStatements: [], resolutions: [], purchaseContracts: [],
    creditResolutions: [], creditInstruments: [], closingRecords: [],
    realEstateAssets: [], collateralPools: [], collateralItems: [],
    fiduciaryActions: [], resitusRecords: [], trustCertificates: [], giftTaxRecords: [], parcelRecords: [], edgarResearchRecords: [],
    achRecords: [], instrumentExchangeRecords: [], dtccPledgeRecords: [], fiduciaryReviews: [], agencyCertifications: [],
    fsForm1010s: [], legalInstruments: [], creditDefenseRecords: [],
    chanceryFilings: [], perfectionInstructions: [], maradRecords: [], settlements: [],
    invoices: [], payables: [], settlementConfirmations: [],
    currentUser: { id: 'test-user', name: 'Test', email: 'test@local', role: 'Owner', _version: '1' },
    secrets: {},
    settings: { fuzzing: { enabled: false }, network: 'Testnet' },
    // Important: include any other root keys ledgerService expects to merge
});

describe('LedgerService Business Invariants', () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
        // Seed localStorage to bypass the 800ms artificial delay and dynamic import
        localStorage.setItem('trust_ledger_state', EMPTY_DB_STATE);
        vi.restoreAllMocks();
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <LedgerProvider>{children}</LedgerProvider>
    );

    it('enforces Double-Entry Accounting (Reject Unbalanced Journal)', async () => {
        const { result } = renderHook(() => useLedgerStore(), { wrapper });

        // Wait for initialization (should be fast now)
        await waitFor(() => {
            expect(result.current).toBeDefined();
            expect(result.current.isLoaded).not.toBe(false); // If isLoaded is exposed? 
            // Actually context is only returned when isLoaded is true. So just checking result.current is enough.
        }, { timeout: 1000 });

        let entityId = '';
        let debitAccId = '';
        let creditAccId = '';


        await act(async () => {
            const entity = await result.current.addEntity('root', types.EntityType.LLC, types.EntityRole.OPERATING_LLC, 'Test Co');
            entityId = entity.id;

            result.current.addAccount({
                id: 'acc-1', entityId: entity.id, code: '1000', name: 'Cash',
                type: types.AccountType.ASSET,
                balance: 0, _version: '1', isActive: true, accountClass: 'Asset', currency: 'USD', parentAccountId: null, lastReconciled: null
            });

            result.current.addAccount({
                id: 'acc-2', entityId: entity.id, code: '3000', name: 'Equity',
                type: types.AccountType.EQUITY,
                balance: 0, _version: '1', isActive: true, accountClass: 'Equity', currency: 'USD', parentAccountId: null, lastReconciled: null
            });
            debitAccId = 'acc-1';
            creditAccId = 'acc-2';
        });

        // Wait for accounts to be added (state update)
        await waitFor(() => {
            expect(result.current.accounts.length).toBe(2);
        });

        // 2. Attempt Unbalanced Post (Debit 100, Credit 50)
        await act(async () => {
            const response = result.current.postJournal(
                entityId,
                '2026-01-01',
                'Unbalanced Entry',
                'General',
                [
                    { accountId: debitAccId, amount: 100, dc: types.DCFlag.Debit },
                    { accountId: creditAccId, amount: 50, dc: types.DCFlag.Credit }
                ]
            );

            expect(response.success).toBe(false);
            expect(response.errors[0].message).toContain('Journal entry must balance');
        });
    });

    it('accepts Balanced Journal and Updates Balances Correctly', async () => {
        const { result } = renderHook(() => useLedgerStore(), { wrapper });

        await waitFor(() => expect(result.current).toBeDefined());

        let entityId = '';
        let assetAccId = '';
        let equityAccId = '';

        await act(async () => {
            const entity = await result.current.addEntity('root', types.EntityType.LLC, types.EntityRole.OPERATING_LLC, 'Test Co');
            entityId = entity.id;

            result.current.addAccount({
                id: 'asset-1', entityId: entity.id, code: '1000', name: 'Cash',
                type: types.AccountType.ASSET,
                balance: 1000, _version: '1', isActive: true, accountClass: 'Asset', currency: 'USD', parentAccountId: null, lastReconciled: null
            });

            result.current.addAccount({
                id: 'equity-1', entityId: entity.id, code: '3000', name: 'Capital',
                type: types.AccountType.EQUITY,
                balance: 1000, _version: '1', isActive: true, accountClass: 'Equity', currency: 'USD', parentAccountId: null, lastReconciled: null
            });

            assetAccId = 'asset-1';
            equityAccId = 'equity-1';
        });

        await waitFor(() => {
            expect(result.current.accounts.length).toBe(2);
        });

        // Post $500 Investment (Debit Cash, Credit Equity)
        await act(async () => {
            const response = result.current.postJournal(
                entityId,
                '2026-01-01',
                'Capital Injection',
                'General',
                [
                    { accountId: assetAccId, amount: 500, dc: types.DCFlag.Debit },
                    { accountId: equityAccId, amount: 500, dc: types.DCFlag.Credit }
                ]
            );

            expect(response.success).toBe(true);
        });

        // Wait for balance update
        await waitFor(() => {
            const assetAcc = result.current.accounts.find(a => a.id === assetAccId);
            expect(assetAcc?.balance).toBe(1500);
        });

        const assetAcc = result.current.accounts.find(a => a.id === assetAccId);
        const equityAcc = result.current.accounts.find(a => a.id === equityAccId);

        expect(assetAcc?.balance).toBe(1500);
        expect(equityAcc?.balance).toBe(1500);
    });

    it('calculates Net Worth correctly via getAccountTotals', async () => {
        const { result } = renderHook(() => useLedgerStore(), { wrapper });


        await waitFor(() => {
            expect(result.current).toBeDefined();
            // Ensure it's the actual context and not some initial state
            expect(result.current?.addEntity).toBeDefined();
        });

        let entityId = '';

        await act(async () => {
            if (!result.current) throw new Error("Context not ready");
            const entity = await result.current.addEntity('root', types.EntityType.LLC, types.EntityRole.OPERATING_LLC, 'Test Co');
            entityId = entity.id;

            // Asset: 100
            result.current.addAccount({
                id: 'a1', entityId: entity.id, code: '1000', name: 'A', type: types.AccountType.ASSET, balance: 100, _version: '1', isActive: true, accountClass: 'Asset', currency: 'USD', parentAccountId: null, lastReconciled: null
            });
            // Liability: 30
            result.current.addAccount({
                id: 'l1', entityId: entity.id, code: '2000', name: 'L', type: types.AccountType.LIABILITY, balance: 30, _version: '1', isActive: true, accountClass: 'Liability', currency: 'USD', parentAccountId: null, lastReconciled: null
            });
        });

        await waitFor(() => {
            expect(result.current.accounts.length).toBe(2);
        });

        const totals = result.current.getAccountTotals(entityId);
        expect(totals.debitTotal).toBe(100);
        expect(totals.creditTotal).toBe(30);
        expect(totals.netWorth).toBe(70); // 100 - 30
    });
});
