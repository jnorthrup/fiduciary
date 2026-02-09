/**
 * Double-Entry Accounting Rules Tests
 *
 * Validates the fundamental invariant of double-entry bookkeeping:
 *   Total Debits = Total Credits for every journal entry
 *
 * Tests cover:
 * - Journal entry balance validation (debits must equal credits)
 * - Balanced entry posting succeeds
 * - Unbalanced entry posting is rejected
 * - Account balance updates after journal posting
 * - Multi-line journal entries
 * - Balance sheet equation: Assets = Liabilities + Equity + (Income - Expenses)
 * - Atomic balance updates across accounts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import {
  Account,
  AccountType,
  DCFlag,
  JournalEntry,
  JournalLine,
} from '../../types';
import {
  createAccount,
  getAccountTotals,
  getAccountClass,
  getDefaultNormalBalance,
  type CreateAccountInput,
} from '../../services/accountService';

// ============================================================================
// PURE BUSINESS LOGIC (extracted from ledgerService postJournal)
// ============================================================================

/**
 * Validates that a journal entry has equal total debits and credits.
 * This is the fundamental invariant of double-entry bookkeeping.
 */
function validateJournalBalance(lines: Pick<JournalLine, 'dc' | 'amount'>[]): {
  isBalanced: boolean;
  totalDebits: number;
  totalCredits: number;
  difference: number;
} {
  let totalDebits = 0;
  let totalCredits = 0;

  for (const line of lines) {
    if (line.amount < 0) {
      return { isBalanced: false, totalDebits, totalCredits, difference: NaN };
    }
    if (line.dc === DCFlag.Debit) {
      totalDebits += line.amount;
    } else if (line.dc === DCFlag.Credit) {
      totalCredits += line.amount;
    }
  }

  // Use epsilon comparison for floating-point precision
  const difference = Math.abs(totalDebits - totalCredits);
  const isBalanced = difference < 0.005; // Half-cent tolerance

  return { isBalanced, totalDebits, totalCredits, difference };
}

/**
 * Constructs a journal entry from input data, enforcing the balanced invariant.
 * Returns null with an error if the entry is unbalanced.
 */
function createJournalEntry(
  entityId: string,
  date: string,
  memo: string,
  type: string,
  lines: Omit<JournalLine, 'id'>[]
): { entry: JournalEntry | null; error: string | null } {
  const validation = validateJournalBalance(lines);

  if (!validation.isBalanced) {
    return {
      entry: null,
      error: `Journal entry is not balanced: debits=${validation.totalDebits}, credits=${validation.totalCredits}, difference=${validation.difference}`,
    };
  }

  if (lines.length < 2) {
    return {
      entry: null,
      error: 'Journal entry must have at least two lines',
    };
  }

  const entry: JournalEntry = {
    id: uuidv4(),
    entityId,
    date,
    memo,
    type,
    lines: lines.map((l) => ({ ...l, id: uuidv4() })),
    locked: true,
    _version: '1',
  };

  return { entry, error: null };
}

/**
 * Computes updated account balances after posting a journal entry.
 * Mirrors the logic in ledgerService.ts postJournal.
 *
 * Rules:
 * - Asset/Expense accounts: Debit increases balance, Credit decreases balance
 * - Liability/Equity/Income accounts: Credit increases balance, Debit decreases balance
 */
function computeBalanceUpdates(
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
        // Debit-normal accounts: debit increases, credit decreases
        change += l.dc === DCFlag.Debit ? l.amount : -l.amount;
      } else {
        // Credit-normal accounts: credit increases, debit decreases
        change += l.dc === DCFlag.Credit ? l.amount : -l.amount;
      }
    });

    return { ...acc, balance: acc.balance + change };
  });
}

// ============================================================================
// TEST FIXTURES
// ============================================================================

const TEST_ENTITY_ID = 'entity-test-001';

function makeAccount(overrides: Partial<Account> & { code: string; type: AccountType }): Account {
  const type = overrides.type;
  return {
    id: overrides.id || uuidv4(),
    entityId: overrides.entityId || TEST_ENTITY_ID,
    code: overrides.code,
    name: overrides.name || `Account ${overrides.code}`,
    type,
    normalBalance: getDefaultNormalBalance(type),
    balance: overrides.balance ?? 0,
    accountClass: getAccountClass(type),
    isActive: overrides.isActive ?? true,
    _version: '1',
  };
}

