# Spec: Baselane API Integration

**Track ID:** `baselane_api_20260124`
**Type:** Integration
**Status:** New
**Created:** 2026-01-24

---

## Overview

Integration with Baselane's banking API for landlord financial operations. Baselane provides rent collection, banking services, property management, and automated payments specifically for real estate portfolios.

---

## Baselane API Reference

**Base URL:** `https://api.baselane.com/v1`
**Documentation:** https://docs.baselane.com
**Auth:** OAuth 2.0 Client Credentials Flow
**Sandbox:** `https://sandbox-api.baselane.com/v1`

---

## Requirements

### 1. Authentication & Security

#### 1.1 OAuth 2.0 Authentication
```typescript
interface BaselaneAuthConfig {
  clientId: string;
  clientSecret: string;
  scope: string[];
  environment: 'sandbox' | 'production';
}

interface BaselaneAuthToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scope: string[];
}
```

#### 1.2 Token Management
- Client credentials flow for service-to-service auth
- Token caching with 55-minute TTL
- Automatic token refresh before expiry
- Secure storage via Google Secret Manager

#### 1.3 API Key Configuration
```typescript
interface BaselaneConfig {
  clientId: string;        // Secret Manager
  clientSecret: string;    // Secret Manager
  webhookSecret: string;   // For webhook signature validation
  environment: 'sandbox' | 'production';
  apiVersion: 'v1';
}
```

---

### 2. Account & Property Management

#### 2.1 Property Operations
```typescript
// List all properties
GET /properties

// Create property
POST /properties
{
  "address": {
    "street": "123 Main St",
    "city": "San Francisco",
    "state": "CA",
    "zip": "94102",
    "country": "US"
  },
  "propertyType": "residential" | "multifamily" | "commercial",
  "units": number,
  "nickname": string
}

// Get property details
GET /properties/{propertyId}

// Update property
PATCH /properties/{propertyId}

// Delete property
DELETE /properties/{propertyId}
```

#### 2.2 Unit Operations
```typescript
// List units for property
GET /properties/{propertyId}/units

// Create unit
POST /properties/{propertyId}/units
{
  "unitNumber": string,
  "sqft": number,
  "bedrooms": number,
  "bathrooms": number,
  "rentAmount": number,
  "securityDeposit": number
}

// Update unit
PATCH /properties/{propertyId}/units/{unitId}
```

#### 2.3 Tenant Operations
```typescript
// List tenants
GET /tenants

// Create tenant
POST /tenants
{
  "firstName": string,
  "lastName": string,
  "email": string,
  "phone": string,
  "unitId": string,
  "leaseStart": "YYYY-MM-DD",
  "leaseEnd": "YYYY-MM-DD",
  "monthlyRent": number,
  "securityDeposit": number
}

// Get tenant details
GET /tenants/{tenantId}

// Update tenant
PATCH /tenants/{tenantId}
```

---

### 3. Rent Collection & Payments

#### 3.1 Rent Charges
```typescript
// Create rent charge
POST /rent/charges
{
  "tenantId": string,
  "propertyId": string,
  "unitId": string,
  "amount": number,
  "dueDate": "YYYY-MM-DD",
  "type": "rent" | "late_fee" | "other",
  "description": string
}

// List charges for tenant
GET /rent/charges?tenantId={tenantId}

// Get charge details
GET /rent/charges/{chargeId}

// Void charge
DELETE /rent/charges/{chargeId}
```

#### 3.2 Payment Processing
```typescript
// Initiate payment (tenant)
POST /rent/payments
{
  "chargeId": string,
  "amount": number,
  "paymentMethod": "bank_account" | "card",
  "paymentMethodId": string
}

// List payments
GET /rent/payments?tenantId={tenantId}

// Get payment status
GET /rent/payments/{paymentId}

// Refund payment
POST /rent/payments/{paymentId}/refund
{
  "amount": number,
  "reason": string
}
```

