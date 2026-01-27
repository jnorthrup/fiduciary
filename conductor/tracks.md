# Project Tracks

Primary scope: **NACHA posting client + Account ledger**

---

## [x] Track: LAS Trust ERP Validation

*Link: [./conductor/tracks/las_trust_erp_20260121/](./conductor/tracks/las_trust_erp_20260121/)*
*OpenAPI spec validation, Cloud Function scaffolding, and settlement orchestration*

---

## [x] Track: Full Ledgering - Credit & Debit Account CRUD

*Link: [./conductor/tracks/ledger_20260114/](./conductor/tracks/ledger_20260114/)*
*Account table operations, journal entries, balance tracking*

---

## [x] Track: Use Case Correctness & Test Adjustments

*Link: [./conductor/tracks/test_correctness_20260121/](./conductor/tracks/test_correctness_20260121/)*
*Fix AccountTable test failures, establish use case testing standards*

---

## [x] Track: Settlement → NACHA Integration

*Link: [./conductor/tracks/settlement_nacha_20260122/](./conductor/tracks/settlement_nacha_20260122/)*
*Wire ledger payment orders to NACHA file generation and submission*

---

## [x] Track: JSONL LSM Persistence Layer

*Link: [./conductor/tracks/jsonl_lsm_persistence_20260121/](./conductor/tracks/jsonl_lsm_persistence_20260121/)*
*LSM-tree with JSONL WAL, configurable threshold, MapReduce-compatible streaming*

---

## [x] Track: BOFA CashPro API Integration

*Link: [./conductor/tracks/bofa_cashpro_20260123/](./conductor/tracks/bofa_cashpro_20260123/)*
*Bank of America ACH origination, automatic posting, 2-cent test transaction, OAuth 2.0*

---

## [ ] Track: Day/Night Capable Skins System

*Link: [./conductor/tracks/nightday_skins_20260124/](./conductor/tracks/nightday_skins_20260124/)*
*3 day-night capable skins (mobile, QuickBooks, advanced graph layout) with UI toggle for profile selection. Profile-resident CRUD for skin adjustments.*

---

## [ ] Track: Baselane API Integration

*Link: [./conductor/tracks/baselane_api_20260124/](./conductor/tracks/baselane_api_20260124/)*
*Landlord banking API integration: rent collection, property management, tenant management, automated payments, ledger & settlement integration*

---

## [ARCHIVED] Completed & Retired Tracks

Stored in `conductor/archive/` for reference:

**Completed:**
- NACHA Account Management System (nacha_accounts_20260120)
- ACH Settlement Logic (ach_settlement_20260112)
- CI/CD Pipeline (cid_deploy_20260115)
- Production Readiness (production_readiness_20260120)

**Retired (incomplete):**
- 1099 IRS CAFR Proficiency (1099_20260111)
- Teach Mode Paragraph Activation (teach-mode_20260112)
- Disjoint Backlog (disjoint_backlog_20260113)
- Administrative Process Management (admin_process_20260114)
- BSO Implementation (bso_phase1_20260114)
- Mobile QuickBooks Layout (mobile_quickbooks_layout_20260115)
- Settlement Architecture Rail Adapters (settlement_architecture_20260115)
- Audit (audit_20260115)
- Long Horizon Adapters (long_horizon_adapters_20260121)
- QuickBooks Toggle (quickbooks_toggle_20260119)
- Specialization (specialization_20260113)
