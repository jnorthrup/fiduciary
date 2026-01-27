# Implementation Plan: Day/Night Capable Skins System

**Track ID:** `nightday_skins_20260124`

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
  - [ ] Sub-task: Create `ThemeContext` with React context
  - [ ] Sub-task: Implement `ThemeProvider` component
  - [ ] Sub-task: Implement `useTheme` hook
  - [ ] Sub-task: Add system preference detection (`prefers-color-scheme`)
  - [ ] Sub-task: Add theme persistence to user profile

### 1.3 Theme Transitions
- [ ] Task: Add smooth theme switching
  - [ ] Sub-task: Configure CSS transitions for theme changes
  - [ ] Sub-task: Prevent flash of wrong theme on page load
  - [ ] Sub-task: Add theme transition animation
  - [ ] Sub-task: Test theme switching across all components

- [ ] Task: Conductor - User Manual Verification 'Phase 1 Theme'

---

## Phase 2: Skin System Architecture [P0]

### 2.1 Skin Type Definitions
- [ ] Task: Create skin type system
  - [ ] Sub-task: Define `SkinType` union type ('mobile' | 'quickbooks' | 'advanced-graph')
  - [ ] Sub-task: Define `Skin` interface
  - [ ] Sub-task: Define `UserProfile` interface with skin preferences
  - [ ] Sub-task: Create `SKINS` registry constant

### 2.2 Skin Provider
- [ ] Task: Implement skin context and provider
  - [ ] Sub-task: Create `SkinContext` with React context
  - [ ] Sub-task: Implement `SkinProvider` component
  - [ ] Sub-task: Implement `useSkin` hook
  - [ ] Sub-task: Add skin persistence to user profile
  - [ ] Sub-task: Add skin change logging

### 2.3 Skin Router Integration
- [ ] Task: Integrate skin system with routing
  - [ ] Sub-task: Wrap app with SkinProvider
  - [ ] Sub-task: Pass skin context to all components
  - [ ] Sub-task: Update routes to be skin-aware
  - [ ] Sub-task: Test skin switching across navigation

- [ ] Task: Conductor - User Manual Verification 'Phase 2 Skin Architecture'

---

## Phase 3: Skin Selector UI [P0]

### 3.1 Quick Toggle Component
- [ ] Task: Create quick skin toggle for header
  - [ ] Sub-task: Implement `SkinQuickToggle` component
  - [ ] Sub-task: Add skin dropdown (mobile/QuickBooks/advanced)
  - [ ] Sub-task: Add theme toggle (light/dark/auto)
  - [ ] Sub-task: Integrate into Dashboard header
  - [ ] Sub-task: Test toggle functionality

### 3.2 Full Skin Selector
- [ ] Task: Create full skin selector for settings
  - [ ] Sub-task: Implement `SkinSelector` component
  - [ ] Add thumbnail previews for each skin
  - [ ] Add feature comparison table
  - [ ] Add "best for" descriptions
  - [ ] Sub-task: Test selector functionality

### 3.3 User Profile Persistence
- [ ] Task: Integrate with user profile
  - [ ] Sub-task: Update user profile schema for skin/theme
  - [ ] Sub-task: Save skin selection to profile
  - [ ] Sub-task: Load skin from profile on login
  - [ ] Sub-task: Apply default skin for new users
  - [ ] Sub-task: Test persistence across sessions

- [ ] Task: Conductor - User Manual Verification 'Phase 3 Skin Selector'

---

## Phase 4: Mobile Skin [P0]

### 4.1 Mobile Layout
- [ ] Task: Create mobile skin layout
  - [ ] Sub-task: Create `components/skins/mobile/MobileLayout.tsx`
  - [ ] Sub-task: Implement bottom navigation bar
  - [ ] Sub-task: Implement compact header
  - [ ] Sub-task: Create full-width content area
  - [ ] Sub-task: Create full-screen modal wrapper
  - [ ] Sub-task: Test layout on mobile viewport

### 4.2 Bottom Navigation
- [ ] Task: Create bottom navigation component
  - [ ] Sub-task: Implement `BottomNav` component
  - [ ] Sub-task: Add navigation items (Home, Accounts, Entities, Settings)
  - [ ] Sub-task: Add active state highlighting
  - [ ] Sub-task: Add icons + labels
  - [ ] Sub-task: Hide on desktop (> 768px)
  - [ ] Sub-task: Test navigation

