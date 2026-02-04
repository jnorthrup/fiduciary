# ACH + KYC Integration — achq.com, Plaid, Stripe

## Overview

Extend the Trust Ledger banking abstraction layer with two new ACH origination
providers (achq.com, Stripe) and CIP-compliant KYC identity verification (Plaid
Identity, Stripe Identity). Adds a full-stack UI for KYC onboarding and ACH
payment initiation with user-selectable provider rails. Payments are recorded as
journal entries in the double-entry ledger immediately; settlement lifecycle is
managed by the originating provider via webhooks — no local NACHA file is
generated.

## Functional Requirements

### FR-1: Provider Registration
- Add `ACHQ` and `STRIPE` to the `BankingProvider` enum in `types/banking/core.ts`.
- Add `AchqConfig` and `StripeConfig` interfaces extending `ProviderConfig`.
- Register both adapters in `BankingFacade` initialization.

### FR-2: AchqAdapter
- Implement `IBankingAdapter` for achq.com.
- Capabilities: ACH credit + ACH debit initiation, account listing, balance check.
- Auth: API key issued from achq.com dashboard.
- Expose payment-status polling.
- Emit webhook events: created, processing, settled, failed.

### FR-3: StripeAdapter
- Implement `IBankingAdapter` for Stripe Payments (PaymentIntents + ACH
  bank_account source). ACH credit only.
- Auth: secret key + publishable key.
- Expose payment-status polling.
- Emit webhook events: payment_intent.succeeded, payment_intent.payment_failed.

### FR-4: KycService
- New module abstracting Plaid Identity and Stripe Identity behind one interface.
- Routing rule: achq.com rail → Plaid Identity; Stripe rail → Stripe Identity.
- Verifies: legal name, SSN/TIN, DOB, residential address, gov-issued ID document.
- Returns `KycStatus`: pending | verified | failed | requires_review.
- Status persisted per user/entity; re-verification only on failure or manual request.

### FR-5: ACH Payment Gating
- Payment initiation checks `KycStatus` before proceeding.
- Rejected with a clear, actionable error if status !== verified.
- Payment request carries explicit `provider` field selecting the ACH rail.

### FR-6: Dual-Track Ledger Integration
- On successful initiation: journal entry written immediately
  (debit source account, credit ACH-transit account).
- Settlement status updated asynchronously via provider webhooks — not via the
  local settlement state machine.
- No local NACHA file generated for these payments.

### FR-7: KYC Onboarding UI
- React screen: "Verify Your Identity".
- Fields: legal name, SSN/TIN, DOB, address (street/city/state/ZIP), gov-ID
  document upload (front + back).
- Calls KycService via new API route on submission.
- Live status display: pending (spinner), verified (checkmark), failed (retry).

### FR-8: ACH Payment Initiation UI
- React screen: "Send ACH Payment".
- Fields: amount, destination routing + account number, memo/reference.
- Provider rail selector: achq.com | Stripe.
- Pre-flight KYC status badge; submission blocked if not verified.
- Post-submission: payment ID, estimated settlement window, live status.

### FR-9: Webhook Ingestion
- Route: `POST /api/banking/webhooks/:provider`
- Signature verification: achq.com HMAC, Stripe `stripe-signature`.
- Parses event → updates transaction status in ledger.
- Idempotent: duplicate events deduplicated by event ID.

## Non-Functional Requirements

- **Security**: Credentials in env vars only. Webhook signatures verified before
  processing. SSN/TIN never logged or persisted outside of provider API calls.
- **Testability**: All provider API calls mockable. >80% unit test coverage for
  all new adapters, KycService, routes, and UI components.
- **Resilience**: Retry + exponential backoff via BaseAdapter. Webhook endpoint
  idempotent.
- **Performance**: KYC status cached per user. Webhook processing <500ms p95.

## Acceptance Criteria

- [ ] AchqAdapter unit tests pass against mocked achq.com responses.
- [ ] StripeAdapter unit tests pass against mocked Stripe responses.
- [ ] KycService routes correctly to Plaid or Stripe Identity per ACH rail.
- [ ] ACH payment blocked when KycStatus !== verified.
- [ ] Journal entry created in ledger on successful payment initiation.
- [ ] Webhook ingestion updates transaction status for both providers.
- [ ] KYC onboarding UI: renders, submits, and displays all statuses.
- [ ] ACH payment UI: rail selector works, KYC gate enforced, post-submit status shown.
- [ ] All new code >80% test coverage.
- [ ] Zero SSN/TIN in logs or persisted state.

## Out of Scope

- ACH debit (pull) via Stripe — credit only in this track.
- Plaid as an ACH origination rail (remains read-only).
- Multi-currency (USD only).
- Periodic KYC refresh / re-KYC scheduling.
