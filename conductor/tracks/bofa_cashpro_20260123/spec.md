# Specification: BOFA CashPro API Integration

**Track ID:** bofa_cashpro_20260123
**Status:** New
**Priority:** P0 (Production payment processing)

## Overview

Integrate Bank of America CashPro Payment API for secure ACH origination, enabling automatic posting of settlement payment orders from the ledger system through NACHA file submission to BOFA. Includes 2-cent validation transaction to verify end-to-end flow before production use.

## Scope

**In Scope:**
- BOFA CashPro OAuth 2.0 authentication and token management
- ACH Payment Origination API (submit NACHA files)
- ACH Payment Status API (track payment status)
- Account Validation API (verify routing/account numbers)
- Balance Inquiry API (check account balance)
- Automatic posting: every settlement auto-submits to BOFA via API
- 2-cent test transaction for system validation
- Secure credential storage via Google Secret Manager
- Egress IP whitelisting: 35.190.0.0/18 (us-central1)

**Out of Scope:**
- Wire transfers (different BOFA API)
- International payments (SWIFT)
- Real-time webhooks for status updates
- Multi-bank support (BOFA only)

---

## Phase 1: BOFA CashPro Authentication

### 1.1 OAuth 2.0 Client Credentials

**Requirements:**
- Implement client credentials flow (grant_type=client_credentials)
- Store credentials in Google Secret Manager:
  - `bofa-client-id`
  - `bofa-client-secret`
  - `bofa-tenant-id`
- Token caching with TTL management
- Automatic token refresh before expiration

**API:**
```typescript
interface BOFAAuthConfig {
  clientId: string
  clientSecret: string
  tenantId: string
  tokenUrl: string  // https://api.bankofamer.com/auth/oauth/v2/token
}

interface BOFATokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  scope: string
}

async function getAuthToken(): Promise<string>
async function refreshAuthToken(): Promise<string>
```

---

## Phase 2: Account Validation API

### 2.1 Routing/Account Number Verification

**Requirements:**
- Validate routing numbers (9-digit, valid ABA routing)
- Validate account numbers format
- Check account existence via BOFA API before submission
- Return account status (active, closed, invalid)

**API:**
```typescript
interface AccountValidationRequest {
  routingNumber: string
  accountNumber: string
  accountType: 'checking' | 'savings'
}

interface AccountValidationResponse {
  valid: boolean
  routingNumberValid: boolean
  accountNumberValid: boolean
  accountStatus: 'active' | 'closed' | 'invalid' | 'not_found'
  bankName: string
}

async function validateAccount(
  request: AccountValidationRequest
): Promise<AccountValidationResponse>
```

---

## Phase 3: ACH Payment Origination API

### 3.1 NACHA File Submission

**Requirements:**
- Submit generated NACHA files to BOFA CashPro
- Use existing `nacha-generator.js` for file creation
- Parse BOFA submission response
- Handle submission errors and retries

**API:**
```typescript
interface ACHSubmissionRequest {
  nachaFileContent: string
  fileName: string
  effectiveDate: string
  customerReference: string
}

interface ACHSubmissionResponse {
  submissionId: string
  status: 'accepted' | 'rejected' | 'pending_review'
  receivedTimestamp: string
  bofaReference: string
}

async function submitACHFile(
  request: ACHSubmissionRequest
): Promise<ACHSubmissionResponse>
```

### 3.2 Automatic Posting Integration

**Requirements:**
- Hook into settlement workflow (routes/settlement.js)
- Every approved payment order → NACHA generation → BOFA submission
- Store submission ID with payment order
- Fire-and-forget with error logging (no blocking)

**Integration Point:**
```typescript
// In settlement workflow
afterPaymentOrderApproved: async (order) => {
  const nachaFile = await generateNachaFile(order)
  const submission = await submitACHFile({ nachaFile, ... })
  await updatePaymentOrder(order.id, { bofaSubmissionId: submission.submissionId })
}
```

---

## Phase 4: ACH Payment Status API

### 4.1 Payment Tracking