### 4.3 Mobile Components
- [ ] Task: Create mobile-specific components
  - [ ] Sub-task: Implement `CardView` for tables as cards
  - [ ] Sub-task: Implement `TouchActions` for swipe gestures
  - [ ] Sub-task: Implement `MobileForm` with stacked fields
  - [ ] Sub-task: Add large touch targets (44px minimum)
  - [ ] Sub-task: Add haptic feedback
  - [ ] Sub-task: Test mobile interactions

### 4.4 Mobile Dashboard
- [ ] Task: Create mobile dashboard view
  - [ ] Sub-task: Adapt Dashboard.tsx for mobile skin
  - [ ] Sub-task: Stack widgets vertically
  - [ ] Sub-task: Add pull-to-refresh
  - [ ] Sub-task: Add floating action button
  - [ ] Sub-task: Test mobile dashboard

- [ ] Task: Conductor - User Manual Verification 'Phase 4 Mobile Skin'

---

## Phase 5: QuickBooks Skin [P0]

### 5.1 QuickBooks Layout
- [ ] Task: Create QuickBooks-style layout
  - [ ] Sub-task: Create `components/skins/quickbooks/QuickBooksLayout.tsx`
  - [ ] Sub-task: Implement left sidebar navigation
  - [ ] Sub-task: Implement full header with toolbar
  - [ ] Sub-task: Create split view (main + detail)
  - [ ] Sub-task: Create modal form wrapper
  - [ ] Sub-task: Test layout

### 5.2 Sidebar Navigation
- [ ] Task: Create sidebar navigation component
  - [ ] Sub-task: Implement `SidebarNav` component
  - [ ] Sub-task: Add expandable sections
  - [ ] Sub-task: Add navigation tree (Dashboard, Banking, Expenses, etc.)
  - [ ] Sub-task: Add collapse/expand toggle
  - [ ] Sub-task: Persist collapsed state to profile
  - [ ] Sub-task: Test navigation

### 5.3 QuickBooks Components
- [ ] Task: Create QuickBooks-style components
  - [ ] Sub-task: Implement `QBToolbar` with actions
  - [ ] Sub-task: Implement `RegisterView` for transactions
  - [ ] Sub-task: Implement `SplitView` for master-detail
  - [ ] Sub-task: Implement `QBForm` with left-aligned labels
  - [ ] Sub-task: Test QuickBooks components

