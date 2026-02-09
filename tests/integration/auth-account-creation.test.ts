/**
 * Integration Test: Authenticated User -> Create Account Flow
 *
 * Tests the complete flow from an authenticated user state through
 * account creation via accountService, verifying that:
 * - Authenticated users can create accounts with correct fields
 * - Unauthenticated users are rejected
 * - Validation errors are surfaced for invalid input
 * - Account class and normal balance are derived correctly
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import React, { useEffect, useState } from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';

// Mock Firebase modules before any imports that use them
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => []),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  onAuthStateChanged: vi.fn(),
}));

// Mock cryptoService to avoid real crypto operations
vi.mock('../../services/cryptoService', () => ({
  cryptoService: {
    deriveKey: vi.fn().mockResolvedValue({ algorithm: { name: 'AES-GCM' } }),
    encrypt: vi.fn(),
    decrypt: vi.fn(),
    generateSalt: vi.fn(() => new Uint8Array(16)),
  },
  CryptoService: vi.fn(),
}));

// Mock logger to suppress output during tests
vi.mock('../../services/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { AuthProvider, useAuth } from '../../services/authService';
import {
  createAccount,
  getAccountClass,
  getDefaultNormalBalance,
  validateAccountInput,
  type CreateAccountInput,
} from '../../services/accountService';
import { Account, AccountType, DCFlag } from '../../types';

// ============================================================================
// TEST HELPERS
// ============================================================================

interface AuthUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}

const MOCK_AUTHENTICATED_USER: AuthUser = {
  uid: 'test-user-42',
  displayName: 'Test Fiduciary',
  email: 'fiduciary@test.local',
  photoURL: null,
  emailVerified: true,
};

const MOCK_ENTITY_ID = 'entity-integration-001';

/**
 * Simulates the application-level guard that requires authentication
 * before allowing account creation. This mirrors the real app pattern
 * where components check auth state before calling service functions.
 */
function createAccountWithAuthGuard(
  user: AuthUser | null,
  input: CreateAccountInput,
  existingAccounts: Account[]
): { account: Account | null; errors: { field: string; message: string }[]; authError?: string } {
  if (!user) {
    return {
      account: null,
      errors: [],
      authError: 'Authentication required to create accounts',
    };
  }

  const result = createAccount(input, existingAccounts);
  return { ...result, authError: undefined };
}

/**
 * Test component that exercises the useAuth -> createAccount flow
 * within a React rendering context.
 */
function AccountCreationTestHarness({
  input,
  existingAccounts,
  onResult,
}: {
  input: CreateAccountInput;
  existingAccounts: Account[];
  onResult: (result: {
    account: Account | null;
    errors: { field: string; message: string }[];
    authError?: string;
    userId?: string;
  }) => void;
}) {
  const { user, isLoading, isInitialized } = useAuth();
  const [executed, setExecuted] = useState(false);

  useEffect(() => {
    if (isInitialized && !isLoading && !executed) {
      const result = createAccountWithAuthGuard(user, input, existingAccounts);
      onResult({
        ...result,
        userId: user?.uid,
      });
      setExecuted(true);
    }
  }, [isInitialized, isLoading, executed, user, input, existingAccounts, onResult]);

  if (isLoading) return React.createElement('div', { 'data-testid': 'loading' }, 'Loading...');
  if (!user) return React.createElement('div', { 'data-testid': 'unauthenticated' }, 'Not authenticated');
  return React.createElement('div', { 'data-testid': 'authenticated' }, `Authenticated: ${user.uid}`);
}

// ============================================================================
// TESTS
// ============================================================================

