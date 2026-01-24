# Implementation Plan: BOFA CashPro API Integration

## Phase 1: Project Setup & Configuration [P0]

### 1.1 Initialize BOFA Service Module
- [x] Task: Create `services/bofaCashProService.ts` module [8c6f410]
  - [x] Sub-task: Write failing tests for module structure and exports
  - [x] Sub-task: Implement module skeleton with TypeScript interfaces
  - [x] Sub-task: Add TypeScript types for BOFA API contracts
  - [x] Sub-task: Verify tests pass

### 1.2 Google Secret Manager Setup
- [x] Task: Configure secret storage for BOFA credentials [a04eb02]
  - [x] Sub-task: Write failing tests for secret retrieval
  - [x] Sub-task: Implement Secret Manager client initialization
  - [x] Sub-task: Add helper functions: getSecret(), getBofaCredentials()
  - [x] Sub-task: Verify tests pass and coverage >80%

### 1.3 Environment Configuration
- [x] Task: Add BOFA environment variables [449147a]
  - [x] Sub-task: Update `.env.example` with BOFA variables
  - [x] Sub-task: Add BOFA config to `server/config.ts`
  - [x] Sub-task: Document egress IP whitelisting requirement

- [ ] Task: Conductor - User Manual Verification 'Phase 1 Setup'

---

## Phase 2: OAuth 2.0 Authentication [P0]

### 2.1 Token Management
- [x] Task: Implement OAuth client credentials flow [6f9a25a]
  - [x] Sub-task: Write failing tests for getAuthToken()
  - [x] Sub-task: Implement token request to BOFA auth endpoint
  - [x] Sub-task: Add token cache with TTL (55 min)
  - [x] Sub-task: Implement automatic token refresh
  - [x] Sub-task: Verify tests pass and coverage >80%

### 2.2 Error Handling for Auth
- [x] Task: Handle authentication errors [9d6ba07]
  - [x] Sub-task: Write failing tests for 401, 403 responses
  - [x] Sub-task: Implement retry logic with token refresh
  - [x] Sub-task: Add error logging for auth failures
  - [x] Sub-task: Verify tests pass

- [ ] Task: Conductor - User Manual Verification 'Phase 2 OAuth'

---

## Phase 3: Account Validation API [P1]

### 3.1 Account Validation Client
- [ ] Task: Implement validateAccount() function
  - [ ] Sub-task: Write failing tests for account validation
  - [ ] Sub-task: Implement BOFA account validation API call
  - [ ] Sub-task: Parse and return validation response
  - [ ] Sub-task: Add routing number format validation
  - [ ] Sub-task: Verify tests pass and coverage >80%

### 3.2 Integration with Settlement UI
- [ ] Task: Add account validation to payment order form
  - [ ] Sub-task: Call validateAccount() on routing/account input
  - [ ] Sub-task: Display validation status in UI
  - [ ] Sub-task: Prevent submission if account invalid
  - [ ] Sub-task: Verify integration works

- [ ] Task: Conductor - User Manual Verification 'Phase 3 Account Validation'

---

## Phase 4: ACH Payment Origination API [P0]

### 4.1 NACHA File Submission
- [ ] Task: Implement submitACHFile() function
  - [ ] Sub-task: Write failing tests for ACH submission
  - [ ] Sub-task: Implement BOFA ACH origination API call
  - [ ] Sub-task: Integrate with existing nacha-generator.js
  - [ ] Sub-task: Parse submission response and extract submissionId
  - [ ] Sub-task: Handle submission errors and retries
  - [ ] Sub-task: Verify tests pass and coverage >80%

### 4.2 Automatic Posting Integration
- [ ] Task: Hook submission into settlement workflow
  - [ ] Sub-task: Write failing tests for auto-posting trigger
  - [ ] Sub-task: Add submitACHFile() call to settlement approval
  - [ ] Sub-task: Store bofaSubmissionId with payment order
  - [ ] Sub-task: Add error handling (fire-and-forget with logging)
  - [ ] Sub-task: Verify tests pass and integration works

- [ ] Task: Conductor - User Manual Verification 'Phase 4 ACH Origination'

---

## Phase 5: ACH Payment Status API [P1]

### 5.1 Payment Status Tracking
- [ ] Task: Implement getPaymentStatus() function
  - [ ] Sub-task: Write failing tests for payment status query
  - [ ] Sub-task: Implement BOFA payment status API call
  - [ ] Sub-task: Parse status response and lifecycle states
  - [ ] Sub-task: Handle return codes (R01, R02, etc.)
  - [ ] Sub-task: Verify tests pass and coverage >80%

### 5.2 Status Polling Service
- [ ] Task: Create background polling for payment updates
  - [ ] Sub-task: Write failing tests for status polling
  - [ ] Sub-task: Implement cron job or Cloud Scheduler
  - [ ] Sub-task: Update payment order status in ledger
  - [ ] Sub-task: Add webhook support for future BOFA webhooks
  - [ ] Sub-task: Verify tests pass

- [ ] Task: Conductor - User Manual Verification 'Phase 5 Payment Status'

---

## Phase 6: Balance Inquiry API [P2]

### 6.1 Balance Check Implementation
- [x] Task: Implement getBalance() function [4cd0700]
  - [x] Sub-task: Write failing tests for balance inquiry
  - [x] Sub-task: Implement BOFA balance API call
  - [x] Sub-task: Parse balance response (available/current)
  - [x] Sub-task: Verify tests pass and coverage >80%

### 6.2 Dashboard Integration
- [x] Task: Display BOFA balance in dashboard [b003637]
  - [x] Sub-task: Add balance widget to dashboard UI
  - [x] Sub-task: Call getBalance() on dashboard load
  - [x] Sub-task: Mask account number in display
  - [x] Sub-task: Verify balance displays correctly

- [ ] Task: Conductor - User Manual Verification 'Phase 6 Balance'

---

## Phase 7: 2-Cent Test Transaction [P0]

### 7.1 Test Payment Order Creation
- [x] Task: Create test payment order helper [b36eb56]
  - [x] Sub-task: Write failing tests for test order creation
  - [x] Sub-task: Implement createTestPaymentOrder($0.02)
  - [x] Sub-task: Use test routing: 021000021, account: 9999999999
  - [x] Sub-task: Generate NACHA file for test order
  - [x] Sub-task: Verify tests pass

### 7.2 End-to-End Test Flow
- [x] Task: Execute 2-cent test transaction [b36eb56]
  - [x] Sub-task: Create test payment order in ledger
  - [x] Sub-task: Generate NACHA file
  - [x] Sub-task: Submit to BOFA sandbox
  - [x] Sub-task: Poll status until settled
  - [x] Sub-task: Reconcile ledger balance vs BOFA settled amount
  - [x] Sub-task: Log full trace with timestamps
  - [x] Sub-task: Verify test passes

- [ ] Task: Conductor - User Manual Verification 'Phase 7 2-Cent Test'

---

## Verification Checkpoints

- [ ] OAuth token management working (refresh, cache)
- [ ] Account validation returns correct status
- [ ] NACHA file submission accepted by BOFA
- [ ] Payment status tracking through lifecycle
- [ ] Balance inquiry returns accurate balance
- [ ] 2-cent test transaction settles successfully
- [ ] Automatic posting triggers on every settlement approval
- [ ] Egress IP whitelisted: 35.190.0.0/18

---

## Definition of Done

A task is complete when:

1. All code implemented to specification
2. Unit tests written and passing
3. Code coverage meets >80% requirement
4. Integration tests pass
5. Manual verification completed for checkpoints
6. Changes committed with proper message
7. Git note with task summary attached to commit
