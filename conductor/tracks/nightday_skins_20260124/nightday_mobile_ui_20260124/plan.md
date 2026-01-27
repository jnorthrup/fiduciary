# Implementation Plan: Night/Day Mobile UI with Quicken-Style Features

**Track ID:** `nightday_mobile_ui_20260124`

---

## Phase 1: Theme System Foundation [P0]

### 1.1 Theme Token Setup
- [ ] Task: Create theme token definitions
  - [ ] Sub-task: Define `ThemeTokens` TypeScript interface
  - [ ] Sub-task: Create light theme token values
  - [ ] Sub-task: Create dark theme token values
  - [ ] Sub-task: Add Tailwind config extension for theme tokens
  - [ ] Sub-task: Verify theme tokens compile

### 1.2 Theme Provider
- [ ] Task: Implement theme context and provider
  - [ ] Sub-task: Create `ThemeProvider` component with React context
  - [ ] Sub-task: Implement `useTheme` hook for accessing theme
  - [ ] Sub-task: Add theme persistence to localStorage
  - [ ] Sub-task: Implement system preference detection (`prefers-color-scheme`)
  - [ ] Sub-task: Add manual theme toggle override

### 1.3 Theme Transitions
- [ ] Task: Add smooth theme switching
  - [ ] Sub-task: Configure CSS transitions for theme changes
  - [ ] Sub-task: Prevent flash of wrong theme on page load
  - [ ] Sub-task: Add theme transition animation
  - [ ] Sub-task: Test theme switching across all components

- [ ] Task: Conductor - User Manual Verification 'Phase 1 Theme'

---

## Phase 2: Responsive Layout System [P0]

### 2.1 Breakpoint Configuration
- [ ] Task: Set up responsive breakpoint utilities
  - [ ] Sub-task: Define breakpoint constants (xs, sm, md, lg, xl, xxl)
  - [ ] Sub-task: Create `useMediaQuery` hook for breakpoint detection
  - [ ] Sub-task: Add `useBreakpoint` hook for current breakpoint
  - [ ] Sub-task: Verify breakpoints match Tailwind config

### 2.2 Layout Components
- [ ] Task: Create Container component
  - [ ] Sub-task: Implement responsive Container with size variants
  - [ ] Sub-task: Add optional padding prop
  - [ ] Sub-task: Write tests for Container responsiveness

- [ ] Task: Create Grid system
  - [ ] Sub-task: Implement Grid component with configurable columns
  - [ ] Sub-task: Create Col component for column spans
  - [ ] Sub-task: Add responsive column props (e.g., `cols={{ md: 2, lg: 3 }}`)
  - [ ] Sub-task: Write tests for Grid layout

- [ ] Task: Create Stack and Row components
  - [ ] Sub-task: Implement Stack for vertical layouts
  - [ ] Sub-task: Implement Row for horizontal flex layouts
  - [ ] Sub-task: Add gap, alignment, and justification props
  - [ ] Sub-task: Write tests for Stack/Row

- [ ] Task: Create Panel component
  - [ ] Sub-task: Implement Panel with theme-aware styling
  - [ ] Sub-task: Add variant props (default, elevated, bordered)
  - [ ] Sub-task: Support theme tokens for colors
  - [ ] Sub-task: Write tests for Panel

- [ ] Task: Conductor - User Manual Verification 'Phase 2 Layouts'

---

## Phase 3: Common UI Skeleton Components [P0]

### 3.1 Form Components
- [ ] Task: Create FormField wrapper
  - [ ] Sub-task: Implement FormField with label, error, required states
  - [ ] Sub-task: Add theme-aware styling
  - [ ] Sub-task: Support horizontal/vertical label layouts
  - [ ] Sub-task: Write tests for FormField

- [ ] Task: Create input primitives
  - [ ] Sub-task: Implement Input component (text, number, email, tel, date)
  - [ ] Sub-task: Implement Textarea component
  - [ ] Sub-task: Implement Select component
  - [ ] Sub-task: Implement Checkbox and Switch components
  - [ ] Sub-task: Implement RadioGroup component
  - [ ] Sub-task: Add validation error states
  - [ ] Sub-task: Write tests for all input components

- [ ] Task: Create specialized inputs
  - [ ] Sub-task: Implement AmountInput with currency formatting
  - [ ] Sub-task: Implement DatePicker component
  - [ ] Sub-task: Implement TimePicker component
  - [ ] Sub-task: Write tests for specialized inputs

### 3.2 Data Display Components
- [ ] Task: Create Badge component
  - [ ] Sub-task: Implement Badge with variant props
  - [ ] Sub-task: Add theme-aware color variants
  - [ ] Sub-task: Write tests for Badge

