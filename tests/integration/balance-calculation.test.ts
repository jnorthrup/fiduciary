/**
 * Balance Calculation Correctness Tests
 *
 * Validates that account balances are computed correctly across operations.
 * Focuses on areas NOT covered by double-entry-accounting.test.ts:
 *
 * - Opening/beginning balance initialization
 * - Running balance accuracy after many sequential entries
 * - Trial balance preservation across all operations
 * - Balance sheet totals with multiple accounts per type
 * - Floating-point precision under cumulative operations
 * - Reversing entries restore prior balances
 * - Entity isolation (balances don't leak across entities)
 * - Beginning balance recalculation on update
 * - Edge cases: zero-amount entries on balances, very large cumulative amounts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import {
  Account,
  AccountType,
  DCFlag,
  JournalLine,
} from '../../types';
import {
  createAccount,
  updateAccount,
  getAccountTotals,
  getAccountClass,
  getDefaultNormalBalance,
  type CreateAccountInput,
} from '../../services/accountService';

// ============================================================================
// SHARED HELPERS (mirroring production logic from ledgerService/postJournal)
// ============================================================================

/**
 * Applies journal lines to account balances following normal balance rules.
 * Mirrors the logic in ledgerService.ts postJournal.
 */
function applyJournalToAccounts(
  accounts: Account[],
  lines: JournalLine[]
): Account[] {
  return accounts.map((acc) => {
    const relLines = lines.filter(
      (l) => l.accountCode === acc.code || l.accountId === acc.id
    );
    if (relLines.length === 0) return acc;

    let change = 0;
    relLines.forEach((l) => {
      if (acc.type === AccountType.ASSET || acc.type === AccountType.EXPENSE) {
        change += l.dc === DCFlag.Debit ? l.amount : -l.amount;
      } else {
        change += l.dc === DCFlag.Credit ? l.amount : -l.amount;
      }
    });

    return { ...acc, balance: acc.balance + change };
  });
}

/**
 * Creates a minimal Account for testing.
 */
function makeAccount(
  overrides: Partial<Account> & { code: string; type: AccountType }
): Account {
  const type = overrides.type;
  return {
    id: overrides.id || uuidv4(),
    entityId: overrides.entityId || ENTITY_A,
    code: overrides.code,
    name: overrides.name || `Account ${overrides.code}`,
    type,
    normalBalance: getDefaultNormalBalance(type),
    balance: overrides.balance ?? 0,
    beginningBalance: (overrides as any).beginningBalance ?? 0,
    accountClass: getAccountClass(type),
    isActive: (overrides as any).isActive ?? true,
    createdAt: new Date().toISOString(),
    _version: '1',
  };
}

