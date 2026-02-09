# Specification: Clear.Flow QB Skin Unification

## Overview
This track focuses on refactoring the Clear.Flow (lastrust) user interface from a standalone bifurcated application into a modular "skin" within the unified Trust Ledger application shell. It adopts the "QuickBooks Skin" layout pattern—a state-driven mobile-first architecture—while preserving the distinct Indigo branding and personal finance capabilities.

## Problem Statement
The application previously suffered from "router bifurcation" where the two UIs (Classic Trust Ledger and Clear.Flow) were diverging into separate applications. This caused context provider conflicts, redundant logic, and a fragmented user experience. The QuickBooks skin pattern (demoting apps to layouts/views) is the chosen solution to unify these while maintaining visual distinction.

## Goals
1. **Structural Unification**: Convert `App-lastrust.tsx` into a layout component that functions as a child of the main application tree.
2. **Layout Consistency**: Implement the QuickBooks mobile layout: persistent header, bottom nav, and side drawer.
3. **Feature Alignment**: Restore and patch all Clear.Flow specific features (Plaid, CSV Import, Payment Center, Loan Manager) into the new layout.
4. **Robust Navigation**: Implement a simple hash-based router for deep linking and back-button support without a full history-based routing dependency.

## Functional Requirements
### 1. Unified App Shell
- The application entry point (`index.tsx`) shall manage the `AuthProvider` and `LedgerProvider`.
- A splash screen shall allow the user to select between "Trust Ledger" (Classic) and "Clear.Flow" (Personal Finance).
- Component state shall dictate which skin is active, ensuring a single shared data store.

### 2. Clear.Flow QB Layout
- **Header**: Indigo-600 background, entity selector in drawer, active view title.
- **Main Area**: Scrollable container for modular views (Dashboard, Banking, Payments, Loans, Profile, Settings).
- **Navigation**: Persistent bottom bar with 5 primary icons.
- **Drawer**: Side menu for entity switching and system settings.

### 3. Core Modules
- **Dashboard**: Net liquidity, in-flight, and debt summary widgets plus liquidity trend charts.
- **Banking**: Reuses `MobileAccountList` for entity-specific chart of accounts.
- **Payment Center**: Switchable interface for ACH and FedWire origination.
- **Loan Manager**: Consolidated view for credit defense and collateral management.
- **User Profile**: Extensible data entity editor for the current user.

## Non-Functional Requirements
- **Performance**: Zero-lag tab switching (all views kept in memory or efficiently swapped).
- **Resilience**: Fail-safe for missing entity data or API connectivity.
- **Consistency**: All Clear.Flow UI elements must adhere to the Indigo color palette.

## Acceptance Criteria
- [ ] Application renders without "LedgerProvider" context errors.
- [ ] Clear.Flow UI displays the Indigo theme and QuickBooks-style navigation.
- [ ] Tab switching correctly renders the Dashboard, Banking, Payments, and Loans views.
- [ ] URL hash (e.g., `#dashboard`) synchronizes with the active tab.
- [ ] CSV import successfully processes files from the Dashboard "Quick Import" card.
- [ ] Plaid Link opens and handles tokens correctly from the Dashboard.

## Out of Scope
- Full desktop layout for Clear.Flow (mobile-first is the priority).
- Backend refactoring or database schema migrations.
- Implementation of new financial logic (only patching existing implementations).
