# Implementation Plan: Full Ledgering System - Credit & Debit Account CRUD

## Phase 1: Account CRUD Foundation

### 1.1 Extend Account Interface
- [x] Task: Add account hierarchy support [cfa9e34]
  - [x] Sub-task: Add `parentAccountId?: string` to Account interface
  - [x] Sub-task: Add `children?: Account[]` for nested display
  - [x] Sub-task: Add `accountClass: 'Credit' | 'Debit'` for quick filtering
- [x] Task: Add account metadata [cfa9e34]
  - [x] Sub-task: Add `description?: string`
  - [x] Sub-task: Add `taxLine?: string` for tax mapping
  - [x] Sub-task: Add `isActive: boolean` for soft delete

### 1.2 Implement Account CRUD Operations
- [x] Task: Create `accountService.ts` module [cfa9e34]
  - [x] Sub-task: Implement `createAccount(entityId, accountData)` with validation
  - [x] Sub-task: Implement `getAccount(accountId)` with entity filtering
  - [x] Sub-task: Implement `getAccounts(filters)` with entity/type/class filters
  - [x] Sub-task: Implement `updateAccount(accountId, updates)` with balance validation
  - [x] Sub-task: Implement `deleteAccount(accountId)` with soft delete
  - [x] Sub-task: Implement `getAccountHierarchy()` for tree structure
- [x] Task: Add account validation rules [cfa9e34]
  - [x] Sub-task: Validate account code uniqueness within entity
  - [x] Sub-task: Validate debit/credit balance rules by account type
  - [x] Sub-task: Validate parent account exists (for hierarchy)

### 1.3 Extend LedgerService Context
- [x] Task: Wire account CRUD into LedgerContext [cfa9e34]
  - [x] Sub-task: Add `createAccount()` to context
  - [x] Sub-task: Add `getAccount()` to context
  - [x] Sub-task: Add `getAccounts()` to context
  - [x] Sub-task: Add `updateAccount()` to context
  - [x] Sub-task: Add `deleteAccount()` to context
  - [x] Sub-task: Add `getAccountTree()` to context
- [x] Task: Add account queries [cfa9e34]
  - [x] Sub-task: `getCreditAccounts(entityId)` - Liability, Equity, Income
  - [x] Sub-task: `getDebitAccounts(entityId)` - Asset, Expense
  - [x] Sub-task: `getActiveAccounts(entityId)` - filter isActive=true

## Phase 2: Account UI Components

### 2.1 Account Management Component
- [ ] Task: Create `AccountManager.tsx` component
  - [ ] Sub-task: Display account list with hierarchy (tree view)
  - [ ] Sub-task: Filter by account class (Credit/Debit)
  - [ ] Sub-task: Filter by account type (Asset/Liability/Equity/Income/Expense)
  - [ ] Sub-task: Search by code or name
- [ ] Task: Add account actions
  - [ ] Sub-task: Create account button with modal
  - [ ] Sub-task: Edit account inline or modal
  - [ ] Sub-task: Delete account with confirmation
  - [ ] Sub-task: View account details (balance, journal history)

### 2.2 Account Form Component
- [ ] Task: Create `AccountForm.tsx` component
  - [ ] Sub-task: Account code input with validation
  - [ ] Sub-task: Account name input
  - [ ] Sub-task: Account type dropdown (Asset/Liability/Equity/Income/Expense)
  - [ ] Sub-task: Normal balance auto-select based on type
  - [ ] Sub-task: Parent account dropdown (for hierarchy)
  - [ ] Sub-task: Description textarea
  - [ ] Sub-task: Tax line mapping input

### 2.3 Account Dashboard Widget
- [ ] Task: Create `AccountSummary.tsx` widget
  - [ ] Sub-task: Display total assets vs liabilities
  - [ ] Sub-task: Display equity calculation
  - [ ] Sub-task: Display income/expense summary
  - [ ] Sub-task: Quick links to create accounts

## Phase 3: Journal Entry Integration

### 3.1 Enhanced Journal Posting
- [ ] Task: Update `postJournal()` to use new account service
  - [ ] Sub-task: Validate accounts exist before posting
  - [ ] Sub-task: Check account active status
  - [ ] Sub-task: Update account balances atomically
  - [ ] Sub-task: Handle sub-account aggregation

### 3.2 Account Activity View
- [ ] Task: Create `AccountActivity.tsx` component
  - [ ] Sub-task: Display journal entries for account
  - [ ] Sub-task: Show running balance calculation
  - [ ] Sub-task: Filter by date range
  - [ ] Sub-task: Export to CSV

## Phase 4: Testing & Documentation

- [ ] Task: Write account CRUD tests
  - [ ] Sub-task: Test account creation with validation
  - [ ] Sub-task: Test account update rules
  - [ ] Sub-task: Test account soft delete
  - [ ] Sub-task: Test hierarchy queries
- [ ] Task: Write integration tests
  - [ ] Sub-task: Test journal posting updates balances
  - [ ] Sub-task: Test balance sheet calculation
  - [ ] Sub-task: Test income statement calculation
- [ ] Task: Document account management
  - [ ] Sub-task: API documentation for accountService
  - [ ] Sub-task: User guide for account management UI
  - [ ] Sub-task: Chart of Accounts best practices