function makeLine(
  dc: DCFlag,
  amount: number,
  accountCode: string,
  accountName?: string
): JournalLine {
  return {
    id: uuidv4(),
    accountCode,
    accountName: accountName || `Account ${accountCode}`,
    dc,
    amount,
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ENTITY_A = 'entity-balance-a';
const ENTITY_B = 'entity-balance-b';

// ============================================================================
// TESTS
// ============================================================================

describe('Balance Calculation Correctness', () => {
  // ------------------------------------------------------------------
  // 1. Opening / beginning balance initialization
  // ------------------------------------------------------------------
  describe('Opening Balance Initialization', () => {
    it('new account with no beginning balance starts at zero', () => {
      const input: CreateAccountInput = {
        entityId: ENTITY_A,
        code: 'CASH-001',
        name: 'Cash',
        type: AccountType.ASSET,
      };

      const { account, errors } = createAccount(input, []);

      expect(errors).toHaveLength(0);
      expect(account.balance).toBe(0);
      expect(account.beginningBalance).toBe(0);
    });

    it('new account with explicit beginning balance sets balance equal to beginning balance', () => {
      const input: CreateAccountInput = {
        entityId: ENTITY_A,
        code: 'CASH-002',
        name: 'Operating Cash',
        type: AccountType.ASSET,
        beginningBalance: 25000,
      };

      const { account, errors } = createAccount(input, []);

      expect(errors).toHaveLength(0);
      expect(account.balance).toBe(25000);
      expect(account.beginningBalance).toBe(25000);
    });

    it('beginning balance works for every account type', () => {
      const types: { type: AccountType; amount: number }[] = [
        { type: AccountType.ASSET, amount: 50000 },
        { type: AccountType.LIABILITY, amount: 20000 },
        { type: AccountType.EQUITY, amount: 30000 },
        { type: AccountType.INCOME, amount: 15000 },
        { type: AccountType.EXPENSE, amount: 5000 },
      ];

      types.forEach(({ type, amount }) => {
        const { account, errors } = createAccount(
          {
            entityId: ENTITY_A,
            code: `BB-${type}`,
            name: `${type} Account`,
            type,
            beginningBalance: amount,
          },
          []
        );

        expect(errors).toHaveLength(0);
        expect(account.balance).toBe(amount);
        expect(account.beginningBalance).toBe(amount);
      });
    });
  });

  // ------------------------------------------------------------------
  // 2. Balance updates after a single journal entry
  // ------------------------------------------------------------------
  describe('Balance After Single Journal Entry', () => {
    it('debit to asset increases balance, credit to liability increases balance', () => {
      const accounts = [
        makeAccount({ code: '100', type: AccountType.ASSET, balance: 0 }),
        makeAccount({ code: '200', type: AccountType.LIABILITY, balance: 0 }),
      ];

      const lines = [
        makeLine(DCFlag.Debit, 5000, '100'),
        makeLine(DCFlag.Credit, 5000, '200'),
      ];

      const updated = applyJournalToAccounts(accounts, lines);

      expect(updated.find((a) => a.code === '100')!.balance).toBe(5000);
      expect(updated.find((a) => a.code === '200')!.balance).toBe(5000);
    });

    it('credit to asset decreases balance, debit to equity decreases balance', () => {
      const accounts = [
        makeAccount({ code: '100', type: AccountType.ASSET, balance: 10000 }),
        makeAccount({ code: '300', type: AccountType.EQUITY, balance: 10000 }),
      ];

      const lines = [
        makeLine(DCFlag.Debit, 3000, '300'),
        makeLine(DCFlag.Credit, 3000, '100'),
      ];

      const updated = applyJournalToAccounts(accounts, lines);

      expect(updated.find((a) => a.code === '100')!.balance).toBe(7000);
      expect(updated.find((a) => a.code === '300')!.balance).toBe(7000);
    });
  });

  // ------------------------------------------------------------------
  // 3. Running balance after many sequential entries
  // ------------------------------------------------------------------
  describe('Running Balance After Multiple Sequential Entries', () => {
    it('tracks running balance correctly over 10 sequential transactions', () => {
      let accounts = [
        makeAccount({ code: '100', type: AccountType.ASSET, name: 'Cash', balance: 0 }),
        makeAccount({ code: '200', type: AccountType.LIABILITY, name: 'Loans', balance: 0 }),
        makeAccount({ code: '300', type: AccountType.EQUITY, name: 'Capital', balance: 0 }),
        makeAccount({ code: '400', type: AccountType.INCOME, name: 'Revenue', balance: 0 }),
        makeAccount({ code: '500', type: AccountType.EXPENSE, name: 'OpEx', balance: 0 }),
      ];

      // Define a sequence of 10 transactions with expected running balances
      const transactions: {
        lines: JournalLine[];
        expectedBalances: Record<string, number>;
      }[] = [
        // 1. Owner invests $100,000
        {
          lines: [
            makeLine(DCFlag.Debit, 100000, '100'),
            makeLine(DCFlag.Credit, 100000, '300'),
          ],
          expectedBalances: { '100': 100000, '200': 0, '300': 100000, '400': 0, '500': 0 },
        },
        // 2. Take loan $50,000
        {
          lines: [
            makeLine(DCFlag.Debit, 50000, '100'),
            makeLine(DCFlag.Credit, 50000, '200'),
          ],
          expectedBalances: { '100': 150000, '200': 50000, '300': 100000, '400': 0, '500': 0 },
        },
        // 3. Earn revenue $30,000
        {
          lines: [
            makeLine(DCFlag.Debit, 30000, '100'),
            makeLine(DCFlag.Credit, 30000, '400'),
          ],
          expectedBalances: { '100': 180000, '200': 50000, '300': 100000, '400': 30000, '500': 0 },
        },
        // 4. Pay operating expenses $12,000
        {
          lines: [
            makeLine(DCFlag.Debit, 12000, '500'),
            makeLine(DCFlag.Credit, 12000, '100'),
          ],
          expectedBalances: { '100': 168000, '200': 50000, '300': 100000, '400': 30000, '500': 12000 },
        },
        // 5. Repay part of loan $15,000
        {
          lines: [
            makeLine(DCFlag.Debit, 15000, '200'),
            makeLine(DCFlag.Credit, 15000, '100'),
          ],
          expectedBalances: { '100': 153000, '200': 35000, '300': 100000, '400': 30000, '500': 12000 },
        },
        // 6. Additional revenue $20,000
        {
          lines: [
            makeLine(DCFlag.Debit, 20000, '100'),
            makeLine(DCFlag.Credit, 20000, '400'),
          ],
          expectedBalances: { '100': 173000, '200': 35000, '300': 100000, '400': 50000, '500': 12000 },
        },
        // 7. Pay expenses $8,000
        {
          lines: [
            makeLine(DCFlag.Debit, 8000, '500'),
            makeLine(DCFlag.Credit, 8000, '100'),
          ],
          expectedBalances: { '100': 165000, '200': 35000, '300': 100000, '400': 50000, '500': 20000 },
        },
        // 8. Owner additional investment $25,000
        {
          lines: [
            makeLine(DCFlag.Debit, 25000, '100'),
            makeLine(DCFlag.Credit, 25000, '300'),
          ],
          expectedBalances: { '100': 190000, '200': 35000, '300': 125000, '400': 50000, '500': 20000 },
        },
        // 9. Repay remaining loan $35,000
        {
          lines: [
            makeLine(DCFlag.Debit, 35000, '200'),
            makeLine(DCFlag.Credit, 35000, '100'),
          ],
          expectedBalances: { '100': 155000, '200': 0, '300': 125000, '400': 50000, '500': 20000 },
        },
        // 10. Earn final revenue $10,000
        {
          lines: [
            makeLine(DCFlag.Debit, 10000, '100'),
            makeLine(DCFlag.Credit, 10000, '400'),
          ],
          expectedBalances: { '100': 165000, '200': 0, '300': 125000, '400': 60000, '500': 20000 },
        },
      ];

      transactions.forEach((txn, index) => {
        accounts = applyJournalToAccounts(accounts, txn.lines);

        for (const [code, expectedBalance] of Object.entries(txn.expectedBalances)) {
          const actual = accounts.find((a) => a.code === code)!.balance;
          expect(actual).toBe(
            expectedBalance,
          );
        }
      });

      // Final verification: Assets = Liabilities + Equity + (Income - Expenses)
      // 165000 = 0 + 125000 + (60000 - 20000) = 165000
      const cash = accounts.find((a) => a.code === '100')!.balance;
      const loans = accounts.find((a) => a.code === '200')!.balance;
      const capital = accounts.find((a) => a.code === '300')!.balance;
      const revenue = accounts.find((a) => a.code === '400')!.balance;
      const opex = accounts.find((a) => a.code === '500')!.balance;

      expect(cash).toBe(loans + capital + (revenue - opex));
    });
  });

  // ------------------------------------------------------------------
  // 4. Trial balance preservation
  // ------------------------------------------------------------------
  describe('Trial Balance Preservation', () => {
    it('trial balance (debitTotal = creditTotal) holds after every balanced entry', () => {
      let accounts = [
        makeAccount({ code: '100', type: AccountType.ASSET, balance: 50000 }),
        makeAccount({ code: '110', type: AccountType.ASSET, balance: 10000 }),
        makeAccount({ code: '200', type: AccountType.LIABILITY, balance: 20000 }),
        makeAccount({ code: '300', type: AccountType.EQUITY, balance: 30000 }),
        makeAccount({ code: '400', type: AccountType.INCOME, balance: 12000 }),
        makeAccount({ code: '500', type: AccountType.EXPENSE, balance: 2000 }),
      ];

      // Initial trial balance check
      let totals = getAccountTotals(ENTITY_A, accounts);
      expect(totals.debitTotal).toBe(totals.creditTotal);

      // Apply 5 balanced entries, checking trial balance after each
      const entries: JournalLine[][] = [
        // Entry 1: Cash sale
        [makeLine(DCFlag.Debit, 5000, '100'), makeLine(DCFlag.Credit, 5000, '400')],
        // Entry 2: Pay expense
        [makeLine(DCFlag.Debit, 3000, '500'), makeLine(DCFlag.Credit, 3000, '100')],
        // Entry 3: Transfer between asset accounts
        [makeLine(DCFlag.Debit, 2000, '110'), makeLine(DCFlag.Credit, 2000, '100')],
        // Entry 4: Borrow money
        [makeLine(DCFlag.Debit, 10000, '100'), makeLine(DCFlag.Credit, 10000, '200')],
        // Entry 5: Compound entry
        [
          makeLine(DCFlag.Debit, 7000, '500'),
          makeLine(DCFlag.Credit, 4000, '100'),
          makeLine(DCFlag.Credit, 3000, '200'),
        ],
      ];

      entries.forEach((lines) => {
        accounts = applyJournalToAccounts(accounts, lines);
        totals = getAccountTotals(ENTITY_A, accounts);
        expect(totals.debitTotal).toBe(totals.creditTotal);
      });
    });

    it('trial balance: sum of all debit-normal balances equals sum of all credit-normal balances', () => {
      const accounts = [
        makeAccount({ code: '100', type: AccountType.ASSET, balance: 80000 }),
        makeAccount({ code: '110', type: AccountType.ASSET, balance: 15000 }),
        makeAccount({ code: '120', type: AccountType.ASSET, balance: 5000 }),
        makeAccount({ code: '200', type: AccountType.LIABILITY, balance: 30000 }),
        makeAccount({ code: '210', type: AccountType.LIABILITY, balance: 10000 }),
        makeAccount({ code: '300', type: AccountType.EQUITY, balance: 40000 }),
        makeAccount({ code: '400', type: AccountType.INCOME, balance: 25000 }),
        makeAccount({ code: '500', type: AccountType.EXPENSE, balance: 5000 }),
      ];

      const totals = getAccountTotals(ENTITY_A, accounts);

      // Debit-normal: Assets + Expenses
      const manualDebitTotal = 80000 + 15000 + 5000 + 5000;
      // Credit-normal: Liabilities + Equity + Income
      const manualCreditTotal = 30000 + 10000 + 40000 + 25000;

      expect(totals.debitTotal).toBe(manualDebitTotal);
      expect(totals.creditTotal).toBe(manualCreditTotal);
      expect(totals.debitTotal).toBe(totals.creditTotal);
      expect(totals.debitTotal).toBe(105000);
    });
  });

  // ------------------------------------------------------------------
  // 5. Balance sheet totals with multiple accounts per type
  // ------------------------------------------------------------------
  describe('Balance Sheet Totals', () => {
    it('total assets sums across multiple asset accounts', () => {
      const accounts = [
        makeAccount({ code: '100', type: AccountType.ASSET, name: 'Cash', balance: 40000 }),
        makeAccount({ code: '110', type: AccountType.ASSET, name: 'AR', balance: 15000 }),
        makeAccount({ code: '120', type: AccountType.ASSET, name: 'Inventory', balance: 25000 }),
        makeAccount({ code: '130', type: AccountType.ASSET, name: 'Equipment', balance: 50000 }),
        makeAccount({ code: '200', type: AccountType.LIABILITY, balance: 30000 }),
        makeAccount({ code: '300', type: AccountType.EQUITY, balance: 100000 }),
      ];

      const totals = getAccountTotals(ENTITY_A, accounts);

      expect(totals.breakdown[AccountType.ASSET]).toBe(130000);
      expect(totals.breakdown[AccountType.LIABILITY]).toBe(30000);
      expect(totals.breakdown[AccountType.EQUITY]).toBe(100000);
    });

    it('total liabilities sums across multiple liability accounts', () => {
      const accounts = [
        makeAccount({ code: '100', type: AccountType.ASSET, balance: 100000 }),
        makeAccount({ code: '200', type: AccountType.LIABILITY, name: 'AP', balance: 15000 }),
        makeAccount({ code: '210', type: AccountType.LIABILITY, name: 'Loans', balance: 35000 }),
        makeAccount({ code: '220', type: AccountType.LIABILITY, name: 'Tax Payable', balance: 8000 }),
        makeAccount({ code: '300', type: AccountType.EQUITY, balance: 42000 }),
      ];

      const totals = getAccountTotals(ENTITY_A, accounts);

      expect(totals.breakdown[AccountType.LIABILITY]).toBe(58000);
    });

    it('net worth = total assets - total liabilities', () => {
      const accounts = [
        makeAccount({ code: '100', type: AccountType.ASSET, balance: 200000 }),
        makeAccount({ code: '110', type: AccountType.ASSET, balance: 50000 }),
        makeAccount({ code: '200', type: AccountType.LIABILITY, balance: 80000 }),
        makeAccount({ code: '210', type: AccountType.LIABILITY, balance: 20000 }),
        makeAccount({ code: '300', type: AccountType.EQUITY, balance: 150000 }),
      ];

      const totals = getAccountTotals(ENTITY_A, accounts);

      expect(totals.netWorth).toBe(250000 - 100000);
      expect(totals.netWorth).toBe(150000);
    });

    it('balance sheet equation holds: Assets = Liabilities + Equity + (Income - Expenses)', () => {
      const accounts = [
        makeAccount({ code: '100', type: AccountType.ASSET, balance: 120000 }),
        makeAccount({ code: '110', type: AccountType.ASSET, balance: 30000 }),
        makeAccount({ code: '200', type: AccountType.LIABILITY, balance: 45000 }),
        makeAccount({ code: '300', type: AccountType.EQUITY, balance: 75000 }),
        makeAccount({ code: '400', type: AccountType.INCOME, balance: 50000 }),
        makeAccount({ code: '500', type: AccountType.EXPENSE, balance: 20000 }),
      ];

      const totals = getAccountTotals(ENTITY_A, accounts);
      const netIncome =
        totals.breakdown[AccountType.INCOME] -
        totals.breakdown[AccountType.EXPENSE];

      const lhs = totals.breakdown[AccountType.ASSET];
      const rhs =
        totals.breakdown[AccountType.LIABILITY] +
        totals.breakdown[AccountType.EQUITY] +
        netIncome;

      expect(lhs).toBe(rhs);
      expect(lhs).toBe(150000);
    });

    it('balance sheet with zero balances is valid', () => {
      const accounts = [
        makeAccount({ code: '100', type: AccountType.ASSET, balance: 0 }),
        makeAccount({ code: '200', type: AccountType.LIABILITY, balance: 0 }),
        makeAccount({ code: '300', type: AccountType.EQUITY, balance: 0 }),
      ];

      const totals = getAccountTotals(ENTITY_A, accounts);

      expect(totals.debitTotal).toBe(0);
      expect(totals.creditTotal).toBe(0);
      expect(totals.netWorth).toBe(0);
      expect(totals.debitTotal).toBe(totals.creditTotal);
    });
  });

  // ------------------------------------------------------------------
  // 6. Reversing entries
  // ------------------------------------------------------------------
  describe('Reversing Entries', () => {
    it('reversing entry restores all account balances to prior state', () => {
      const originalAccounts = [
        makeAccount({ code: '100', type: AccountType.ASSET, balance: 50000 }),
        makeAccount({ code: '400', type: AccountType.INCOME, balance: 20000 }),
      ];

      // Post original entry
      const originalEntry = [
        makeLine(DCFlag.Debit, 8000, '100'),
        makeLine(DCFlag.Credit, 8000, '400'),
      ];
      let accounts = applyJournalToAccounts(originalAccounts, originalEntry);

      expect(accounts.find((a) => a.code === '100')!.balance).toBe(58000);
      expect(accounts.find((a) => a.code === '400')!.balance).toBe(28000);

      // Post reversing entry (swap debit/credit)
      const reversingEntry = [
        makeLine(DCFlag.Credit, 8000, '100'),
        makeLine(DCFlag.Debit, 8000, '400'),
      ];
      accounts = applyJournalToAccounts(accounts, reversingEntry);

      expect(accounts.find((a) => a.code === '100')!.balance).toBe(50000);
      expect(accounts.find((a) => a.code === '400')!.balance).toBe(20000);
    });

    it('trial balance preserved after original and reversing entry', () => {
      let accounts = [
        makeAccount({ code: '100', type: AccountType.ASSET, balance: 30000 }),
        makeAccount({ code: '200', type: AccountType.LIABILITY, balance: 10000 }),
        makeAccount({ code: '300', type: AccountType.EQUITY, balance: 20000 }),
      ];

      const before = getAccountTotals(ENTITY_A, accounts);
      expect(before.debitTotal).toBe(before.creditTotal);

      // Original entry
      accounts = applyJournalToAccounts(accounts, [
        makeLine(DCFlag.Debit, 5000, '100'),
        makeLine(DCFlag.Credit, 5000, '200'),
      ]);

      const afterOriginal = getAccountTotals(ENTITY_A, accounts);
      expect(afterOriginal.debitTotal).toBe(afterOriginal.creditTotal);

      // Reversing entry
      accounts = applyJournalToAccounts(accounts, [
        makeLine(DCFlag.Credit, 5000, '100'),
        makeLine(DCFlag.Debit, 5000, '200'),
      ]);

      const afterReversal = getAccountTotals(ENTITY_A, accounts);
      expect(afterReversal.debitTotal).toBe(afterReversal.creditTotal);
      expect(afterReversal.debitTotal).toBe(before.debitTotal);
    });
  });

  // ------------------------------------------------------------------
  // 7. Entity isolation
  // ------------------------------------------------------------------
  describe('Entity Isolation', () => {
    it('getAccountTotals only includes accounts from the specified entity', () => {
      const accounts = [
        makeAccount({ code: '100', type: AccountType.ASSET, balance: 50000, entityId: ENTITY_A }),
        makeAccount({ code: '200', type: AccountType.LIABILITY, balance: 20000, entityId: ENTITY_A }),
        makeAccount({ code: '300', type: AccountType.EQUITY, balance: 30000, entityId: ENTITY_A }),
        makeAccount({ code: '100', type: AccountType.ASSET, balance: 80000, entityId: ENTITY_B }),
        makeAccount({ code: '200', type: AccountType.LIABILITY, balance: 30000, entityId: ENTITY_B }),
        makeAccount({ code: '300', type: AccountType.EQUITY, balance: 50000, entityId: ENTITY_B }),
      ];

      const totalsA = getAccountTotals(ENTITY_A, accounts);
      const totalsB = getAccountTotals(ENTITY_B, accounts);

      expect(totalsA.breakdown[AccountType.ASSET]).toBe(50000);
      expect(totalsB.breakdown[AccountType.ASSET]).toBe(80000);

      expect(totalsA.netWorth).toBe(30000);
      expect(totalsB.netWorth).toBe(50000);

      // Both independently balanced
      expect(totalsA.debitTotal).toBe(totalsA.creditTotal);
      expect(totalsB.debitTotal).toBe(totalsB.creditTotal);
    });

    it('journal entry on entity A does not affect entity B balances', () => {
      let accounts = [
        makeAccount({ code: '100', type: AccountType.ASSET, balance: 10000, entityId: ENTITY_A }),
        makeAccount({ code: '400', type: AccountType.INCOME, balance: 0, entityId: ENTITY_A }),
        makeAccount({ code: '100', type: AccountType.ASSET, balance: 5000, entityId: ENTITY_B }),
        makeAccount({ code: '400', type: AccountType.INCOME, balance: 0, entityId: ENTITY_B }),
      ];

      // Post entry only for entity A accounts (matched by code)
      // Since applyJournalToAccounts matches by code, we use accountId for precision
      const entityAAsset = accounts.find(
        (a) => a.entityId === ENTITY_A && a.code === '100'
      )!;
      const entityAIncome = accounts.find(
        (a) => a.entityId === ENTITY_A && a.code === '400'
      )!;

      const lines: JournalLine[] = [
        {
          id: uuidv4(),
          accountId: entityAAsset.id,
          accountCode: '__unique_a_100',
          accountName: 'Cash A',
          dc: DCFlag.Debit,
          amount: 3000,
        },
        {
          id: uuidv4(),
          accountId: entityAIncome.id,
          accountCode: '__unique_a_400',
          accountName: 'Revenue A',
          dc: DCFlag.Credit,
          amount: 3000,
        },
      ];

      accounts = applyJournalToAccounts(accounts, lines);

      // Entity A updated
      expect(
        accounts.find((a) => a.entityId === ENTITY_A && a.code === '100')!
          .balance
      ).toBe(13000);
      expect(
        accounts.find((a) => a.entityId === ENTITY_A && a.code === '400')!
          .balance
      ).toBe(3000);

      // Entity B unchanged
      expect(
        accounts.find((a) => a.entityId === ENTITY_B && a.code === '100')!
          .balance
      ).toBe(5000);
      expect(
        accounts.find((a) => a.entityId === ENTITY_B && a.code === '400')!
          .balance
      ).toBe(0);
    });
  });

  // ------------------------------------------------------------------
  // 8. Beginning balance recalculation
  // ------------------------------------------------------------------
  describe('Beginning Balance Recalculation', () => {
    it('updating beginning balance preserves activity delta', () => {
      // Account starts with beginningBalance=1000, current balance=1500
      // Activity = 500
      const account: Account = makeAccount({
        code: '100',
        type: AccountType.ASSET,
        balance: 1500,
      });
      (account as any).beginningBalance = 1000;
      (account as any).id = 'acct-bb-test';

      const existingAccounts = [account];

      const { account: updated, errors } = updateAccount(
        'acct-bb-test',
        { beginningBalance: 3000 },
        existingAccounts
      );

      expect(errors).toHaveLength(0);
      expect(updated!.beginningBalance).toBe(3000);
      // New balance = new beginning balance + activity (500)
      expect(updated!.balance).toBe(3500);
    });

    it('beginning balance change to zero preserves activity', () => {
      const account: Account = makeAccount({
        code: '100',
        type: AccountType.ASSET,
        balance: 800,
      });
      (account as any).beginningBalance = 500;
      (account as any).id = 'acct-bb-zero';

      const { account: updated, errors } = updateAccount(
        'acct-bb-zero',
        { beginningBalance: 0 },
        [account]
      );

      expect(errors).toHaveLength(0);
      expect(updated!.beginningBalance).toBe(0);
      // Activity was 300, so new balance = 0 + 300
      expect(updated!.balance).toBe(300);
    });
  });

  // ------------------------------------------------------------------
  // 9. Edge cases
  // ------------------------------------------------------------------
  describe('Edge Cases', () => {
    it('zero-amount journal entry does not change any balance', () => {
      const accounts = [
        makeAccount({ code: '100', type: AccountType.ASSET, balance: 5000 }),
        makeAccount({ code: '200', type: AccountType.LIABILITY, balance: 3000 }),
      ];

      const lines = [
        makeLine(DCFlag.Debit, 0, '100'),
        makeLine(DCFlag.Credit, 0, '200'),
      ];

      const updated = applyJournalToAccounts(accounts, lines);

      expect(updated.find((a) => a.code === '100')!.balance).toBe(5000);
      expect(updated.find((a) => a.code === '200')!.balance).toBe(3000);
    });

    it('very large cumulative balance remains precise', () => {
      let accounts = [
        makeAccount({ code: '100', type: AccountType.ASSET, balance: 0 }),
        makeAccount({ code: '300', type: AccountType.EQUITY, balance: 0 }),
      ];

      // Apply 100 entries of $1,000,000 each
      for (let i = 0; i < 100; i++) {
        accounts = applyJournalToAccounts(accounts, [
          makeLine(DCFlag.Debit, 1000000, '100'),
          makeLine(DCFlag.Credit, 1000000, '300'),
        ]);
      }

      expect(accounts.find((a) => a.code === '100')!.balance).toBe(100000000);
      expect(accounts.find((a) => a.code === '300')!.balance).toBe(100000000);

      const totals = getAccountTotals(ENTITY_A, accounts);
      expect(totals.debitTotal).toBe(totals.creditTotal);
    });

    it('floating-point precision: many small amounts sum correctly', () => {
      let accounts = [
        makeAccount({ code: '100', type: AccountType.ASSET, balance: 0 }),
        makeAccount({ code: '400', type: AccountType.INCOME, balance: 0 }),
      ];

      // Apply 100 entries of $0.01 each
      for (let i = 0; i < 100; i++) {
        accounts = applyJournalToAccounts(accounts, [
          makeLine(DCFlag.Debit, 0.01, '100'),
          makeLine(DCFlag.Credit, 0.01, '400'),
        ]);
      }

      // Due to floating-point, check within tolerance
      const assetBalance = accounts.find((a) => a.code === '100')!.balance;
      const incomeBalance = accounts.find((a) => a.code === '400')!.balance;

      expect(Math.abs(assetBalance - 1.0)).toBeLessThan(0.005);
      expect(Math.abs(incomeBalance - 1.0)).toBeLessThan(0.005);
      // The key invariant: both sides equal
      expect(assetBalance).toBe(incomeBalance);
    });

    it('mixed debit and credit on same account in one entry computes net effect', () => {
      const accounts = [
        makeAccount({ code: '100', type: AccountType.ASSET, balance: 10000 }),
        makeAccount({ code: '200', type: AccountType.LIABILITY, balance: 5000 }),
        makeAccount({ code: '400', type: AccountType.INCOME, balance: 0 }),
      ];

      // Cash receives both a debit and credit in the same compound entry
      const lines = [
        makeLine(DCFlag.Debit, 8000, '100'),    // +8000 to asset
        makeLine(DCFlag.Credit, 3000, '100'),    // -3000 to asset
        makeLine(DCFlag.Credit, 5000, '400'),    // income
      ];

      // Net effect on cash: +8000 - 3000 = +5000
      const updated = applyJournalToAccounts(accounts, lines);

      expect(updated.find((a) => a.code === '100')!.balance).toBe(15000);
      expect(updated.find((a) => a.code === '400')!.balance).toBe(5000);
    });

    it('account balance can go negative (overdraft scenario)', () => {
      const accounts = [
        makeAccount({ code: '100', type: AccountType.ASSET, balance: 1000 }),
        makeAccount({ code: '500', type: AccountType.EXPENSE, balance: 0 }),
      ];

      // Spend more than available
      const lines = [
        makeLine(DCFlag.Debit, 5000, '500'),
        makeLine(DCFlag.Credit, 5000, '100'),
      ];

      const updated = applyJournalToAccounts(accounts, lines);

      // Asset can go negative (overdraft)
      expect(updated.find((a) => a.code === '100')!.balance).toBe(-4000);
      expect(updated.find((a) => a.code === '500')!.balance).toBe(5000);
    });

    it('inactive accounts are excluded from getAccountTotals', () => {
      const accounts = [
        makeAccount({
          code: '100',
          type: AccountType.ASSET,
          balance: 50000,
        }),
        makeAccount({
          code: '110',
          type: AccountType.ASSET,
          balance: 10000,
        }),
        makeAccount({
          code: '200',
          type: AccountType.LIABILITY,
          balance: 20000,
        }),
        makeAccount({
          code: '300',
          type: AccountType.EQUITY,
          balance: 40000,
        }),
      ];

      // Mark one asset as inactive
      (accounts[1] as any).isActive = false;

      const totals = getAccountTotals(ENTITY_A, accounts);

      // Only active asset should count
      expect(totals.breakdown[AccountType.ASSET]).toBe(50000);
      expect(totals.debitTotal).toBe(50000);
      expect(totals.creditTotal).toBe(60000);
    });

    it('very small fractional amounts: $0.001 entries maintain parity', () => {
      let accounts = [
        makeAccount({ code: '100', type: AccountType.ASSET, balance: 0 }),
        makeAccount({ code: '300', type: AccountType.EQUITY, balance: 0 }),
      ];

      accounts = applyJournalToAccounts(accounts, [
        makeLine(DCFlag.Debit, 0.001, '100'),
        makeLine(DCFlag.Credit, 0.001, '300'),
      ]);

      expect(accounts.find((a) => a.code === '100')!.balance).toBe(0.001);
      expect(accounts.find((a) => a.code === '300')!.balance).toBe(0.001);
    });
  });

  // ------------------------------------------------------------------
  // 10. Normal balance direction rules applied to balance computation
  // ------------------------------------------------------------------
  describe('Normal Balance Direction Rules in Computation', () => {
    it('all five account types respond correctly to debit and credit', () => {
      const testCases: {
        type: AccountType;
        debitEffect: 'increase' | 'decrease';
        creditEffect: 'increase' | 'decrease';
      }[] = [
        { type: AccountType.ASSET, debitEffect: 'increase', creditEffect: 'decrease' },
        { type: AccountType.EXPENSE, debitEffect: 'increase', creditEffect: 'decrease' },
        { type: AccountType.LIABILITY, debitEffect: 'decrease', creditEffect: 'increase' },
        { type: AccountType.EQUITY, debitEffect: 'decrease', creditEffect: 'increase' },
        { type: AccountType.INCOME, debitEffect: 'decrease', creditEffect: 'increase' },
      ];

      testCases.forEach(({ type, debitEffect, creditEffect }) => {
        // Test debit
        const debitAccounts = [
          makeAccount({ code: 'TEST', type, balance: 1000 }),
          makeAccount({
            code: 'CONTRA',
            type: type === AccountType.ASSET || type === AccountType.EXPENSE
              ? AccountType.LIABILITY
              : AccountType.ASSET,
            balance: 1000,
          }),
        ];

        const debitResult = applyJournalToAccounts(debitAccounts, [
          makeLine(DCFlag.Debit, 500, 'TEST'),
          makeLine(DCFlag.Credit, 500, 'CONTRA'),
        ]);

        const debitBalance = debitResult.find((a) => a.code === 'TEST')!.balance;
        if (debitEffect === 'increase') {
          expect(debitBalance).toBe(1500);
        } else {
          expect(debitBalance).toBe(500);
        }

        // Test credit
        const creditAccounts = [
          makeAccount({ code: 'TEST', type, balance: 1000 }),
          makeAccount({
            code: 'CONTRA',
            type: type === AccountType.ASSET || type === AccountType.EXPENSE
              ? AccountType.LIABILITY
              : AccountType.ASSET,
            balance: 1000,
          }),
        ];

        const creditResult = applyJournalToAccounts(creditAccounts, [
          makeLine(DCFlag.Credit, 500, 'TEST'),
          makeLine(DCFlag.Debit, 500, 'CONTRA'),
        ]);

        const creditBalance = creditResult.find((a) => a.code === 'TEST')!.balance;
        if (creditEffect === 'increase') {
          expect(creditBalance).toBe(1500);
        } else {
          expect(creditBalance).toBe(500);
        }
      });
    });
  });
});
