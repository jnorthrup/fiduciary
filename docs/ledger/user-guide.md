# Account Management UI User Guide

Guide for using the Account Management interface in the Trust Ledger System.

**Components:** `/components/AccountTable.tsx`, `/components/AccountActivity.tsx`

---

## Overview

The account management interface provides:

- **AccountTable**: Browse, search, edit, and manage accounts with keyboard navigation and touch gestures
- **AccountActivity**: View transaction history and activity for a specific account

---

## AccountTable Component

### Features

| Feature | Description |
|---------|-------------|
| **Keyboard Navigation** | Arrow keys, Enter, Tab for navigation and editing |
| **Touch Gestures** | Swipe left for actions, swipe right to edit |
| **Virtual Scrolling** | Handles large account lists efficiently |
| **Inline Editing** | Edit account name and description directly |
| **Search & Filter** | Filter by account type, search by code/name |

### Props

```typescript
interface Props {
  entityId: string;                    // Required: Entity to display accounts for
  onAccountSelect?: (account) => void; // Optional: Callback when account selected
  onAccountCreate?: () => void;        // Optional: Callback when "Add" clicked
  onSwipeLeftAction?: (id) => void;    // Optional: Custom left swipe handler
  onSwipeRightAction?: (id) => void;   // Optional: Custom right swipe handler
}
```

### Usage Example

```typescript
import { AccountTable } from './components/AccountTable';

<AccountTable
  entityId="entity-001"
  onAccountSelect={(account) => {
    setSelectedAccount(account);
    setShowActivity(true);
  }}
  onAccountCreate={() => setShowCreateModal(true)}
/>
```

---

## Keyboard Shortcuts

### Navigation

| Key | Action |
|-----|--------|
| `ArrowUp` / `ArrowDown` | Move between rows |
| `ArrowLeft` / `ArrowRight` | Move between cells in a row |
| `Tab` | Move to next row |
| `Enter` | Start editing current row |
| `E` | Start editing current row |

### Editing Mode

| Key | Action |
|-----|--------|
| `Enter` | Save changes |
| `Tab` | Move between fields (name -> description -> save button) |
| `Shift + Tab` | Move backward between fields |
| `Esc` | Cancel editing |

### Visual Hints

A keyboard hint banner displays at the top of the table (desktop only):

```
[↑↓←→] Navigate    [Enter] Edit    [Esc] Cancel    [Tab] Next
```

---

## Touch Gestures

### Swipe Left

Reveals action buttons (Edit and Delete).

```
[ Account Row ] → Swipe Left → [ Edit ] [ Delete ]
```

### Swipe Right

Activates inline editing mode.

```
[ Account Row ] → Swipe Right → [ Inline Edit Form ]
```

### Gesture Detection

- **Distance Threshold**: 30px minimum horizontal movement
- **Velocity Threshold**: 0.5 px/ms (production only)
- **Vertical Rejection**: Vertical movement cancels horizontal gesture

---

## Search and Filter

### Search Bar

Located in the header, searches account codes and names.

```
Search: "cash"
→ Matches: "1000 Cash", "1100 Cash on Hand"
```

### Type Filter Chips

Filter by account type with clickable chips:

```
[ All ] [ Asset ] [ Liability ] [ Equity ] [ Income ] [ Expense ]
```

- Active filter highlighted in dark
- Scrollable horizontally on mobile

---

## Inline Editing

### Edit Mode Interface

When editing is activated:

```
┌─────────────────────────────────────────┐
│ Account Name: [_______________]         │
│ Description: [_______________]          │
│ [Save] [Cancel]                         │
└─────────────────────────────────────────┘
```

### Validation

| Field | Validation |
|-------|------------|
| Account Name | Required, max 100 chars, no special characters |
| Description | Optional, max 500 chars |

**Valid Characters**: Letters, numbers, spaces, `&`, `-`, `.`, `,`, `'`, `(`, `)`

### Edit Flow

1. Activate edit mode (Enter key, E key, or swipe right)
2. Modify fields
3. Press Enter or click Save to commit
4. Or press Esc or click Cancel to discard

---

## Account Display

### Row Layout

Each account row displays three cells:

| Cell | Content |
|------|---------|
| **Type & Code** | Account type badge, code in monospace |
| **Name & Description** | Account name (bold), description (gray) |
| **Balance** | Current balance, normal balance indicator |

### Color Coding

| Account Type | Badge Color |
|--------------|-------------|
| Asset | Emerald (green) |
| Liability | Red |
| Equity | Blue |
| Income | Indigo (purple) |
| Expense | Amber (orange) |

### Balance Display

- **Positive balances**: Black text
- **Negative balances**: Red text
- **Normal Balance**: Shows "Debit" or "Credit" indicator below balance

---

## AccountActivity Component

### Features