- [ ] Task: Create Currency component
  - [ ] Sub-task: Implement Currency display with formatting
  - [ ] Sub-task: Add currency symbol and sign options
  - [ ] Sub-task: Support theme-aware colors (positive/negative)
  - [ ] Sub-task: Write tests for Currency

- [ ] Task: Create DataTable component
  - [ ] Sub-task: Implement DataTable with columns and data props
  - [ ] Sub-task: Add mobile card view mode
  - [ ] Sub-task: Implement sortable columns
  - [ ] Sub-task: Add filterable columns
  - [ ] Sub-task: Support row selection
  - [ ] Sub-task: Write tests for DataTable

- [ ] Task: Create progress components
  - [ ] Sub-task: Implement ProgressBar with value/max
  - [ ] Sub-task: Implement StepProgress for multi-step flows
  - [ ] Sub-task: Add theme-aware colors
  - [ ] Sub-task: Write tests for progress components

### 3.3 Feedback Components
- [ ] Task: Create Toast notification system
  - [ ] Sub-task: Implement Toast component with variants
  - [ ] Sub-task: Create `useToast` hook for triggering toasts
  - [ ] Sub-task: Add auto-dismiss with configurable duration
  - [ ] Sub-task: Support multiple concurrent toasts
  - [ ] Sub-task: Write tests for Toast

- [ ] Task: Create Modal component
  - [ ] Sub-task: Implement Modal with size variants
  - [ ] Sub-task: Add fullscreen prop for mobile
  - [ ] Sub-task: Implement close on backdrop click
  - [ ] Sub-task: Add escape key handling
  - [ ] Sub-task: Write tests for Modal

- [ ] Task: Create Confirm dialog
  - [ ] Sub-task: Implement Confirm as specialized Modal
  - [ ] Sub-task: Add confirm/cancel callbacks
  - [ ] Sub-task: Support customizable confirm text
  - [ ] Sub-task: Write tests for Confirm

- [ ] Task: Create loading components
  - [ ] Sub-task: Implement Spinner with size variants
  - [ ] Sub-task: Implement Skeleton with variants (text, circle, rect)
  - [ ] Sub-task: Add shimmer animation
  - [ ] Sub-task: Write tests for loading components

### 3.4 Navigation Components
- [ ] Task: Create BottomNav for mobile
  - [ ] Sub-task: Implement BottomNav with items prop
  - [ ] Sub-task: Add active state highlighting
  - [ ] Sub-task: Hide on desktop (> md breakpoint)
  - [ ] Sub-task: Write tests for BottomNav

- [ ] Task: Create TopNav for desktop
  - [ ] Sub-task: Implement TopNav with logo and menu
  - [ ] Sub-task: Add user dropdown menu
  - [ ] Sub-task: Hide on mobile (< md breakpoint)
  - [ ] Sub-task: Write tests for TopNav

- [ ] Task: Create Breadcrumb component
  - [ ] Sub-task: Implement Breadcrumb with items prop
  - [ ] Sub-task: Add click navigation
  - [ ] Sub-task: Support mobile truncation
  - [ ] Sub-task: Write tests for Breadcrumb

- [ ] Task: Create Tabs component
  - [ ] Sub-task: Implement Tabs with items and content
  - [ ] Sub-task: Add controlled/uncontrolled modes
  - [ ] Sub-task: Support scrollable tabs on mobile
  - [ ] Sub-task: Write tests for Tabs

- [ ] Task: Conductor - User Manual Verification 'Phase 3 Skeleton Components'

---

## Phase 4: Mobile Dashboard [P1]

### 4.1 Dashboard Layout
- [ ] Task: Create mobile-responsive dashboard layout
  - [ ] Sub-task: Adapt existing Dashboard.tsx for mobile
  - [ ] Sub-task: Add BottomNav for primary navigation
  - [ ] Sub-task: Stack widgets vertically on mobile
  - [ ] Sub-task: Add pull-to-refresh on data views

### 4.2 Dashboard Widgets
- [ ] Task: Create BalanceCard widget
  - [ ] Sub-task: Implement BalanceCard with account list
  - [ ] Sub-task: Add trend indicator and sparkline
  - [ ] Sub-task: Support theme-aware styling
  - [ ] Sub-task: Write tests for BalanceCard

- [ ] Task: Create SpendingChart widget
  - [ ] Sub-task: Implement SpendingChart with period selector
  - [ ] Sub-task: Add category/payee grouping
  - [ ] Sub-task: Use responsive chart library (Recharts)
  - [ ] Sub-task: Write tests for SpendingChart