describe('Integration: Authenticated User -> Create Account Flow', () => {
  let existingAccounts: Account[];

  beforeEach(() => {
    existingAccounts = [];
    vi.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // Auth Context Integration via React
  // --------------------------------------------------------------------------
  describe('Auth Context -> Account Creation (React render)', () => {
    it('creates account when user is authenticated via test backdoor', async () => {
      // Simulate the test backdoor URL param that AuthProvider supports
      const originalLocation = window.location;
      Object.defineProperty(window, 'location', {
        value: { ...originalLocation, search: '?__test_user=test-user-42' },
        writable: true,
        configurable: true,
      });

      const input: CreateAccountInput = {
        entityId: MOCK_ENTITY_ID,
        code: '1000',
        name: 'Operating Cash',
        type: AccountType.ASSET,
      };

      let capturedResult: any = null;
      const handleResult = vi.fn((result: any) => {
        capturedResult = result;
      });

      await act(async () => {
        render(
          React.createElement(
            AuthProvider,
            null,
            React.createElement(AccountCreationTestHarness, {
              input,
              existingAccounts,
              onResult: handleResult,
            })
          )
        );
      });

      await waitFor(() => {
        expect(handleResult).toHaveBeenCalled();
      });

      expect(capturedResult).toBeTruthy();
      expect(capturedResult.authError).toBeUndefined();
      expect(capturedResult.errors).toHaveLength(0);
      expect(capturedResult.account).toBeTruthy();
      expect(capturedResult.account.code).toBe('1000');
      expect(capturedResult.account.name).toBe('Operating Cash');
      expect(capturedResult.account.type).toBe(AccountType.ASSET);
      expect(capturedResult.account.accountClass).toBe('Debit');
      expect(capturedResult.account.isActive).toBe(true);
      expect(capturedResult.userId).toBe('test-user-42');

      // Restore
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
        configurable: true,
      });
    });

    it('blocks account creation when user is not authenticated', async () => {
      // No test backdoor, and Firebase is mocked to not provide a user
      const originalLocation = window.location;
      Object.defineProperty(window, 'location', {
        value: { ...originalLocation, search: '' },
        writable: true,
        configurable: true,
      });

      const input: CreateAccountInput = {
        entityId: MOCK_ENTITY_ID,
        code: '1000',
        name: 'Cash',
        type: AccountType.ASSET,
      };

      let capturedResult: any = null;
      const handleResult = vi.fn((result: any) => {
        capturedResult = result;
      });

      await act(async () => {
        render(
          React.createElement(
            AuthProvider,
            null,
            React.createElement(AccountCreationTestHarness, {
              input,
              existingAccounts,
              onResult: handleResult,
            })
          )
        );
      });

      await waitFor(() => {
        expect(handleResult).toHaveBeenCalled();
      });

      expect(capturedResult).toBeTruthy();
      expect(capturedResult.authError).toBe('Authentication required to create accounts');
      expect(capturedResult.account).toBeNull();

      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
        configurable: true,
      });
    });
  });

  // --------------------------------------------------------------------------
  // Direct auth guard + accountService integration
  // --------------------------------------------------------------------------
  describe('Auth Guard -> Account Creation (direct)', () => {
    it('creates a valid Asset account for authenticated user', () => {
      const input: CreateAccountInput = {
        entityId: MOCK_ENTITY_ID,
        code: '1000',
        name: 'Cash',
        type: AccountType.ASSET,
      };

      const result = createAccountWithAuthGuard(MOCK_AUTHENTICATED_USER, input, existingAccounts);

      expect(result.authError).toBeUndefined();
      expect(result.errors).toHaveLength(0);
      expect(result.account).toBeTruthy();
      expect(result.account!.id).toBeTruthy();
      expect(result.account!.entityId).toBe(MOCK_ENTITY_ID);
      expect(result.account!.code).toBe('1000');
      expect(result.account!.name).toBe('Cash');
      expect(result.account!.type).toBe(AccountType.ASSET);
      expect(result.account!.accountClass).toBe('Debit');
      expect(result.account!.normalBalance).toBe(DCFlag.Debit);
      expect(result.account!.balance).toBe(0);
      expect(result.account!.isActive).toBe(true);
      expect(result.account!._version).toBe('1');
    });

    it('creates a Liability (Credit) account for authenticated user', () => {
      const input: CreateAccountInput = {
        entityId: MOCK_ENTITY_ID,
        code: '2000',
        name: 'Accounts Payable',
        type: AccountType.LIABILITY,
      };

      const result = createAccountWithAuthGuard(MOCK_AUTHENTICATED_USER, input, existingAccounts);

      expect(result.authError).toBeUndefined();
      expect(result.errors).toHaveLength(0);
      expect(result.account!.accountClass).toBe('Credit');
      expect(result.account!.normalBalance).toBe(DCFlag.Credit);
    });

    it('creates account with all optional fields', () => {
      const parentAccount: Account = {
        id: 'parent-001',
        entityId: MOCK_ENTITY_ID,
        code: '1000',
        name: 'Cash',
        type: AccountType.ASSET,
        normalBalance: DCFlag.Debit,
        balance: 0,
        isActive: true,
        _version: '1',
      } as Account;
      existingAccounts.push(parentAccount);

      const input: CreateAccountInput = {
        entityId: MOCK_ENTITY_ID,
        code: '1010',
        name: 'Petty Cash',
        type: AccountType.ASSET,
        description: 'Small cash fund for office expenses',
        taxLine: 'Schedule C, Line 1',
        parentAccountId: 'parent-001',
        beginningBalance: 500,
      };

      const result = createAccountWithAuthGuard(MOCK_AUTHENTICATED_USER, input, existingAccounts);

      expect(result.authError).toBeUndefined();
      expect(result.errors).toHaveLength(0);
      expect(result.account!.description).toBe('Small cash fund for office expenses');
      expect(result.account!.taxLine).toBe('Schedule C, Line 1');
      expect(result.account!.parentAccountId).toBe('parent-001');
      expect(result.account!.beginningBalance).toBe(500);
      expect(result.account!.balance).toBe(500);
    });

    it('rejects account creation for unauthenticated user (null)', () => {
      const input: CreateAccountInput = {
        entityId: MOCK_ENTITY_ID,
        code: '1000',
        name: 'Cash',
        type: AccountType.ASSET,
      };

      const result = createAccountWithAuthGuard(null, input, existingAccounts);

      expect(result.authError).toBe('Authentication required to create accounts');
      expect(result.account).toBeNull();
      expect(result.errors).toHaveLength(0);
    });

    it('returns validation errors for missing required fields', () => {
      const input: CreateAccountInput = {
        entityId: '',
        code: '',
        name: '',
        type: AccountType.ASSET,
      };

      const result = createAccountWithAuthGuard(MOCK_AUTHENTICATED_USER, input, existingAccounts);

      expect(result.authError).toBeUndefined();
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.field === 'code')).toBe(true);
      expect(result.errors.some((e) => e.field === 'name')).toBe(true);
      expect(result.errors.some((e) => e.field === 'entityId')).toBe(true);
    });

    it('rejects duplicate account code within same entity', () => {
      const existing: Account = {
        id: 'existing-001',
        entityId: MOCK_ENTITY_ID,
        code: '1000',
        name: 'Cash',
        type: AccountType.ASSET,
        normalBalance: DCFlag.Debit,
        balance: 5000,
        isActive: true,
        _version: '1',
      } as Account;
      existingAccounts.push(existing);

      const input: CreateAccountInput = {
        entityId: MOCK_ENTITY_ID,
        code: '1000',
        name: 'Duplicate Cash',
        type: AccountType.ASSET,
      };

      const result = createAccountWithAuthGuard(MOCK_AUTHENTICATED_USER, input, existingAccounts);

      expect(result.authError).toBeUndefined();
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.message.includes('already exists'))).toBe(true);
      expect(result.account).toBeFalsy();
    });

    it('allows same account code in different entity', () => {
      const existingInOtherEntity: Account = {
        id: 'other-001',
        entityId: 'other-entity',
        code: '1000',
        name: 'Cash',
        type: AccountType.ASSET,
        normalBalance: DCFlag.Debit,
        balance: 0,
        isActive: true,
        _version: '1',
      } as Account;
      existingAccounts.push(existingInOtherEntity);

      const input: CreateAccountInput = {
        entityId: MOCK_ENTITY_ID,
        code: '1000',
        name: 'Cash',
        type: AccountType.ASSET,
      };

      const result = createAccountWithAuthGuard(MOCK_AUTHENTICATED_USER, input, existingAccounts);

      expect(result.authError).toBeUndefined();
      expect(result.errors).toHaveLength(0);
      expect(result.account).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // Account class derivation across all 5 account types
  // --------------------------------------------------------------------------
  describe('Account class and normal balance derivation (all types)', () => {
    const typeExpectations: {
      type: AccountType;
      expectedClass: string;
      expectedNormal: DCFlag;
    }[] = [
      { type: AccountType.ASSET, expectedClass: 'Debit', expectedNormal: DCFlag.Debit },
      { type: AccountType.EXPENSE, expectedClass: 'Debit', expectedNormal: DCFlag.Debit },
      { type: AccountType.LIABILITY, expectedClass: 'Credit', expectedNormal: DCFlag.Credit },
      { type: AccountType.EQUITY, expectedClass: 'Credit', expectedNormal: DCFlag.Credit },
      { type: AccountType.INCOME, expectedClass: 'Credit', expectedNormal: DCFlag.Credit },
    ];

    typeExpectations.forEach(({ type, expectedClass, expectedNormal }) => {
      it(`creates ${type} account with class=${expectedClass}, normalBalance=${expectedNormal}`, () => {
        const input: CreateAccountInput = {
          entityId: MOCK_ENTITY_ID,
          code: `${type.toUpperCase().slice(0, 3)}-001`,
          name: `Test ${type}`,
          type,
        };

        const result = createAccountWithAuthGuard(MOCK_AUTHENTICATED_USER, input, existingAccounts);

        expect(result.errors).toHaveLength(0);
        expect(result.account!.accountClass).toBe(expectedClass);
        expect(result.account!.normalBalance).toBe(expectedNormal);
      });
    });
  });

  // --------------------------------------------------------------------------
  // Validation edge cases
  // --------------------------------------------------------------------------
  describe('Validation edge cases with auth guard', () => {
    it('rejects invalid account code format', () => {
      const input: CreateAccountInput = {
        entityId: MOCK_ENTITY_ID,
        code: 'invalid code!@#',
        name: 'Bad Code Account',
        type: AccountType.ASSET,
      };

      const result = createAccountWithAuthGuard(MOCK_AUTHENTICATED_USER, input, existingAccounts);

      expect(result.errors.some((e) => e.field === 'code' && e.message.includes('alphanumeric'))).toBe(true);
    });

    it('rejects parent account from different entity', () => {
      const foreignParent: Account = {
        id: 'foreign-parent',
        entityId: 'different-entity',
        code: '1000',
        name: 'Foreign Parent',
        type: AccountType.ASSET,
        normalBalance: DCFlag.Debit,
        balance: 0,
        isActive: true,
        _version: '1',
      } as Account;
      existingAccounts.push(foreignParent);

      const input: CreateAccountInput = {
        entityId: MOCK_ENTITY_ID,
        code: '1010',
        name: 'Child Account',
        type: AccountType.ASSET,
        parentAccountId: 'foreign-parent',
      };

      const result = createAccountWithAuthGuard(MOCK_AUTHENTICATED_USER, input, existingAccounts);

      expect(result.errors.some((e) => e.message.includes('same entity'))).toBe(true);
    });

    it('rejects nonexistent parent account', () => {
      const input: CreateAccountInput = {
        entityId: MOCK_ENTITY_ID,
        code: '1010',
        name: 'Orphan Account',
        type: AccountType.ASSET,
        parentAccountId: 'ghost-parent',
      };

      const result = createAccountWithAuthGuard(MOCK_AUTHENTICATED_USER, input, existingAccounts);

      expect(result.errors.some((e) => e.field === 'parentAccountId')).toBe(true);
    });

    it('rejects inactive parent account', () => {
      const inactiveParent: Account = {
        id: 'inactive-parent',
        entityId: MOCK_ENTITY_ID,
        code: '1000',
        name: 'Inactive Parent',
        type: AccountType.ASSET,
        normalBalance: DCFlag.Debit,
        balance: 0,
        isActive: false,
        _version: '1',
      } as Account;
      existingAccounts.push(inactiveParent);

      const input: CreateAccountInput = {
        entityId: MOCK_ENTITY_ID,
        code: '1010',
        name: 'Child of Inactive',
        type: AccountType.ASSET,
        parentAccountId: 'inactive-parent',
      };

      const result = createAccountWithAuthGuard(MOCK_AUTHENTICATED_USER, input, existingAccounts);

      expect(result.errors.some((e) => e.message.includes('inactive parent'))).toBe(true);
    });

    it('uppercases account code on creation', () => {
      const input: CreateAccountInput = {
        entityId: MOCK_ENTITY_ID,
        code: 'abc-001',
        name: 'Lowercase Code',
        type: AccountType.ASSET,
      };

      const result = createAccountWithAuthGuard(MOCK_AUTHENTICATED_USER, input, existingAccounts);

      expect(result.errors).toHaveLength(0);
      expect(result.account!.code).toBe('ABC-001');
    });

    it('trims whitespace from name and description', () => {
      const input: CreateAccountInput = {
        entityId: MOCK_ENTITY_ID,
        code: '1000',
        name: '  Padded Name  ',
        type: AccountType.ASSET,
        description: '  Padded Description  ',
      };

      const result = createAccountWithAuthGuard(MOCK_AUTHENTICATED_USER, input, existingAccounts);

      expect(result.errors).toHaveLength(0);
      expect(result.account!.name).toBe('Padded Name');
      expect(result.account!.description).toBe('Padded Description');
    });

    it('sets default beginning balance to zero', () => {
      const input: CreateAccountInput = {
        entityId: MOCK_ENTITY_ID,
        code: '1000',
        name: 'No Balance Specified',
        type: AccountType.ASSET,
      };

      const result = createAccountWithAuthGuard(MOCK_AUTHENTICATED_USER, input, existingAccounts);

      expect(result.errors).toHaveLength(0);
      expect(result.account!.beginningBalance).toBe(0);
      expect(result.account!.balance).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Sequential account creation (multiple accounts)
  // --------------------------------------------------------------------------
  describe('Sequential account creation flow', () => {
    it('creates multiple accounts maintaining unique IDs', () => {
      const inputs: CreateAccountInput[] = [
        { entityId: MOCK_ENTITY_ID, code: '1000', name: 'Cash', type: AccountType.ASSET },
        { entityId: MOCK_ENTITY_ID, code: '2000', name: 'AP', type: AccountType.LIABILITY },
        { entityId: MOCK_ENTITY_ID, code: '3000', name: 'Owner Equity', type: AccountType.EQUITY },
        { entityId: MOCK_ENTITY_ID, code: '4000', name: 'Revenue', type: AccountType.INCOME },
        { entityId: MOCK_ENTITY_ID, code: '5000', name: 'Rent', type: AccountType.EXPENSE },
      ];

      const createdAccounts: Account[] = [];

      inputs.forEach((input) => {
        const result = createAccountWithAuthGuard(MOCK_AUTHENTICATED_USER, input, [
          ...existingAccounts,
          ...createdAccounts,
        ]);
        expect(result.errors).toHaveLength(0);
        expect(result.account).toBeTruthy();
        createdAccounts.push(result.account!);
      });

      // All IDs should be unique
      const ids = createdAccounts.map((a) => a.id);
      expect(new Set(ids).size).toBe(5);

      // Verify each type
      expect(createdAccounts[0].accountClass).toBe('Debit');
      expect(createdAccounts[1].accountClass).toBe('Credit');
      expect(createdAccounts[2].accountClass).toBe('Credit');
      expect(createdAccounts[3].accountClass).toBe('Credit');
      expect(createdAccounts[4].accountClass).toBe('Debit');
    });

    it('creates parent-child hierarchy in sequence', () => {
      // Create parent
      const parentInput: CreateAccountInput = {
        entityId: MOCK_ENTITY_ID,
        code: '1000',
        name: 'Cash & Equivalents',
        type: AccountType.ASSET,
      };

      const parentResult = createAccountWithAuthGuard(MOCK_AUTHENTICATED_USER, parentInput, existingAccounts);
      expect(parentResult.errors).toHaveLength(0);
      existingAccounts.push(parentResult.account!);

      // Create child referencing parent
      const childInput: CreateAccountInput = {
        entityId: MOCK_ENTITY_ID,
        code: '1010',
        name: 'Checking Account',
        type: AccountType.ASSET,
        parentAccountId: parentResult.account!.id,
      };

      const childResult = createAccountWithAuthGuard(MOCK_AUTHENTICATED_USER, childInput, existingAccounts);
      expect(childResult.errors).toHaveLength(0);
      expect(childResult.account!.parentAccountId).toBe(parentResult.account!.id);
    });
  });
});
