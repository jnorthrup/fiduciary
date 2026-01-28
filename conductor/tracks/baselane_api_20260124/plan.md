# Implementation Plan: Baselane API Integration

**Track ID:** `baselane_api_20260124`

---

## Phase 1: Project Setup & Configuration [P0]

### 1.1 Initialize Baselane Service Module
- [x] Task: Create `services/baselaneService.ts` module
  - [x] Sub-task: Write failing tests for module structure and exports
  - [x] Sub-task: Implement module skeleton with TypeScript interfaces
  - [x] Sub-task: Add TypeScript types for Baselane API contracts
  - [x] Sub-task: Verify tests pass

### 1.2 Google Secret Manager Setup
- [x] Task: Configure secret storage for Baselane credentials
  - [x] Sub-task: Write failing tests for secret retrieval
  - [x] Sub-task: Implement Secret Manager client initialization
  - [x] Sub-task: Add helper functions: getSecret(), getBaselaneCredentials()
  - [x] Sub-task: Verify tests pass and coverage >80%

### 1.3 Environment Configuration
- [x] Task: Add Baselane environment variables
  - [x] Sub-task: Update `.env.example` with Baselane variables
  - [x] Sub-task: Add Baselane config to `server/config.ts`
  - [x] Sub-task: Document egress IP whitelisting requirement

- [ ] Task: Conductor - User Manual Verification 'Phase 1 Setup'

---

## Phase 2: OAuth 2.0 Authentication [P0]

### 2.1 Token Management
- [x] Task: Implement OAuth client credentials flow
  - [x] Sub-task: Write failing tests for getAuthToken()
  - [x] Sub-task: Implement token request to Baselane auth endpoint
  - [x] Sub-task: Add token cache with TTL (55 min)
  - [x] Sub-task: Implement automatic token refresh
  - [x] Sub-task: Verify tests pass and coverage >80%

### 2.2 Error Handling for Auth
- [x] Task: Handle authentication errors
  - [x] Sub-task: Write failing tests for 401, 403 responses
  - [x] Sub-task: Implement retry logic with token refresh
  - [x] Sub-task: Add error logging for auth failures
  - [x] Sub-task: Verify tests pass

- [ ] Task: Conductor - User Manual Verification 'Phase 2 OAuth'

---

## Phase 3: Property Management API [P1]

### 3.1 Property CRUD Operations
- [x] Task: Implement property operations
  - [x] Sub-task: Write failing tests for getProperties(), createProperty()
  - [x] Sub-task: Implement list properties API call
  - [x] Sub-task: Implement create property API call
  - [x] Sub-task: Implement update property API call
  - [x] Sub-task: Implement delete property API call
  - [x] Sub-task: Verify tests pass and coverage >80%

### 3.2 Unit Operations
- [x] Task: Implement unit operations
  - [x] Sub-task: Write failing tests for unit CRUD
  - [x] Sub-task: Implement list units for property
  - [x] Sub-task: Implement create unit API call
  - [x] Sub-task: Implement update unit API call
  - [x] Sub-task: Verify tests pass

### 3.3 Entity Mapping
- [x] Task: Map Baselane properties to fiduciary entities
  - [x] Sub-task: Write failing tests for property mapping
  - [x] Sub-task: Implement property sync to entity system
  - [x] Sub-task: Store mapping in persistence layer
  - [x] Sub-task: Add sync toggle for each property
  - [x] Sub-task: Verify tests pass

- [ ] Task: Conductor - User Manual Verification 'Phase 3 Properties'

---

## Phase 4: Tenant Management API [P1]

### 4.1 Tenant CRUD Operations
- [x] Task: Implement tenant operations
  - [x] Sub-task: Write failing tests for getTenants(), createTenant()
  - [x] Sub-task: Implement list tenants API call
  - [x] Sub-task: Implement create tenant API call
  - [x] Sub-task: Implement update tenant API call
  - [x] Sub-task: Verify tests pass and coverage >80%