- [ ] Task: Create UpcomingBills widget
  - [ ] Sub-task: Implement UpcomingBills with days ahead prop
  - [ ] Sub-task: Show overdue items prominently
  - [ ] Sub-task: Add quick pay action
  - [ ] Sub-task: Write tests for UpcomingBills

- [ ] Task: Create BudgetProgress widget
  - [ ] Sub-task: Implement BudgetProgress with category list
  - [ ] Sub-task: Show progress bars per category
  - [ ] Sub-task: Add color coding (under/over budget)
  - [ ] Sub-task: Write tests for BudgetProgress

- [ ] Task: Create NetWorthChart widget
  - [ ] Sub-task: Implement NetWorthChart with period selector
  - [ ] Sub-task: Display line chart over time
  - [ ] Sub-task: Add theme-aware colors
  - [ ] Sub-task: Write tests for NetWorthChart

- [ ] Task: Conductor - User Manual Verification 'Phase 4 Dashboard'

---

## Phase 5: Quicken-Style Account Register [P0]

### 5.1 Transaction List View
- [ ] Task: Create mobile-optimized transaction register
  - [ ] Sub-task: Implement TransactionList with running balance
  - [ ] Sub-task: Add chronological sorting with newest first
  - [ ] Sub-task: Show pending/cleared status indicators
  - [ ] Sub-task: Display split transaction indicators
  - [ ] Sub-task: Write tests for TransactionList

- [ ] Task: Add swipe gestures
  - [ ] Sub-task: Implement swipe left for edit action
  - [ ] Sub-task: Implement swipe right for delete action
  - [ ] Sub-task: Add haptic feedback on swipe
  - [ ] Sub-task: Write tests for swipe gestures

- [ ] Task: Add quick actions
  - [ ] Sub-task: Implement floating action button for new transaction
  - [ ] Sub-task: Add long-press for multi-select mode
  - [ ] Sub-task: Implement bulk edit/delete operations
  - [ ] Sub-task: Write tests for quick actions

### 5.2 Filter and Search
- [ ] Task: Create filter panel
  - [ ] Sub-task: Implement date range picker
  - [ ] Sub-task: Add category filter dropdown
  - [ ] Sub-task: Add payee search autocomplete
  - [ ] Sub-task: Add amount range filter
  - [ ] Sub-task: Add status filter (all, pending, cleared)
  - [ ] Sub-task: Write tests for filter panel

- [ ] Task: Implement search
  - [ ] Sub-task: Add full-text search across transactions
  - [ ] Sub-task: Implement debounced search input
  - [ ] Sub-task: Highlight search terms in results
  - [ ] Sub-task: Write tests for search

### 5.3 Reconciliation Mode
- [ ] Task: Create reconciliation interface
  - [ ] Sub-task: Implement balance adjustment mode
  - [ ] Sub-task: Add toggle for pending/cleared state
  - [ ] Sub-task: Show running balance in reconciliation
  - [ ] Sub-task: Calculate difference from statement
  - [ ] Sub-task: Write tests for reconciliation

- [ ] Task: Conductor - User Manual Verification 'Phase 5 Register'

---

## Phase 6: Mobile Transaction Entry [P0]

### 6.1 Transaction Form
- [ ] Task: Create mobile-optimized transaction entry
  - [ ] Sub-task: Implement TransactionForm with responsive layout
  - [ ] Sub-task: Use AmountInput with custom number pad
  - [ ] Sub-task: Add CategoryPicker with quick categories
  - [ ] Sub-task: Implement PayeeInput with autocomplete
  - [ ] Sub-task: Add Date and Time pickers
  - [ ] Sub-task: Include optional Memo textarea
  - [ ] Sub-task: Write tests for TransactionForm

### 6.2 Smart Features
- [ ] Task: Add intelligent defaults
  - [ ] Sub-task: Remember last used payee per category
  - [ ] Sub-task: Pre-fill category from payee history
  - [ ] Sub-task: Remember last account used
  - [ ] Sub-task: Implement "duplicate previous" option
  - [ ] Sub-task: Write tests for smart defaults

### 6.3 Advanced Features
- [ ] Task: Add split transactions
  - [ ] Sub-task: Implement split transaction editor
  - [ ] Sub-task: Add/remove split lines dynamically
  - [ ] Sub-task: Validate split totals match amount
  - [ ] Sub-task: Write tests for split transactions

