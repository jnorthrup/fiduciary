# Chart of Accounts Best Practices

Guide for designing and implementing a chart of accounts using double-entry bookkeeping principles.

---

## Double-Entry Fundamentals

### The Accounting Equation

```
Assets = Liabilities + Equity + (Income - Expenses)
```

This equation must always balance. Every transaction affects at least two accounts.

### Debits and Credits

| Account Type | Normal Balance | Increases With | Decreases With |
|--------------|----------------|----------------|----------------|
| **Asset** | Debit | Debit | Credit |
| **Expense** | Debit | Debit | Credit |
| **Liability** | Credit | Credit | Debit |
| **Equity** | Credit | Credit | Debit |
| **Income** | Credit | Credit | Debit |

**Memory Aid:**
- **DEBIT** accounts: Assets and Expenses (things you have or spend)
- **CREDIT** accounts: Liabilities, Equity, and Income (things you owe or earn)

### Transaction Rules

1. Every transaction must have equal debits and credits
2. At least one account is debited, at least one is credited
3. Total debits must equal total credits

---

## Account Types

### Assets (Debit Balance)

Resources owned by the entity. Current assets are liquid; non-current are long-term.

**Examples:**

| Code | Account | Description |
|------|---------|-------------|
| 1000 | Current Assets | Parent account |
| 1100 | Cash | Cash on hand and in bank |
| 1200 | Accounts Receivable | Money owed by customers |
| 1300 | Inventory | Goods held for sale |
| 1500 | Fixed Assets | Parent account |
| 1510 | Equipment | Long-term equipment |
| 1520 | Vehicles | Company vehicles |
| 1530 | Accumulated Depreciation | Contra-asset (credit balance) |

### Liabilities (Credit Balance)

Obligations owed by the entity. Current liabilities due within 1 year; non-current due later.

**Examples:**

| Code | Account | Description |
|------|---------|-------------|
| 2000 | Current Liabilities | Parent account |
| 2100 | Accounts Payable | Money owed to vendors |
| 2200 | Accrued Expenses | Expenses incurred, not paid |
| 2300 | Short-Term Debt | Loans due within 1 year |
| 2500 | Long-Term Liabilities | Parent account |
| 2510 | Long-Term Debt | Loans due after 1 year |

### Equity (Credit Balance)

Owner's residual interest in assets after liabilities.

**Examples:**

| Code | Account | Description |
|------|---------|-------------|
| 3000 | Owner's Equity | Parent account |
| 3100 | Capital | Owner's investment |
| 3200 | Retained Earnings | Accumulated profits |
| 3300 | Drawings | Owner's withdrawals (contra-equity, debit) |

### Income (Credit Balance)

Revenue generated from normal operations.

**Examples:**

| Code | Account | Description |
|------|---------|-------------|
| 4000 | Revenue | Parent account |
| 4100 | Sales Revenue | Product sales |
| 4200 | Service Revenue | Service income |
| 4300 | Interest Income | Interest earned |
| 4400 | Other Income | Non-operating income |

### Expenses (Debit Balance)

Costs incurred to generate revenue.

**Examples:**

| Code | Account | Description |
|------|---------|-------------|
| 5000 | Operating Expenses | Parent account |
| 5100 | Cost of Goods Sold | Direct costs of products |
| 5200 | Rent Expense | Facility costs |
| 5300 | Salary Expense | Employee compensation |
| 5400 | Utilities Expense | Power, water, internet |
| 5500 | Marketing Expense | Advertising and promotion |
| 5600 | Professional Fees | Legal, accounting, consulting |
| 5700 | Depreciation Expense | Fixed asset depreciation |

---

## Account Numbering System

### Standard Numbering

| Range | Account Type |
|-------|--------------|
| 1000-1999 | Assets |
| 2000-2999 | Liabilities |
| 3000-3999 | Equity |
| 4000-4999 | Income |
| 5000-5999 | Expenses |

### Hierarchical Numbering

Use sub-ranges for grouped accounts:

```
1000-1999  Assets
├── 1100-1199  Current Assets
│   ├── 1110  Cash
│   ├── 1120  Cash - Bank A
│   ├── 1130  Cash - Bank B
│   ├── 1200  Accounts Receivable
│   └── 1300  Inventory
└── 1500-1599  Fixed Assets
    ├── 1510  Equipment
    ├── 1520  Vehicles
    └── 1530  Buildings
```

### Gap Numbering

Leave gaps in numbering for future accounts:

```
1100 Cash
1200 Accounts Receivable
1300 Inventory
1400 (reserved)
1500 Prepaid Expenses
```

---

## Hierarchy Design

### Parent-Child Relationships

Parent accounts group related accounts for reporting.

**Rules:**
1. Parent accounts can have children or hold balances, not both
2. Children inherit account type from parent
3. Move children to another parent by updating `parentAccountId`

**Example:**

