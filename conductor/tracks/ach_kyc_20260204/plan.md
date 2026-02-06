# Plan: ACH + KYC Integration — achq.com, Plaid, Stripe

---

## Phase 1: Core Types & Provider Registration

- [x] Task: Extend `BankingProvider` enum with `ACHQ` and `STRIPE` in `types/banking/core.ts`
    - [x] Add `ACHQ = 'achq'` and `STRIPE = 'stripe'` to enum
    - [x] Add `AchqConfig` and `StripeConfig` interfaces extending `ProviderConfig`
    - [x] Update `types/banking/index.ts` exports
- [x] Task: Write tests for new provider config types [7cdfdba]
    - [x] Unit tests validating AchqConfig and StripeConfig shape and defaults
    - [x] Confirm tests fail (Red)
- [x] Task: Implement and verify config types [7cdfdba]
    - [x] Ensure tests pass (Green)
    - [x] Commit: `feat(banking): Register ACHQ and STRIPE provider types`
- [~] Task: Conductor - User Manual Verification 'Phase 1' (Protocol in workflow.md)

---

## Phase 2: AchqAdapter

- [ ] Task: Write tests for AchqAdapter
    - [ ] Mock achq.com HTTP responses (account list, balance, payment initiation, payment status)
    - [ ] Test ACH credit and ACH debit initiation
    - [ ] Test account listing and balance check
    - [ ] Test error handling (auth failure, rate limit, invalid amount)
    - [ ] Confirm tests fail (Red)
- [ ] Task: Implement AchqAdapter
    - [ ] Extend `BaseAdapter`; set `provider = BankingProvider.ACHQ`
    - [ ] Implement `listAccountsImplementation`, `getBalance`, `initiatePaymentImplementation`
    - [ ] Implement payment-status polling (`getPaymentStatus`)
    - [ ] Declare capabilities: ACH credit + debit, accounts, balances, webhooks
    - [ ] Confirm tests pass (Green)
- [ ] Task: Register AchqAdapter in BankingFacade
    - [ ] Add to facade provider map and initialization
    - [ ] Commit: `feat(banking): Add AchqAdapter for ACH origination`
- [ ] Task: Conductor - User Manual Verification 'Phase 2' (Protocol in workflow.md)

---

## Phase 3: StripeAdapter

- [ ] Task: Write tests for StripeAdapter
    - [ ] Mock Stripe PaymentIntents API responses (create, retrieve, ACH bank_account source)
    - [ ] Test ACH credit initiation only
    - [ ] Test account listing and balance check
    - [ ] Test error handling (auth failure, card_declined equivalent, rate limit)
    - [ ] Confirm tests fail (Red)
- [ ] Task: Implement StripeAdapter
    - [ ] Extend `BaseAdapter`; set `provider = BankingProvider.STRIPE`
    - [ ] Implement `listAccountsImplementation`, `getBalance`, `initiatePaymentImplementation`
    - [ ] Implement payment-status polling via PaymentIntents retrieve
    - [ ] Declare capabilities: ACH credit only, accounts, balances, webhooks
    - [ ] Confirm tests pass (Green)
- [ ] Task: Register StripeAdapter in BankingFacade
    - [ ] Add to facade provider map and initialization
    - [ ] Commit: `feat(banking): Add StripeAdapter for ACH origination`
- [ ] Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md)

---

## Phase 4: KycService

- [ ] Task: Write tests for KycService
    - [ ] Test routing logic: achq rail → Plaid Identity, Stripe rail → Stripe Identity
    - [ ] Mock Plaid Identity verify and Stripe Identity verify API responses
    - [ ] Test all KycStatus outcomes: pending, verified, failed, requires_review
    - [ ] Test PII is not logged or persisted beyond provider call
    - [ ] Confirm tests fail (Red)
- [ ] Task: Implement KycService
    - [ ] Define `KycRequest` and `KycStatus` types
    - [ ] Implement provider routing based on selected ACH rail
    - [ ] Implement Plaid Identity call (name, SSN/TIN, DOB, address, doc upload)
    - [ ] Implement Stripe Identity call (same fields)
    - [ ] Persist `KycStatus` per user/entity (GCS user state)
    - [ ] Cache verified status; trigger re-verification only on failure or manual request
    - [ ] Confirm tests pass (Green)
    - [ ] Commit: `feat(banking): Add KycService with Plaid/Stripe Identity routing`
- [ ] Task: Conductor - User Manual Verification 'Phase 4' (Protocol in workflow.md)

---

## Phase 5: Webhook Ingestion & Ledger Integration

- [ ] Task: Write tests for webhook route and ledger integration
    - [ ] Test achq.com HMAC signature verification (valid + tampered)
    - [ ] Test Stripe `stripe-signature` header verification (valid + tampered)
    - [ ] Test idempotency: duplicate event IDs are deduplicated
    - [ ] Test journal entry creation on payment initiation (debit source, credit ACH-transit)
    - [ ] Test ledger transaction status update on webhook event
    - [ ] Confirm tests fail (Red)
- [ ] Task: Implement webhook route
    - [ ] Add `POST /api/banking/webhooks/:provider` route
    - [ ] Implement HMAC verification for achq.com
    - [ ] Implement Stripe signature verification
    - [ ] Parse event and map to internal transaction status
    - [ ] Deduplicate by event ID before processing
    - [ ] Confirm tests pass (Green)