### 4.2 CRM Integration
- [x] Task: Sync tenants to CRM
  - [x] Sub-task: Write failing tests for tenant sync
  - [x] Sub-task: Implement tenant to CRM person mapping
  - [x] Sub-task: Create CRM person on tenant creation
  - [x] Sub-task: Update CRM person on tenant update
  - [x] Sub-task: Verify integration works

- [ ] Task: Conductor - User Manual Verification 'Phase 4 Tenants'

---

## Phase 5: Rent Collection & Payments [P0]

### 5.1 Rent Charges
- [x] Task: Implement rent charge operations
  - [x] Sub-task: Write failing tests for charge operations
  - [x] Sub-task: Implement create rent charge API call
  - [x] Sub-task: Implement list charges API call
  - [x] Sub-task: Implement void charge API call
  - [x] Sub-task: Verify tests pass and coverage >80%

### 5.2 Payment Processing
- [x] Task: Implement payment operations
  - [x] Sub-task: Write failing tests for payment operations
  - [x] Sub-task: Implement initiate payment API call
  - [x] Sub-task: Implement list payments API call
  - [x] Sub-task: Implement get payment status API call
  - [x] Sub-task: Implement refund payment API call
  - [x] Sub-task: Verify tests pass

### 5.3 Payment Methods
- [x] Task: Implement payment method operations
  - [x] Sub-task: Write failing tests for payment methods
  - [x] Sub-task: Implement list payment methods API call
  - [x] Sub-task: Implement add bank account API call
  - [x] Sub-task: Implement verify payment method API call
  - [x] Sub-task: Verify tests pass

- [ ] Task: Conductor - User Manual Verification 'Phase 5 Rent Collection'

---

## Phase 6: Banking Operations [P1]

### 6.1 Account Balance
- [x] Task: Implement balance inquiry
  - [x] Sub-task: Write failing tests for getBalance()
  - [x] Sub-task: Implement balance inquiry API call
  - [x] Sub-task: Parse balance response
  - [x] Sub-task: Verify tests pass and coverage >80%

### 6.2 Transactions
- [x] Task: Implement transaction operations
  - [x] Sub-task: Write failing tests for getTransactions()
  - [x] Sub-task: Implement list transactions API call
  - [x] Sub-task: Add date range filtering
  - [x] Sub-task: Implement categorize transaction API call
  - [x] Sub-task: Verify tests pass

### 6.3 Transfers
- [x] Task: Implement transfer operations
  - [x] Sub-task: Write failing tests for transfers
  - [x] Sub-task: Implement internal transfer API call
  - [x] Sub-task: Implement external ACH transfer API call
  - [x] Sub-task: Verify tests pass

- [ ] Task: Conductor - User Manual Verification 'Phase 6 Banking'

---

## Phase 7: Ledger Integration [P0]

### 7.1 Rent Payment Posting
- [x] Task: Post rent payments to ledger
  - [x] Sub-task: Write failing tests for rent journal posting
  - [x] Sub-task: Implement rent payment to journal conversion
  - [x] Sub-task: Post debit to cash/bank account
  - [x] Sub-task: Post credit to rental income account
  - [x] Sub-task: Include Baselane metadata in journal entry
  - [x] Sub-task: Verify tests pass and integration works

### 7.2 Automatic Posting
- [x] Task: Hook rent payments into ledger workflow
  - [x] Sub-task: Write failing tests for auto-posting trigger
  - [x] Sub-task: Add journal posting to payment webhook handler
  - [x] Sub-task: Store ledger transaction ID with Baselane payment
  - [x] Sub-task: Add error handling (fire-and-forget with logging)
  - [x] Sub-task: Verify tests pass and integration works

- [ ] Task: Conductor - User Manual Verification 'Phase 7 Ledger Integration'

---

## Phase 8: Settlement Integration [P1]

