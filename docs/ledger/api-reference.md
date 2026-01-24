# Account Service API Reference

Account management service for the Trust Ledger System. Provides CRUD operations, validation, hierarchy support, and cursor-based pagination for double-entry bookkeeping accounts.

**Source:** `/services/accountService.ts`

---

## Types

### CreateAccountInput

Input for creating a new account.

```typescript
interface CreateAccountInput {
  entityId: string;           // Required: Entity this account belongs to
  code: string;               // Required: Account code (e.g., "1000", "1100")
  name: string;               // Required: Account name
  type: AccountType;          // Required: Asset, Liability, Equity, Income, or Expense
  description?: string;       // Optional description
  taxLine?: string;           // Optional tax line mapping
  parentAccountId?: string;   // Optional parent account for hierarchy
  normalBalance?: DCFlag;     // Optional: Debit or Credit (auto-detected if omitted)
  beginningBalance?: number;  // Optional: Starting balance (defaults to 0)
}
```

### UpdateAccountInput

Partial input for updating an existing account.

```typescript
interface UpdateAccountInput {
  name?: string;              // New account name
  description?: string;       // New description
  taxLine?: string;           // New tax line
  parentAccountId?: string;   // Reassign to different parent
  isActive?: boolean;         // Soft delete (false = inactive)
  beginningBalance?: number;  // Adjust beginning balance
}
```

### AccountFilters

Filters for querying accounts.

```typescript
interface AccountFilters {
  entityId?: string;          // Filter by entity
  type?: AccountType;         // Filter by account type
  accountClass?: AccountClass;// Filter by 'Credit' or 'Debit'
  isActive?: boolean;         // Filter active/inactive
  parentAccountId?: string | null;  // Filter by parent (null = top-level only)
  searchTerm?: string;        // Search in code, name, description
}
```

### PaginationResult

Result from cursor-based pagination.

```typescript
interface PaginationResult<T> {
  data: T[];                  // Current page of items
  nextCursor: string | null;  // Cursor for next page
  previousCursor: string | null; // Cursor for previous page
  hasNext: boolean;           // Whether next page exists
  hasPrevious: boolean;       // Whether previous page exists
  totalCount: number;         // Total matching records
}
```

### ValidationError

Validation error returned from create/update operations.

```typescript
interface ValidationError {
  field: string;              // Field that failed validation
  message: string;            // Error message
}
```

---

## Account Class Determination

### getAccountClass(type: AccountType): AccountClass

Determines account class (Debit or Credit) based on account type.

**Returns:**
- `'Debit'` for Asset and Expense accounts
- `'Credit'` for Liability, Equity, and Income accounts

```typescript
import { getAccountClass, AccountType } from './services/accountService';

getAccountClass(AccountType.ASSET);     // 'Debit'
getAccountClass(AccountType.LIABILITY); // 'Credit'
```

### getDefaultNormalBalance(type: AccountType): DCFlag

Returns the normal balance (Debit or Credit) for an account type.

**Returns:**
- `DCFlag.Debit` for Asset and Expense accounts
- `DCFlag.Credit` for Liability, Equity, and Income accounts

```typescript
import { getDefaultNormalBalance, AccountType, DCFlag } from './services/accountService';

getDefaultNormalBalance(AccountType.ASSET);  // DCFlag.Debit
getDefaultNormalBalance(AccountType.LIABILITY); // DCFlag.Credit
```

---

## Validation

### validateAccountInput(input, existingAccounts): ValidationError[]

Validates input for creating a new account.

**Rules:**
- `code`, `name`, `entityId`, `type` are required
- Code must be alphanumeric (hyphens and dots allowed)
- Code must be unique within entity
- Parent account must exist, belong to same entity, and be active
- Normal balance must match account type (if provided)

**Returns:** Array of validation errors (empty if valid)

```typescript
import { validateAccountInput } from './services/accountService';

const errors = validateAccountInput(input, existingAccounts);
if (errors.length > 0) {
  errors.forEach(e => console.log(`${e.field}: ${e.message}`));
}
```

### validateAccountUpdate(accountId, updates, existingAccounts): ValidationError[]

Validates input for updating an account.

**Rules:**
- Account must exist
- Cannot be self-referencing parent
- New parent must exist, belong to same entity, and be active

**Returns:** Array of validation errors (empty if valid)

---

## CRUD Operations

### createAccount(input, existingAccounts): Result

Creates a new account with validation.

**Parameters:**
- `input: CreateAccountInput` - Account data
- `existingAccounts: Account[]` - Current account list for validation

**Returns:**
```typescript
{
  account: Account | null;  // Created account, or null if errors
  errors: ValidationError[]; // Validation errors (empty if success)
}
```

**Behavior:**
- Auto-detects `accountClass` from `type`
- Auto-detects `normalBalance` if not provided
- Converts `code` to uppercase
- Auto-generates UUID `id`
- Sets `isActive` to true
- Initial `balance` equals `beginningBalance`

