/**
 * Account Service - Credit & Debit Account CRUD Operations
 *
 * Provides full CRUD functionality for ledger accounts with hierarchy support,
 * validation, and categorization by account class (Credit/Debit).
 */

import { v4 as uuidv4 } from 'uuid';
import * as types from '../types';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateAccountInput {
  entityId: string;
  code: string;
  name: string;
  type: types.AccountType;
  description?: string;
  taxLine?: string;
  parentAccountId?: string;
  normalBalance?: types.DCFlag;
  beginningBalance?: number;
}

export interface UpdateAccountInput {
  name?: string;
  description?: string;
  taxLine?: string;
  parentAccountId?: string;
  isActive?: boolean;
  beginningBalance?: number;
}

export interface AccountFilters {
  entityId?: string;
  type?: types.AccountType;
  accountClass?: types.AccountClass;
  isActive?: boolean;
  parentAccountId?: string | null; // null = top-level only
  searchTerm?: string; // Search code or name
}

// ============================================================================
// ACCOUNT CLASS DETERMINATION
// ============================================================================

/**
 * Determines account class based on account type.
 * - Credit accounts: Liability, Equity, Income (normal balance is Credit)
 * - Debit accounts: Asset, Expense (normal balance is Debit)
 */
export function getAccountClass(type: types.AccountType): types.AccountClass {
  return ['Liability', 'Equity', 'Income'].includes(type) ? 'Credit' : 'Debit';
}

/**
 * Determines normal balance for account type.
 */
export function getDefaultNormalBalance(type: types.AccountType): types.DCFlag {
  return getAccountClass(type) === 'Credit' ? types.DCFlag.Credit : types.DCFlag.Debit;
}

// ============================================================================
// VALIDATION
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validates account input data.
 */
