/**
 * Tests for Settlement Event Consumer
 *
 * Tests the event-driven auto-pay functionality that creates payment orders
 * from posted journal entries involving Accounts Payable accounts.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock event bus
vi.mock('../lib/event-bus.js', () => ({
    subscribe: vi.fn()
}));

// Mock persistence
vi.mock('../lib/gcs-persistence.js', () => {
    const store = new Map();
    return {
        default: {
            loadData: vi.fn(async (uid: string, component: string) => {
                const key = `${uid}/${component}`;
                // Return initial settlement state if not found
                if (component === 'settlement' && !store.has(key)) {
                    return { paymentOrders: {} };
                }
                return store.get(key) || null;
            }),
            saveData: vi.fn(async (uid: string, component: string, data: any) => {
                const key = `${uid}/${component}`;
                store.set(key, data);
            })
        }
    };
});

import { handleJournalEntryPosted } from './settlement-events.js';
import persistence from './gcs-persistence.js';

describe('Settlement Event Consumer', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('AP Account Detection', () => {
        it('should identify liability accounts as Accounts Payable', async () => {
            const event = {
                journalEntryId: 'je-001',
                trustId: 'trust-1',
                uid: 'test-user',
                lines: [
                    {
                        lineId: 'line-1',
                        accountId: 'account-1',
                        debit: 1000.00,
                        credit: 0
                    }
                ]
            };

            // Mock ledger with liability account
            vi.mocked(persistence.loadData).mockImplementation(async (uid: string, component: string) => {
                if (component === 'ledger') {
                    return {
                        accounts: {
                            'trust-1': [
                                {
                                    accountId: 'account-1',
                                    code: '2000',
                                    name: 'Accounts Payable',
                                    type: 'liab',
                                    balance: 5000.00
                                }
                            ]
                        }
                    };
                }
                if (component === 'settlement') {
                    return { paymentOrders: {} };
                }
                return null;
            });

            await handleJournalEntryPosted(event);

            // Should create payment order
            expect(persistence.saveData).toHaveBeenCalled();
            const saveCall = vi.mocked(persistence.saveData).mock.calls[0];
            const state = saveCall[2];
            const orders = Object.values(state.paymentOrders);
            expect(orders.length).toBeGreaterThan(0);

            const order = orders[0] as any;
            expect(order.journalEntryId).toBe('je-001');
            expect(order.journalEntryLineId).toBe('line-1');
            expect(order.amount).toBe(1000.00);
        });

        it('should not create payment order for non-AP accounts', async () => {
            const event = {
                journalEntryId: 'je-002',
                trustId: 'trust-1',
                uid: 'test-user',
                lines: [
                    {
                        lineId: 'line-1',
                        accountId: 'account-1',
                        debit: 1000.00,
                        credit: 0
                    }
                ]
            };

            // Mock ledger with expense account (not AP)
            vi.mocked(persistence.loadData).mockImplementation(async (uid: string, component: string) => {
                if (component === 'ledger') {
                    return {
                        accounts: {
                            'trust-1': [
                                {
                                    accountId: 'account-1',
                                    code: '6000',
                                    name: 'Office Expense',
                                    type: 'expense',
                                    balance: 2000.00
                                }
                            ]
                        }
                    };
                }
                if (component === 'settlement') {
                    return { paymentOrders: {} };
                }
                return null;
            });

            await handleJournalEntryPosted(event);

            // Should NOT create payment order
            const saveCalls = vi.mocked(persistence.saveData).mock.calls;
            expect(saveCalls.length).toBe(0);
        });

        it('should not create payment order for credit transactions to AP', async () => {
            const event = {
                journalEntryId: 'je-003',
                trustId: 'trust-1',
                uid: 'test-user',
                lines: [
                    {
                        lineId: 'line-1',
                        accountId: 'account-1',
                        debit: 0,
                        credit: 1000.00
                    }
                ]
            };

            // Mock ledger with liability account
            vi.mocked(persistence.loadData).mockImplementation(async (uid: string, component: string) => {
                if (component === 'ledger') {
                    return {
                        accounts: {
                            'trust-1': [
                                {
                                    accountId: 'account-1',
                                    code: '2000',
                                    name: 'Accounts Payable',
                                    type: 'liab',
                                    balance: 5000.00
                                }
                            ]
                        }
                    };
                }
                if (component === 'settlement') {
                    return { paymentOrders: {} };
                }
                return null;
            });

            await handleJournalEntryPosted(event);

            // Credit to AP increases liability (not a payment), should NOT create payment order
            const saveCalls = vi.mocked(persistence.saveData).mock.calls;
            expect(saveCalls.length).toBe(0);
        });
    });

    describe('Payee Details Extraction', () => {
        it('should extract payee name from notes field', async () => {
            const event = {
                journalEntryId: 'je-004',
                trustId: 'trust-1',
                uid: 'test-user',
                lines: [
                    {
                        lineId: 'line-1',
                        accountId: 'account-1',
                        debit: 500.00,
                        credit: 0,
                        notes: 'Payment to ACME Corporation for services',
                        routingNumber: '021000021',
                        accountNumber: '987654321'
                    }
                ]
            };

            vi.mocked(persistence.loadData).mockImplementation(async (uid: string, component: string) => {
                if (component === 'ledger') {
                    return {
                        accounts: {
                            'trust-1': [
                                {
                                    accountId: 'account-1',
                                    code: '2000',
                                    name: 'Accounts Payable',
                                    type: 'liab',
                                    balance: 5000.00
                                }
                            ]
                        }
                    };
                }
                if (component === 'settlement') {
                    return { paymentOrders: {} };
                }
                return null;
            });

            await handleJournalEntryPosted(event);

            const saveCall = vi.mocked(persistence.saveData).mock.calls[0];
            const state = saveCall[2];
            const order = Object.values(state.paymentOrders)[0] as any;

            expect(order.payee.name).toContain('ACME');
            expect(order.method).toBe('ACH'); // Has routing/account numbers
        });

        it('should use payeeId if available', async () => {
            const event = {
                journalEntryId: 'je-005',
                trustId: 'trust-1',
                uid: 'test-user',
                lines: [
                    {
                        lineId: 'line-1',
                        accountId: 'account-1',
                        debit: 250.00,
                        credit: 0,
                        vendorId: 'VENDOR-123',
                        routingNumber: '021000021',
                        accountNumber: '987654321'
                    }
                ]
            };

            vi.mocked(persistence.loadData).mockImplementation(async (uid: string, component: string) => {
                if (component === 'ledger') {
                    return {
                        accounts: {
                            'trust-1': [
                                {
                                    accountId: 'account-1',
                                    code: '2000',
                                    name: 'Accounts Payable',
                                    type: 'liab',
                                    balance: 5000.00
                                }
                            ]
                        }
                    };
                }
                if (component === 'settlement') {
                    return { paymentOrders: {} };
                }
                return null;
            });

            await handleJournalEntryPosted(event);

            const saveCall = vi.mocked(persistence.saveData).mock.calls[0];
            const state = saveCall[2];
            const order = Object.values(state.paymentOrders)[0] as any;

            expect(order.payee.id).toBe('VENDOR-123');
        });

        it('should default to CHECK method when banking details missing', async () => {
            const event = {
                journalEntryId: 'je-006',
                trustId: 'trust-1',
                uid: 'test-user',
                lines: [
                    {
                        lineId: 'line-1',
                        accountId: 'account-1',
                        debit: 100.00,
                        credit: 0,
                        notes: 'Check payment to vendor'
                    }
                ]
            };

            vi.mocked(persistence.loadData).mockImplementation(async (uid: string, component: string) => {
                if (component === 'ledger') {
                    return {
                        accounts: {
                            'trust-1': [
                                {
                                    accountId: 'account-1',
                                    code: '2000',
                                    name: 'Accounts Payable',
                                    type: 'liab',
                                    balance: 5000.00
                                }
                            ]
                        }
                    };
                }
                if (component === 'settlement') {
                    return { paymentOrders: {} };
                }
                return null;
            });

            await handleJournalEntryPosted(event);

            const saveCall = vi.mocked(persistence.saveData).mock.calls[0];
            const state = saveCall[2];
            const order = Object.values(state.paymentOrders)[0] as any;

            expect(order.method).toBe('CHECK');
        });
    });

    describe('Idempotency', () => {
        it('should not create duplicate payment orders for same journal entry line', async () => {
            const event = {
                journalEntryId: 'je-007',
                trustId: 'trust-1',
                uid: 'test-user',
                lines: [
                    {
                        lineId: 'line-1',
                        accountId: 'account-1',
                        debit: 750.00,
                        credit: 0,
                        routingNumber: '021000021',
                        accountNumber: '987654321'
                    }
                ]
            };

            // Mock ledger with AP account
            (vi.mocked(persistence.loadData) as any)
                .mockResolvedValueOnce({
                    accounts: {
                        'trust-1': [
                            {
                                accountId: 'account-1',
                                code: '2000',
                                name: 'Accounts Payable',
                                type: 'liab',
                                balance: 5000.00
                            }
                        ]
                    }
                })
                // Mock existing settlement state with payment order
                .mockResolvedValueOnce({
                    paymentOrders: {
                        'po-existing': {
                            paymentOrderId: 'po-existing',
                            journalEntryId: 'je-007',
                            journalEntryLineId: 'line-1',
                            amount: 750.00,
                            status: 'created'
                        }
                    }
                });

            await handleJournalEntryPosted(event);

            // Should NOT create new payment order (already exists)
            const saveCalls = vi.mocked(persistence.saveData).mock.calls;
            expect(saveCalls.length).toBe(0);
        });
    });

    describe('Error Handling', () => {
        it('should handle missing ledger data gracefully', async () => {
            const event = {
                journalEntryId: 'je-008',
                trustId: 'trust-1',
                uid: 'test-user',
                lines: [
                    {
                        lineId: 'line-1',
                        accountId: 'account-1',
                        debit: 1000.00,
                        credit: 0
                    }
                ]
            };

            // Return null for ledger data
            (vi.mocked(persistence.loadData) as any).mockResolvedValue(null);

            // Should not throw
            await expect(handleJournalEntryPosted(event)).resolves.toBeUndefined();
        });

        it('should handle missing account gracefully', async () => {
            const event = {
                journalEntryId: 'je-009',
                trustId: 'trust-1',
                uid: 'test-user',
                lines: [
                    {
                        lineId: 'line-1',
                        accountId: 'non-existent',
                        debit: 1000.00,
                        credit: 0
                    }
                ]
            };

            (vi.mocked(persistence.loadData) as any).mockResolvedValue({
                accounts: {
                    'trust-1': [
                        {
                            accountId: 'account-1',
                            code: '2000',
                            name: 'Accounts Payable',
                            type: 'liab',
                            balance: 5000.00
                        }
                    ]
                }
            });

            // Should not throw
            await expect(handleJournalEntryPosted(event)).resolves.toBeUndefined();
        });
    });
});
