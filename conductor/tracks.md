# Project Tracks

Primary scope: **NACHA posting client + Account ledger**

---

## [COMPLETE] Track: Clear.Flow Normalization

*Encompasses: QB Skin Unification, Dual App Consolidation, Env Var Normalization*

- [clearflow_qb_unification_20260209](./conductor/tracks/clearflow_qb_unification_20260209/) — Restored all original pages into QB mobile shell (indigo header, bottom nav, drawer, hash routing). Prop-driven sub-tabs, apiClient-based pages. Deleted LoginPage/RouteContext.
- [dual_app_consolidation_20260209](./conductor/tracks/dual_app_consolidation_20260209/) — Unified Google Auth, DualEntrySplash skin selector, single index.tsx entry point. Purged all local login/password flows.
- Env var normalization — Standardized all client-side vars to `import.meta.env.VITE_*`. Cleaned SettingsModal fallback chain, DocumentCaptureWizard, IRIS1099Wizard.

---

## [COMPLETE] Track: Integration Tests & Business Invariants
*Link: [./conductor/tracks/unified_remaining_20260209/](./conductor/tracks/unified_remaining_20260209/)*
*Key flow integration tests, double-entry accounting rules, NACHA format validation, balance correctness.*

---

## [COMPLETE] Track: Offload 2FA to Google OAuth Provider
*Link: [./conductor/tracks/google_oauth_2fa_20260209/](./conductor/tracks/google_oauth_2fa_20260209/)*
*Replace custom TwoFactorAuthModal with Google re-auth. Retain step-up auth guard points for rail operations (FedGateway, ACH, payments) via pluggable StepUpAuthProvider.*

---

## [COMPLETE] Track: Coinbase OpenAPI Rail
*Link: [./conductor/tracks/coinbase_openapi_rail_20260209/](./conductor/tracks/coinbase_openapi_rail_20260209/)*
*Integrate Coinbase as a crypto transfer rail via OpenAPI. Server-side proxy, typed client, rail adapter, UI components for balances/send/receive/history.*

---

## [PLANNING] Track: Long Horizon Adapters

*Link: [./conductor/tracks/long_horizon_adapters_20260121/](./conductor/tracks/long_horizon_adapters_20260121/)*
*Future-proof adapter patterns: LSM-tree WAL, Merkle tree integrity, SHA-3 sponge, USB crypto path, generic 2FA wrapper (Google-only)*

---

## [COMPLETE] Track: Production Readiness

*Link: [./conductor/tracks/production_readiness_20260120/](./conductor/tracks/production_readiness_20260120/)*
*Demo code removal, Plaid integration, production deployment*

---

## [COMPLETE] Track: ACH Settlement Logic

*Link: [./conductor/tracks/ach_settlement_20260112/](./conductor/tracks/ach_settlement_20260112/)*

---

## [COMPLETE] Track: CI/CD Pipeline

*Link: [./conductor/tracks/cid_deploy_20260115/](./conductor/tracks/cid_deploy_20260115/)*

---

## [MERGED] Track: Full Ledgering - Credit & Debit Account CRUD

*Link: [./conductor/tracks/ledger_20260114/](./conductor/tracks/ledger_20260114/)*
*Account table operations, journal entries, balance tracking*

---

## [MERGED] Track: Use Case Correctness & Test Adjustments

*Link: [./conductor/tracks/test_correctness_20260121/](./conductor/tracks/test_correctness_20260121/)*
*Fix AccountTable test failures, establish use case testing standards*

---

## [RETIRED] Incomplete Tracks

The following tracks are retired incomplete to focus on core NACHA + ledger functionality:

- 1099 IRS CAFR Proficiency (1099_20260111)
- Teach Mode Paragraph Activation (teach-mode_20260112)
- Disjoint Backlog (disjoint_backlog_20260113)
- Administrative Process Management (admin_process_20260114)
- BSO Implementation (bso_phase1_20260114)
- Mobile QuickBooks Layout (mobile_quickbooks_layout_20260115)
- Settlement Architecture Rail Adapters (settlement_architecture_20260115)

---

## [DEFERRED] Track: NACHA Account Management System

*Link: [./conductor/tracks/nacha_accounts_20260120/](./conductor/tracks/nacha_accounts_20260120/)*
*Mobile-first account table, NACHA submissions, GCS WAL persistence*