function makeLine(
  dc: DCFlag,
  amount: number,
  accountCode: string,
  accountName?: string
): Omit<JournalLine, 'id'> {
  return {
    accountCode,
    accountName: accountName || `Account ${accountCode}`,
    dc,
    amount,
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe('Double-Entry Accounting Rules', () => {
  describe('Journal Balance Validation', () => {
    it('accepts a balanced two-line entry (debit = credit)', () => {
      const lines = [
        makeLine(DCFlag.Debit, 1000, '101000'),
        makeLine(DCFlag.Credit, 1000, '201000'),
      ];

      const result = validateJournalBalance(lines);

      expect(result.isBalanced).toBe(true);
      expect(result.totalDebits).toBe(1000);
      expect(result.totalCredits).toBe(1000);
      expect(result.difference).toBeLessThan(0.005);
    });

    it('rejects an unbalanced entry (debit != credit)', () => {
      const lines = [
        makeLine(DCFlag.Debit, 1000, '101000'),
        makeLine(DCFlag.Credit, 500, '201000'),
      ];

      const result = validateJournalBalance(lines);

      expect(result.isBalanced).toBe(false);
      expect(result.totalDebits).toBe(1000);
      expect(result.totalCredits).toBe(500);
      expect(result.difference).toBe(500);
    });

    it('accepts a multi-line balanced entry', () => {
      // Payroll example: 50000 debit labor = 40000 credit cash + 10000 credit tax
      const lines = [
        makeLine(DCFlag.Debit, 50000, '510000', 'Labor Exp'),
        makeLine(DCFlag.Credit, 40000, '101000', 'Cash'),
        makeLine(DCFlag.Credit, 10000, '210000', 'Tax Liab'),
      ];

      const result = validateJournalBalance(lines);

      expect(result.isBalanced).toBe(true);
      expect(result.totalDebits).toBe(50000);
      expect(result.totalCredits).toBe(50000);
    });

    it('rejects a multi-line unbalanced entry', () => {
      const lines = [
        makeLine(DCFlag.Debit, 50000, '510000'),
        makeLine(DCFlag.Credit, 40000, '101000'),
        makeLine(DCFlag.Credit, 9000, '210000'), // Short by 1000
      ];

      const result = validateJournalBalance(lines);

      expect(result.isBalanced).toBe(false);
      expect(result.difference).toBe(1000);
    });

    it('handles zero-amount lines', () => {
      const lines = [
        makeLine(DCFlag.Debit, 0, '101000'),
        makeLine(DCFlag.Credit, 0, '201000'),
      ];

      const result = validateJournalBalance(lines);

      expect(result.isBalanced).toBe(true);
      expect(result.totalDebits).toBe(0);
      expect(result.totalCredits).toBe(0);
    });

    it('rejects negative amounts', () => {
      const lines = [
        makeLine(DCFlag.Debit, -100, '101000'),
        makeLine(DCFlag.Credit, -100, '201000'),
      ];

      const result = validateJournalBalance(lines);

      expect(result.isBalanced).toBe(false);
    });

    it('handles floating-point precision within tolerance', () => {
      // 10.10 + 10.20 = 20.30 (potential floating-point issue)
      const lines = [
        makeLine(DCFlag.Debit, 10.10, '101000'),
        makeLine(DCFlag.Debit, 10.20, '102000'),
        makeLine(DCFlag.Credit, 20.30, '201000'),
      ];

      const result = validateJournalBalance(lines);

      expect(result.isBalanced).toBe(true);
    });

    it('accepts compound entry with multiple debits and credits', () => {
      // Asset acquisition with multiple funding sources
      const lines = [
        makeLine(DCFlag.Debit, 100000, '150000', 'Property'),
        makeLine(DCFlag.Debit, 5000, '160000', 'Closing Costs'),
        makeLine(DCFlag.Credit, 80000, '250000', 'Mortgage Payable'),
        makeLine(DCFlag.Credit, 25000, '101000', 'Cash'),
      ];

      const result = validateJournalBalance(lines);

      expect(result.isBalanced).toBe(true);
      expect(result.totalDebits).toBe(105000);
      expect(result.totalCredits).toBe(105000);
    });

    it('handles empty lines array', () => {
      const result = validateJournalBalance([]);

      expect(result.isBalanced).toBe(true);
      expect(result.totalDebits).toBe(0);
      expect(result.totalCredits).toBe(0);
    });
  });

  describe('Journal Entry Creation', () => {
    it('creates a balanced journal entry successfully', () => {
      const lines = [
        makeLine(DCFlag.Debit, 5000, '101000', 'Cash'),
        makeLine(DCFlag.Credit, 5000, '400000', 'Revenue'),
      ];

      const { entry, error } = createJournalEntry(
        TEST_ENTITY_ID,
        '2026-01-15',
        'Cash sale',
        'REVENUE',
        lines
      );

      expect(error).toBeNull();
      expect(entry).not.toBeNull();
      expect(entry!.entityId).toBe(TEST_ENTITY_ID);
      expect(entry!.date).toBe('2026-01-15');
      expect(entry!.memo).toBe('Cash sale');
      expect(entry!.type).toBe('REVENUE');
      expect(entry!.lines).toHaveLength(2);
      expect(entry!.locked).toBe(true);
      expect(entry!.id).toBeDefined();
      expect(entry!.lines[0].id).toBeDefined();
      expect(entry!.lines[1].id).toBeDefined();
    });

    it('rejects an unbalanced journal entry', () => {
      const lines = [
        makeLine(DCFlag.Debit, 5000, '101000', 'Cash'),
        makeLine(DCFlag.Credit, 3000, '400000', 'Revenue'),
      ];

      const { entry, error } = createJournalEntry(
        TEST_ENTITY_ID,
        '2026-01-15',
        'Bad entry',
        'REVENUE',
        lines
      );

      expect(entry).toBeNull();
      expect(error).not.toBeNull();
      expect(error).toContain('not balanced');
      expect(error).toContain('5000');
      expect(error).toContain('3000');
    });

    it('rejects a journal entry with fewer than two lines', () => {
      const lines = [makeLine(DCFlag.Debit, 0, '101000', 'Cash')];

      const { entry, error } = createJournalEntry(
        TEST_ENTITY_ID,
        '2026-01-15',
        'Single line',
        'OTHER',
        lines
      );

      expect(entry).toBeNull();
      expect(error).toContain('at least two lines');
    });

    it('assigns unique IDs to each journal line', () => {
      const lines = [
        makeLine(DCFlag.Debit, 1000, '101000', 'Cash'),
        makeLine(DCFlag.Credit, 500, '201000', 'AP'),
        makeLine(DCFlag.Credit, 500, '210000', 'Tax Liab'),
      ];

      const { entry } = createJournalEntry(
        TEST_ENTITY_ID,
        '2026-01-15',
        'Split payment',
        'PAYMENT',
        lines
      );

      expect(entry).not.toBeNull();
      const lineIds = entry!.lines.map((l) => l.id);
      const uniqueIds = new Set(lineIds);
      expect(uniqueIds.size).toBe(lineIds.length);
    });
  });

  describe('Account Balance Updates', () => {
    let accounts: Account[];

    beforeEach(() => {
      accounts = [
        makeAccount({ code: '101000', type: AccountType.ASSET, name: 'Cash', balance: 10000 }),
        makeAccount({ code: '120000', type: AccountType.ASSET, name: 'Accounts Receivable', balance: 5000 }),
        makeAccount({ code: '201000', type: AccountType.LIABILITY, name: 'Accounts Payable', balance: 3000 }),
        makeAccount({ code: '300000', type: AccountType.EQUITY, name: 'Retained Earnings', balance: 8000 }),
        makeAccount({ code: '400000', type: AccountType.INCOME, name: 'Revenue', balance: 6000 }),
        makeAccount({ code: '510000', type: AccountType.EXPENSE, name: 'Operating Expenses', balance: 2000 }),
      ];
    });

    it('increases asset account on debit', () => {
      const lines: JournalLine[] = [
        { id: '1', accountCode: '101000', accountName: 'Cash', dc: DCFlag.Debit, amount: 1000 },
        { id: '2', accountCode: '400000', accountName: 'Revenue', dc: DCFlag.Credit, amount: 1000 },
      ];

      const updated = computeBalanceUpdates(accounts, lines);
      const cash = updated.find((a) => a.code === '101000')!;

      expect(cash.balance).toBe(11000); // 10000 + 1000
    });

    it('decreases asset account on credit', () => {
      const lines: JournalLine[] = [
        { id: '1', accountCode: '510000', accountName: 'Expenses', dc: DCFlag.Debit, amount: 500 },
        { id: '2', accountCode: '101000', accountName: 'Cash', dc: DCFlag.Credit, amount: 500 },
      ];

      const updated = computeBalanceUpdates(accounts, lines);
      const cash = updated.find((a) => a.code === '101000')!;

      expect(cash.balance).toBe(9500); // 10000 - 500
    });

    it('increases liability account on credit', () => {
      const lines: JournalLine[] = [
        { id: '1', accountCode: '510000', accountName: 'Expenses', dc: DCFlag.Debit, amount: 2000 },
        { id: '2', accountCode: '201000', accountName: 'AP', dc: DCFlag.Credit, amount: 2000 },
      ];

      const updated = computeBalanceUpdates(accounts, lines);
      const ap = updated.find((a) => a.code === '201000')!;

      expect(ap.balance).toBe(5000); // 3000 + 2000
    });

    it('decreases liability account on debit', () => {
      const lines: JournalLine[] = [
        { id: '1', accountCode: '201000', accountName: 'AP', dc: DCFlag.Debit, amount: 1000 },
        { id: '2', accountCode: '101000', accountName: 'Cash', dc: DCFlag.Credit, amount: 1000 },
      ];

      const updated = computeBalanceUpdates(accounts, lines);
      const ap = updated.find((a) => a.code === '201000')!;

      expect(ap.balance).toBe(2000); // 3000 - 1000
    });

    it('increases income account on credit', () => {
      const lines: JournalLine[] = [
        { id: '1', accountCode: '101000', accountName: 'Cash', dc: DCFlag.Debit, amount: 3000 },
        { id: '2', accountCode: '400000', accountName: 'Revenue', dc: DCFlag.Credit, amount: 3000 },
      ];

      const updated = computeBalanceUpdates(accounts, lines);
      const revenue = updated.find((a) => a.code === '400000')!;

      expect(revenue.balance).toBe(9000); // 6000 + 3000
    });

    it('increases expense account on debit', () => {
      const lines: JournalLine[] = [
        { id: '1', accountCode: '510000', accountName: 'Expenses', dc: DCFlag.Debit, amount: 1500 },
        { id: '2', accountCode: '101000', accountName: 'Cash', dc: DCFlag.Credit, amount: 1500 },
      ];

      const updated = computeBalanceUpdates(accounts, lines);
      const expenses = updated.find((a) => a.code === '510000')!;

      expect(expenses.balance).toBe(3500); // 2000 + 1500
    });

    it('does not modify accounts not referenced in journal lines', () => {
      const lines: JournalLine[] = [
        { id: '1', accountCode: '101000', accountName: 'Cash', dc: DCFlag.Debit, amount: 100 },
        { id: '2', accountCode: '400000', accountName: 'Revenue', dc: DCFlag.Credit, amount: 100 },
      ];

      const updated = computeBalanceUpdates(accounts, lines);
      const ar = updated.find((a) => a.code === '120000')!;
      const ap = updated.find((a) => a.code === '201000')!;
      const equity = updated.find((a) => a.code === '300000')!;
      const expenses = updated.find((a) => a.code === '510000')!;

      expect(ar.balance).toBe(5000);
      expect(ap.balance).toBe(3000);
      expect(equity.balance).toBe(8000);
      expect(expenses.balance).toBe(2000);
    });

    it('handles multi-line payroll journal entry', () => {
      // Classic payroll entry:
      //   Debit: Labor Expense  50,000
      //   Credit: Cash          40,000
      //   Credit: Tax Liability 10,000
      const payrollAccounts = [
        makeAccount({ code: '510000', type: AccountType.EXPENSE, name: 'Labor', balance: 0 }),
        makeAccount({ code: '101000', type: AccountType.ASSET, name: 'Cash', balance: 100000 }),
        makeAccount({ code: '210000', type: AccountType.LIABILITY, name: 'Tax Liab', balance: 0 }),
      ];

      const lines: JournalLine[] = [
        { id: '1', accountCode: '510000', accountName: 'Labor', dc: DCFlag.Debit, amount: 50000 },
        { id: '2', accountCode: '101000', accountName: 'Cash', dc: DCFlag.Credit, amount: 40000 },
        { id: '3', accountCode: '210000', accountName: 'Tax Liab', dc: DCFlag.Credit, amount: 10000 },
      ];

      const updated = computeBalanceUpdates(payrollAccounts, lines);

      expect(updated.find((a) => a.code === '510000')!.balance).toBe(50000);
      expect(updated.find((a) => a.code === '101000')!.balance).toBe(60000); // 100000 - 40000
      expect(updated.find((a) => a.code === '210000')!.balance).toBe(10000);
    });

    it('applies multiple journal entries sequentially', () => {
      let currentAccounts = [
        makeAccount({ code: '101000', type: AccountType.ASSET, name: 'Cash', balance: 0 }),
        makeAccount({ code: '300000', type: AccountType.EQUITY, name: 'Capital', balance: 0 }),
        makeAccount({ code: '400000', type: AccountType.INCOME, name: 'Revenue', balance: 0 }),
        makeAccount({ code: '510000', type: AccountType.EXPENSE, name: 'Rent', balance: 0 }),
      ];

      // Entry 1: Owner invests $50,000
      const invest: JournalLine[] = [
        { id: '1', accountCode: '101000', accountName: 'Cash', dc: DCFlag.Debit, amount: 50000 },
        { id: '2', accountCode: '300000', accountName: 'Capital', dc: DCFlag.Credit, amount: 50000 },
      ];
      currentAccounts = computeBalanceUpdates(currentAccounts, invest);

      expect(currentAccounts.find((a) => a.code === '101000')!.balance).toBe(50000);
      expect(currentAccounts.find((a) => a.code === '300000')!.balance).toBe(50000);

      // Entry 2: Earn revenue $10,000
      const revenue: JournalLine[] = [
        { id: '3', accountCode: '101000', accountName: 'Cash', dc: DCFlag.Debit, amount: 10000 },
        { id: '4', accountCode: '400000', accountName: 'Revenue', dc: DCFlag.Credit, amount: 10000 },
      ];
      currentAccounts = computeBalanceUpdates(currentAccounts, revenue);

      expect(currentAccounts.find((a) => a.code === '101000')!.balance).toBe(60000);
      expect(currentAccounts.find((a) => a.code === '400000')!.balance).toBe(10000);

      // Entry 3: Pay rent $3,000
      const rent: JournalLine[] = [
        { id: '5', accountCode: '510000', accountName: 'Rent', dc: DCFlag.Debit, amount: 3000 },
        { id: '6', accountCode: '101000', accountName: 'Cash', dc: DCFlag.Credit, amount: 3000 },
      ];
      currentAccounts = computeBalanceUpdates(currentAccounts, rent);

      expect(currentAccounts.find((a) => a.code === '101000')!.balance).toBe(57000);
      expect(currentAccounts.find((a) => a.code === '510000')!.balance).toBe(3000);
    });
  });

  describe('Balance Sheet Equation: Assets = Liabilities + Equity', () => {
    it('maintains balance sheet equation after a simple transaction', () => {
      const accounts = [
        makeAccount({ code: '101000', type: AccountType.ASSET, name: 'Cash', balance: 100000 }),
        makeAccount({ code: '201000', type: AccountType.LIABILITY, name: 'Loans', balance: 40000 }),
        makeAccount({ code: '300000', type: AccountType.EQUITY, name: 'Capital', balance: 60000 }),
      ];

      // Before: Assets(100000) = Liabilities(40000) + Equity(60000)
      const totalsBefore = getAccountTotals(TEST_ENTITY_ID, accounts);
      expect(totalsBefore.breakdown[AccountType.ASSET]).toBe(
        totalsBefore.breakdown[AccountType.LIABILITY] + totalsBefore.breakdown[AccountType.EQUITY]
      );

      // Post a balanced entry: borrow $20,000
      const lines: JournalLine[] = [
        { id: '1', accountCode: '101000', accountName: 'Cash', dc: DCFlag.Debit, amount: 20000 },
        { id: '2', accountCode: '201000', accountName: 'Loans', dc: DCFlag.Credit, amount: 20000 },
      ];

      const updated = computeBalanceUpdates(accounts, lines);
      const totalsAfter = getAccountTotals(TEST_ENTITY_ID, updated);

      // After: Assets(120000) = Liabilities(60000) + Equity(60000)
      expect(totalsAfter.breakdown[AccountType.ASSET]).toBe(
        totalsAfter.breakdown[AccountType.LIABILITY] + totalsAfter.breakdown[AccountType.EQUITY]
      );
      expect(totalsAfter.breakdown[AccountType.ASSET]).toBe(120000);
      expect(totalsAfter.breakdown[AccountType.LIABILITY]).toBe(60000);
      expect(totalsAfter.breakdown[AccountType.EQUITY]).toBe(60000);
    });

    it('maintains extended equation: Assets = Liabilities + Equity + (Income - Expenses)', () => {
      const accounts = [
        makeAccount({ code: '101000', type: AccountType.ASSET, name: 'Cash', balance: 50000 }),
        makeAccount({ code: '201000', type: AccountType.LIABILITY, name: 'AP', balance: 10000 }),
        makeAccount({ code: '300000', type: AccountType.EQUITY, name: 'Capital', balance: 30000 }),
        makeAccount({ code: '400000', type: AccountType.INCOME, name: 'Revenue', balance: 15000 }),
        makeAccount({ code: '510000', type: AccountType.EXPENSE, name: 'Expenses', balance: 5000 }),
      ];

      // Extended equation check:
      // Assets(50000) = Liabilities(10000) + Equity(30000) + Income(15000) - Expenses(5000)
      // 50000 = 10000 + 30000 + 15000 - 5000 = 50000
      const totals = getAccountTotals(TEST_ENTITY_ID, accounts);
      const netIncome =
        totals.breakdown[AccountType.INCOME] - totals.breakdown[AccountType.EXPENSE];
      expect(totals.breakdown[AccountType.ASSET]).toBe(
        totals.breakdown[AccountType.LIABILITY] +
          totals.breakdown[AccountType.EQUITY] +
          netIncome
      );
    });

    it('maintains equation after multiple balanced entries', () => {
      let accounts = [
        makeAccount({ code: '101000', type: AccountType.ASSET, name: 'Cash', balance: 0 }),
        makeAccount({ code: '120000', type: AccountType.ASSET, name: 'Equipment', balance: 0 }),
        makeAccount({ code: '201000', type: AccountType.LIABILITY, name: 'Loan', balance: 0 }),
        makeAccount({ code: '300000', type: AccountType.EQUITY, name: 'Capital', balance: 0 }),
        makeAccount({ code: '400000', type: AccountType.INCOME, name: 'Revenue', balance: 0 }),
        makeAccount({ code: '510000', type: AccountType.EXPENSE, name: 'Rent', balance: 0 }),
      ];

      // Transaction 1: Owner invests $100,000
      accounts = computeBalanceUpdates(accounts, [
        { id: '1', accountCode: '101000', accountName: 'Cash', dc: DCFlag.Debit, amount: 100000 },
        { id: '2', accountCode: '300000', accountName: 'Capital', dc: DCFlag.Credit, amount: 100000 },
      ]);

      // Transaction 2: Buy equipment for $30,000
      accounts = computeBalanceUpdates(accounts, [
        { id: '3', accountCode: '120000', accountName: 'Equipment', dc: DCFlag.Debit, amount: 30000 },
        { id: '4', accountCode: '101000', accountName: 'Cash', dc: DCFlag.Credit, amount: 30000 },
      ]);

      // Transaction 3: Borrow $20,000
      accounts = computeBalanceUpdates(accounts, [
        { id: '5', accountCode: '101000', accountName: 'Cash', dc: DCFlag.Debit, amount: 20000 },
        { id: '6', accountCode: '201000', accountName: 'Loan', dc: DCFlag.Credit, amount: 20000 },
      ]);

      // Transaction 4: Earn revenue $15,000
      accounts = computeBalanceUpdates(accounts, [
        { id: '7', accountCode: '101000', accountName: 'Cash', dc: DCFlag.Debit, amount: 15000 },
        { id: '8', accountCode: '400000', accountName: 'Revenue', dc: DCFlag.Credit, amount: 15000 },
      ]);

      // Transaction 5: Pay rent $4,000
      accounts = computeBalanceUpdates(accounts, [
        { id: '9', accountCode: '510000', accountName: 'Rent', dc: DCFlag.Debit, amount: 4000 },
        { id: '10', accountCode: '101000', accountName: 'Cash', dc: DCFlag.Credit, amount: 4000 },
      ]);

      // Verify final balances
      const cash = accounts.find((a) => a.code === '101000')!;
      const equipment = accounts.find((a) => a.code === '120000')!;
      const loan = accounts.find((a) => a.code === '201000')!;
      const capital = accounts.find((a) => a.code === '300000')!;
      const revenue = accounts.find((a) => a.code === '400000')!;
      const rent = accounts.find((a) => a.code === '510000')!;

      expect(cash.balance).toBe(101000); // 0 + 100000 - 30000 + 20000 + 15000 - 4000
      expect(equipment.balance).toBe(30000);
      expect(loan.balance).toBe(20000);
      expect(capital.balance).toBe(100000);
      expect(revenue.balance).toBe(15000);
      expect(rent.balance).toBe(4000);

      // Extended equation: Assets = Liabilities + Equity + (Income - Expenses)
      const totalAssets = cash.balance + equipment.balance; // 131000
      const totalLiabilities = loan.balance; // 20000
      const totalEquity = capital.balance; // 100000
      const netIncome = revenue.balance - rent.balance; // 11000

      expect(totalAssets).toBe(totalLiabilities + totalEquity + netIncome);
      expect(totalAssets).toBe(131000);

      // Also verify via getAccountTotals
      const totals = getAccountTotals(TEST_ENTITY_ID, accounts);
      expect(totals.debitTotal).toBe(totals.creditTotal);
    });

    it('accounting equation holds: debitTotal == creditTotal (trial balance)', () => {
      const accounts = [
        makeAccount({ code: '101000', type: AccountType.ASSET, name: 'Cash', balance: 25000 }),
        makeAccount({ code: '120000', type: AccountType.ASSET, name: 'AR', balance: 8000 }),
        makeAccount({ code: '201000', type: AccountType.LIABILITY, name: 'AP', balance: 5000 }),
        makeAccount({ code: '220000', type: AccountType.LIABILITY, name: 'Loans', balance: 12000 }),
        makeAccount({ code: '300000', type: AccountType.EQUITY, name: 'Capital', balance: 10000 }),
        makeAccount({ code: '400000', type: AccountType.INCOME, name: 'Revenue', balance: 9000 }),
        makeAccount({ code: '510000', type: AccountType.EXPENSE, name: 'Wages', balance: 3000 }),
      ];

      const totals = getAccountTotals(TEST_ENTITY_ID, accounts);

      // Trial balance: sum of debit balances = sum of credit balances
      // Debit accounts (Asset + Expense): 25000 + 8000 + 3000 = 36000
      // Credit accounts (Liability + Equity + Income): 5000 + 12000 + 10000 + 9000 = 36000
      expect(totals.debitTotal).toBe(36000);
      expect(totals.creditTotal).toBe(36000);
      expect(totals.debitTotal).toBe(totals.creditTotal);
    });
  });

  describe('Edge Cases and Invariant Guarantees', () => {
    it('a balanced entry preserves the trial balance', () => {
      const accounts = [
        makeAccount({ code: '101000', type: AccountType.ASSET, name: 'Cash', balance: 10000 }),
        makeAccount({ code: '201000', type: AccountType.LIABILITY, name: 'AP', balance: 5000 }),
        makeAccount({ code: '300000', type: AccountType.EQUITY, name: 'Equity', balance: 5000 }),
      ];

      const totalsBefore = getAccountTotals(TEST_ENTITY_ID, accounts);
      expect(totalsBefore.debitTotal).toBe(totalsBefore.creditTotal);

      // Post a balanced entry
      const lines: JournalLine[] = [
        { id: '1', accountCode: '201000', accountName: 'AP', dc: DCFlag.Debit, amount: 2000 },
        { id: '2', accountCode: '101000', accountName: 'Cash', dc: DCFlag.Credit, amount: 2000 },
      ];

      const validation = validateJournalBalance(lines);
      expect(validation.isBalanced).toBe(true);

      const updated = computeBalanceUpdates(accounts, lines);
      const totalsAfter = getAccountTotals(TEST_ENTITY_ID, updated);

      expect(totalsAfter.debitTotal).toBe(totalsAfter.creditTotal);
    });

    it('handles large transaction amounts', () => {
      const accounts = [
        makeAccount({ code: '101000', type: AccountType.ASSET, name: 'Cash', balance: 0 }),
        makeAccount({ code: '300000', type: AccountType.EQUITY, name: 'Capital', balance: 0 }),
      ];

      const largeAmount = 999999999.99;
      const lines: JournalLine[] = [
        { id: '1', accountCode: '101000', accountName: 'Cash', dc: DCFlag.Debit, amount: largeAmount },
        { id: '2', accountCode: '300000', accountName: 'Capital', dc: DCFlag.Credit, amount: largeAmount },
      ];

      const validation = validateJournalBalance(lines);
      expect(validation.isBalanced).toBe(true);

      const updated = computeBalanceUpdates(accounts, lines);
      expect(updated.find((a) => a.code === '101000')!.balance).toBe(largeAmount);
      expect(updated.find((a) => a.code === '300000')!.balance).toBe(largeAmount);
    });

    it('handles fractional cent amounts', () => {
      const lines = [
        makeLine(DCFlag.Debit, 33.33, '101000'),
        makeLine(DCFlag.Debit, 33.33, '102000'),
        makeLine(DCFlag.Debit, 33.34, '103000'),
        makeLine(DCFlag.Credit, 100.00, '400000'),
      ];

      const validation = validateJournalBalance(lines);
      expect(validation.isBalanced).toBe(true);
    });

    it('journal line amounts must match account codes for proper routing', () => {
      const accounts = [
        makeAccount({ code: '101000', type: AccountType.ASSET, name: 'Cash', balance: 5000 }),
        makeAccount({ code: '400000', type: AccountType.INCOME, name: 'Revenue', balance: 0 }),
        makeAccount({ code: '999000', type: AccountType.ASSET, name: 'Unrelated', balance: 1000 }),
      ];

      const lines: JournalLine[] = [
        { id: '1', accountCode: '101000', accountName: 'Cash', dc: DCFlag.Debit, amount: 500 },
        { id: '2', accountCode: '400000', accountName: 'Revenue', dc: DCFlag.Credit, amount: 500 },
      ];

      const updated = computeBalanceUpdates(accounts, lines);

      // Only referenced accounts should change
      expect(updated.find((a) => a.code === '101000')!.balance).toBe(5500);
      expect(updated.find((a) => a.code === '400000')!.balance).toBe(500);
      expect(updated.find((a) => a.code === '999000')!.balance).toBe(1000); // unchanged
    });

    it('equity account increases on credit (owner investment)', () => {
      const accounts = [
        makeAccount({ code: '101000', type: AccountType.ASSET, name: 'Cash', balance: 0 }),
        makeAccount({ code: '300000', type: AccountType.EQUITY, name: 'Capital', balance: 0 }),
      ];

      const lines: JournalLine[] = [
        { id: '1', accountCode: '101000', accountName: 'Cash', dc: DCFlag.Debit, amount: 75000 },
        { id: '2', accountCode: '300000', accountName: 'Capital', dc: DCFlag.Credit, amount: 75000 },
      ];

      const updated = computeBalanceUpdates(accounts, lines);

      expect(updated.find((a) => a.code === '101000')!.balance).toBe(75000);
      expect(updated.find((a) => a.code === '300000')!.balance).toBe(75000);

      // Balance sheet holds
      const totals = getAccountTotals(TEST_ENTITY_ID, updated);
      expect(totals.debitTotal).toBe(totals.creditTotal);
    });

    it('discharge entry (debit liability, credit equity) maintains equation', () => {
      // Real scenario from the codebase: executeClosing posts a DISCHARGE entry
      const accounts = [
        makeAccount({ code: '250000', type: AccountType.LIABILITY, name: 'Mortgage', balance: 200000 }),
        makeAccount({ code: '300000', type: AccountType.EQUITY, name: 'Equity', balance: 50000 }),
        makeAccount({ code: '101000', type: AccountType.ASSET, name: 'Cash', balance: 250000 }),
      ];

      const lines: JournalLine[] = [
        { id: '1', accountCode: '250000', accountName: 'Mortgage', dc: DCFlag.Debit, amount: 200000 },
        { id: '2', accountCode: '300000', accountName: 'Equity', dc: DCFlag.Credit, amount: 200000 },
      ];

      const validation = validateJournalBalance(lines);
      expect(validation.isBalanced).toBe(true);

      const updated = computeBalanceUpdates(accounts, lines);

      expect(updated.find((a) => a.code === '250000')!.balance).toBe(0); // Mortgage discharged
      expect(updated.find((a) => a.code === '300000')!.balance).toBe(250000); // Equity increased

      const totals = getAccountTotals(TEST_ENTITY_ID, updated);
      expect(totals.debitTotal).toBe(totals.creditTotal);
    });
  });

  describe('Normal Balance Rules by Account Type', () => {
    it('asset accounts have debit normal balance', () => {
      expect(getDefaultNormalBalance(AccountType.ASSET)).toBe(DCFlag.Debit);
      expect(getAccountClass(AccountType.ASSET)).toBe('Debit');
    });

    it('liability accounts have credit normal balance', () => {
      expect(getDefaultNormalBalance(AccountType.LIABILITY)).toBe(DCFlag.Credit);
      expect(getAccountClass(AccountType.LIABILITY)).toBe('Credit');
    });

    it('equity accounts have credit normal balance', () => {
      expect(getDefaultNormalBalance(AccountType.EQUITY)).toBe(DCFlag.Credit);
      expect(getAccountClass(AccountType.EQUITY)).toBe('Credit');
    });

    it('income accounts have credit normal balance', () => {
      expect(getDefaultNormalBalance(AccountType.INCOME)).toBe(DCFlag.Credit);
      expect(getAccountClass(AccountType.INCOME)).toBe('Credit');
    });

    it('expense accounts have debit normal balance', () => {
      expect(getDefaultNormalBalance(AccountType.EXPENSE)).toBe(DCFlag.Debit);
      expect(getAccountClass(AccountType.EXPENSE)).toBe('Debit');
    });
  });
});
