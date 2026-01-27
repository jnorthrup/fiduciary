# Spec: Night/Day Mobile UI with Quicken-Style Features

**Track ID:** `nightday_mobile_ui_20260124`
**Type:** Feature
**Status:** New
**Created:** 2026-01-24

---

## Overview

Mobile-first responsive UI with automatic dark/light mode switching and Quicken-inspired financial management features. Built on reusable UI skeleton components.

---

## Requirements

### 1. Theme System (Night/Day)

#### 1.1 Automatic Theme Detection
- Detect system preference via `prefers-color-scheme`
- Support manual theme toggle override
- Persist theme choice in localStorage
- Smooth CSS transitions for theme changes

#### 1.2 Theme Tokens
```typescript
interface ThemeTokens {
  colors: {
    background: { primary, secondary, tertiary, elevated };
    text: { primary, secondary, muted, inverse };
    border: { default, subtle, focus };
    accent: { primary, secondary, success, warning, error, info };
    status: { paid, pending, failed, reconciled };
  };
  spacing: { xs, sm, md, lg, xl, xxl };
  typography: { xs, sm, base, lg, xl, xxl };
  shadows: { sm, md, lg, xl };
  radii: { sm, md, lg, xl, full };
}
```

#### 1.3 Theme Configurations
- **Light Mode:** White backgrounds, dark text, subtle borders
- **Dark Mode:** Slate-900 backgrounds, white text, slate-700 borders
- **High Contrast Mode:** Optional accessibility mode with WCAG AA compliance

---

### 2. Mobile-First Responsive Design

#### 2.1 Breakpoints
```typescript
const breakpoints = {
  xs: '0px',      // Mobile portrait
  sm: '640px',    // Mobile landscape
  md: '768px',    // Tablet
  lg: '1024px',   // Desktop
  xl: '1280px',   // Wide desktop
  xxl: '1536px'   // Ultra-wide
};
```

#### 2.2 Mobile Optimizations
- Bottom navigation bar for mobile (< 768px)
- Touch-friendly tap targets (44px minimum)
- Swipe gestures for common actions
- Pull-to-refresh on data views
- Haptic feedback on actions

#### 2.3 Responsive Components
- Collapsible sidebar on tablet/desktop
- Full-screen modals on mobile
- Stacked layouts on mobile, side-by-side on larger screens
- Adaptive data tables (card view on mobile, table on desktop)

---

### 3. Common UI Skeleton Components

#### 3.1 Layout Components
```typescript
// Responsive container
<Container size="sm|md|lg|xl" padded>

// Grid system
<Grid cols={1-12} gap="spacing">
  <Col span={1-12}>

// Stack for vertical layouts
<Stack gap="spacing" align="start|center|end">

// Flex row
<Row gap="spacing" justify="start|center|end|between">

// Panel/Card
<Panel variant="default|elevated|bordered">
```

#### 3.2 Form Components
```typescript
// Form field wrapper
<FormField label="Label" error="Error" required>

// Input variants
<Input type="text|number|email|tel|date" />
<Textarea rows={4} />
<Select options={[]} />
<Checkbox label="Label" />
<RadioGroup options={[]} />
<Switch label="Label" />

// Date/time pickers
<DatePicker />
<TimePicker />
<DateTimePicker />

// Amount input with formatting
<AmountInput currency="USD" />
```

#### 3.3 Data Display Components
```typescript
// Data table with mobile card view
<DataTable
  columns={[]}
  data={[]}
  mobileCardView
  sortable
  filterable
/>

// Status badge
<Badge variant="success|warning|error|info|neutral">

// Currency display
<Currency amount={100} currency="USD" showSign />

// Progress indicators
<ProgressBar value={75} max={100} />
<StepProgress steps={[]} currentStep={0} />
```

#### 3.4 Feedback Components
```typescript
// Toast notifications
<Toast variant="success|error|info|warning" duration={3000}>

// Modal/Dialog
<Modal size="sm|md|lg|xl" fullscreen={boolean}>

// Confirm dialog
<Confirm
  title="Confirm Action"
  message="Are you sure?"
  onConfirm={handleConfirm}
  onCancel={handleCancel}
>

// Loading states
<Spinner size="sm|md|lg" />
<Skeleton variant="text|circle|rect" width height />
```

#### 3.5 Navigation Components
```typescript
// Bottom nav (mobile)
<BottomNav items={[
  { icon: 'home', label: 'Home', path: '/' },
  { icon: 'accounts', label: 'Accounts', path: '/accounts' },
  { icon: 'pay', label: 'Pay', path: '/pay' },
  { icon: 'reports', label: 'Reports', path: '/reports' },
  { icon: 'settings', label: 'Settings', path: '/settings' }
]}>

// Top nav (desktop)
<TopNav logo menuItems userMenu />

// Breadcrumb
<Breadcrumb items={[{ label: 'Home', path: '/' }, ...]} />

// Tabs
<Tabs items={[{ label: 'Tab 1', content: ... }]}>
```

---

### 4. Quicken-Style Financial Features