```
Current Assets (1000)
├── Cash (1100)
│   ├── Cash - Main Bank (1110)
│   └── Cash - Petty Cash (1120)
├── Accounts Receivable (1200)
└── Inventory (1300)
```

### Implementation

```typescript
import { createAccount } from './services/accountService';

let accounts = [];

// Create parent
const currentAssets = createAccount({
  entityId: 'entity-001',
  code: '1000',
  name: 'Current Assets',
  type: AccountType.ASSET
}, accounts);
accounts.push(currentAssets.account);

// Create children
const cash = createAccount({
  entityId: 'entity-001',
  code: '1100',
  name: 'Cash',
  type: AccountType.ASSET,
  parentAccountId: currentAssets.account.id
}, accounts);
accounts.push(cash.account);

const ar = createAccount({
  entityId: 'entity-001',
  code: '1200',
  name: 'Accounts Receivable',
  type: AccountType.ASSET,
  parentAccountId: currentAssets.account.id
}, accounts);
accounts.push(ar.account);
```

---

## Common Account Structures

### Service Business Chart of Accounts

```
1000  Assets
├── 1100  Current Assets
│   ├── 1110  Cash
│   ├── 1120  Accounts Receivable
│   └── 1130  Prepaid Expenses
└── 1500  Fixed Assets
    └── 1510  Equipment

2000  Liabilities
└── 2100  Current Liabilities
    ├── 2110  Accounts Payable
    └── 2120  Accrued Expenses

3000  Equity
├── 3100  Owner's Capital
├── 3200  Retained Earnings
└── 3300  Owner's Draw

4000  Income
└── 4100  Service Revenue

5000  Expenses
├── 5100  Cost of Services
├── 5200  Rent Expense
├── 5300  Salary Expense
├── 5400  Utilities Expense
├── 5500  Professional Fees
└── 5600  Other Expenses
```

### Retail Business Chart of Accounts

```
1000  Assets
├── 1100  Current Assets
│   ├── 1110  Cash
│   ├── 1120  Accounts Receivable
│   ├── 1130  Inventory
│   └── 1140  Prepaid Expenses
└── 1500  Fixed Assets
    ├── 1510  Equipment
    └── 1520  Accumulated Depreciation

2000  Liabilities
└── 2100  Current Liabilities
    ├── 2110  Accounts Payable
    ├── 2120  Sales Tax Payable
    └── 2130  Accrued Expenses

3000  Equity
├── 3100  Owner's Capital
├── 3200  Retained Earnings
└── 3300  Owner's Draw

4000  Income
├── 4100  Sales Revenue
├── 4200  Cost of Goods Sold
└── 4300  Other Income

5000  Expenses
├── 5100  Rent Expense
├── 5200  Salary Expense
├── 5300  Utilities Expense
├── 5400  Advertising Expense
├── 5500  Professional Fees
└── 5600  Depreciation Expense
```

---

## Transaction Examples

### Cash Sale

**Scenario:** Receive $500 cash for service.

```
Debit:  Cash (1100)               $500
Credit: Service Revenue (4100)    $500
```

### Sale on Credit

**Scenario:** Provide service for $1,000, bill customer.

```
Debit:  Accounts Receivable (1200)  $1,000
Credit: Service Revenue (4100)      $1,000
```

### Collect Receivable

**Scenario:** Customer pays $1,000 invoice.

```
Debit:  Cash (1100)                  $1,000
Credit: Accounts Receivable (1200)   $1,000
```

### Pay Rent

**Scenario:** Pay $2,000 rent.

```
Debit:  Rent Expense (5200)    $2,000
Credit: Cash (1100)            $2,000
```

### Purchase Equipment on Credit

**Scenario:** Buy $5,000 equipment on account.

```
Debit:  Equipment (1510)           $5,000
Credit: Accounts Payable (2110)    $5,000
```

### Owner Investment

**Scenario:** Owner invests $10,000.

```
Debit:  Cash (1100)              $10,000
Credit: Owner's Capital (3100)   $10,000
```

### Owner Withdrawal

**Scenario:** Owner withdraws $2,000.

```
Debit:  Owner's Draw (3300)      $2,000
Credit: Cash (1100)              $2,000
```

---

## Best Practices

### DO

1. **Use consistent numbering** - Leave gaps for future accounts
2. **Group related accounts** - Use parent accounts for reporting
3. **Use descriptive names** - "Cash - Main Bank" vs "Cash"
4. **Match account type to purpose** - Assets are resources, not expenses
5. **Keep chart simple** - Don't create accounts you won't use
6. **Review annually** - Archive unused accounts, add new ones as needed
7. **Document account purposes** - Use descriptions for clarity

### DON'T

