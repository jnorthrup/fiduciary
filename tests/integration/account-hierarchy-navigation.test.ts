/**
 * Integration Test: Account Hierarchy Navigation
 *
 * Tests the complete flow of creating parent-child account hierarchies
 * and navigating them via getAccountHierarchy(), verifying:
 * - Parent-child relationships via parentAccountId
 * - Multi-level (grandchild) hierarchies
 * - Tree structure returned by getAccountHierarchy()
 * - Filtering children by parentAccountId
 * - Edge cases: orphan accounts, circular references, reparenting
 * - Hierarchy constraints on deletion
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createAccount,
  updateAccount,
  deleteAccount,
  getAccount,
  getAccounts,
  getAccountHierarchy,
  getAccountClass,
  getDefaultNormalBalance,
  validateAccountUpdate,
  type CreateAccountInput,
  type UpdateAccountInput,
} from '../../services/accountService';
import { Account, AccountType, DCFlag } from '../../types';

// ============================================================================
// TEST HELPERS
// ============================================================================

const TEST_ENTITY_ID = 'entity-hierarchy-001';

/**
 * Creates a test account with sensible defaults and overrides.
 * Mirrors the pattern used in accountService.test.ts.
 */
function createTestAccount(overrides: Partial<Account> & { beginningBalance?: number; createdAt?: string; children?: any[] } = {}): Account {
  const type = overrides.type || AccountType.ASSET;
  const accountClass = getAccountClass(type);
  const normalBalance = getDefaultNormalBalance(type);

  return {
    id: `acc-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    entityId: TEST_ENTITY_ID,
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
    ...overrides,
  } as Account;
}

/**
 * Helper to create an account and add it to the accounts array.
 * Returns the created account or throws on validation error.
 */
function createAndTrack(
  input: CreateAccountInput,
  accounts: Account[]
): Account {
  const result = createAccount(input, accounts);
  if (result.errors.length > 0) {
    throw new Error(`Account creation failed: ${result.errors.map(e => `${e.field}: ${e.message}`).join(', ')}`);
  }
  accounts.push(result.account);
  return result.account;
}

// ============================================================================
// TESTS
// ============================================================================

describe('Integration: Account Hierarchy Navigation', () => {
  let accounts: Account[];

  beforeEach(() => {
    accounts = [];
  });

  // --------------------------------------------------------------------------
  // Basic parent-child hierarchy creation
  // --------------------------------------------------------------------------
  describe('Parent-child hierarchy creation', () => {
    it('creates a parent account with no parentAccountId', () => {
      const parent = createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '1000',
        name: 'Assets',
        type: AccountType.ASSET,
      }, accounts);

      expect(parent.parentAccountId).toBeUndefined();
      expect(parent.name).toBe('Assets');
      expect(parent.isActive).toBe(true);
    });

    it('creates child accounts under a parent', () => {
      const parent = createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '1000',
        name: 'Assets',
        type: AccountType.ASSET,
      }, accounts);

      const cash = createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '1100',
        name: 'Cash',
        type: AccountType.ASSET,
        parentAccountId: parent.id,
      }, accounts);

      const receivables = createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '1200',
        name: 'Accounts Receivable',
        type: AccountType.ASSET,
        parentAccountId: parent.id,
      }, accounts);

      expect(cash.parentAccountId).toBe(parent.id);
      expect(receivables.parentAccountId).toBe(parent.id);
    });

    it('creates grandchild accounts (three-level hierarchy)', () => {
      const assets = createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '1000',
        name: 'Assets',
        type: AccountType.ASSET,
      }, accounts);

      const cash = createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '1100',
        name: 'Cash',
        type: AccountType.ASSET,
        parentAccountId: assets.id,
      }, accounts);

      const pettyCash = createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '1110',
        name: 'Petty Cash',
        type: AccountType.ASSET,
        parentAccountId: cash.id,
      }, accounts);

      const checking = createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '1120',
        name: 'Checking Account',
        type: AccountType.ASSET,
        parentAccountId: cash.id,
      }, accounts);

      expect(pettyCash.parentAccountId).toBe(cash.id);
      expect(checking.parentAccountId).toBe(cash.id);
      expect(cash.parentAccountId).toBe(assets.id);
    });
  });

  // --------------------------------------------------------------------------
  // Hierarchy navigation via getAccountHierarchy()
  // --------------------------------------------------------------------------
  describe('Hierarchy navigation via getAccountHierarchy()', () => {
    it('returns root accounts at top level of tree', () => {
      createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '1000',
        name: 'Assets',
        type: AccountType.ASSET,
      }, accounts);

      createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '2000',
        name: 'Liabilities',
        type: AccountType.LIABILITY,
      }, accounts);

      const hierarchy = getAccountHierarchy(TEST_ENTITY_ID, accounts);

      expect(hierarchy).toHaveLength(2);
      const names = hierarchy.map(a => a.name);
      expect(names).toContain('Assets');
      expect(names).toContain('Liabilities');
    });

    it('nests children under their parent in the tree', () => {
      const assets = createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '1000',
        name: 'Assets',
        type: AccountType.ASSET,
      }, accounts);

      createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '1100',
        name: 'Cash',
        type: AccountType.ASSET,
        parentAccountId: assets.id,
      }, accounts);

      createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '1200',
        name: 'Receivables',
        type: AccountType.ASSET,
        parentAccountId: assets.id,
      }, accounts);

      const hierarchy = getAccountHierarchy(TEST_ENTITY_ID, accounts);

      expect(hierarchy).toHaveLength(1);
      expect(hierarchy[0].name).toBe('Assets');
      expect(hierarchy[0].children).toHaveLength(2);

      const childNames = hierarchy[0].children!.map((c: any) => c.name);
      expect(childNames).toContain('Cash');
      expect(childNames).toContain('Receivables');
    });

    it('builds a three-level deep hierarchy tree', () => {
      const assets = createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '1000',
        name: 'Assets',
        type: AccountType.ASSET,
      }, accounts);

      const cash = createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '1100',
        name: 'Cash',
        type: AccountType.ASSET,
        parentAccountId: assets.id,
      }, accounts);

      createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '1110',
        name: 'Petty Cash',
        type: AccountType.ASSET,
        parentAccountId: cash.id,
      }, accounts);

      createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '1120',
        name: 'Checking',
        type: AccountType.ASSET,
        parentAccountId: cash.id,
      }, accounts);

      createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '1200',
        name: 'Receivables',
        type: AccountType.ASSET,
        parentAccountId: assets.id,
      }, accounts);

      const hierarchy = getAccountHierarchy(TEST_ENTITY_ID, accounts);

      // Root level: just "Assets"
      expect(hierarchy).toHaveLength(1);
      const root = hierarchy[0];
      expect(root.name).toBe('Assets');

      // Level 2: Cash, Receivables
      expect(root.children).toHaveLength(2);

      const cashNode = root.children!.find((c: any) => c.name === 'Cash') as any;
      const receivablesNode = root.children!.find((c: any) => c.name === 'Receivables') as any;

      expect(cashNode).toBeDefined();
      expect(receivablesNode).toBeDefined();

      // Level 3: Petty Cash, Checking under Cash
      expect(cashNode.children).toHaveLength(2);
      const grandchildNames = cashNode.children.map((gc: any) => gc.name);
      expect(grandchildNames).toContain('Petty Cash');
      expect(grandchildNames).toContain('Checking');

      // Receivables has no children
      expect(receivablesNode.children).toHaveLength(0);
    });

    it('builds a full chart of accounts hierarchy with multiple root types', () => {
      // Assets
      const assets = createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '1000',
        name: 'Assets',
        type: AccountType.ASSET,
      }, accounts);

      createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '1100',
        name: 'Cash',
        type: AccountType.ASSET,
        parentAccountId: assets.id,
      }, accounts);

      // Liabilities
      const liabilities = createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '2000',
        name: 'Liabilities',
        type: AccountType.LIABILITY,
      }, accounts);

      createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '2100',
        name: 'Accounts Payable',
        type: AccountType.LIABILITY,
        parentAccountId: liabilities.id,
      }, accounts);

      // Equity
      createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '3000',
        name: 'Owner Equity',
        type: AccountType.EQUITY,
      }, accounts);

      const hierarchy = getAccountHierarchy(TEST_ENTITY_ID, accounts);

      // Three root accounts
      expect(hierarchy).toHaveLength(3);

      const assetsRoot = hierarchy.find(a => a.code === '1000');
      const liabilitiesRoot = hierarchy.find(a => a.code === '2000');
      const equityRoot = hierarchy.find(a => a.code === '3000');

      expect(assetsRoot).toBeDefined();
      expect(assetsRoot!.children).toHaveLength(1);

      expect(liabilitiesRoot).toBeDefined();
      expect(liabilitiesRoot!.children).toHaveLength(1);

      expect(equityRoot).toBeDefined();
      expect(equityRoot!.children).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------------
  // Filtering children by parentAccountId
  // --------------------------------------------------------------------------
  describe('Navigating children via getAccounts filter', () => {
    it('retrieves direct children of a parent using parentAccountId filter', () => {
      const assets = createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '1000',
        name: 'Assets',
        type: AccountType.ASSET,
      }, accounts);

      createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '1100',
        name: 'Cash',
        type: AccountType.ASSET,
        parentAccountId: assets.id,
      }, accounts);

      createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '1200',
        name: 'Receivables',
        type: AccountType.ASSET,
        parentAccountId: assets.id,
      }, accounts);

      // Also a non-child account
      createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '2000',
        name: 'Liabilities',
        type: AccountType.LIABILITY,
      }, accounts);

      const children = getAccounts({ parentAccountId: assets.id }, accounts);

      expect(children).toHaveLength(2);
      expect(children.every(c => c.parentAccountId === assets.id)).toBe(true);
    });

    it('retrieves top-level accounts using parentAccountId=null filter', () => {
      const assets = createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '1000',
        name: 'Assets',
        type: AccountType.ASSET,
      }, accounts);

      createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '1100',
        name: 'Cash',
        type: AccountType.ASSET,
        parentAccountId: assets.id,
      }, accounts);

      createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '2000',
        name: 'Liabilities',
        type: AccountType.LIABILITY,
      }, accounts);

      const topLevel = getAccounts({ parentAccountId: null }, accounts);

      // Only root accounts (no parentAccountId)
      expect(topLevel).toHaveLength(2);
      expect(topLevel.every(a => !a.parentAccountId)).toBe(true);
    });

    it('returns empty array when parent has no children', () => {
      const loneAccount = createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '1000',
        name: 'Lone Account',
        type: AccountType.ASSET,
      }, accounts);

      const children = getAccounts({ parentAccountId: loneAccount.id }, accounts);

      expect(children).toHaveLength(0);
    });

    it('does not return grandchildren when querying direct children', () => {
      const assets = createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '1000',
        name: 'Assets',
        type: AccountType.ASSET,
      }, accounts);

      const cash = createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '1100',
        name: 'Cash',
        type: AccountType.ASSET,
        parentAccountId: assets.id,
      }, accounts);

      createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '1110',
        name: 'Petty Cash',
        type: AccountType.ASSET,
        parentAccountId: cash.id,
      }, accounts);

      const directChildren = getAccounts({ parentAccountId: assets.id }, accounts);

      // Only Cash, not Petty Cash
      expect(directChildren).toHaveLength(1);
      expect(directChildren[0].name).toBe('Cash');
    });
  });

  // --------------------------------------------------------------------------
  // Hierarchy and inactive accounts
  // --------------------------------------------------------------------------
  describe('Hierarchy with inactive accounts', () => {
    it('excludes inactive accounts from hierarchy tree', () => {
      const assets = createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '1000',
        name: 'Assets',
        type: AccountType.ASSET,
      }, accounts);

      const cash = createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '1100',
        name: 'Cash',
        type: AccountType.ASSET,
        parentAccountId: assets.id,
      }, accounts);

      createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '1200',
        name: 'Receivables',
        type: AccountType.ASSET,
        parentAccountId: assets.id,
      }, accounts);

      // Soft-delete Cash
      const deleteResult = deleteAccount(cash.id, accounts);
      expect(deleteResult.errors).toHaveLength(0);
      // Update the account in our array
      const cashIndex = accounts.findIndex(a => a.id === cash.id);
      accounts[cashIndex] = deleteResult.account!;

      const hierarchy = getAccountHierarchy(TEST_ENTITY_ID, accounts);

      expect(hierarchy).toHaveLength(1);
      // Only Receivables remains as child
      expect(hierarchy[0].children).toHaveLength(1);
      expect((hierarchy[0].children![0] as any).name).toBe('Receivables');
    });

    it('excludes inactive parent from hierarchy, leaving children as orphans in tree', () => {
      const assets = createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '1000',
        name: 'Assets',
        type: AccountType.ASSET,
      }, accounts);

      const cash = createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '1100',
        name: 'Cash',
        type: AccountType.ASSET,
        parentAccountId: assets.id,
      }, accounts);

      // Deactivate child first so parent can be deactivated
      const deactivateChild = deleteAccount(cash.id, accounts);
      expect(deactivateChild.errors).toHaveLength(0);
      const childIdx = accounts.findIndex(a => a.id === cash.id);
      accounts[childIdx] = deactivateChild.account!;

      // Now deactivate parent
      const deactivateParent = deleteAccount(assets.id, accounts);
      expect(deactivateParent.errors).toHaveLength(0);
      const parentIdx = accounts.findIndex(a => a.id === assets.id);
      accounts[parentIdx] = deactivateParent.account!;

      const hierarchy = getAccountHierarchy(TEST_ENTITY_ID, accounts);

      // Both are inactive, hierarchy is empty
      expect(hierarchy).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------------
  // Edge cases: orphan accounts
  // --------------------------------------------------------------------------
  describe('Edge cases: orphan accounts', () => {
    it('rejects creation with nonexistent parentAccountId', () => {
      const result = createAccount({
        entityId: TEST_ENTITY_ID,
        code: '1100',
        name: 'Orphan',
        type: AccountType.ASSET,
        parentAccountId: 'nonexistent-parent-id',
      }, accounts);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.field === 'parentAccountId')).toBe(true);
    });

    it('rejects creation with parent from a different entity', () => {
      const foreignParent = createTestAccount({
        id: 'foreign-parent',
        entityId: 'different-entity',
        code: '1000',
        name: 'Foreign Assets',
      });
      accounts.push(foreignParent);

      const result = createAccount({
        entityId: TEST_ENTITY_ID,
        code: '1100',
        name: 'Cross-Entity Child',
        type: AccountType.ASSET,
        parentAccountId: 'foreign-parent',
      }, accounts);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.message.includes('same entity'))).toBe(true);
    });

    it('rejects creation with inactive parent', () => {
      const inactiveParent = createTestAccount({
        id: 'inactive-parent',
        code: '1000',
        name: 'Inactive Assets',
        isActive: false,
      });
      accounts.push(inactiveParent);

      const result = createAccount({
        entityId: TEST_ENTITY_ID,
        code: '1100',
        name: 'Child of Inactive',
        type: AccountType.ASSET,
        parentAccountId: 'inactive-parent',
      }, accounts);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.message.includes('inactive'))).toBe(true);
    });

    it('handles accounts whose parent was deactivated after creation', () => {
      // Create parent and child
      const parent = createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '1000',
        name: 'Assets',
        type: AccountType.ASSET,
      }, accounts);

      const child = createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '1100',
        name: 'Cash',
        type: AccountType.ASSET,
        parentAccountId: parent.id,
      }, accounts);

      // Deactivate child, then parent
      const deactivateChild = deleteAccount(child.id, accounts);
      accounts[accounts.findIndex(a => a.id === child.id)] = deactivateChild.account!;

      const deactivateParent = deleteAccount(parent.id, accounts);
      accounts[accounts.findIndex(a => a.id === parent.id)] = deactivateParent.account!;

      // Both inactive: hierarchy is empty
      const hierarchy = getAccountHierarchy(TEST_ENTITY_ID, accounts);
      expect(hierarchy).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------------
  // Edge cases: circular references
  // --------------------------------------------------------------------------
  describe('Edge cases: circular references', () => {
    it('rejects self-referencing parentAccountId on update', () => {
      const account = createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '1000',
        name: 'Assets',
        type: AccountType.ASSET,
      }, accounts);

      const errors = validateAccountUpdate(
        account.id,
        { parentAccountId: account.id },
        accounts
      );

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.message.includes('own parent'))).toBe(true);
    });

    it('rejects self-referencing parentAccountId via updateAccount', () => {
      const account = createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '1000',
        name: 'Assets',
        type: AccountType.ASSET,
      }, accounts);

      const result = updateAccount(
        account.id,
        { parentAccountId: account.id },
        accounts
      );

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.message.includes('own parent'))).toBe(true);
      expect(result.account).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // Reparenting accounts
  // --------------------------------------------------------------------------
  describe('Reparenting accounts', () => {
    it('moves an account from one parent to another', () => {
      const assets = createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '1000',
        name: 'Assets',
        type: AccountType.ASSET,
      }, accounts);

      const currentAssets = createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '1100',
        name: 'Current Assets',
        type: AccountType.ASSET,
        parentAccountId: assets.id,
      }, accounts);

      const fixedAssets = createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '1500',
        name: 'Fixed Assets',
        type: AccountType.ASSET,
        parentAccountId: assets.id,
      }, accounts);

      const equipment = createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '1510',
        name: 'Equipment',
        type: AccountType.ASSET,
        parentAccountId: currentAssets.id, // Initially under Current Assets
      }, accounts);

      // Verify initial placement
      expect(equipment.parentAccountId).toBe(currentAssets.id);

      // Move Equipment from Current Assets to Fixed Assets
      const moveResult = updateAccount(
        equipment.id,
        { parentAccountId: fixedAssets.id },
        accounts
      );

      expect(moveResult.errors).toHaveLength(0);
      expect(moveResult.account!.parentAccountId).toBe(fixedAssets.id);

      // Update accounts array with the moved account
      const eqIdx = accounts.findIndex(a => a.id === equipment.id);
      accounts[eqIdx] = moveResult.account!;

      // Verify hierarchy reflects the move
      const hierarchy = getAccountHierarchy(TEST_ENTITY_ID, accounts);
      const assetsNode = hierarchy.find(a => a.code === '1000');
      expect(assetsNode).toBeDefined();

      const currentNode = assetsNode!.children!.find((c: any) => c.code === '1100') as any;
      const fixedNode = assetsNode!.children!.find((c: any) => c.code === '1500') as any;

      // Current Assets should have no children now
      expect(currentNode.children).toHaveLength(0);
      // Fixed Assets should have Equipment
      expect(fixedNode.children).toHaveLength(1);
      expect(fixedNode.children[0].name).toBe('Equipment');
    });

    it('promotes an account to root by clearing parentAccountId', () => {
      const assets = createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '1000',
        name: 'Assets',
        type: AccountType.ASSET,
      }, accounts);

      const cash = createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '1100',
        name: 'Cash',
        type: AccountType.ASSET,
        parentAccountId: assets.id,
      }, accounts);

      // Promote Cash to root level by setting parentAccountId to null
      // (undefined would be a no-op since updateAccount checks !== undefined)
      const promoteResult = updateAccount(
        cash.id,
        { parentAccountId: null as any },
        accounts
      );

      expect(promoteResult.errors).toHaveLength(0);

      // Update accounts array
      const cashIdx = accounts.findIndex(a => a.id === cash.id);
      accounts[cashIdx] = promoteResult.account!;

      const hierarchy = getAccountHierarchy(TEST_ENTITY_ID, accounts);

      // Now both Assets and Cash are root-level
      expect(hierarchy).toHaveLength(2);
      const rootNames = hierarchy.map(a => a.name);
      expect(rootNames).toContain('Assets');
      expect(rootNames).toContain('Cash');

      // Assets should have no children
      const assetsNode = hierarchy.find(a => a.name === 'Assets');
      expect(assetsNode!.children).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------------
  // Deletion constraints in hierarchy
  // --------------------------------------------------------------------------
  describe('Deletion constraints in hierarchy', () => {
    it('prevents deletion of parent with active children', () => {
      const parent = createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '1000',
        name: 'Assets',
        type: AccountType.ASSET,
      }, accounts);

      createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '1100',
        name: 'Cash',
        type: AccountType.ASSET,
        parentAccountId: parent.id,
      }, accounts);

      const result = deleteAccount(parent.id, accounts);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.message.includes('children'))).toBe(true);
      expect(result.account).toBeNull();
    });

    it('allows deletion of parent after all children are deactivated', () => {
      const parent = createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '1000',
        name: 'Assets',
        type: AccountType.ASSET,
      }, accounts);

      const child = createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '1100',
        name: 'Cash',
        type: AccountType.ASSET,
        parentAccountId: parent.id,
      }, accounts);

      // Delete child first
      const childDeleteResult = deleteAccount(child.id, accounts);
      expect(childDeleteResult.errors).toHaveLength(0);
      accounts[accounts.findIndex(a => a.id === child.id)] = childDeleteResult.account!;

      // Now parent can be deleted
      const parentDeleteResult = deleteAccount(parent.id, accounts);
      expect(parentDeleteResult.errors).toHaveLength(0);
      expect(parentDeleteResult.account!.isActive).toBe(false);
    });

    it('allows deletion of leaf nodes in hierarchy', () => {
      const parent = createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '1000',
        name: 'Assets',
        type: AccountType.ASSET,
      }, accounts);

      const child = createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '1100',
        name: 'Cash',
        type: AccountType.ASSET,
        parentAccountId: parent.id,
      }, accounts);

      const grandchild = createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '1110',
        name: 'Petty Cash',
        type: AccountType.ASSET,
        parentAccountId: child.id,
      }, accounts);

      // Can delete grandchild (leaf)
      const result = deleteAccount(grandchild.id, accounts);
      expect(result.errors).toHaveLength(0);
      expect(result.account!.isActive).toBe(false);
    });

    it('requires bottom-up deletion order for multi-level hierarchy', () => {
      const root = createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '1000',
        name: 'Assets',
        type: AccountType.ASSET,
      }, accounts);

      const mid = createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '1100',
        name: 'Cash',
        type: AccountType.ASSET,
        parentAccountId: root.id,
      }, accounts);

      const leaf = createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '1110',
        name: 'Petty Cash',
        type: AccountType.ASSET,
        parentAccountId: mid.id,
      }, accounts);

      // Cannot delete root (has child "Cash")
      expect(deleteAccount(root.id, accounts).errors.length).toBeGreaterThan(0);

      // Cannot delete mid (has child "Petty Cash")
      expect(deleteAccount(mid.id, accounts).errors.length).toBeGreaterThan(0);

      // Delete leaf
      const leafResult = deleteAccount(leaf.id, accounts);
      expect(leafResult.errors).toHaveLength(0);
      accounts[accounts.findIndex(a => a.id === leaf.id)] = leafResult.account!;

      // Now mid can be deleted
      const midResult = deleteAccount(mid.id, accounts);
      expect(midResult.errors).toHaveLength(0);
      accounts[accounts.findIndex(a => a.id === mid.id)] = midResult.account!;

      // Now root can be deleted
      const rootResult = deleteAccount(root.id, accounts);
      expect(rootResult.errors).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------------
  // Entity isolation in hierarchy
  // --------------------------------------------------------------------------
  describe('Entity isolation in hierarchy', () => {
    it('getAccountHierarchy only returns accounts for the specified entity', () => {
      const otherEntityId = 'entity-other';

      createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '1000',
        name: 'Entity A Assets',
        type: AccountType.ASSET,
      }, accounts);

      // Manually add an account for a different entity
      accounts.push(createTestAccount({
        id: 'other-entity-acc',
        entityId: otherEntityId,
        code: '1000',
        name: 'Entity B Assets',
      }));

      const hierarchyA = getAccountHierarchy(TEST_ENTITY_ID, accounts);
      const hierarchyB = getAccountHierarchy(otherEntityId, accounts);

      expect(hierarchyA).toHaveLength(1);
      expect(hierarchyA[0].name).toBe('Entity A Assets');

      expect(hierarchyB).toHaveLength(1);
      expect(hierarchyB[0].name).toBe('Entity B Assets');
    });

    it('returns empty hierarchy for entity with no accounts', () => {
      createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '1000',
        name: 'Assets',
        type: AccountType.ASSET,
      }, accounts);

      const hierarchy = getAccountHierarchy('nonexistent-entity', accounts);
      expect(hierarchy).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------------
  // Complex hierarchy scenarios
  // --------------------------------------------------------------------------
  describe('Complex hierarchy scenarios', () => {
    it('handles a realistic chart of accounts with multiple branches and depths', () => {
      // Build a standard chart of accounts hierarchy
      // Level 0: Assets, Liabilities, Equity, Income, Expenses
      const assets = createAndTrack({
        entityId: TEST_ENTITY_ID, code: '1000', name: 'Assets', type: AccountType.ASSET,
      }, accounts);

      const liabilities = createAndTrack({
        entityId: TEST_ENTITY_ID, code: '2000', name: 'Liabilities', type: AccountType.LIABILITY,
      }, accounts);

      const equity = createAndTrack({
        entityId: TEST_ENTITY_ID, code: '3000', name: 'Equity', type: AccountType.EQUITY,
      }, accounts);

      const income = createAndTrack({
        entityId: TEST_ENTITY_ID, code: '4000', name: 'Income', type: AccountType.INCOME,
      }, accounts);

      const expenses = createAndTrack({
        entityId: TEST_ENTITY_ID, code: '5000', name: 'Expenses', type: AccountType.EXPENSE,
      }, accounts);

      // Level 1 under Assets
      const currentAssets = createAndTrack({
        entityId: TEST_ENTITY_ID, code: '1100', name: 'Current Assets',
        type: AccountType.ASSET, parentAccountId: assets.id,
      }, accounts);

      const fixedAssets = createAndTrack({
        entityId: TEST_ENTITY_ID, code: '1500', name: 'Fixed Assets',
        type: AccountType.ASSET, parentAccountId: assets.id,
      }, accounts);

      // Level 2 under Current Assets
      createAndTrack({
        entityId: TEST_ENTITY_ID, code: '1110', name: 'Cash on Hand',
        type: AccountType.ASSET, parentAccountId: currentAssets.id,
      }, accounts);

      createAndTrack({
        entityId: TEST_ENTITY_ID, code: '1120', name: 'Checking',
        type: AccountType.ASSET, parentAccountId: currentAssets.id,
      }, accounts);

      createAndTrack({
        entityId: TEST_ENTITY_ID, code: '1130', name: 'Savings',
        type: AccountType.ASSET, parentAccountId: currentAssets.id,
      }, accounts);

      // Level 2 under Fixed Assets
      createAndTrack({
        entityId: TEST_ENTITY_ID, code: '1510', name: 'Equipment',
        type: AccountType.ASSET, parentAccountId: fixedAssets.id,
      }, accounts);

      createAndTrack({
        entityId: TEST_ENTITY_ID, code: '1520', name: 'Vehicles',
        type: AccountType.ASSET, parentAccountId: fixedAssets.id,
      }, accounts);

      // Level 1 under Liabilities
      createAndTrack({
        entityId: TEST_ENTITY_ID, code: '2100', name: 'Accounts Payable',
        type: AccountType.LIABILITY, parentAccountId: liabilities.id,
      }, accounts);

      createAndTrack({
        entityId: TEST_ENTITY_ID, code: '2200', name: 'Notes Payable',
        type: AccountType.LIABILITY, parentAccountId: liabilities.id,
      }, accounts);

      // Level 1 under Expenses
      createAndTrack({
        entityId: TEST_ENTITY_ID, code: '5100', name: 'Operating Expenses',
        type: AccountType.EXPENSE, parentAccountId: expenses.id,
      }, accounts);

      const hierarchy = getAccountHierarchy(TEST_ENTITY_ID, accounts);

      // 5 root accounts
      expect(hierarchy).toHaveLength(5);

      // Verify Assets subtree
      const assetsRoot = hierarchy.find(a => a.code === '1000');
      expect(assetsRoot!.children).toHaveLength(2); // Current, Fixed

      const currentNode = assetsRoot!.children!.find((c: any) => c.code === '1100') as any;
      expect(currentNode.children).toHaveLength(3); // Cash, Checking, Savings

      const fixedNode = assetsRoot!.children!.find((c: any) => c.code === '1500') as any;
      expect(fixedNode.children).toHaveLength(2); // Equipment, Vehicles

      // Verify Liabilities subtree
      const liabRoot = hierarchy.find(a => a.code === '2000');
      expect(liabRoot!.children).toHaveLength(2); // AP, Notes Payable

      // Equity has no children
      const equityRoot = hierarchy.find(a => a.code === '3000');
      expect(equityRoot!.children).toHaveLength(0);

      // Income has no children
      const incomeRoot = hierarchy.find(a => a.code === '4000');
      expect(incomeRoot!.children).toHaveLength(0);

      // Expenses has one child
      const expenseRoot = hierarchy.find(a => a.code === '5000');
      expect(expenseRoot!.children).toHaveLength(1);

      // Total accounts: 15
      expect(accounts).toHaveLength(15);
    });

    it('each node in hierarchy has fresh empty children array (no cross-contamination)', () => {
      const root = createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '1000',
        name: 'Assets',
        type: AccountType.ASSET,
      }, accounts);

      createAndTrack({
        entityId: TEST_ENTITY_ID,
        code: '1100',
        name: 'Cash',
        type: AccountType.ASSET,
        parentAccountId: root.id,
      }, accounts);

      // Get hierarchy twice
      const hierarchy1 = getAccountHierarchy(TEST_ENTITY_ID, accounts);
      const hierarchy2 = getAccountHierarchy(TEST_ENTITY_ID, accounts);

      // Mutating one should not affect the other
      (hierarchy1[0].children as any[]).push({ fake: true });

      expect(hierarchy2[0].children).toHaveLength(1);
      expect(hierarchy1[0].children).toHaveLength(2); // has the mutation
    });
  });
});