### 8.1 Property Expense Payments
- [x] Task: Create settlement integration for property expenses
  - [x] Sub-task: Write failing tests for expense payment creation
  - [x] Sub-task: Implement property expense to payment order conversion
  - [x] Sub-task: Include Baselane property metadata in payment order
  - [x] Sub-task: Link payment order to property for reconciliation
  - [x] Sub-task: Verify tests pass

### 8.2 Reconciliation
- [x] Task: Reconcile Baselane transactions with settlement
  - [x] Sub-task: Write failing tests for reconciliation
  - [x] Sub-task: Match Baselane transactions to payment orders
  - [x] Sub-task: Update payment order status on Baselane payment
  - [x] Sub-task: Handle refunds and failed payments
  - [x] Sub-task: Verify tests pass

- [ ] Task: Conductor - User Manual Verification 'Phase 8 Settlement Integration'

---

## Phase 9: Webhook Integration [P0]

### 9.1 Webhook Endpoint
- [x] Task: Create webhook endpoint
  - [x] Sub-task: Write failing tests for webhook handling
  - [x] Sub-task: Implement POST /api/settlement/baselane/webhook
  - [x] Sub-task: Add webhook signature validation (HMAC-SHA256)
  - [x] Sub-task: Add replay attack prevention
  - [x] Sub-task: Verify tests pass

### 9.2 Webhook Event Handlers
- [x] Task: Implement webhook event handlers
  - [x] Sub-task: Write failing tests for each event type
  - [x] Sub-task: Handle rent.payment.completed event
  - [x] Sub-task: Handle rent.payment.failed event
  - [x] Sub-task: Handle tenant.created event
  - [x] Sub-task: Handle banking.transaction.posted event
  - [x] Sub-task: Verify tests pass

### 9.3 Webhook Registration
- [x] Task: Implement webhook registration
  - [x] Sub-task: Write failing tests for webhook registration
  - [x] Sub-task: Implement register webhook API call
  - [x] Sub-task: Store webhook configuration
  - [x] Sub-task: Implement webhook deletion
  - [x] Sub-task: Verify tests pass

- [ ] Task: Conductor - User Manual Verification 'Phase 9 Webhooks'

---

## Phase 10: Reporting & Analytics [P2]

### 10.1 Property Performance
- [x] Task: Implement property performance reporting
  - [x] Sub-task: Write failing tests for property performance
  - [x] Sub-task: Implement property performance API call
  - [x] Sub-task: Parse and return performance metrics
  - [x] Sub-task: Verify tests pass

### 10.2 Portfolio Summary
- [x] Task: Implement portfolio summary reporting
  - [x] Sub-task: Write failing tests for portfolio summary
  - [x] Sub-task: Implement portfolio summary API call
  - [x] Sub-task: Parse and return portfolio metrics
  - [x] Sub-task: Verify tests pass

### 10.3 Rent Roll Report
- [x] Task: Implement rent roll reporting
  - [x] Sub-task: Write failing tests for rent roll
  - [x] Sub-task: Implement rent roll API call
  - [x] Sub-task: Parse and return rent roll data
  - [x] Sub-task: Verify tests pass

- [ ] Task: Conductor - User Manual Verification 'Phase 10 Reports'

---

## Phase 11: Admin UI & API Routes [P1]

### 11.1 API Routes
- [x] Task: Create Baselane API routes [12c38f4]
  - [x] Sub-task: Create `server/routes/baselane.js`
  - [x] Sub-task: Implement GET /api/baselane/properties
  - [x] Sub-task: Implement POST /api/baselane/properties/sync
  - [x] Sub-task: Implement GET /api/baselane/tenants
  - [x] Sub-task: Implement POST /api/baselane/rent/charges
  - [x] Sub-task: Implement GET /api/baselane/balance
  - [x] Sub-task: Implement GET /api/baselane/transactions
  - [x] Sub-task: Verify all routes work