- [ ] Task: Add attachments
  - [ ] Sub-task: Implement photo capture from camera
  - [ ] Sub-task: Add image gallery picker
  - [ ] Sub-task: Store attachment references
  - [ ] Sub-task: Show attachment previews
  - [ ] Sub-task: Write tests for attachments

- [ ] Task: Add recurring transactions
  - [ ] Sub-task: Implement recurring setup UI
  - [ ] Sub-task: Add frequency options (weekly, monthly, etc.)
  - [ ] Sub-task: Add end date or occurrence limit
  - [ ] Sub-task: Create recurring instances automatically
  - [ ] Sub-task: Write tests for recurring transactions

- [ ] Task: Conductor - User Manual Verification 'Phase 6 Transaction Entry'

---

## Phase 7: Reports & Analytics [P1]

### 7.1 Report Views
- [ ] Task: Create Spending Trends report
  - [ ] Sub-task: Implement line chart for spending over time
  - [ ] Sub-task: Add category grouping option
  - [ ] Sub-task: Support period selection (week, month, year)
  - [ ] Sub-task: Add theme-aware chart colors
  - [ ] Sub-task: Write tests for Spending Trends

- [ ] Task: Create Income vs Expense report
  - [ ] Sub-task: Implement bar chart with income/expense overlay
  - [ ] Sub-task: Show monthly breakdown
  - [ ] Sub-task: Add net income calculation
  - [ ] Sub-task: Write tests for Income vs Expense

- [ ] Task: Create Category Breakdown report
  - [ ] Sub-task: Implement pie/donut chart for category distribution
  - [ ] Sub-task: Add percentage labels
  - [ ] Sub-task: Support drill-down to transactions
  - [ ] Sub-task: Write tests for Category Breakdown

- [ ] Task: Create Budget vs Actual report
  - [ ] Sub-task: Implement progress bars per category
  - [ ] Sub-task: Show under/over budget indicators
  - [ ] Sub-task: Add variance calculation
  - [ ] Sub-task: Write tests for Budget vs Actual

- [ ] Task: Create Net Worth report
  - [ ] Sub-task: Implement line chart for net worth over time
  - [ ] Sub-task: Add period selection (1m, 3m, 6m, 1y, all)
  - [ ] Sub-task: Show asset/liability breakdown
  - [ ] Sub-task: Write tests for Net Worth report

### 7.2 Export Features
- [ ] Task: Add export functionality
  - [ ] Sub-task: Implement PDF export for reports
  - [ ] Sub-task: Add CSV export for transaction data
  - [ ] Sub-task: Add Excel export with formatting
  - [ ] Sub-task: Write tests for export features

- [ ] Task: Conductor - User Manual Verification 'Phase 7 Reports'

---

## Phase 8: Bill Pay & Reminders [P2]

### 8.1 Bill Management
- [ ] Task: Create bill list view
  - [ ] Sub-task: Implement BillList with due date sorting
  - [ ] Sub-task: Add sections for upcoming, due today, overdue
  - [ ] Sub-task: Show bill amount and payee
  - [ ] Sub-task: Add quick pay action
  - [ ] Sub-task: Write tests for BillList

- [ ] Task: Create bill entry form
  - [ ] Sub-task: Implement BillForm with payee, amount, due date
  - [ ] Sub-task: Add recurring option
  - [ ] Sub-task: Add category assignment
  - [ ] Sub-task: Write tests for BillForm

### 8.2 Reminders
- [ ] Task: Implement reminder system
  - [ ] Sub-task: Create reminder scheduler
  - [ ] Sub-task: Add push notification support
  - [ ] Sub-task: Configure notification timing (day before, day of)
  - [ ] Sub-task: Add notification preferences settings
  - [ ] Sub-task: Write tests for reminders

- [ ] Task: Add auto-pay
  - [ ] Sub-task: Implement auto-pay setup
  - [ ] Sub-task: Connect to payment execution
  - [ ] Sub-task: Add confirmation before auto-pay
  - [ ] Sub-task: Write tests for auto-pay

- [ ] Task: Create bill calendar view
  - [ ] Sub-task: Implement calendar with due dates marked
  - [ ] Sub-task: Add month navigation
  - [ ] Sub-task: Show bill details on tap
  - [ ] Sub-task: Write tests for bill calendar

- [ ] Task: Conductor - User Manual Verification 'Phase 8 Bill Pay'

---

## Phase 9: Account Management [P1]

### 9.1 Account List
- [ ] Task: Create account management view
  - [ ] Sub-task: Implement AccountList with all accounts
  - [ ] Sub-task: Show account balances and types
  - [ ] Sub-task: Add sync status indicator
  - [ ] Sub-task: Add quick actions (reconcile, edit, hide)
  - [ ] Sub-task: Write tests for AccountList

