# Specification: Unified Remaining Work

## Overview
Merge remaining open tasks from Full Ledgering and Use Case Correctness tracks into one track, plus env var normalization from the current session.

## Scope

### From Use Case Correctness (test_correctness_20260121)
- Integration tests for critical user flows
- Business invariant validation tests
- Test naming verification

### From Full Ledgering (ledger_20260114)
- Account management documentation (API docs, user guide, best practices)

### From Current Session
- Environment variable normalization (SettingsModal, DocumentCaptureWizard, IRIS1099Wizard)

## Functional Requirements

### 1. Integration Tests for Key Flows
- Test authenticated user → create account flow
- Test create account → NACHA submission flow
- Test account hierarchy navigation

### 2. Business Invariant Tests
- Double-entry accounting rules (debits = credits)
- NACHA file format constraints (94-char records)
- Balance calculation correctness

### 3. Env Var Normalization
- All client-side env vars use `import.meta.env.VITE_*`
- Remove dead `process.env.FIREBASE_*` / `NEXT_PUBLIC_*` fallback chains
- Fix broken `process.env.GOOGLE_CLIENT_ID` references

## Acceptance Criteria
- Integration tests pass for critical user flows
- Business invariant tests pass
- All env var references in frontend use `import.meta.env.VITE_*` or are covered by vite.config.ts `define`
- `npx vite build` succeeds clean
