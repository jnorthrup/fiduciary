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

/**
 * Cursor for pagination - contains position markers
 */
export interface Cursor {
  id: string;
  code: string;
  createdAt: string;
}

/**
 * Result of pagination operation
 */
export interface PaginationResult<T> {
  data: T[];
  nextCursor: string | null;
  previousCursor: string | null;
  hasNext: boolean;
  hasPrevious: boolean;
  totalCount: number;
}

/**
 * Extended filters for pagination
 */
export interface PaginationFilters extends AccountFilters {
  limit?: number;
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

// ============================================================================
// CURSOR-BASED PAGINATION
// ============================================================================

/**
 * Creates a cursor from an account
 */
function createCursor(account: types.Account): string {
  const cursor: Cursor = {
    id: account.id,
    code: account.code,
    createdAt: account.createdAt || new Date().toISOString()
  };
  return Buffer.from(JSON.stringify(cursor)).toString('base64');
}

/**
 * Parses a cursor string
 */
function parseCursor(cursorString: string | null): Cursor | null {
  if (!cursorString) return null;

  try {
    const decoded = Buffer.from(cursorString, 'base64').toString('utf-8');
    return JSON.parse(decoded) as Cursor;
  } catch {
    return null;
  }
}

/**
 * Sorts accounts by code, then name (consistent sort order)
 */
function sortAccounts(accounts: types.Account[]): types.Account[] {
  return [...accounts].sort((a, b) => {
    const codeCompare = a.code.localeCompare(b.code);
    if (codeCompare !== 0) return codeCompare;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Fetches the next page of accounts using cursor-based pagination
 *
 * @param cursor - Base64-encoded cursor string, or null for first page
 * @param limit - Number of items per page
 * @param accounts - Full list of accounts to paginate
 * @param filters - Optional filters to apply
 * @returns PaginationResult with data and navigation cursors
 */
export function fetchNext(
  cursor: string | null,
  limit: number,
  accounts: types.Account[],
  filters?: AccountFilters
): PaginationResult<types.Account> {
  // Apply filters
  let filtered = filters ? getAccounts(filters, accounts) : [...accounts];

  // Sort for consistent pagination
  filtered = sortAccounts(filtered);

  const totalCount = filtered.length;

  // Handle empty result
  if (filtered.length === 0) {
    return {
      data: [],
      nextCursor: null,
      previousCursor: null,
      hasNext: false,
      hasPrevious: false,
      totalCount: 0
    };
  }

  // Find starting position from cursor
  let startIndex = 0;
  const parsedCursor = parseCursor(cursor);

  if (parsedCursor) {
    startIndex = filtered.findIndex(
      a => a.id === parsedCursor.id ||
           (a.code === parsedCursor.code && a.createdAt === parsedCursor.createdAt)
    );

    // If cursor not found, start from beginning (graceful degradation)
    if (startIndex === -1) {
      startIndex = 0;
    } else {
      // Start after the cursor position
      startIndex += 1;
    }
  }

  // Validate limit
  const safeLimit = Math.max(1, Math.min(limit, 100)); // Max 100 per page

  // Slice data
  const endIndex = startIndex + safeLimit;
  const data = filtered.slice(startIndex, endIndex);

  // Create cursors
  const hasNext = endIndex < filtered.length;
  const hasPrevious = startIndex > 0;

  let nextCursor: string | null = null;
  let previousCursor: string | null = null;

  if (hasNext && data.length > 0) {
    const lastAccount = data[data.length - 1];
    nextCursor = createCursor(lastAccount);
  }

  if (hasPrevious && filtered.length > 0) {
    // For previous cursor, point to the item before start
    const previousIndex = Math.max(0, startIndex - 1);
    const previousAccount = filtered[previousIndex];
    previousCursor = createCursor(previousAccount);
  }

  return {
    data,
    nextCursor,
    previousCursor,
    hasNext,
    hasPrevious,
    totalCount
  };
}

/**
 * Fetches the previous page of accounts using cursor-based pagination
 *
 * The cursor from fetchNext's previousCursor points to an item that should
 * be included as the LAST item of the previous page.
 *
 * @param cursor - Base64-encoded cursor string from previousCursor
 * @param limit - Number of items per page
 * @param accounts - Full list of accounts to paginate
 * @param filters - Optional filters to apply
 * @returns PaginationResult with data and navigation cursors
 */
export function fetchPrevious(
  cursor: string | null,
  limit: number,
  accounts: types.Account[],
  filters?: AccountFilters
): PaginationResult<types.Account> {
  // Apply filters
  let filtered = filters ? getAccounts(filters, accounts) : [...accounts];

  // Sort for consistent pagination
  filtered = sortAccounts(filtered);

  const totalCount = filtered.length;

  // Handle empty result
  if (filtered.length === 0) {
    return {
      data: [],
      nextCursor: null,
      previousCursor: null,
      hasNext: false,
      hasPrevious: false,
      totalCount: 0
    };
  }

  // Find the cursor position - this is the item that should be LAST on this page
  const parsedCursor = parseCursor(cursor);
  let endIndex = filtered.length - 1; // Default to last item

  if (parsedCursor) {
    endIndex = filtered.findIndex(
      a => a.id === parsedCursor.id ||
           (a.code === parsedCursor.code && a.createdAt === parsedCursor.createdAt)
    );

    // If cursor not found, start from end (graceful degradation)
    if (endIndex === -1) {
      endIndex = filtered.length - 1;
    }
  }

  // Validate limit
  const safeLimit = Math.max(1, Math.min(limit, 100)); // Max 100 per page

  // Calculate range: endIndex is INCLUSIVE (the cursor item is last on page)
  const startIndex = Math.max(0, endIndex - safeLimit + 1);

  const data = filtered.slice(startIndex, endIndex + 1);

  // Create cursors
  const hasNext = endIndex < filtered.length - 1;
  const hasPrevious = startIndex > 0;

  let nextCursor: string | null = null;
  let previousCursor: string | null = null;

  if (hasNext && filtered.length > 0) {
    // Next cursor points to the item after this page (for going forward again)
    const nextIndex = endIndex + 1;
    const nextAccount = filtered[nextIndex];
    nextCursor = createCursor(nextAccount);
  }

  if (hasPrevious && data.length > 0) {
    // Previous cursor points to the item before this page
    const previousIndex = startIndex - 1;
    const previousAccount = filtered[previousIndex];
    previousCursor = createCursor(previousAccount);
  }

  return {
    data,
    nextCursor,
    previousCursor,
    hasNext,
    hasPrevious,
    totalCount
  };
}