### 5.4 QuickBooks Dashboard
- [ ] Task: Create QuickBooks-style dashboard
  - [ ] Sub-task: Refactor existing Dashboard.tsx as QuickBooks skin
  - [ ] Sub-task: Add green accent color (#00A698)
  - [ ] Sub-task: Add alternating row colors to tables
  - [ ] Sub-task: Add prominent "New" button
  - [ ] Sub-task: Add keyboard shortcuts
  - [ ] Sub-task: Test QuickBooks dashboard

- [ ] Task: Conductor - User Manual Verification 'Phase 5 QuickBooks Skin'

---

## Phase 6: Advanced Graph Skin [P1]

### 6.1 Advanced Graph Layout
- [ ] Task: Create advanced graph layout
  - [ ] Sub-task: Create `components/skins/advanced-graph/AdvancedGraphLayout.tsx`
  - [ ] Sub-task: Implement hybrid navigation (sidebar + tabs)
  - [ ] Sub-task: Implement minimal header
  - [ ] Sub-task: Create grid-based widget layout
  - [ ] Sub-task: Create slide-over panel for details
  - [ ] Sub-task: Test layout

### 6.2 Widget System
- [ ] Task: Create widget component system
  - [ ] Sub-task: Define `WidgetType` interface
  - [ ] Sub-task: Implement `ChartWidget` component
  - [ ] Sub-task: Implement `DataWidget` component
  - [ ] Sub-task: Implement `KPICard` component
  - [ ] Sub-task: Add widget size variants (small, medium, large, wide)
  - [ ] Sub-task: Test widgets

### 6.3 Chart Types
- [ ] Task: Implement chart types
  - [ ] Sub-task: Add line chart with zoom/pan
  - [ ] Sub-task: Add bar chart
  - [ ] Sub-task: Add pie/donut chart
  - [ ] Sub-task: Add heatmap
  - [ ] Sub-task: Add scatter plot
  - [ ] Sub-task: Add gauge/metric chart
  - [ ] Sub-task: Add treemap
  - [ ] Sub-task: Test all chart types

### 6.4 Advanced Graph Dashboard
- [ ] Task: Create advanced graph dashboard
  - [ ] Sub-task: Create widget grid layout
  - [ ] Sub-task: Add draggable widgets (optional)
  - [ ] Sub-task: Add real-time data updates
  - [ ] Sub-task: Add color-coded metrics
  - [ ] Sub-task: Add export individual charts
  - [ ] Sub-task: Optimize for dark mode
  - [ ] Sub-task: Test advanced graph dashboard

- [ ] Task: Conductor - User Manual Verification 'Phase 6 Advanced Graph Skin'

---

## Phase 7: Component Compatibility [P0]

### 7.1 Skin-Aware Components
- [ ] Task: Make existing components skin-aware
  - [ ] Sub-task: Update all components to accept className prop
  - [ ] Sub-task: Add data-skin attribute support
  - [ ] Sub-task: Update buttons for all skins
  - [ ] Sub-task: Update forms for all skins
  - [ ] Sub-task: Update tables for all skins
  - [ ] Sub-task: Test components in each skin

### 7.2 Responsive Components
- [ ] Task: Ensure components work in all skins
  - [ ] Sub-task: Test components in mobile skin
  - [ ] Sub-task: Test components in QuickBooks skin
  - [ ] Sub-task: Test components in advanced-graph skin
  - [ ] Sub-task: Fix layout issues per skin
  - [ ] Sub-task: Document skin-specific behaviors

### 7.3 Shared Component Library
- [ ] Task: Create shared component library
  - [ ] Sub-task: Extract common components from skins
  - [ ] Sub-task: Create `components/ui/shared/` directory
  - [ ] Sub-task: Document shared component usage
  - [ ] Sub-task: Test shared components in all skins

- [ ] Task: Conductor - User Manual Verification 'Phase 7 Component Compatibility'

---

## Phase 8: Theme Implementation [P0]

### 8.1 CSS Variables
- [ ] Task: Implement CSS variable system
  - [ ] Sub-task: Define CSS variables for light mode
  - [ ] Sub-task: Define CSS variables for dark mode
  - [ ] Sub-task: Add data-theme attribute switching
  - [ ] Sub-task: Add theme transition classes
  - [ ] Sub-task: Test CSS variable switching

### 8.2 Per-Skin Themes
- [ ] Task: Create per-skin theme variants
  - [ ] Sub-task: Create mobile skin theme overrides
  - [ ] Sub-task: Create QuickBooks skin theme overrides (green accent)
  - [ ] Sub-task: Create advanced-graph skin theme overrides
  - [ ] Sub-task: Apply skin-specific spacing/typography
  - [ ] Sub-task: Test themes in each skin

### 8.3 Theme Customization
- [ ] Task: Add theme customization support
  - [ ] Sub-task: Allow user to override theme values
  - [ ] Sub-task: Store custom theme values in profile
  - [ ] Sub-task: Apply custom themes on load
  - [ ] Sub-task: Add theme reset to default
  - [ ] Sub-task: Test theme customization

- [ ] Task: Conductor - User Manual Verification 'Phase 8 Theme Implementation'

---

## Phase 9: User Profile Integration [P1]

### 9.1 Profile Schema
- [ ] Task: Update user profile schema
  - [ ] Sub-task: Add skin preference field
  - [ ] Sub-task: Add theme preference field
  - [ ] Sub-task: Add per-skin customizations field
  - [ ] Sub-task: Update profile CRUD operations
  - [ ] Sub-task: Test profile schema

### 9.2 Profile Persistence
- [ ] Task: Implement profile persistence
  - [ ] Sub-task: Save skin/theme selection on change
  - [ ] Sub-task: Load skin/theme on login
  - [ ] Sub-task: Apply defaults for new users (mobile, auto)
  - [ ] Sub-task: Sync preferences across devices
  - [ ] Sub-task: Test persistence

### 9.3 Profile Settings UI
- [ ] Task: Create profile settings UI
  - [ ] Sub-task: Add skin selector to settings page
  - [ ] Sub-task: Add theme selector to settings page
  - [ ] Sub-task: Add per-skin customization options
  - [ ] Sub-task: Add reset to defaults button
  - [ ] Sub-task: Test settings UI

- [ ] Task: Conductor - User Manual Verification 'Phase 9 Profile Integration'

---

## Phase 10: Accessibility & Performance [P0]

### 10.1 Accessibility Audit
- [ ] Task: Perform WCAG 2.1 AA audit
  - [ ] Sub-task: Test all 3 skins with screen reader
  - [ ] Sub-task: Test keyboard navigation in all skins
  - [ ] Sub-task: Verify color contrast in all themes
  - [ ] Sub-task: Verify touch targets in mobile skin
  - [ ] Sub-task: Test focus indicators
  - [ ] Sub-task: Fix accessibility issues

### 10.2 Performance Optimization
- [ ] Task: Optimize for performance
  - [ ] Sub-task: Run Lighthouse audit for each skin
  - [ ] Sub-task: Optimize chart rendering (advanced-graph)
  - [ ] Sub-task: Lazy load skin components
  - [ ] Sub-task: Optimize images and thumbnails
  - [ ] Sub-task: Verify performance targets met

### 10.3 Cross-Browser Testing
- [ ] Task: Test across browsers
  - [ ] Sub-task: Test in Chrome/Edge (Chromium)
  - [ ] Sub-task: Test in Firefox
  - [ ] Sub-task: Test in Safari
  - [ ] Sub-task: Test on mobile browsers
  - [ ] Sub-task: Fix browser-specific issues

- [ ] Task: Conductor - User Manual Verification 'Phase 10 A11y & Performance'

---

## Phase 11: Migration & Rollout [P1]

### 11.1 Migration from Existing Dashboard
- [ ] Task: Migrate existing Dashboard
  - [ ] Sub-task: Refactor Dashboard.tsx as QuickBooks skin
  - [ ] Sub-task: Set QuickBooks as default for existing users
  - [ ] Sub-task: Ensure no breaking changes
  - [ ] Sub-task: Test migration with existing users

### 11.2 Rollout Plan
- [ ] Task: Plan rollout strategy
  - [ ] Sub-task: Create feature flag for skin system
  - [ ] Sub-task: Document migration path for users
  - [ ] Sub-task: Create help documentation
  - [ ] Sub-task: Plan gradual rollout

### 11.3 Documentation
- [ ] Task: Document skin system
  - [ ] Sub-task: Document skin architecture
  - [ ] Sub-task: Document theme customization
  - [ ] Sub-task: Document component usage per skin
  - [ ] Sub-task: Create user guide for skin selection

- [ ] Task: Conductor - User Manual Verification 'Phase 11 Migration'

---

## Success Verification

### Theme System
- [ ] Light/dark/auto mode works in all skins
- [ ] System preference detected correctly
- [ ] Theme persists across sessions
- [ ] Theme transitions are smooth

### Skin System
- [ ] All 3 skins render correctly
- [ ] Skin selector allows switching
- [ ] Skin preference persists
- [ ] Each skin has distinct layout

### Mobile Skin
- [ ] Bottom navigation works
- [ ] Touch targets ≥44px
- [ ] Swipe gestures work
- [ ] Tables render as cards
- [ ] Forms are stacked

### QuickBooks Skin
- [ ] Sidebar navigation works
- [ ] Green accent color applied
- [ ] Register view matches QuickBooks
- [ ] Keyboard shortcuts work
- [ ] "New" button prominent

### Advanced Graph Skin
- [ ] Widget grid renders
- [ ] Charts are interactive
- [ ] Real-time updates work
- [ ] Dark mode optimized
- [ ] Export works

### Component Compatibility
- [ ] All components work in all skins
- [ ] No breaking changes
- [ ] Shared component library works

### Accessibility
- [ ] WCAG 2.1 AA compliance in all skins/themes
- [ ] Screen reader works
- [ ] Keyboard navigation works
- [ ] Color contrast sufficient

### Performance
- [ ] Lighthouse scores ≥90
- [ ] First Contentful Paint <1.5s
- [ ] Time to Interactive <3.5s