```typescript
import { createAccount } from './services/accountService';

const result = createAccount({
  entityId: 'entity-001',
  code: '1000',
  name: 'Cash on Hand',
  type: AccountType.ASSET,
  beginningBalance: 5000
}, existingAccounts);

if (result.errors.length === 0) {
  const newAccount = result.account;
  console.log(`Created ${newAccount.code}: ${newAccount.name}`);
}
```

### updateAccount(accountId, updates, existingAccounts): Result

Updates an existing account.

**Parameters:**
- `accountId: string` - ID of account to update
- `updates: UpdateAccountInput` - Fields to update (partial)
- `existingAccounts: Account[]` - Current account list

**Returns:**
```typescript
{
  account: Account | null;  // Updated account, or null if errors
  errors: ValidationError[]; // Validation errors (empty if success)
}
```

**Behavior:**
- When `beginningBalance` changes, `balance` is recalculated preserving activity
- Increments `_version` number

```typescript
import { updateAccount } from './services/accountService';

const result = updateAccount('acc-123', {
  name: 'Updated Account Name',
  description: 'New description'
}, existingAccounts);
```

### deleteAccount(accountId, existingAccounts): Result

Soft deletes an account by setting `isActive = false`.

**Parameters:**
- `accountId: string` - ID of account to delete
- `existingAccounts: Account[]` - Current account list

**Returns:**
```typescript
{
  account: Account | null;  // Deactivated account, or null if errors
  errors: ValidationError[]; // Validation errors (empty if success)
}
```

**Restrictions:**
- Account must have `balance === 0`
- Account must not have active children

```typescript
import { deleteAccount } from './services/accountService';

const result = deleteAccount('acc-123', existingAccounts);
if (result.errors.length > 0) {
  console.log('Cannot delete:', result.errors[0].message);
}
```

---

## Queries

### getAccount(accountId, accounts): Account | null

Retrieves a single account by ID.

```typescript
import { getAccount } from './services/accountService';

const account = getAccount('acc-123', accounts);
if (account) {
  console.log(`${account.code}: ${account.name} - $${account.balance}`);
}
```

### getAccounts(filters, accounts): Account[]

Retrieves accounts matching filters, sorted by code then name.

**Parameters:**
- `filters: AccountFilters` - Filter criteria
- `accounts: Account[]` - Account list to search

**Returns:** Filtered and sorted array of accounts

```typescript
import { getAccounts, AccountType } from './services/accountService';

// All active asset accounts for entity
const assets = getAccounts({
  entityId: 'entity-001',
  type: AccountType.ASSET,
  isActive: true
}, accounts);

// Top-level accounts only (no parent)
const rootAccounts = getAccounts({
  parentAccountId: null
}, accounts);

// Search accounts
const searchResults = getAccounts({
  searchTerm: 'cash'
}, accounts);
```

### getCreditAccounts(entityId, accounts, activeOnly?): Account[]

Convenience method to get credit accounts (Liability, Equity, Income).

**Parameters:**
- `entityId: string` - Entity to filter by
- `accounts: Account[]` - Account list
- `activeOnly: boolean` - Filter active accounts only (default: true)

```typescript
import { getCreditAccounts } from './services/accountService';

const creditAccounts = getCreditAccounts('entity-001', accounts);
```

### getDebitAccounts(entityId, accounts, activeOnly?): Account[]

Convenience method to get debit accounts (Asset, Expense).

**Parameters:**
- `entityId: string` - Entity to filter by
- `accounts: Account[]` - Account list
- `activeOnly: boolean` - Filter active accounts only (default: true)

```typescript
import { getDebitAccounts } from './services/accountService';

const debitAccounts = getDebitAccounts('entity-001', accounts);
```

### getActiveAccounts(entityId, accounts): Account[]

Convenience method to get all active accounts for an entity.

```typescript
import { getActiveAccounts } from './services/accountService';

const activeAccounts = getActiveAccounts('entity-001', accounts);
```

---

## Hierarchy

### getAccountHierarchy(entityId, accounts): Account[]

Builds a tree structure from flat account list using `parentAccountId` relationships.

**Parameters:**
- `entityId: string` - Entity to filter by
- `accounts: Account[]` - Flat account list

**Returns:** Array of root-level accounts with populated `children` arrays

**Behavior:**
- Only includes active accounts
- Populates `children` property on parent accounts
- Returns multiple root accounts (multiple hierarchies)

```typescript
import { getAccountHierarchy } from './services/accountService';

const hierarchy = getAccountHierarchy('entity-001', accounts);

// Traverse tree
hierarchy.forEach(root => {
  console.log(root.code, root.name);
  root.children?.forEach(child => {
    console.log('  ', child.code, child.name);
  });
});
```

---

## Totals

### getAccountTotals(entityId, accounts): Totals

Calculates totals by account class for an entity.

**Parameters:**
- `entityId: string` - Entity to calculate for
- `accounts: Account[]` - Account list

**Returns:**
```typescript
{
  debitTotal: number;   // Assets + Expenses
  creditTotal: number;  // Liabilities + Equity + Income
  netWorth: number;     // Assets - Liabilities
  breakdown: {
    [AccountType.ASSET]: number;
    [AccountType.LIABILITY]: number;
    [AccountType.EQUITY]: number;
    [AccountType.INCOME]: number;
    [AccountType.EXPENSE]: number;
  };
}
```

