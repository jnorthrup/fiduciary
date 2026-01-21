/**
 * Account Service Tests
 * Tests for account CRUD operations, validation, and hierarchy queries
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createAccount,
  updateAccount,
  deleteAccount,
  getAccount,
  getAccounts,
  getAccountHierarchy,
  getAccountTotals,
  getCreditAccounts,
  getDebitAccounts,
  getActiveAccounts,
  getAccountClass,
  getDefaultNormalBalance,
  validateAccountInput,
  validateAccountUpdate,
  type CreateAccountInput,
  type UpdateAccountInput,
  type AccountFilters
} from './accountService';
import { Account, AccountType, DCFlag, AccountClass } from '../types';

// Test fixtures
const testEntityId = 'entity-001';

const createTestAccount = (overrides: Partial<Account> = {}): Account => {
  const type = overrides.type || AccountType.ASSET;
  const accountClass = getAccountClass(type);
  const normalBalance = getDefaultNormalBalance(type);

  return {
    id: `acc-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    entityId: testEntityId,
    code: '1000',
    name: 'Test Account',
    type,
    normalBalance,
    balance: 0,
    beginningBalance: 0,
    accountClass,
    isActive: true,
    createdAt: new Date().toISOString(),
    _version: '1',
    ...overrides
  };
};

describe('accountService', () => {
  let existingAccounts: Account[];

  beforeEach(() => {
    existingAccounts = [];
  });

  describe('Account Class Determination', () => {
    it('classifies Asset and Expense as Debit accounts', () => {
      expect(getAccountClass(AccountType.ASSET)).toBe('Debit');
      expect(getAccountClass(AccountType.EXPENSE)).toBe('Debit');
    });

    it('classifies Liability, Equity, Income as Credit accounts', () => {
      expect(getAccountClass(AccountType.LIABILITY)).toBe('Credit');
      expect(getAccountClass(AccountType.EQUITY)).toBe('Credit');
      expect(getAccountClass(AccountType.INCOME)).toBe('Credit');
    });

    it('returns correct normal balance for account types', () => {
      expect(getDefaultNormalBalance(AccountType.ASSET)).toBe(DCFlag.Debit);
      expect(getDefaultNormalBalance(AccountType.EXPENSE)).toBe(DCFlag.Debit);
      expect(getDefaultNormalBalance(AccountType.LIABILITY)).toBe(DCFlag.Credit);
      expect(getDefaultNormalBalance(AccountType.EQUITY)).toBe(DCFlag.Credit);
      expect(getDefaultNormalBalance(AccountType.INCOME)).toBe(DCFlag.Credit);
    });
  });

  describe('Account Creation', () => {
    it('creates a valid account', () => {
      const input: CreateAccountInput = {
        entityId: testEntityId,
        code: '1000',
        name: 'Cash',
        type: AccountType.ASSET
      };

      const result = createAccount(input, existingAccounts);

      expect(result.errors).toHaveLength(0);
      expect(result.account).toBeDefined();
      expect(result.account.code).toBe('1000');
      expect(result.account.name).toBe('Cash');
      expect(result.account.type).toBe(AccountType.ASSET);
      expect(result.account.accountClass).toBe('Debit');
      expect(result.account.normalBalance).toBe(DCFlag.Debit);
      expect(result.account.isActive).toBe(true);
    });

    it('rejects account with missing code', () => {
      const input: CreateAccountInput = {
        entityId: testEntityId,
        code: '',
        name: 'Test',
        type: AccountType.ASSET
      };

      const result = createAccount(input, existingAccounts);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.field === 'code')).toBe(true);
    });

    it('rejects account with missing name', () => {
      const input: CreateAccountInput = {
        entityId: testEntityId,
        code: '1000',
        name: '',
        type: AccountType.ASSET
      };

      const result = createAccount(input, existingAccounts);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.field === 'name')).toBe(true);
    });

    it('rejects duplicate account code within entity', () => {
      existingAccounts.push(createTestAccount({ code: '1000' }));

      const input: CreateAccountInput = {
        entityId: testEntityId,
        code: '1000',
        name: 'Duplicate',
        type: AccountType.ASSET
      };

      const result = createAccount(input, existingAccounts);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.message.includes('already exists'))).toBe(true);
    });

    it('allows same code in different entity', () => {
      existingAccounts.push(createTestAccount({ code: '1000', entityId: 'other-entity' }));

      const input: CreateAccountInput = {
        entityId: testEntityId,
        code: '1000',
        name: 'Cash',
        type: AccountType.ASSET
      };

      const result = createAccount(input, existingAccounts);

      expect(result.errors).toHaveLength(0);
    });

    it('validates parent account exists', () => {
      const input: CreateAccountInput = {
        entityId: testEntityId,
        code: '1010',
        name: 'Sub Account',
        type: AccountType.ASSET,
        parentAccountId: 'nonexistent-parent'
      };

      const result = createAccount(input, existingAccounts);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.field === 'parentAccountId')).toBe(true);
    });

    it('validates parent account is same entity', () => {
      const parentAccount = createTestAccount({
        id: 'parent-001',
        entityId: 'other-entity',
        code: '1000'
      });
      existingAccounts.push(parentAccount);

      const input: CreateAccountInput = {
        entityId: testEntityId,
        code: '1010',
        name: 'Sub Account',
        type: AccountType.ASSET,
        parentAccountId: 'parent-001'
      };

      const result = createAccount(input, existingAccounts);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.message.includes('same entity'))).toBe(true);
    });

    it('sets beginning balance correctly', () => {
      const input: CreateAccountInput = {
        entityId: testEntityId,
        code: '1000',
        name: 'Cash',
        type: AccountType.ASSET,
        beginningBalance: 5000
      };

      const result = createAccount(input, existingAccounts);

      expect(result.account.beginningBalance).toBe(5000);
      expect(result.account.balance).toBe(5000);
    });
  });

  describe('Account Update', () => {
    it('updates account name', () => {
      const account = createTestAccount({ id: 'acc-001', name: 'Original Name' });
      existingAccounts.push(account);

      const result = updateAccount('acc-001', { name: 'New Name' }, existingAccounts);

      expect(result.errors).toHaveLength(0);
      expect(result.account?.name).toBe('New Name');
    });

    it('updates account description', () => {
      const account = createTestAccount({ id: 'acc-001' });
      existingAccounts.push(account);

      const result = updateAccount('acc-001', { description: 'New description' }, existingAccounts);

      expect(result.errors).toHaveLength(0);
      expect(result.account?.description).toBe('New description');
    });

    it('rejects self-referencing parent', () => {
      const account = createTestAccount({ id: 'acc-001' });
      existingAccounts.push(account);

      const result = updateAccount('acc-001', { parentAccountId: 'acc-001' }, existingAccounts);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.message.includes('own parent'))).toBe(true);
    });

    it('returns error for nonexistent account', () => {
      const result = updateAccount('nonexistent', { name: 'Test' }, existingAccounts);

      expect(result.account).toBeNull();
      expect(result.errors.some(e => e.message.includes('not found'))).toBe(true);
    });

    it('recalculates balance when beginning balance changes', () => {
      const account = createTestAccount({
        id: 'acc-001',
        beginningBalance: 1000,
        balance: 1500 // Has 500 of activity
      });
      existingAccounts.push(account);

      const result = updateAccount('acc-001', { beginningBalance: 2000 }, existingAccounts);

      expect(result.account?.beginningBalance).toBe(2000);
      expect(result.account?.balance).toBe(2500); // New beginning + activity
    });
  });

  describe('Account Deletion (Soft Delete)', () => {
    it('soft deletes an account', () => {
      const account = createTestAccount({ id: 'acc-001', balance: 0 });
      existingAccounts.push(account);

      const result = deleteAccount('acc-001', existingAccounts);

      expect(result.errors).toHaveLength(0);
      expect(result.account?.isActive).toBe(false);
    });

    it('rejects deletion of account with non-zero balance', () => {
      const account = createTestAccount({ id: 'acc-001', balance: 100 });
      existingAccounts.push(account);

      const result = deleteAccount('acc-001', existingAccounts);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.message.includes('non-zero balance'))).toBe(true);
    });

    it('rejects deletion of account with children', () => {
      const parent = createTestAccount({ id: 'parent-001', balance: 0 });
      const child = createTestAccount({
        id: 'child-001',
        parentAccountId: 'parent-001',
        balance: 0
      });
      existingAccounts.push(parent, child);

      const result = deleteAccount('parent-001', existingAccounts);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.message.includes('children'))).toBe(true);
    });

    it('allows deletion after children are deleted', () => {
      const parent = createTestAccount({ id: 'parent-001', balance: 0 });
      const child = createTestAccount({
        id: 'child-001',
        parentAccountId: 'parent-001',
        balance: 0,
        isActive: false // Already soft deleted
      });
      existingAccounts.push(parent, child);

      const result = deleteAccount('parent-001', existingAccounts);

      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Account Queries', () => {
    beforeEach(() => {
      existingAccounts = [
        createTestAccount({ id: '1', code: '1000', name: 'Cash', type: AccountType.ASSET, balance: 5000 }),
        createTestAccount({ id: '2', code: '1100', name: 'AR', type: AccountType.ASSET, balance: 2000 }),
        createTestAccount({ id: '3', code: '2000', name: 'AP', type: AccountType.LIABILITY, balance: 1000 }),
        createTestAccount({ id: '4', code: '3000', name: 'Equity', type: AccountType.EQUITY, balance: 6000 }),
        createTestAccount({ id: '5', code: '4000', name: 'Revenue', type: AccountType.INCOME, balance: 3000 }),
        createTestAccount({ id: '6', code: '5000', name: 'Expenses', type: AccountType.EXPENSE, balance: 1500 }),
        createTestAccount({ id: '7', code: '1200', name: 'Inactive', type: AccountType.ASSET, isActive: false }),
      ];
    });

    it('gets account by ID', () => {
      const account = getAccount('1', existingAccounts);
      expect(account?.code).toBe('1000');
    });

    it('returns null for nonexistent account', () => {
      const account = getAccount('nonexistent', existingAccounts);
      expect(account).toBeNull();
    });

    it('filters accounts by type', () => {
      const assets = getAccounts({ type: AccountType.ASSET }, existingAccounts);
      expect(assets.length).toBe(3); // Including inactive
    });

    it('filters accounts by entity', () => {
      existingAccounts.push(createTestAccount({ id: '8', entityId: 'other-entity' }));
      const entityAccounts = getAccounts({ entityId: testEntityId }, existingAccounts);
      expect(entityAccounts.length).toBe(7);
    });

    it('filters active accounts only', () => {
      const active = getAccounts({ isActive: true }, existingAccounts);
      expect(active.length).toBe(6);
    });

    it('searches by code or name', () => {
      const results = getAccounts({ searchTerm: 'cash' }, existingAccounts);
      expect(results.length).toBe(1);
      expect(results[0].code).toBe('1000');
    });

    it('gets credit accounts', () => {
      const credits = getCreditAccounts(testEntityId, existingAccounts);
      expect(credits.length).toBe(3); // Liability, Equity, Income
    });

    it('gets debit accounts', () => {
      const debits = getDebitAccounts(testEntityId, existingAccounts);
      expect(debits.length).toBe(3); // 2 Assets + 1 Expense (active only)
    });

    it('gets active accounts only', () => {
      const active = getActiveAccounts(testEntityId, existingAccounts);
      expect(active.length).toBe(6);
    });
  });

  describe('Account Hierarchy', () => {
    it('builds account tree', () => {
      const parent = createTestAccount({ id: 'p1', code: '1000', name: 'Parent' });
      const child1 = createTestAccount({ id: 'c1', code: '1010', name: 'Child 1', parentAccountId: 'p1' });
      const child2 = createTestAccount({ id: 'c2', code: '1020', name: 'Child 2', parentAccountId: 'p1' });
      existingAccounts = [parent, child1, child2];

      const hierarchy = getAccountHierarchy(testEntityId, existingAccounts);

      expect(hierarchy.length).toBe(1);
      expect(hierarchy[0].children?.length).toBe(2);
    });

    it('excludes inactive accounts from hierarchy', () => {
      const parent = createTestAccount({ id: 'p1', code: '1000', name: 'Parent' });
      const activeChild = createTestAccount({ id: 'c1', code: '1010', name: 'Active', parentAccountId: 'p1' });
      const inactiveChild = createTestAccount({ id: 'c2', code: '1020', name: 'Inactive', parentAccountId: 'p1', isActive: false });
      existingAccounts = [parent, activeChild, inactiveChild];

      const hierarchy = getAccountHierarchy(testEntityId, existingAccounts);

      expect(hierarchy[0].children?.length).toBe(1);
    });
  });

  describe('Account Totals', () => {
    beforeEach(() => {
      existingAccounts = [
        createTestAccount({ id: '1', type: AccountType.ASSET, balance: 10000 }),
        createTestAccount({ id: '2', type: AccountType.LIABILITY, balance: 3000 }),
        createTestAccount({ id: '3', type: AccountType.EQUITY, balance: 5000 }),
        createTestAccount({ id: '4', type: AccountType.INCOME, balance: 4000 }),
        createTestAccount({ id: '5', type: AccountType.EXPENSE, balance: 2000 }),
      ];
    });

    it('calculates debit total (Assets + Expenses)', () => {
      const totals = getAccountTotals(testEntityId, existingAccounts);
      expect(totals.debitTotal).toBe(12000);
    });

    it('calculates credit total (Liabilities + Equity + Income)', () => {
      const totals = getAccountTotals(testEntityId, existingAccounts);
      expect(totals.creditTotal).toBe(12000);
    });

    it('calculates net worth (Assets - Liabilities)', () => {
      const totals = getAccountTotals(testEntityId, existingAccounts);
      expect(totals.netWorth).toBe(7000);
    });

    it('provides breakdown by account type', () => {
      const totals = getAccountTotals(testEntityId, existingAccounts);
      expect(totals.breakdown[AccountType.ASSET]).toBe(10000);
      expect(totals.breakdown[AccountType.LIABILITY]).toBe(3000);
      expect(totals.breakdown[AccountType.EQUITY]).toBe(5000);
      expect(totals.breakdown[AccountType.INCOME]).toBe(4000);
      expect(totals.breakdown[AccountType.EXPENSE]).toBe(2000);
    });

    it('calculates balance sheet equation (Assets = Liabilities + Equity + Net Income)', () => {
      const totals = getAccountTotals(testEntityId, existingAccounts);
      const netIncome = totals.breakdown[AccountType.INCOME] - totals.breakdown[AccountType.EXPENSE];
      const balanceSheetRHS = totals.breakdown[AccountType.LIABILITY] +
                              totals.breakdown[AccountType.EQUITY] +
                              netIncome;
      expect(totals.breakdown[AccountType.ASSET]).toBe(balanceSheetRHS);
    });

    it('calculates income statement (Net Income = Income - Expenses)', () => {
      const totals = getAccountTotals(testEntityId, existingAccounts);
      const netIncome = totals.breakdown[AccountType.INCOME] - totals.breakdown[AccountType.EXPENSE];
      expect(netIncome).toBe(2000); // 4000 Income - 2000 Expense
    });
  });
});
