# Plan: Unified Remaining Work

## Phase 1: Env Var Normalization
- [x] Task: Clean up SettingsModal.tsx 3-tier process.env fallback to import.meta.env.VITE_FIREBASE_*
- [x] Task: Fix DocumentCaptureWizard.tsx process.env.GOOGLE_CLIENT_ID to import.meta.env.VITE_GMAIL_CLIENT_ID
- [x] Task: Simplify IRIS1099Wizard.tsx dual env var check to import.meta.env.VITE_REQUIRE_2FA
- [x] Task: Verify Vite build succeeds clean after env var changes

## Phase 2: Integration Tests for Key Flows
- [x] Task: Write integration test for authenticated user → create account flow [5cd987c]
- [x] Task: Write integration test for create account → NACHA submission flow [27 tests]
- [x] Task: Write integration test for account hierarchy navigation [29 tests]

## Phase 3: Business Invariant Tests
- [x] Task: Write test for double-entry accounting rules (debits = credits) [37 tests]
- [x] Task: Write test for NACHA file format constraints (94-char records) [covered by NACHA submission test — 7 format tests]
- [x] Task: Write test for balance calculation correctness [27 tests]