export function validateAccountInput(
  input: CreateAccountInput,
  existingAccounts: types.Account[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate required fields
  if (!input.code?.trim()) {
    errors.push({ field: 'code', message: 'Account code is required' });
  }
  if (!input.name?.trim()) {
    errors.push({ field: 'name', message: 'Account name is required' });
  }
  if (!input.entityId) {
    errors.push({ field: 'entityId', message: 'Entity ID is required' });
  }
  if (!input.type) {
    errors.push({ field: 'type', message: 'Account type is required' });
  }

  // Validate code format (alphanumeric, hyphens, dots)
  if (input.code && !/^[A-Z0-9\-\.]+$/i.test(input.code)) {
    errors.push({ field: 'code', message: 'Account code must be alphanumeric (may include hyphens and dots)' });
  }

  // Validate code uniqueness within entity
  const entityAccounts = existingAccounts.filter(a => a.entityId === input.entityId);
  const duplicateCode = entityAccounts.find(a => a.code === input.code);
  if (duplicateCode) {
    errors.push({ field: 'code', message: `Account code ${input.code} already exists for this entity` });
  }

  // Validate parent account exists and is same entity
  if (input.parentAccountId) {
    const parentAccount = existingAccounts.find(a => a.id === input.parentAccountId);
    if (!parentAccount) {
      errors.push({ field: 'parentAccountId', message: 'Parent account not found' });
    } else if (parentAccount.entityId !== input.entityId) {
      errors.push({ field: 'parentAccountId', message: 'Parent account must belong to the same entity' });
    } else if (!parentAccount.isActive) {
      errors.push({ field: 'parentAccountId', message: 'Cannot assign to inactive parent account' });
    }
  }

  // Validate normal balance matches account type (if provided)
  if (input.normalBalance) {
    const expected = getDefaultNormalBalance(input.type);
    if (input.normalBalance !== expected) {
      errors.push({
        field: 'normalBalance',
        message: `Normal balance for ${input.type} accounts should be ${expected}`
      });
    }
  }

  return errors;
}

/**
 * Validates account update data.
 */
export function validateAccountUpdate(
  accountId: string,
  updates: UpdateAccountInput,
  existingAccounts: types.Account[]
): ValidationError[] {
  const errors: ValidationError[] = [];
  const account = existingAccounts.find(a => a.id === accountId);

  if (!account) {
    errors.push({ field: 'id', message: 'Account not found' });
    return errors;
  }

  // Validate parent account change
  if (updates.parentAccountId !== undefined) {
    if (updates.parentAccountId === accountId) {
      errors.push({ field: 'parentAccountId', message: 'Account cannot be its own parent' });
    } else if (updates.parentAccountId) {
      const parentAccount = existingAccounts.find(a => a.id === updates.parentAccountId);
      if (!parentAccount) {
        errors.push({ field: 'parentAccountId', message: 'Parent account not found' });
      } else if (parentAccount.entityId !== account.entityId) {
        errors.push({ field: 'parentAccountId', message: 'Parent account must belong to the same entity' });
      } else if (!parentAccount.isActive) {
        errors.push({ field: 'parentAccountId', message: 'Cannot assign to inactive parent account' });
      }
    }
  }

  return errors;
}

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * Creates a new account.
 */
export function createAccount(
  input: CreateAccountInput,
  existingAccounts: types.Account[]
): { account: types.Account; errors: ValidationError[] } {
  const errors = validateAccountInput(input, existingAccounts);

  if (errors.length > 0) {
    return { account: null as any, errors };
  }

  const accountClass = getAccountClass(input.type);
  const normalBalance = input.normalBalance || getDefaultNormalBalance(input.type);

  const beginningBalance = input.beginningBalance ?? 0;

  const account: types.Account = {
    id: uuidv4(),
    entityId: input.entityId,
    code: input.code.toUpperCase(),
    name: input.name.trim(),
    type: input.type,
    normalBalance,
    balance: beginningBalance,
    beginningBalance,
    accountClass,
    description: input.description?.trim(),
    taxLine: input.taxLine?.trim(),
    parentAccountId: input.parentAccountId,
    children: [],
    isActive: true,
    createdAt: new Date().toISOString(),
    _version: '1'
  };

  return { account, errors: [] };
}

/**
 * Updates an existing account.
 */
export function updateAccount(
  accountId: string,
  updates: UpdateAccountInput,
  existingAccounts: types.Account[]
): { account: types.Account | null; errors: ValidationError[] } {
  const validationErrors = validateAccountUpdate(accountId, updates, existingAccounts);

  if (validationErrors.length > 0) {
    return { account: null, errors: validationErrors };
  }

  const accountIndex = existingAccounts.findIndex(a => a.id === accountId);
  if (accountIndex === -1) {
    return { account: null, errors: [{ field: 'id', message: 'Account not found' }] };
  }

  const existingAccount = existingAccounts[accountIndex];

  // If beginningBalance is being updated, recalculate the current balance
  let balanceUpdates: { beginningBalance?: number; balance?: number } = {};
  if (updates.beginningBalance !== undefined) {
    const oldBeginningBalance = existingAccount.beginningBalance ?? 0;
    const activity = existingAccount.balance - oldBeginningBalance;
    balanceUpdates.beginningBalance = updates.beginningBalance;
    balanceUpdates.balance = updates.beginningBalance + activity;
  }

  const updatedAccount: types.Account = {
    ...existingAccount,
    ...(updates.name !== undefined && { name: updates.name.trim() }),
    ...(updates.description !== undefined && { description: updates.description.trim() }),
    ...(updates.taxLine !== undefined && { taxLine: updates.taxLine.trim() }),
    ...(updates.parentAccountId !== undefined && { parentAccountId: updates.parentAccountId }),
    ...(updates.isActive !== undefined && { isActive: updates.isActive }),
    ...balanceUpdates,
    _version: String(parseInt(existingAccount._version) + 1)
  };

  return { account: updatedAccount, errors: [] };
}

/**
 * Soft deletes an account by setting isActive = false.
 */
export function deleteAccount(
  accountId: string,
  existingAccounts: types.Account[]
): { account: types.Account | null; errors: ValidationError[] } {
  const account = existingAccounts.find(a => a.id === accountId);

  if (!account) {
    return { account: null, errors: [{ field: 'id', message: 'Account not found' }] };
  }

  // Check if account has children
  const hasChildren = existingAccounts.some(a => a.parentAccountId === accountId && a.isActive);
  if (hasChildren) {
    return { account: null, errors: [{ field: 'id', message: 'Cannot delete account with children' }] };
  }

  // Check if account has non-zero balance
  if (account.balance !== 0) {
    return { account: null, errors: [{ field: 'id', message: 'Cannot delete account with non-zero balance' }] };
  }

  const deletedAccount: types.Account = {
    ...account,
    isActive: false,
    _version: String(parseInt(account._version) + 1)
  };

  return { account: deletedAccount, errors: [] };
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Gets a single account by ID.
 */
export function getAccount(
  accountId: string,
  accounts: types.Account[]
): types.Account | null {
  return accounts.find(a => a.id === accountId) || null;
}

/**
 * Gets accounts matching filters.
 */
export function getAccounts(
  filters: AccountFilters,
  accounts: types.Account[]
): types.Account[] {
  let filtered = [...accounts];

  if (filters.entityId) {
    filtered = filtered.filter(a => a.entityId === filters.entityId);
  }

  if (filters.type) {
    filtered = filtered.filter(a => a.type === filters.type);
  }

  if (filters.accountClass) {
    filtered = filtered.filter(a => a.accountClass === filters.accountClass);
  }

  if (filters.isActive !== undefined) {
    filtered = filtered.filter(a => a.isActive === filters.isActive);
  }

  if (filters.parentAccountId !== undefined) {
    if (filters.parentAccountId === null) {
      filtered = filtered.filter(a => !a.parentAccountId);
    } else {
      filtered = filtered.filter(a => a.parentAccountId === filters.parentAccountId);
    }
  }

  if (filters.searchTerm) {
    const term = filters.searchTerm.toLowerCase();
    filtered = filtered.filter(a =>
      a.code.toLowerCase().includes(term) ||
      a.name.toLowerCase().includes(term) ||
      a.description?.toLowerCase().includes(term)
    );
  }

  // Sort by code, then name
  filtered.sort((a, b) => a.code.localeCompare(b.code) || a.name.localeCompare(b.name));

  return filtered;
}

/**
 * Gets credit accounts (Liability, Equity, Income) for an entity.
 */
export function getCreditAccounts(
  entityId: string,
  accounts: types.Account[],
  activeOnly: boolean = true
): types.Account[] {
  return getAccounts({
    entityId,
    accountClass: 'Credit',
    isActive: activeOnly ? true : undefined
  }, accounts);
}

/**
 * Gets debit accounts (Asset, Expense) for an entity.
 */
export function getDebitAccounts(
  entityId: string,
  accounts: types.Account[],
  activeOnly: boolean = true
): types.Account[] {
  return getAccounts({
    entityId,
    accountClass: 'Debit',
    isActive: activeOnly ? true : undefined
  }, accounts);
}

/**
 * Gets all active accounts for an entity.
 */
export function getActiveAccounts(
  entityId: string,
  accounts: types.Account[]
): types.Account[] {
  return getAccounts({
    entityId,
    isActive: true
  }, accounts);
}

/**
 * Builds account hierarchy tree from flat account list.
 */
export function getAccountHierarchy(
  entityId: string,
  accounts: types.Account[]
): types.Account[] {
  const entityAccounts = accounts.filter(a => a.entityId === entityId && a.isActive);

  // Create a map for quick lookup
  const accountMap = new Map<string, types.Account>();
  entityAccounts.forEach(a => {
    accountMap.set(a.id, { ...a, children: [] });
  });

  // Build tree structure
  const rootAccounts: types.Account[] = [];
  accountMap.forEach(account => {
    if (account.parentAccountId) {
      const parent = accountMap.get(account.parentAccountId);
      if (parent) {
        parent.children!.push(account);
      }
    } else {
      rootAccounts.push(account);
    }
  });

  return rootAccounts;
}

/**
 * Calculates totals by account class for an entity.
 */
export function getAccountTotals(
  entityId: string,
  accounts: types.Account[]
): { debitTotal: number; creditTotal: number; netWorth: number; breakdown: Record<types.AccountType, number> } {
  const entityAccounts = accounts.filter(a => a.entityId === entityId && a.isActive);

  const breakdown: Record<types.AccountType, number> = {
    [types.AccountType.ASSET]: 0,
    [types.AccountType.LIABILITY]: 0,
    [types.AccountType.EQUITY]: 0,
    [types.AccountType.INCOME]: 0,
    [types.AccountType.EXPENSE]: 0
  };

  entityAccounts.forEach(account => {
    breakdown[account.type] += account.balance;
  });

  // Debit accounts: Assets and Expenses
  const debitTotal = breakdown[types.AccountType.ASSET] + breakdown[types.AccountType.EXPENSE];

  // Credit accounts: Liabilities, Equity, Income
  const creditTotal = breakdown[types.AccountType.LIABILITY] + breakdown[types.AccountType.EQUITY] + breakdown[types.AccountType.INCOME];

  // Net worth = Assets - Liabilities
  const netWorth = breakdown[types.AccountType.ASSET] - breakdown[types.AccountType.LIABILITY];

  return { debitTotal, creditTotal, netWorth, breakdown };
}