- [ ] Task: Implement dual-track ledger integration
    - [ ] On successful payment initiation: write journal entry immediately
    - [ ] Define ACH-transit account in chart of accounts if not present
    - [ ] Update transaction status in ledger when webhook is received
    - [ ] Confirm tests pass (Green)
    - [ ] Commit: `feat(banking): Add webhook ingestion and dual-track ledger integration`
- [ ] Task: Conductor - User Manual Verification 'Phase 5' (Protocol in workflow.md)

---

## Phase 6: Backend API Routes

- [ ] Task: Write tests for KYC and ACH payment API routes
    - [ ] Test `POST /api/banking/kyc/verify` — submit KYC, returns status
    - [ ] Test `GET /api/banking/kyc/status` — returns cached KycStatus
    - [ ] Test `POST /api/banking/payments` with provider field — routes to correct adapter
    - [ ] Test payment blocked when KycStatus !== verified (403)
    - [ ] Test validation: missing required fields return 400
    - [ ] Confirm tests fail (Red)
- [ ] Task: Implement API routes
    - [ ] `POST /api/banking/kyc/verify` — accepts PII + doc, calls KycService, returns status
    - [ ] `GET /api/banking/kyc/status` — returns persisted KycStatus for authenticated user
    - [ ] Extend `POST /api/banking/payments` — accept `provider` field, enforce KYC gate before routing
    - [ ] Confirm tests pass (Green)
    - [ ] Commit: `feat(banking): Add KYC and ACH payment API routes with KYC gating`
- [ ] Task: Conductor - User Manual Verification 'Phase 6' (Protocol in workflow.md)

---

## Phase 7: KYC Onboarding UI

- [ ] Task: Write tests for KYC onboarding components
    - [ ] Test form renders all fields: name, SSN/TIN, DOB, address, doc upload
    - [ ] Test form submission calls POST /api/banking/kyc/verify
    - [ ] Test status display: pending spinner, verified checkmark, failed with retry
    - [ ] Test doc upload component: accepts image/PDF, preview, remove
    - [ ] Confirm tests fail (Red)
- [ ] Task: Implement KYC onboarding UI
    - [ ] React screen: "Verify Your Identity"
    - [ ] Form fields with validation (required, SSN format mask, DOB date picker)
    - [ ] Document upload: gov-ID front + back (drag-and-drop + file picker)
    - [ ] On submit: call API, show pending spinner
    - [ ] On response: display verified checkmark or failed state with retry button
    - [ ] Confirm tests pass (Green)
    - [ ] Commit: `feat(ui): Add KYC onboarding screen`
- [ ] Task: Conductor - User Manual Verification 'Phase 7' (Protocol in workflow.md)

---

## Phase 8: ACH Payment Initiation UI

- [ ] Task: Write tests for ACH payment initiation components
    - [ ] Test form renders: amount, routing number, account number, memo, provider selector
    - [ ] Test provider rail selector: achq.com and Stripe options
    - [ ] Test KYC status badge: green if verified, red/blocked if not
    - [ ] Test submission blocked when KYC not verified
    - [ ] Test post-submission display: payment ID, settlement window, status
    - [ ] Confirm tests fail (Red)
- [ ] Task: Implement ACH payment initiation UI
    - [ ] React screen: "Send ACH Payment"
    - [ ] Amount input with USD formatting
    - [ ] Destination: routing number + account number fields with validation
    - [ ] Memo/reference field
    - [ ] Provider rail selector dropdown (achq.com | Stripe)
    - [ ] Pre-flight KYC badge — links to onboarding if not verified
    - [ ] On submit: call POST /api/banking/payments, show pending
    - [ ] On response: show payment ID, estimated settlement, live status polling
    - [ ] Confirm tests pass (Green)
    - [ ] Commit: `feat(ui): Add ACH payment initiation screen with rail selector`
- [ ] Task: Conductor - User Manual Verification 'Phase 8' (Protocol in workflow.md)

---

## Phase 9: Integration & Coverage

- [ ] Task: Wire all components and run full integration verification
    - [ ] Verify AchqAdapter and StripeAdapter registered and reachable via BankingFacade
    - [ ] Verify KycService routing end-to-end (achq→Plaid, Stripe→Stripe)
    - [ ] Verify KYC gate blocks payment when status !== verified
    - [ ] Verify journal entry written on payment initiation
    - [ ] Verify webhook updates transaction status in ledger
    - [ ] Verify KYC UI → API → KycService flow
    - [ ] Verify ACH UI → API → adapter → ledger flow
- [ ] Task: Run coverage report and close gaps
    - [ ] Run `CI=true npm test -- --coverage` across all new files
    - [ ] Identify any files below 80% coverage threshold
    - [ ] Add missing tests and re-run until >80% across all new modules
- [ ] Task: Final security audit
    - [ ] Grep for SSN/TIN in logs, persisted state, or console output — must be zero
    - [ ] Verify webhook signatures are mandatory (no bypass path)
    - [ ] Verify all credentials are env-var sourced
    - [ ] Commit: `feat(banking): Integration verification and coverage sign-off`
- [ ] Task: Conductor - User Manual Verification 'Phase 9' (Protocol in workflow.md)
