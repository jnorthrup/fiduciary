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

- [ ] **OpenAPI Spec Finalization**: Move spec from `tmp/` to `docs/openapi/` and finalize version 0.1.0
- [ ] **Type Generation**: Generate TypeScript interfaces from OpenAPI spec
- [ ] **Validation Middleware**: Implement request/response validation against the spec
- [ ] **Mock Server**: detailed mock implementation for all endpoints (Trusts, Ledger, Settlement)

## Phase 2: Core Domain Implementation (Cloud Functions)

### Trust & Identity Domain
- [ ] `createTrust` / `getTrust` / `updateTrust`
- [ ] `addTrustee` / `listTrustees`

### Ledger Domain
- [ ] `createAccount` / `listAccounts`
- [ ] `createJournalEntry` / `postJournalEntry` (Immutable Ledger)

### Settlement Domain
- [ ] `createPaymentOrder` (Payment Order State Machine)
- [ ] `dispatchPaymentOrder` (Sponsor Adapter Interface)

## Phase 3: Integration & Contract Testing

- [ ] **Contract Tests**: Run `dredd` against Cloud Functions to verify spec compliance
- [ ] **Fuzz Testing**: Property-based testing of complex flows (Settlement State Machine)
- [ ] **Performance Profile**: Cold start analysis and GCS latency optimization

---

## Technical Constraints

1. **Strict OpenAPI Interfaces**: No undocumented fields or side channels.
2. **Stateless Compute**: Functions must be strictly stateless (state in GCS).
3. **Idempotency**: All non-read operations must handle retries gracefully (idempotency keys).