**Requirements:**
- Query payment status by submission ID
- Track through BOFA lifecycle: submitted → processing → settled → returned
- Update payment order status in ledger
- Handle return codes (R01, R02, etc.)

**API:**
```typescript
interface PaymentStatusResponse {
  submissionId: string
  status: 'submitted' | 'processing' | 'settled' | 'returned' | 'rejected'
  settledDate?: string
  returnCode?: string
  returnReason?: string
}

async function getPaymentStatus(
  submissionId: string
): Promise<PaymentStatusResponse>
```

---

## Phase 5: Balance Inquiry API

### 5.1 Account Balance Check

**Requirements:**
- Query BOFA settlement account balance
- Display in dashboard UI
- Pre-transaction validation (sufficient funds)

**API:**
```typescript
interface BalanceResponse {
  accountNumber: string  // masked
  availableBalance: number
  currentBalance: number
  currency: string
  asOfDate: string
}

async function getBalance(accountId: string): Promise<BalanceResponse>
```

---

## Phase 6: 2-Cent Test Transaction

### 6.1 System Validation

**Requirements:**
- Create test payment order: $0.02 debit from test account
- Generate NACHA file
- Submit to BOFA sandbox
- Track through status API
- Verify complete flow: ledger → NACHA → BOFA → settled
- Use test routing number: 021000021 (BOFA test)
- Use test account format: 9999999999

**Test Sequence:**
1. Create test payment order in ledger
2. Generate NACHA file with 2-cent debit
3. Submit to BOFA sandbox
4. Poll status API until settled
5. Reconcile: ledger balance matches BOFA settled amount
6. Log success/failure with full trace

---

## Technical Constraints

### Security
- OAuth 2.0 client credentials only
- Credentials stored in Google Secret Manager
- No credentials in code or environment variables
- Egress via static IP range: 35.190.0.0/18
- TLS 1.3 for all API calls

### API Endpoints (Sandbox)
- Auth: `https://api.bankofamerica.com/auth/oauth/v2/token`
- ACH Origination: `https://api.bankofamerica.com/achs/v1/payments`
- Account Validation: `https://api.bankofamerica.com/achs/v1/accounts/validate`
- Payment Status: `https://api.bankofamerica.com/achs/v1/payments/{id}`
- Balance: `https://api.bankofamerica.com/accounts/v1/balances`

### Performance
- Token cache TTL: 3300 seconds (55 min)
- API timeout: 30 seconds
- Retry: exponential backoff, max 3 attempts
- Status poll interval: 5 minutes

### Error Handling
- 401 Unauthorized: refresh token, retry
- 429 Rate Limit: exponential backoff
- 500 Server Error: retry up to 3 times
- 400 Validation Error: do not retry, log error

---

## Dependencies

### Existing Code
- `nacha-generator.js` - NACHA file generation
- `services/nachaService.ts` - NACHA service layer
- `services/ledgerService.ts` - Journal and balance queries
- `routes/settlement.js` - Settlement workflow integration point

### External APIs
- Bank of America CashPro Payment API
- Google Secret Manager (@google-cloud/secret-manager)

---

## Acceptance Criteria

### Unit Tests
- OAuth token management (refresh, cache)
- Account validation parsing
- NACHA submission request/response
- Payment status parsing
- Balance inquiry parsing

### Integration Tests
- Mock BOFA API responses
- End-to-end settlement → NACHA → submission flow
- Token refresh on 401
- Retry logic on 429/500

### Manual Verification
- 2-cent test transaction settles successfully
- BOFA sandbox confirms submission
- Ledger balances reconcile
- Dashboard displays BOFA status

---

## Sources

- [BOFA CashPro Developer Studio](https://developer.bankofamerica.com/)
- [ACH Getting Started Guide](https://developer.merchant-services.bankofamerica.com/assets/guides/integrations/gettingstarted/ACHGettingStarted.pdf)
- [CashPro Payment API](https://newsroom.bankofamerica.com/content/newsroom/press-releases/2022/10/bank-of-america-expands-its-cashpro--payment-api-capability-to-o.html)