| Feature | Description |
|---------|-------------|
| **Transaction List** | All journal entries affecting the account |
| **Impact Calculation** | Net effect of each transaction on account balance |
| **CSV Export** | Download activity to CSV file |
| **Running Totals** | Footer shows total debits and credits |

### Props

```typescript
interface Props {
  account: Account;    // Required: Account to show activity for
  onClose: () => void; // Required: Callback to close activity view
}
```

### Usage Example

```typescript
import { AccountActivity } from './components/AccountActivity';

{selectedAccount && (
  <AccountActivity
    account={selectedAccount}
    onClose={() => setSelectedAccount(null)}
  />
)}
```

---

## Activity View

### Header

```
┌─────────────────────────────────────────────────────────────┐
│ [←] 1000 Cash                                    $10,000.00 │
│      ASSET • Debit Account                                 │
└─────────────────────────────────────────────────────────────┘
```

- **Back Button**: Returns to account list
- **Account Code & Name**: Bold with type/class indicator
- **Current Balance**: Right-aligned, color-coded by sign

### Toolbar

```
[Calendar Last 30 Days] [|] [Advanced Filters]     [Export CSV]
```

- **Time Range**: Shows current filter period
- **Advanced Filters**: (Placeholder) Future date range filtering
- **Export CSV**: Downloads activity as CSV file

### Transaction Table

Columns:

| Column | Description |
|--------|-------------|
| **Date** | Transaction date |
| **Type / ID** | Journal entry type and short ID |
| **Memo** | Transaction description |
| **Debit** | Total debit amount to this account |
| **Credit** | Total credit amount from this account |
| **Impact** | Net effect on account balance (green/red) |

### Impact Calculation

The impact column shows the net change to account balance:

**For Asset/Expense (Debit) accounts:**
- Debit transactions: Positive impact
- Credit transactions: Negative impact

**For Liability/Equity/Income (Credit) accounts:**
- Credit transactions: Positive impact
- Debit transactions: Negative impact

### Footer Statistics

```
Total Debits: 5,000.00    Total Credits: 3,000.00    [↑↓] 15 Transactions Found
```

---

## CSV Export

### Export Format

```csv
Date,Type,Memo,Debit,Credit,Impact
2026-01-15,Payment,Invoice #1234,500.00,,-500.00
2026-01-16,Deposit,Client payment,,1000.00,+1000.00
```

### File Naming

`account_{code}_activity.csv`

Example: `account_1000_activity.csv`

---

## Responsive Behavior

### Desktop (>768px)

- Full keyboard navigation enabled
- Keyboard hint banner visible
- Virtual scrolling with large row height (120px)

### Mobile (<768px)

- Touch gestures enabled
- Keyboard hints hidden
- Type filter chips horizontally scrollable
- Swipe actions accessible

---

## Empty States

### No Accounts Found

```
[$]
No accounts found.
Try adjusting your search or filters.
```

### No Activity Recorded

```
[Page]
No activity recorded for this account.
```

---

## Integration with Store

The components use `useLedgerStore` for state management:

```typescript
import { useLedgerStore } from '../services/ledgerService';

const {
  accounts,
  updateAccount,
  deleteAccount,
  cursorIndex,
  setCursorIndex,
  selectedAccountId,
  setSelectedAccountId
} = useLedgerStore();
```

### Store Methods Used

| Method | Purpose |
|--------|---------|
| `accounts` | Read-only account list |
| `updateAccount()` | Commit inline edits |
| `deleteAccount()` | Soft delete account |
| `setCursorIndex()` | Update keyboard cursor position |
| `setSelectedAccountId()` | Track selected account |

---

## Accessibility

### ARIA Labels

- Table: `role="grid"` with `aria-label="Account Table"`
- Rows: `role="row"` with `aria-selected`
- Cells: `role="gridcell"` with appropriate `tabIndex`
- Filter buttons: `aria-pressed` state

### Focus Management

- Container: `tabIndex={0}` for keyboard focus
- Edit inputs: `autoFocus` on edit mode entry
- Focus restoration: Returns to row after edit cancel

### Screen Reader Support

- Account type badges announced
- Balance amounts announced with currency
- Validation errors linked via `aria-describedby`
- Navigation hints visible as text

---

## Error Handling

### Validation Errors

Displayed inline with red border and text:

```
Account Name: [_______________]
                    Account name is required
```

### Save Failures

Silently fail (updateAccount in store handles errors).
Future: Display toast notifications.

---

## Best Practices

### For Users

1. **Use descriptive account names**: "Cash on Hand" vs "Cash"
2. **Follow naming conventions**: Consistent naming aids search
3. **Leverage hierarchy**: Group related accounts under parents
4. **Review activity regularly**: Use AccountActivity to reconcile

### For Developers

1. **Provide onAccountSelect**: Enable navigation to activity view
2. **Provide onAccountCreate**: Enable adding new accounts
3. **Use entityId filter**: Ensure component shows correct entity
4. **Handle empty states**: Display helpful messages when no accounts exist