1. **Don't mix account types** - Expenses under assets, etc.
2. **Don't reuse codes** - Each code must be unique within entity
3. **Don't delete accounts with balances** - Zero balance required for deletion
4. **Don't create circular hierarchies** - An account can't be its own parent
5. **Don't ignore normal balances** - Assets should normally have debit balances
6. **Don't use special characters in codes** - Alphanumeric with hyphens/dots only
7. **Don't make the chart too complex** - Start simple, add complexity as needed

---

## Account Lifecycle

### Creating Accounts

1. Determine account type (Asset, Liability, Equity, Income, Expense)
2. Assign appropriate code (follow numbering system)
3. Name the account clearly and descriptively
4. Set beginning balance if migrating from another system
5. Assign to parent account if grouping

### Updating Accounts

1. **Name changes:** Safe at any time
2. **Description changes:** Safe at any time
3. **Parent reassignment:** Allowed if same entity and parent is active
4. **Beginning balance:** Adjusts current balance to preserve activity

### Deleting Accounts

1. **Requirements:**
   - Balance must be zero
   - No active children
   - Account must exist

2. **Process:**
   - Zero out balance with journal entry
   - Delete or reassign children
   - Soft delete (isActive = false)

---

## Integration Examples

### Creating a Complete Chart

```typescript
import {
  createAccount,
  AccountType
} from './services/accountService';

let accounts = [];
const entityId = 'entity-001';

// Assets
const cash = createAccount({
  entityId,
  code: '1100',
  name: 'Cash',
  type: AccountType.ASSET,
  beginningBalance: 10000
}, accounts);
accounts.push(cash.account);

const ar = createAccount({
  entityId,
  code: '1200',
  name: 'Accounts Receivable',
  type: AccountType.ASSET
}, accounts);
accounts.push(ar.account);

// Liabilities
const ap = createAccount({
  entityId,
  code: '2100',
  name: 'Accounts Payable',
  type: AccountType.LIABILITY
}, accounts);
accounts.push(ap.account);

// Equity
const capital = createAccount({
  entityId,
  code: '3100',
  name: "Owner's Capital",
  type: AccountType.EQUITY,
  beginningBalance: 10000
}, accounts);
accounts.push(capital.account);

// Income
const revenue = createAccount({
  entityId,
  code: '4100',
  name: 'Service Revenue',
  type: AccountType.INCOME
}, accounts);
accounts.push(revenue.account);

// Expenses
const rent = createAccount({
  entityId,
  code: '5200',
  name: 'Rent Expense',
  type: AccountType.EXPENSE
}, accounts);
accounts.push(rent.account);

// Verify balance
import { getAccountTotals } from './services/accountService';
const totals = getAccountTotals(entityId, accounts);
console.log('Balanced:', totals.debitTotal === totals.creditTotal);
```

### Querying Accounts

```typescript
import {
  getAccounts,
  getCreditAccounts,
  getDebitAccounts,
  getAccountHierarchy,
  AccountType
} from './services/accountService';

// All active asset accounts
const assets = getAccounts({
  entityId: 'entity-001',
  type: AccountType.ASSET,
  isActive: true
}, accounts);

// For transaction entry (dropdowns)
const debitAccounts = getDebitAccounts('entity-001', accounts);
const creditAccounts = getCreditAccounts('entity-001', accounts);

// For balance sheet reporting
const hierarchy = getAccountHierarchy('entity-001', accounts);
hierarchy.forEach(parent => {
  console.log(`${parent.code}: ${parent.name}`);
  parent.children?.forEach(child => {
    console.log(`  ${child.code}: ${child.name} - $${child.balance}`);
  });
});
```

---

## Reporting

### Balance Sheet

Reports assets, liabilities, and equity at a point in time.

**Structure:**

```
ASSETS
Current Assets
  Cash                    $10,000
  Accounts Receivable      $5,000
  Total Current Assets    $15,000

Fixed Assets
  Equipment               $20,000
  Less: Accum. Depr.     ($5,000)
  Net Fixed Assets        $15,000

TOTAL ASSETS             $30,000

LIABILITIES & EQUITY
Current Liabilities
  Accounts Payable         $3,000
  Total Liabilities        $3,000

Equity
  Owner's Capital         $25,000
  Retained Earnings        $2,000
  Total Equity            $27,000

TOTAL LIAB & EQUITY      $30,000
```

### Income Statement

Reports revenue and expenses over a period.

**Structure:**

```
REVENUE
  Service Revenue          $50,000

  Total Revenue            $50,000

EXPENSES
  Cost of Services         $15,000
  Rent Expense             $5,000
  Salary Expense           $20,000
  Utilities Expense        $2,000

  Total Expenses           $42,000

NET INCOME                 $8,000
```

---

## References

- **API Reference:** `/docs/ledger/api-reference.md`
- **User Guide:** `/docs/ledger/user-guide.md`
- **Source Code:** `/services/accountService.ts`
- **Types:** `/types/accounts.ts`
- **Tests:** `/services/accountService.test.ts`
