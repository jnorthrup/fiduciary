# Track: LAS Trust ERP Validation

**Status:** PLANNING
**Created:** 2026-01-21
**Scope:** Validate and implement the LAS Trust ERP OpenAPI spec via Google Cloud Functions

---

## Overview

Implementation and validation of the [LAS Trust ERP OpenAPI Spec](../tmp/las-trust-api-spec.yaml). This system provides a ledger-first Trust ERP with settlement orchestration, exposed as a set of logical Cloud Functions.

**Architecture:**
- **Spec-First:** Development driven by `las-trust-api-spec.yaml`
- **Serverless:** Google Cloud Functions (Gen 2) / Cloud Run
- **Persistence:** GCS (per-user isolation)
- **Validation:** Automated OpenAPI contract testing (`dredd` / `schemathesis`)

---

## Phase 1: API Scaffolding & Validation Layer

- [x] **OpenAPI Spec Finalization**: Move spec from `tmp/` to `docs/openapi/` and finalize version 0.2.0 (Simplified)
- [x] **Type Generation**: Generate TypeScript interfaces from OpenAPI spec
- [x] **Validation Middleware**: Implement request/response validation against the spec [implemented in server/lib/validation-middleware.js with 19 passing tests]
- [x] **Trust Routes**: Create/Get/Update/List Trusts + Trustee management [implemented in server/routes/trusts.js]

## Phase 2: Core Domain Implementation (Cloud Functions)

### Trust & Identity Domain
- [x] `createTrust` / `getTrust` / `updateTrust` / `listTrusts` [trusts.js]
- [x] `addTrustee` / `listTrustees` / `updateTrustee` [trusts.js]

### Ledger Domain
- [x] `createAccount` / `listAccounts`
- [x] `createJournalEntry` / `postJournalEntry` (Immutable Ledger)

### Settlement Domain
- [x] `createPaymentOrder` (Payment Order State Machine)
- [x] `dispatchPaymentOrder` (Sponsor Adapter Interface) [Implemented as execute endpoint]

## Phase 3: Integration & Contract Testing

- [x] **Contract Tests**: Comprehensive test suite verifying spec compliance [contract-tests.test.ts with 23 passing tests]
- [x] **Ledger Route Tests**: Complete test coverage for ledger domain [ledger.test.ts with 14 passing tests]
- [x] **Fuzz Testing**: Property-based testing of Settlement State Machine [settlement-state-machine.fuzz.test.ts with 11 passing tests]
- [x] **Performance Profile**: Cold start analysis and GCS latency benchmarking [performance-benchmark.test.ts + baseline documentation]

---

## Technical Constraints

1. **Strict OpenAPI Interfaces**: No undocumented fields or side channels.
2. **Stateless Compute**: Functions must be strictly stateless (state in GCS).
3. **Idempotency**: All non-read operations must handle retries gracefully (idempotency keys).