### 11.2 Admin Panel Component
- [x] Task: Create BaselaneAdminPanel component [46eb7a7]
  - [x] Sub-task: Create `components/BaselaneAdminPanel.tsx`
  - [x] Sub-task: Add property management tab
  - [x] Sub-task: Add tenant management tab
  - [x] Sub-task: Add rent collection tab
  - [x] Sub-task: Add banking operations tab
  - [x] Sub-task: Add confirmation modals for critical actions
  - [x] Sub-task: Verify component renders and functions

### 11.3 Dashboard Integration
- [x] Task: Integrate Baselane admin into dashboard [53a0a7d]
  - [x] Sub-task: Add "Baselane Admin" button to Financials tab
  - [x] Sub-task: Add Baselane widget for property performance
  - [x] Sub-task: Add rent collection summary widget
  - [x] Sub-task: Verify integration works

- [ ] Task: Conductor - User Manual Verification 'Phase 11 Admin UI'

---

## Phase 12: Testing & Documentation [P0]

### 12.1 Unit Tests
- [ ] Task: Achieve >80% test coverage
  - [ ] Sub-task: Write tests for all Baselane service functions
  - [ ] Sub-task: Write tests for all API routes
  - [ ] Sub-task: Write tests for webhook handlers
  - [ ] Sub-task: Write tests for ledger integration
  - [ ] Sub-task: Write tests for settlement integration
  - [ ] Sub-task: Verify coverage report shows >80%

### 12.2 Integration Tests
- [ ] Task: Write integration tests
  - [ ] Sub-task: Test end-to-end property sync
  - [ ] Sub-task: Test end-to-end rent payment flow
  - [ ] Sub-task: Test webhook event processing
  - [ ] Sub-task: Test ledger posting
  - [ ] Sub-task: Test settlement payment order creation
  - [ ] Sub-task: Verify all integration tests pass

### 12.3 Documentation
- [ ] Task: Document Baselane integration
  - [ ] Sub-task: Write API documentation for all routes
  - [ ] Sub-task: Document environment setup
  - [ ] Sub-task: Document webhook configuration
  - [ ] Sub-task: Document entity mapping logic
  - [ ] Sub-task: Add troubleshooting guide

- [ ] Task: Conductor - User Manual Verification 'Phase 12 Testing'

---

## Success Verification

### Authentication
- [ ] OAuth token retrieved successfully
- [ ] Token refresh works before expiry
- [ ] Token cache reduces API calls

### Property Management
- [ ] Properties list retrieved from Baselane
- [ ] Properties sync to fiduciary entities
- [ ] Property CRUD operations work
- [ ] Units sync correctly

### Tenant Management
- [ ] Tenants list retrieved from Baselane
- [ ] Tenants sync to CRM people
- [ ] Tenant CRUD operations work

### Rent Collection
- [ ] Rent charges created successfully
- [ ] Payments initiated successfully
- [ ] Payment status tracked correctly
- [ ] Refunds processed successfully

### Banking Operations
- [ ] Account balance retrieved
- [ ] Transactions listed with filters
- [ ] Transfers initiated successfully

### Ledger Integration
- [ ] Rent payments post to ledger
- [ ] Journal entries include Baselane metadata
- [ ] Automatic posting works via webhooks

### Settlement Integration
- [ ] Property expenses create payment orders
- [ ] Payments reconcile with transactions
- [ ] Failed payments handled correctly

### Webhooks
- [ ] Webhook signature validated
- [ ] Payment events processed
- [ ] Tenant events processed
- [ ] Replay attacks prevented

### Admin UI
- [ ] Properties managed via admin panel
- [ ] Tenants managed via admin panel
- [ ] Rent charges created via UI
- [ ] Banking operations accessible

### Testing
- [ ] Unit test coverage >80%
- [ ] All integration tests pass
- [ ] Manual verification checkpoints completed
