import { describe, it, expect, beforeEach } from 'vitest';
import {
    ledgerReducer,
    replayActions,
    parseWalContent,
    serializeAction,
    actions,
    EMPTY_LEDGER_STATE,
    LedgerState,
    LedgerAction,
} from './walReducer';
import { AccountType, EntityType, EntityRole, DCFlag, ExternalRail } from '../types';

describe('walReducer', () => {
    let initialState: LedgerState;

    beforeEach(() => {
        initialState = { ...EMPTY_LEDGER_STATE };
    });

    describe('Account Actions', () => {
        const testAccount = {
            id: 'acc-001',
            entityId: 'entity-001',
            code: '100000',
            name: 'Cash',
            type: 'Asset' as AccountType,
            normalBalance: DCFlag.Debit,
            isActive: true,
            balance: 0,
            _version: '1',
        };

        it('should handle ACCOUNT_CREATE', () => {
            const action = actions.createAccount(testAccount);
            const result = ledgerReducer(initialState, action);

            expect(result.accounts).toHaveLength(1);
            expect(result.accounts[0]).toEqual(testAccount);
            expect(result.version).toBe(1);
            expect(result.lastActionTimestamp).toBe(action.timestamp);
        });

        it('should handle ACCOUNT_UPDATE', () => {
            const state: LedgerState = {
                ...initialState,
                accounts: [testAccount],
            };

            const action = actions.updateAccount('acc-001', { balance: 1000 });
            const result = ledgerReducer(state, action);

            expect(result.accounts[0].balance).toBe(1000);
            expect(result.accounts[0].name).toBe('Cash'); // unchanged
        });

        it('should handle ACCOUNT_DELETE (soft delete)', () => {
            const state: LedgerState = {
                ...initialState,
                accounts: [testAccount],
            };

            const action = actions.deleteAccount('acc-001');
            const result = ledgerReducer(state, action);

            expect(result.accounts).toHaveLength(1);
            expect(result.accounts[0].isActive).toBe(false);
        });
    });

    describe('Journal Actions', () => {
        const testJournal = {
            id: 'jrn-001',
            entityId: 'entity-001',
            date: '2026-01-20',
            memo: 'Test entry',
            type: 'GENERAL',
            lines: [
                { id: 'line-1', accountCode: '100000', dc: DCFlag.Debit, amount: 100, accountName: 'Cash' },
                { id: 'line-2', accountCode: '200000', dc: DCFlag.Credit, amount: 100, accountName: 'Revenue' },
            ],
            locked: true,
            _version: '1',
        };

        it('should handle JOURNAL_POST', () => {
            const action = actions.postJournal(testJournal);
            const result = ledgerReducer(initialState, action);

            expect(result.journals).toHaveLength(1);
            expect(result.journals[0]).toEqual(testJournal);
        });

        it('should handle JOURNAL_VOID', () => {
            const state: LedgerState = {
                ...initialState,
                journals: [testJournal],
            };

            const action = actions.voidJournal('jrn-001', 'Error correction');
            const result = ledgerReducer(state, action);

            expect(result.journals[0].locked).toBe(false);
            expect(result.journals[0].memo).toContain('[VOIDED: Error correction]');
        });
    });

    describe('Entity Actions', () => {
        const testEntity = {
            id: 'entity-001',
            name: 'Test LLC',
            type: EntityType.LLC,
            role: EntityRole.OPERATING_LLC,
            parentEntityId: null,
            _version: '1',
        };

        it('should handle ENTITY_CREATE', () => {
            const action = actions.createEntity(testEntity);
            const result = ledgerReducer(initialState, action);

            expect(result.entities).toHaveLength(1);
            expect(result.entities[0]).toEqual(testEntity);
        });

        it('should handle ENTITY_UPDATE', () => {
            const state: LedgerState = {
                ...initialState,
                entities: [testEntity],
            };

            const action = actions.updateEntity('entity-001', { name: 'Updated LLC' });
            const result = ledgerReducer(state, action);

            expect(result.entities[0].name).toBe('Updated LLC');
        });

        it('should handle ENTITY_DELETE', () => {
            const state: LedgerState = {
                ...initialState,
                entities: [testEntity],
            };

            const action = actions.deleteEntity('entity-001');
            const result = ledgerReducer(state, action);

            expect(result.entities).toHaveLength(0);
        });
    });

    describe('NACHA Actions', () => {
        it('should handle NACHA_SUBMIT', () => {
            const action = actions.submitNacha(
                'nacha-001',
                2,
                50,
                10000,
                10000,
                'abc123hash'
            );
            const result = ledgerReducer(initialState, action);

            expect(result.nachaSubmissions).toHaveLength(1);
            expect(result.nachaSubmissions[0].fileId).toBe('nacha-001');
            expect(result.nachaSubmissions[0].status).toBe('pending');
        });

        it('should handle NACHA_SETTLE', () => {
            const state: LedgerState = {
                ...initialState,
                nachaSubmissions: [
                    {
                        fileId: 'nacha-001',
                        batchCount: 2,
                        entryCount: 50,
                        totalDebit: 10000,
                        totalCredit: 10000,
                        hash: 'abc123hash',
                        submittedAt: '2026-01-20T10:00:00Z',
                        status: 'pending',
                    },
                ],
            };

            const action = actions.settleNacha('nacha-001', '2026-01-21', 'settled');
            const result = ledgerReducer(state, action);

            expect(result.nachaSubmissions[0].status).toBe('settled');
            expect(result.nachaSubmissions[0].settlementDate).toBe('2026-01-21');
        });

        it('should handle NACHA_SETTLE with return', () => {
            const state: LedgerState = {
                ...initialState,
                nachaSubmissions: [
                    {
                        fileId: 'nacha-001',
                        batchCount: 2,
                        entryCount: 50,
                        totalDebit: 10000,
                        totalCredit: 10000,
                        hash: 'abc123hash',
                        submittedAt: '2026-01-20T10:00:00Z',
                        status: 'pending',
                    },
                ],
            };

            const action = actions.settleNacha('nacha-001', '2026-01-21', 'returned', 'R01');
            const result = ledgerReducer(state, action);

            expect(result.nachaSubmissions[0].status).toBe('returned');
            expect(result.nachaSubmissions[0].returnCode).toBe('R01');
        });
    });

    describe('Settlement Actions', () => {
        const testSettlement = {
            payment_id: 'settle-001',
            entityId: 'entity-001',
            payee: 'Test Vendor',
            amount: 500,
            method: ExternalRail.ACH,
            funding_source: 'acc-001',
            supporting_docs: [],
            approval: { required_signers: ['user-001'] },
            status: 'Pending' as const,
            internal_trace_id: 'trace-001',
            date_created: '2026-01-20',
        };

        it('should handle SETTLEMENT_CREATE', () => {
            const action = actions.createSettlement(testSettlement);
            const result = ledgerReducer(initialState, action);

            expect(result.settlements).toHaveLength(1);
            expect(result.settlements[0].payment_id).toBe('settle-001');
        });

        it('should handle SETTLEMENT_RETURN', () => {
            const state: LedgerState = {
                ...initialState,
                settlements: [testSettlement],
            };

            const action = actions.returnSettlement('settle-001', 'R01', 'Insufficient funds');
            const result = ledgerReducer(state, action);

            expect(result.settlements[0].status).toBe('Failed');
        });
    });

    describe('Invoice Actions', () => {
        const testInvoice = {
            id: 'inv-001',
            entityId: 'entity-001',
            vendorId: 'vendor-001',
            invoiceNumber: 'INV-2026-001',
            issueDate: '2026-01-20',
            dueDate: '2026-02-20',
            amount: 108,
            description: 'Test invoice',
            status: 'Draft' as const,
            items: [{ description: 'Service', amount: 100 }],
            _version: '1',
        };

        it('should handle INVOICE_CREATE', () => {
            const action = actions.createInvoice(testInvoice);
            const result = ledgerReducer(initialState, action);

            expect(result.invoices).toHaveLength(1);
            expect(result.invoices[0].invoiceNumber).toBe('INV-2026-001');
        });

        it('should handle INVOICE_UPDATE', () => {
            const state: LedgerState = {
                ...initialState,
                invoices: [testInvoice],
            };

            const action = actions.updateInvoice('inv-001', { status: 'Approved' as const });
            const result = ledgerReducer(state, action);

            expect(result.invoices[0].status).toBe('Approved');
        });
    });

    describe('State Snapshot (Compaction)', () => {
        it('should handle STATE_SNAPSHOT', () => {
            const snapshotState: LedgerState = {
                ...initialState,
                accounts: [
                    {
                        id: 'acc-001',
                        entityId: 'entity-001',
                        code: '100000',
                        name: 'Cash',
                        type: 'Asset' as AccountType,
                        normalBalance: DCFlag.Debit,
                        isActive: true,
                        balance: 5000,
                        _version: '1',
                    },
                ],
                version: 100,
            };

            const action = actions.snapshot(snapshotState, 100);
            const result = ledgerReducer(initialState, action);

            expect(result.accounts).toHaveLength(1);
            expect(result.accounts[0].balance).toBe(5000);
            expect(result.version).toBe(100);
        });
    });

    describe('replayActions', () => {
        it('should replay multiple actions in sequence', () => {
            const actionList: LedgerAction[] = [
                actions.createEntity({
                    id: 'entity-001',
                    name: 'Test LLC',
                    type: EntityType.LLC,
                    role: EntityRole.OPERATING_LLC,
                    parentEntityId: null,
                    _version: '1',
                }),
                actions.createAccount({
                    id: 'acc-001',
                    entityId: 'entity-001',
                    code: '100000',
                    name: 'Cash',
                    type: 'Asset' as AccountType,
                    normalBalance: DCFlag.Debit,
                    isActive: true,
                    balance: 0,
                    _version: '1',
                }),
                actions.updateAccount('acc-001', { balance: 1000 }),
            ];

            const finalState = replayActions(actionList);

            expect(finalState.entities).toHaveLength(1);
            expect(finalState.accounts).toHaveLength(1);
            expect(finalState.accounts[0].balance).toBe(1000);
            expect(finalState.version).toBe(3);
        });

        it('should start from provided initial state', () => {
            const prevState: LedgerState = {
                ...EMPTY_LEDGER_STATE,
                version: 50,
                accounts: [
                    {
                        id: 'existing-acc',
                        entityId: 'entity-001',
                        code: '100000',
                        name: 'Existing Cash',
                        type: 'Asset' as AccountType,
                        normalBalance: DCFlag.Debit,
                        isActive: true,
                        balance: 500,
                        _version: '1',
                    },
                ],
            };

            const actionList: LedgerAction[] = [
                actions.createAccount({
                    id: 'new-acc',
                    entityId: 'entity-001',
                    code: '100001',
                    name: 'New Cash',
                    type: 'Asset' as AccountType,
                    normalBalance: DCFlag.Debit,
                    isActive: true,
                    balance: 100,
                    _version: '1',
                }),
            ];

            const finalState = replayActions(actionList, prevState);

            expect(finalState.accounts).toHaveLength(2);
            expect(finalState.version).toBe(51);
        });
    });

    describe('JSONL Serialization', () => {
        it('should serialize action to JSONL format', () => {
            const action = actions.createAccount({
                id: 'acc-001',
                entityId: 'entity-001',
                code: '100000',
                name: 'Cash',
                type: 'Asset' as AccountType,
                normalBalance: DCFlag.Debit,
                isActive: true,
                balance: 0,
                _version: '1',
            });

            const serialized = serializeAction(action);

            expect(serialized).toContain('"type":"ACCOUNT_CREATE"');
            expect(serialized.endsWith('\n')).toBe(true);
        });

        it('should parse JSONL content into actions', () => {
            const jsonl = [
                '{"type":"ACCOUNT_CREATE","payload":{"id":"acc-001","name":"Cash"},"timestamp":"2026-01-20T10:00:00Z"}',
                '{"type":"ACCOUNT_UPDATE","payload":{"id":"acc-001","changes":{"balance":100}},"timestamp":"2026-01-20T10:01:00Z"}',
            ].join('\n');

            const parsed = parseWalContent(jsonl);

            expect(parsed).toHaveLength(2);
            expect(parsed[0].type).toBe('ACCOUNT_CREATE');
            expect(parsed[1].type).toBe('ACCOUNT_UPDATE');
        });

        it('should handle empty lines in JSONL', () => {
            const jsonl = `
        {"type":"ACCOUNT_CREATE","payload":{"id":"acc-001"},"timestamp":"2026-01-20T10:00:00Z"}
        
        {"type":"ACCOUNT_UPDATE","payload":{"id":"acc-001","changes":{}},"timestamp":"2026-01-20T10:01:00Z"}
      `;

            const parsed = parseWalContent(jsonl);
            expect(parsed).toHaveLength(2);
        });
    });

    describe('Version Tracking', () => {
        it('should increment version on each action', () => {
            let state = initialState;
            expect(state.version).toBe(0);

            state = ledgerReducer(state, actions.createEntity({
                id: 'e1',
                name: 'E1',
                type: EntityType.LLC,
                role: EntityRole.OPERATING_LLC,
                parentEntityId: null,
                _version: '1',
            }));
            expect(state.version).toBe(1);

            state = ledgerReducer(state, actions.updateEntity('e1', { name: 'E1 Updated' }));
            expect(state.version).toBe(2);

            state = ledgerReducer(state, actions.deleteEntity('e1'));
            expect(state.version).toBe(3);
        });
    });
});
