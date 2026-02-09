# Plan: Clear.Flow QB Skin Unification

## Phase 1: Foundation & Context Unification
Goal: Resolve the "LedgerProvider" context error and establish a shared state shell.

- [x] Task: AuthProvider wraps UnifiedApp in index.tsx (Clear.Flow uses apiClient, not LedgerProvider)
- [x] Task: Splash screen launches without context errors
- [x] Task: App-lastrust.tsx correctly invoked as lazy-loaded component from index.tsx

## Phase 2: Clear.Flow UI Refactoring (QuickBooks Layout)
Goal: Transform the standalone app into a layout-driven skin.

- [x] Task: Implement `activeTab` state and hash router synchronization (#dashboard, #ledger, #rail, #entities, #lending, #admin)
- [x] Task: Structure layout with header (indigo-600), main (scrollable), nav (bottom bar), aside (drawer)
- [x] Task: Apply Indigo-600 branding across header and drawer
- [x] Task: Side drawer with full nav list, Help & Support, Sign Out

## Phase 3: Module Restoration & Functional Patching
Goal: Restore all original Clear.Flow pages into the QB shell using apiClient (not useLedgerStore).

- [x] Task: Restore DashboardPage with Cash/Transit/AP balance cards, chart series, PlaidLinkButton
- [x] Task: Restore Ledger pages (Accounts, Journal, Reports) with prop-driven LedgerTabs + LedgerPage wrapper
- [x] Task: Restore Rail pages (Payees, Payment Orders, Bank Mirror, Reconcile, Documents, Webhook Tester) with prop-driven RailTabs + RailPage wrapper
- [x] Task: Restore EntitiesPage (table, verify/approve, add form) + Lending/Admin placeholders
- [x] Task: Delete LoginPage, useRoute/RouteContext/useRouteContext, and login guards (auth via index.tsx)

## Phase 4: Verification & Quality Assurance
Goal: Final validation of the unified experience.

- [x] Task: Verify Plaid Link connectivity and token exchange flow
- [x] Task: Cross-tab navigation testing (bottom nav, drawer, sub-tabs, hash URL sync)
- [x] Task: Verify logout and skin-switching persistence (localStorage `fiduciary_skin_v2`)
- [x] Task: Vite build succeeds with zero TS errors in App-lastrust.tsx