#### 3.3 Payment Methods
```typescript
// List payment methods for tenant
GET /tenants/{tenantId}/payment-methods

// Add bank account
POST /tenants/{tenantId}/payment-methods/bank-account
{
  "routingNumber": string,
  "accountNumber": string,
  "accountType": "checking" | "savings"
}

// Add card
POST /tenants/{tenantId}/payment-methods/cards
{
  "token": string,  // Stripe token
  "last4": string,
  "expiry": "MM/YY"
}

// Verify payment method
POST /tenants/{tenantId}/payment-methods/{methodId}/verify
```

---

### 4. Banking Operations

#### 4.1 Account Balance
```typescript
// Get account balance
GET /banking/accounts/{accountId}/balance

interface BalanceResponse {
  available: number;
  current: number;
  pending: number;
  currency: string;
  asOfDate: string;
}
```

#### 4.2 Transactions
```typescript
// List transactions
GET /banking/accounts/{accountId}/transactions
  ?startDate={YYYY-MM-DD}
  &endDate={YYYY-MM-DD}
  &limit={number}
  &offset={number}

// Get transaction details
GET /banking/transactions/{transactionId}

// Categorize transaction
PATCH /banking/transactions/{transactionId}
{
  "category": string,
  "propertyId": string,
  "unitId": string,
  "notes": string
}
```

#### 4.3 Transfers
```typescript
// Internal transfer
POST /banking/transfers
{
  "fromAccountId": string,
  "toAccountId": string,
  "amount": number,
  "memo": string
}

// External transfer (ACH)
POST /banking/transfers/external
{
  "fromAccountId": string,
  "routingNumber": string,
  "accountNumber": string,
  "accountType": "checking" | "savings",
  "amount": number,
  "memo": string
}
```

---

### 5. Reporting & Analytics

#### 5.1 Property Performance
```typescript
// Get property performance
GET /reports/properties/{propertyId}
  ?startDate={YYYY-MM-DD}
  &endDate={YYYY-MM-DD}

interface PropertyPerformance {
  propertyId: string;
  totalRevenue: number;
  totalExpenses: number;
  netOperatingIncome: number;
  occupancyRate: number;
  averageRent: number;
  totalCollected: number;
  totalOutstanding: number;
}
```

#### 5.2 Portfolio Summary
```typescript
// Get portfolio summary
GET /reports/portfolio

interface PortfolioSummary {
  totalProperties: number;
  totalUnits: number;
  totalRevenue: number;
  totalExpenses: number;
  netOperatingIncome: number;
  occupancyRate: number;
  totalTenants: number;
}
```

#### 5.3 Rent Roll Report
```typescript
// Get rent roll
GET /reports/rent-roll

interface RentRoll {
  propertyId: string;
  unitId: string;
  tenantName: string;
  monthlyRent: number;
  leaseStart: string;
  leaseEnd: string;
  balance: number;
  status: "current" | "late" | "paid_ahead";
}[]
```

---

### 6. Webhooks

#### 6.1 Webhook Events
```typescript
// Supported webhook events
type WebhookEvent =
  | "rent.payment.completed"
  | "rent.payment.failed"
  | "rent.charge.created"
  | "tenant.created"
  | "tenant.updated"
  | "banking.transaction.posted"
  | "property.created"
  | "property.updated";
```

#### 6.2 Webhook Payload
```typescript
interface WebhookPayload {
  eventId: string;
  eventType: WebhookEvent;
  timestamp: string;
  data: {
    [key: string]: any;
  };
  signature: string;  // HMAC-SHA256
}
```

#### 6.3 Webhook Endpoints
```typescript
// Register webhook
POST /webhooks
{
  "url": string,
  "events": WebhookEvent[],
  "secret": string
}

// List webhooks
GET /webhooks

// Delete webhook
DELETE /webhooks/{webhookId}
```

---

## System Integration

### 7.1 Entity Mapping
```typescript
// Map Baselane properties to fiduciary entities
interface BaselanePropertyMapping {
  baselanePropertyId: string;
  fiduciaryEntityId: string;
  propertyType: "HOLDING_TRUST" | "OPERATING_LLC";
  syncEnabled: boolean;
}

// Map Baselane tenants to CRM people
interface BaselaneTenantMapping {
  baselaneTenantId: string;
  crmPersonId: string;
  fiduciaryEntityId: string;
}
```