#### 4.1 Account Register View
- **Transaction List:** Chronological register with running balance
- **Quick Add:** Floating action button for new transactions
- **Swipe Actions:** Swipe left to edit, right to delete
- **Bulk Edit:** Select multiple transactions for batch operations
- **Split Transactions:** Visual indication of split items
- **Reconciliation:** Balance-adjustment mode with pending/cleared states
- **Filter/Sort:** Date range, category, payee, amount, status
- **Search:** Full-text search across transactions

#### 4.2 Dashboard Widgets
```typescript
// Account balance cards
<BalanceCard
  accounts={accounts}
  showTrend
  sparkline
/>

// Spending breakdown
<SpendingChart
  period="week|month|year"
  groupBy="category|payee"
/>

// Upcoming bills
<UpcomingBills
  daysAhead={7}
  showOverdue
/>

// Budget progress
<BudgetProgress
  budgetCategories={[]}
  period="month"
/>

// Net worth tracker
<NetWorthChart
  period="1m|3m|6m|1y|all"
/>
```

#### 4.3 Transaction Entry (Mobile Optimized)
- **Smart Defaults:** Remember last payee, category, account
- **Quick Categories:** Frequently used categories at top
- **Auto-complete:** Payee suggestions from history
- **Number Pad:** Custom numeric keypad for amount entry
- **Memo Expansion:** Optional notes field
- **Attachments:** Receipt photos (mobile camera)
- **Recurring:** Setup recurring transactions
- **Split:** Split transaction across multiple categories

#### 4.4 Reports & Analytics
- **Spending Trends:** Category trends over time
- **Income vs Expense:** Monthly comparison
- **Category Breakdown:** Pie/donut charts
- **Cash Flow:** Bar chart with income/expense overlay
- **Budget vs Actual:** Progress bars per category
- **Net Worth:** Line chart over time
- **Export:** PDF, CSV, Excel formats

#### 4.5 Bill Pay & Reminders
- **Bill List:** Upcoming, due today, overdue
- **Reminder Alerts:** Push notifications
- **Quick Pay:** One-click payment from bill list
- **Auto-Pay:** Setup automatic payments
- **Bill Calendar:** Calendar view of due dates

#### 4.6 Account Management
- **Account List:** All accounts with balances
- **Account Types:** Bank, Credit Card, Investment, Loan, Cash
- **Sync Status:** Last sync time, manual refresh
- **Account Actions:** Reconcile, adjust balance, edit, hide
- **Joint Accounts:** Multi-owner support

---

### 5. Performance & Accessibility

#### 5.1 Performance Targets
- **First Contentful Paint:** < 1.5s
- **Largest Contentful Paint:** < 2.5s
- **Time to Interactive:** < 3.5s
- **Cumulative Layout Shift:** < 0.1
- **First Input Delay:** < 100ms

#### 5.2 Accessibility (WCAG 2.1 AA)
- Keyboard navigation for all interactive elements
- Screen reader announcements for dynamic content
- Focus indicators for all focusable elements
- Color contrast ratios ≥ 4.5:1 for text
- Touch target size ≥ 44×44px
- Semantic HTML structure
- ARIA labels where needed

#### 5.3 Mobile-Specific
- Touch gestures (swipe, pinch, long-press)
- Haptic feedback on actions
- Offline support with service workers
- Optimized images (WebP, lazy loading)
- Reduce motion preference support

---

## Technical Constraints

- **Framework:** React with TypeScript
- **Styling:** Tailwind CSS with custom theme tokens
- **State:** Zustand for global state
- **Routing:** React Router v7
- **Forms:** React Hook Form + Zod validation
- **Charts:** Recharts or Chart.js
- **Icons:** Lucide React
- **Date:** dayjs or date-fns
- **Testing:** Vitest + Testing Library

---

## Deliverables

1. Theme system with light/dark mode
2. Responsive mobile-first layouts
3. Common UI skeleton component library
4. Quicken-style account register
5. Dashboard with financial widgets
6. Mobile-optimized transaction entry
7. Reports and analytics views
8. Bill pay and reminders
9. Component documentation (Storybook or similar)
10. Accessibility audit pass

---

## Dependencies

- Existing: `components/Dashboard.tsx` (integrate new mobile view)
- Existing: `services/ledgerService.ts` (transaction data)
- Existing: `types/index.ts` (extend with mobile-specific types)
- New: `components/ui/skeleton/*` (common components)
- New: `components/mobile/*` (mobile-specific views)
- New: `hooks/useTheme.ts` (theme management)
- New: `hooks/useMediaQuery.ts` (responsive utilities)

---

## Success Criteria

- [ ] Theme switching works seamlessly with system preference
- [ ] All components are responsive (xs to xxl breakpoints)
- [ ] Mobile UI is touch-optimized (44px tap targets, swipe gestures)
- [ ] Common skeleton components are reusable and documented
- [ ] Account register matches Quicken functionality
- [ ] Dashboard widgets display accurate financial data
- [ ] Transaction entry is fast and mobile-friendly
- [ ] Reports render correctly on all screen sizes
- [ ] WCAG 2.1 AA accessibility compliance
- [ ] Performance targets met (Lighthouse scores)
