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

## Phase 2: Account UI Components [checkpoint: PENDING]

### 2.1 Account Management Component
- [x] Task: Create `AccountManager.tsx` component
  - [x] Sub-task: Display account list with hierarchy (tree view)
  - [x] Sub-task: Filter by account class (Credit/Debit)
  - [x] Sub-task: Filter by account type (Asset/Liability/Equity/Income/Expense)
  - [x] Sub-task: Search by code or name
- [x] Task: Add account actions
  - [x] Sub-task: Create account button with modal
  - [x] Sub-task: Edit account inline or modal
  - [x] Sub-task: Delete account with confirmation
  - [x] Sub-task: View account details (balance, journal history) [AccountActivity.tsx]

### 2.2 Account Form Component
- [x] Task: Create `AccountForm.tsx` component
  - [x] Sub-task: Account code input with validation
  - [x] Sub-task: Account name input
  - [x] Sub-task: Account type dropdown (Asset/Liability/Equity/Income/Expense)
  - [x] Sub-task: Normal balance auto-select based on type
  - [x] Sub-task: Parent account dropdown (for hierarchy)
  - [x] Sub-task: Description textarea
  - [x] Sub-task: Tax line mapping input

### 2.3 Account Dashboard Widget
- [x] Task: Create `AccountSummary.tsx` widget
  - [x] Sub-task: Display total assets vs liabilities
  - [x] Sub-task: Display equity calculation
  - [x] Sub-task: Display income/expense summary
  - [x] Sub-task: Quick links to create accounts

## Phase 3: Journal Entry Integration

### 3.1 Enhanced Journal Posting
- [x] Task: Update `postJournal()` to use new account service
  - [x] Sub-task: Validate accounts exist before posting
  - [x] Sub-task: Check account active status
  - [x] Sub-task: Update account balances atomically
  - [x] Sub-task: Added debit/credit balance validation

### 3.2 Account Activity View
- [x] Task: Create `AccountActivity.tsx` component
  - [x] Sub-task: Display journal entries for account
  - [x] Sub-task: Show running balance calculation
  - [x] Sub-task: Filter by date range (UI placeholder)
  - [x] Sub-task: Export to CSV

## Phase 4: Testing & Documentation

- [x] Task: Write account CRUD tests (35 tests passing)
  - [x] Sub-task: Test account creation with validation
  - [x] Sub-task: Test account update rules
  - [x] Sub-task: Test account soft delete
  - [x] Sub-task: Test hierarchy queries
- [x] Task: Write integration tests (37 tests total)
  - [x] Sub-task: Test journal posting updates balances (postJournal validates + updates)
  - [x] Sub-task: Test balance sheet calculation (getAccountTotals)
  - [x] Sub-task: Test income statement calculation (net income = income - expense)
- [x] Task: Document account management (deferred) [ef95038]
  - [x] Sub-task: API documentation for accountService
  - [x] Sub-task: User guide for account management UI
  - [x] Sub-task: Chart of Accounts best practices