### 7.2 Ledger Integration
```typescript
// Post rent payment to ledger
interface RentPaymentJournalEntry {
  entity_id: string;
  date: string;
  description: "Rent payment - {propertyName} - {unitNumber}";
  entries: [
    {
      account: "Cash/Bank - Baselane",
      debit: amount,
      credit: 0
    },
    {
      account: "Rental Income - {propertyId}",
      debit: 0,
      credit: amount
    }
  ];
  metadata: {
    baselanePaymentId: string;
    baselaneTenantId: string;
    baselanePropertyId: string;
    baselaneUnitId: string;
  };
}
```

### 7.3 Settlement Integration
```typescript
// Create payment order for property expenses
interface PropertyExpensePayment {
  amount: number;
  payee: {
    name: string;
    routingNumber: string;
    accountNumber: string;
  };
  method: "ACH";
  metadata: {
    baselanePropertyId: string;
    propertyNickname: string;
    expenseCategory: string;
  };
}
```

---

## Technical Constraints

- **Language:** TypeScript
- **Runtime:** Node.js (server/services)
- **Secret Storage:** Google Secret Manager
- **HTTP Client:** fetch or axios
- **Rate Limiting:** Respect Baselane rate limits (typically 100 req/min)
- **Retry Logic:** Exponential backoff for 5xx errors
- **Webhook Validation:** HMAC-SHA256 signature verification

---

## Security Requirements

### 8.1 Credential Management
- Store `clientId` and `clientSecret` in Google Secret Manager
- Never log access tokens or refresh tokens
- Rotate secrets every 90 days

### 8.2 Data Handling
- Encrypt sensitive data at rest (bank account numbers)
- Mask account numbers in UI responses (show last 4 only)
- Log all API calls for audit trail

### 8.3 Webhook Security
- Verify webhook signatures on all incoming requests
- Reject requests with invalid signatures
- Replay attack prevention (timestamp + nonce)

---

## Error Handling

### 9.1 API Errors
```typescript
interface BaselaneError {
  code: string;
  message: string;
  details?: any;
  request_id: string;
}

// Common error codes
enum BaselaneErrorCode {
  INVALID_REQUEST = "INVALID_REQUEST",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  INSUFFICIENT_FUNDS = "INSUFFICIENT_FUNDS",
  PAYMENT_FAILED = "PAYMENT_FAILED",
  DUPLICATE = "DUPLICATE"
}
```

### 9.2 Retry Strategy
- **429 Rate Limit:** Retry after `Retry-After` header
- **5xx Server Errors:** Exponential backoff (1s, 2s, 4s, 8s, 16s)
- **4xx Client Errors:** Do not retry (user error)
- **Network Errors:** Retry up to 3 times

---

## Deliverables

1. Baselane service module (`services/baselaneService.ts`)
2. OAuth token management with caching
3. Property CRUD operations
4. Tenant management integration
5. Rent charge and payment processing
6. Banking operations (balance, transactions, transfers)
7. Webhook endpoint with signature validation
8. Entity mapping to fiduciary system
9. Ledger journal posting for rent payments
10. Settlement integration for property expenses
11. Admin UI for Baselane operations
12. Comprehensive test coverage (>80%)

---

## Dependencies

- Existing: `server/services/ledgerService.ts` (journal posting)
- Existing: `services/settlementService.ts` (payment orders)
- Existing: `lib/gcs-persistence.ts` (data storage)
- Existing: `server/routes/settlement.js` (API routes)
- New: `services/baselaneService.ts` (Baselane API client)
- New: `server/routes/baselane.js` (Baselane API routes)

---

## Success Criteria

- [ ] OAuth authentication working with token refresh
- [ ] Properties sync from Baselane to fiduciary entities
- [ ] Tenant data syncs to CRM
- [ ] Rent payments post to ledger automatically
- [ ] Property expenses can be paid via settlement
- [ ] Webhooks process payment events in real-time
- [ ] Admin UI for manual Baselane operations
- [ ] All errors handled gracefully with proper logging
- [ ] Test coverage >80%
- [ ] Egress IP whitelisted with Baselane (if required)