### 9.2 Account CRUD
- [ ] Task: Create account form
  - [ ] Sub-task: Implement AccountForm for add/edit
  - [ ] Sub-task: Add account type selection
  - [ ] Sub-task: Include balance and currency fields
  - [ ] Sub-task: Add joint account support
  - [ ] Sub-task: Write tests for AccountForm

- [ ] Task: Add account actions
  - [ ] Sub-task: Implement account reconciliation
  - [ ] Sub-task: Add balance adjustment
  - [ ] Sub-task: Support account hiding/showing
  - [ ] Sub-task: Add account deletion with confirmation
  - [ ] Sub-task: Write tests for account actions

- [ ] Task: Conductor - User Manual Verification 'Phase 9 Account Management'

---

## Phase 10: Component Documentation [P2]

### 10.1 Storybook Setup
- [ ] Task: Set up Storybook
  - [ ] Sub-task: Install and configure Storybook
  - [ ] Sub-task: Add theme provider to stories
  - [ ] Sub-task: Configure responsive device previews
  - [ ] Sub-task: Verify stories render correctly

### 10.2 Component Stories
- [ ] Task: Create stories for all skeleton components
  - [ ] Sub-task: Write stories for layout components
  - [ ] Sub-task: Write stories for form components
  - [ ] Sub-task: Write stories for data display components
  - [ ] Sub-task: Write stories for feedback components
  - [ ] Sub-task: Write stories for navigation components
  - [ ] Sub-task: Add interaction tests to stories

### 10.3 Documentation
- [ ] Task: Document component APIs
  - [ ] Sub-task: Add props documentation for all components
  - [ ] Sub-task: Include usage examples
  - [ ] Sub-task: Document theme customization
  - [ ] Sub-task: Add accessibility notes

- [ ] Task: Conductor - User Manual Verification 'Phase 10 Documentation'

---

## Phase 11: Accessibility & Performance [P0]

### 11.1 Accessibility Audit
- [ ] Task: Perform WCAG 2.1 AA audit
  - [ ] Sub-task: Test keyboard navigation for all components
  - [ ] Sub-task: Verify screen reader announcements
  - [ ] Sub-task: Check color contrast ratios
  - [ ] Sub-task: Verify touch target sizes
  - [ ] Sub-task: Test with screen reader (VoiceOver/TalkBack)
  - [ ] Sub-task: Fix identified accessibility issues

### 11.2 Performance Optimization
- [ ] Task: Optimize for performance targets
  - [ ] Sub-task: Run Lighthouse audit and identify issues
  - [ ] Sub-task: Implement code splitting for routes
  - [ ] Sub-task: Add lazy loading for images
  - [ ] Sub-task: Optimize bundle size
  - [ ] Sub-task: Add service worker for offline support
  - [ ] Sub-task: Verify performance targets met

- [ ] Task: Conductor - User Manual Verification 'Phase 11 A11y & Performance'

---

## Success Verification

### Theme System
- [ ] Light/dark mode switching works seamlessly
- [ ] System preference is detected automatically
- [ ] Theme choice persists across sessions
- [ ] CSS transitions are smooth

### Responsive Design
- [ ] All views work on xs (320px) to xxl (1536px+) screens
- [ ] Bottom navigation appears on mobile only
- [ ] Top navigation appears on desktop only
- [ ] Touch targets are ≥44×44px on mobile

### Component Library
- [ ] All skeleton components are reusable
- [ ] Components accept theme tokens
- [ ] Components have TypeScript types
- [ ] Components have unit tests
- [ ] Components have Storybook stories

### Quicken Features
- [ ] Transaction register shows running balance
- [ ] Swipe gestures work for edit/delete
- [ ] Filter and search work correctly
- [ ] Reconciliation mode calculates difference
- [ ] Transaction entry is fast and mobile-friendly

### Reports
- [ ] All reports render on mobile and desktop
- [ ] Charts are theme-aware
- [ ] Export functionality works (PDF, CSV, Excel)

### Accessibility
- [ ] Keyboard navigation works for all interactions
- [ ] Screen reader announces dynamic content
- [ ] Color contrast ratios meet WCAG AA
- [ ] Focus indicators are visible
- [ ] Touch targets are sufficient size

### Performance
- [ ] First Contentful Paint < 1.5s
- [ ] Largest Contentful Paint < 2.5s
- [ ] Time to Interactive < 3.5s
- [ ] Cumulative Layout Shift < 0.1
- [ ] First Input Delay < 100ms
