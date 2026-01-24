# Ledger Account Management Documentation

Documentation for the Trust Ledger System account management functionality.

---

## Overview

The account management system provides a complete double-entry bookkeeping implementation with:

- Full CRUD operations for accounts
- Credit/Debit classification with validation
- Hierarchical account structures
- Cursor-based pagination for large datasets
- React UI components with keyboard and touch navigation

---

## Documentation Files

### [API Reference](./api-reference.md)

Complete API documentation for `accountService.ts`.

**Contents:**
- Type definitions (CreateAccountInput, UpdateAccountInput, AccountFilters)
- CRUD operations (create, update, delete, get)
- Query functions (filter by type, class, entity)
- Hierarchy building (parent-child relationships)
- Pagination (cursor-based forward/backward)
- Account class determination utilities

**For:** Developers integrating the account service

### [User Guide](./user-guide.md)

Guide for using the AccountTable and AccountActivity UI components.

**Contents:**
- Component props and usage
- Keyboard shortcuts (navigation, editing)
- Touch gestures (swipe actions)
- Search and filter interface
- Inline editing workflow
- Activity view and CSV export
- Responsive behavior (desktop/mobile)
- Accessibility features

**For:** Developers using the UI components, end users

### [Chart of Accounts Best Practices](./chart-of-accounts-best-practices.md)

Double-entry bookkeeping principles and account structure design.

**Contents:**
- Double-entry fundamentals (accounting equation, debits/credits)
- Account types (Asset, Liability, Equity, Income, Expense)
- Account numbering systems and conventions
- Hierarchy design patterns
- Common account structures (service, retail businesses)
- Transaction examples with journal entries
- Best practices and anti-patterns
- Integration code examples

**For:** Developers designing charts of accounts, accountants

---

## Quick Start

### Create an Account

```typescript
import { createAccount, AccountType } from './services/accountService';

const result = createAccount({
  entityId: 'entity-001',
  code: '1000',
  name: 'Cash',
  type: AccountType.ASSET,
  beginningBalance: 5000
}, existingAccounts);

if (result.errors.length === 0) {
  console.log('Created:', result.account);
}
```

### Render Account Table

```typescript
import { AccountTable } from './components/AccountTable';

<AccountTable
  entityId="entity-001"
  onAccountSelect={(account) => setSelectedAccount(account)}
  onAccountCreate={() => setShowCreateModal(true)}
/>
```

### Build Account Hierarchy

```typescript
import { getAccountHierarchy } from './services/accountService';

const hierarchy = getAccountHierarchy('entity-001', accounts);
// Returns tree structure with children arrays
```

---

## Architecture

```
services/accountService.ts      # Core CRUD and validation logic
├── Types                       # Input/output interfaces
├── Validation                  # Account rules and constraints
├── CRUD Operations             # Create, update, delete (soft)
├── Queries                     # Filter, search, hierarchy
└── Pagination                  # Cursor-based forward/backward

components/AccountTable.tsx     # Virtualized account list UI
├── Keyboard navigation         # Arrow keys, Enter, Tab
├── Touch gestures              # Swipe left/right actions
├── Inline editing              # Name, description
└── Search & filter             # Type chips, text search

components/AccountActivity.tsx  # Transaction history view
├── Journal filtering           # Account-specific entries
├── Impact calculation          # Net balance change
└── CSV export                  # Download activity

types/accounts.ts               # Domain types
├── AccountType enum            # Asset, Liability, Equity, Income, Expense
├── DCFlag enum                 # Debit, Credit
└── Account interface           # Account entity definition
```

---

## Testing

All account service tests pass:

```bash
npm test -- accountService.test.ts
```

**Coverage:**
- 66 tests covering CRUD, validation, hierarchy, pagination
- Edge cases: empty datasets, invalid cursors, large limits
- Balance verification: accounting equation validation

---

## Track Reference

**Track:** `ledger_20260114` (Full Ledgering - Credit & Debit Account CRUD)

**Status:** Complete

This documentation completes the ledger track. All features implemented and documented.