```typescript
import { getAccountTotals } from './services/accountService';

const totals = getAccountTotals('entity-001', accounts);

console.log('Total Debits:', totals.debitTotal);
console.log('Total Credits:', totals.creditTotal);
console.log('Net Worth:', totals.netWorth);
console.log('Net Income:', totals.breakdown.INCOME - totals.breakdown.EXPENSE);
```

---

## Cursor-Based Pagination

### fetchNext(cursor, limit, accounts, filters?): PaginationResult

Fetches the next page of accounts.

**Parameters:**
- `cursor: string | null` - Base64 cursor from previous page, or `null` for first page
- `limit: number` - Items per page (max 100)
- `accounts: Account[]` - Full account list
- `filters?: AccountFilters` - Optional filters

**Returns:** `PaginationResult<Account>`

**Behavior:**
- Sorted by code, then name
- Graceful degradation for invalid cursors (returns first page)
- `limit` is clamped between 1 and 100

```typescript
import { fetchNext } from './services/accountService';

// First page
let page = fetchNext(null, 20, accounts, {
  entityId: 'entity-001',
  isActive: true
});

console.log(`Showing ${page.data.length} of ${page.totalCount} accounts`);

// Subsequent pages
while (page.hasNext) {
  page = fetchNext(page.nextCursor, 20, accounts);
  // Process page.data...
}
```

### fetchPrevious(cursor, limit, accounts, filters?): PaginationResult

Fetches the previous page of accounts.

**Parameters:**
- `cursor: string | null` - Base64 cursor from `previousCursor` of current page
- `limit: number` - Items per page (max 100)
- `accounts: Account[]` - Full account list
- `filters?: AccountFilters` - Optional filters

**Returns:** `PaginationResult<Account>`

**Behavior:**
- The cursor from `fetchNext`'s `previousCursor` points to an item that will be the **last** item on this page
- Graceful degradation for invalid cursors (returns last page)

```typescript
import { fetchNext, fetchPrevious } from './services/accountService';

// Navigate forward
const page1 = fetchNext(null, 20, accounts);
const page2 = fetchNext(page1.nextCursor, 20, accounts);

// Navigate back
const page1Again = fetchPrevious(page2.previousCursor, 20, accounts);
// page1Again.data should equal page1.data
```

---

## Constants

### AccountType Enum

```typescript
enum AccountType {
  ASSET = 'Asset',
  LIABILITY = 'Liability',
  EQUITY = 'Equity',
  INCOME = 'Income',
  EXPENSE = 'Expense'
}
```

### DCFlag Enum

```typescript
enum DCFlag {
  Debit = 'Debit',
  Credit = 'Credit'
}
```

### AccountClass Type

```typescript
type AccountClass = 'Debit' | 'Credit';
```

---

## Usage Examples

### Create a Chart of Accounts

```typescript
import {
  createAccount,
  AccountType,
  DCFlag
} from './services/accountService';

let accounts = [];

// Asset accounts
const cash = createAccount({
  entityId: 'entity-001',
  code: '1000',
  name: 'Cash',
  type: AccountType.ASSET,
  beginningBalance: 10000
}, accounts);

accounts.push(cash.account);

// Liability accounts
const ap = createAccount({
  entityId: 'entity-001',
  code: '2000',
  name: 'Accounts Payable',
  type: AccountType.LIABILITY
}, accounts);

accounts.push(ap.account);
```

### Build Account Hierarchy

```typescript
// Create parent account
const parent = createAccount({
  entityId: 'entity-001',
  code: '1000',
  name: 'Current Assets',
  type: AccountType.ASSET
}, accounts);
accounts.push(parent.account);

// Create child accounts
const cash = createAccount({
  entityId: 'entity-001',
  code: '1100',
  name: 'Cash',
  type: AccountType.ASSET,
  parentAccountId: parent.account.id
}, accounts);
accounts.push(cash.account);

const ar = createAccount({
  entityId: 'entity-001',
  code: '1200',
  name: 'Accounts Receivable',
  type: AccountType.ASSET,
  parentAccountId: parent.account.id
}, accounts);
accounts.push(ar.account);

// Get hierarchy
const hierarchy = getAccountHierarchy('entity-001', accounts);
// Returns: [{ code: '1000', name: 'Current Assets', children: [...] }]
```

### Paginate Large Account Lists

```typescript
import { fetchNext, fetchPrevious } from './services/accountService';

let currentCursor = null;
const pageSize = 50;

// Fetch first page
const firstPage = fetchNext(currentCursor, pageSize, accounts, {
  accountClass: 'Debit'
});

// Forward navigation
if (firstPage.hasNext) {
  const secondPage = fetchNext(firstPage.nextCursor, pageSize, accounts);
}

// Backward navigation
if (secondPage.hasPrevious) {
  const backToFirst = fetchPrevious(secondPage.previousCursor, pageSize, accounts);
}
```
