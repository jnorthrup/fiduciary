# Service-to-Service Communication Patterns

## Overview

This document defines the communication patterns between microservices in the Trust Ledger System.

## REST API Endpoints

### API Gateway

The API Gateway provides a single entry point and handles:
- Request routing
- Authentication/authorization
- Rate limiting
- Request/response transformation

#### Health Check Endpoints

Each service exposes health check endpoints:

```bash
GET /health      # Liveness probe
GET /ready       # Readiness probe
GET /metrics     # Prometheus metrics
```

#### Gateway Routes

```yaml
/api/iris/*        → irs-service:3001
/api/bso/*         → bso-service:3002
/api/ledger/*      → ledger-service:3003
/api/banking/*     → banking-service:3004
/api/auth/*        → auth-service:3005
/api/audit/*       → audit-service:3006
/api/teach-mode/*  → teach-mode-service:3007
```

## Service API Contracts

### IRS Service (Port 3001)

#### Endpoints

```typescript
// OAuth endpoints
POST /api/iris/auth/oauth/v2/token
  Body: { grant_type, client_assertion, scope }
  Response: { access_token, token_type, expires_in }

// Submission endpoints
POST /api/iris/submissions
  Headers: { Authorization: Bearer <token> }
  Body: { submission }
  Response: { receiptId, status, timestamp }

GET /api/iris/submissions/:receiptId/status
  Response: { receiptId, status, submittedAt, completedAt }

// Validation endpoints
POST /api/iris/tin-validation
  Body: { tin, name } or { requests: [...] }
  Response: { code, match, message }

POST /api/iris/transmission-check
  Body: { submission }
  Response: { valid, errors, warnings }
```

### Ledger Service (Port 3003)

#### Endpoints

```typescript
// Account management
GET /api/ledger/accounts
  Query: { entityId, type }
  Response: { accounts: [...] }

POST /api/ledger/accounts
  Body: { account }
  Response: { account }

GET /api/ledger/accounts/:id
  Response: { account }

// Journal entries
POST /api/ledger/journals
  Body: { journalEntry }
  Response: { journalEntry }

GET /api/ledger/journals
  Query: { accountId, startDate, endDate }
  Response: { journalEntries: [...] }

GET /api/ledger/journals/:id
  Response: { journalEntry }

// Balance
GET /api/ledger/balances
  Query: { accountId, asOfDate }
  Response: { balances: [...] }
```

### Banking Service (Port 3004)

#### Endpoints

```typescript
// Accounts
GET /api/banking/accounts
  Query: { provider, type, status }
  Response: { accounts: [...] }

GET /api/banking/accounts/:id
  Response: { account }

GET /api/banking/accounts/:id/balance
  Response: { balance }

// Transactions
GET /api/banking/transactions
  Query: { accountId, startDate, endDate, limit }
  Response: { transactions: [...] }

GET /api/banking/transactions/:id
  Response: { transaction }

// Payments
POST /api/banking/payments
  Body: { payment }
  Response: { paymentId, status }

// Summary
GET /api/banking/summary
  Response: { totalBalances, byCurrency, byProvider }
```

### Audit Service (Port 3006)

#### Endpoints

```typescript
// Audit log
POST /api/audit/log
  Body: { event }
  Response: { eventId }

GET /api/audit/logs
  Query: { service, action, startDate, endDate }
  Response: { logs: [...] }

GET /api/audit/logs/:id
  Response: { log }

// Compliance
GET /api/audit/compliance
  Query: { entityId, dateRange }
  Response: { complianceReport }
```

## Event-Driven Communication

### RabbitMQ Event Bus

All services publish events to RabbitMQ for asynchronous processing.

#### Exchange Configuration

```typescript
// Main exchange
Exchange: fiduciary.events
Type: topic
Durable: true

// Audit exchange
Exchange: fiduciary.audit
Type: fanout
Durable: true
```

#### Event Definitions

##### IRS Service Events

```typescript
// Submission created
{
  eventType: "submission.created",
  timestamp: "2026-01-15T10:30:00Z",
  data: {
    submissionId: "sub-123",
    entityType: "LLC",
    taxYear: 2024,
    formType: "1099-NEC"
  }
}

// Submission status updated
{
  eventType: "submission.status_updated",
  timestamp: "2026-01-15T10:35:00Z",
  data: {
    submissionId: "sub-123",
    oldStatus: "Processing",
    newStatus: "Accepted"
  }
}
```

##### Ledger Service Events

```typescript
// Journal entry created
{
  eventType: "journal.entry_created",
  timestamp: "2026-01-15T10:30:00Z",
  data: {
    journalId: "je-456",
    entityId: "entity-789",
    entries: [
      { accountId: "acc-1", debit: 1000, credit: 0 },
      { accountId: "acc-2", debit: 0, credit: 1000 }
    ]
  }
}

// Account created
{
  eventType: "account.created",
  timestamp: "2026-01-15T10:30:00Z",
  data: {
    accountId: "acc-1",
    entityId: "entity-789",
    accountType: "Asset",
    balance: 0
  }
}
```

##### Banking Service Events

```typescript
// Payment initiated
{
  eventType: "payment.initiated",
  timestamp: "2026-01-15T10:30:00Z",
  data: {
    paymentId: "pay-123",
    sourceAccount: "acc-1",
    amount: 500.00,
    currency: "USD",
    status: "Pending"
  }
}

// Payment completed
{
  eventType: "payment.completed",
  timestamp: "2026-01-15T10:35:00Z",
  data: {
    paymentId: "pay-123",
    status: "Completed",
    transactionId: "txn-456"
  }
}

// Transaction synced
{
  eventType: "transaction.synced",
  timestamp: "2026-01-15T10:30:00Z",
  data: {
    transactionId: "txn-789",
    accountId: "acc-1",
    amount: -100.00,
    description: "Payment to Vendor"
  }
}
```

##### Audit Events

All services publish to the audit exchange for compliance tracking:

```typescript
{
  eventType: "compliance.event",
  timestamp: "2026-01-15T10:30:00Z",
  data: {
    service: "irs-service",
    action: "submission.created",
    userId: "user-123",
    entityId: "entity-456",
    resourceId: "sub-789",
    metadata: { /* ... */ }
  }
}
```

### Queue Configuration

```typescript
// Service queues
Queues:
  - irs-service.events
  - bso-service.events
  - ledger-service.events
  - banking-service.events
  - audit-service.events

// Binding keys
irs-service.events:
  - submission.*    # All submission events
  - transmission.*  # All transmission events

ledger-service.events:
  - journal.*       # All journal events
  - account.*       # All account events
  - payment.*       # Payment events for reconciliation

banking-service.events:
  - payment.*       # Payment events
  - transaction.*   # Transaction events

audit-service.events:
  - *.#             # ALL events (for compliance)
```

## Service Discovery

### Internal Communication

Services communicate using Kubernetes DNS:

```typescript
// Service URL format
const serviceUrl = (service: string, port: number) =>
  `http://${service}:300${port}`;

// Examples
const irsService = serviceUrl('irs-service', 1);    // http://irs-service:3001
const ledgerService = serviceUrl('ledger-service', 3); // http://ledger-service:3003
```

### Configuration

Services are configured with environment variables:

```yaml
env:
  - name: IRS_SERVICE_URL
    value: "http://irs-service:3001"
  - name: LEDGER_SERVICE_URL
    value: "http://ledger-service:3003"
  - name: BANKING_SERVICE_URL
    value: "http://banking-service:3004"
  - name: AUDIT_SERVICE_URL
    value: "http://audit-service:3006"
```

## Error Handling

### Standard Error Response

```typescript
interface ErrorResponse {
  error: string;
  message: string;
  code: string;
  timestamp: string;
  details?: any;
}
```

### HTTP Status Codes

- **200** - Success
- **201** - Created
- **202** - Accepted (async processing)
- **400** - Bad Request
- **401** - Unauthorized
- **403** - Forbidden
- **404** - Not Found
- **409** - Conflict
- **422** - Unprocessable Entity
- **429** - Too Many Requests
- **500** - Internal Server Error
- **503** - Service Unavailable

### Retry Strategy

```typescript
// Exponential backoff for retries
const retryConfig = {
  maxRetries: 3,
  initialDelay: 1000,    // 1 second
  maxDelay: 10000,       // 10 seconds
  factor: 2,             // Exponential
  // Retry on: 429, 500, 503
};
```

## Circuit Breaker Pattern

```typescript
// Circuit breaker configuration
const circuitBreaker = {
  timeout: 30000,           // 30 seconds
  errorThresholdPercentage: 50,  // Open at 50% errors
  resetTimeout: 60000,      // Close after 60 seconds
};

// States: CLOSED, OPEN, HALF_OPEN
```

## Authentication

### JWT Tokens

```typescript
// JWT payload
interface JwtPayload {
  sub: string;      // User ID
  name: string;
  email: string;
  roles: string[];
  entityId?: string;
  iat: number;
  exp: number;
}
```

### Service-to-Service Authentication

```typescript
// Internal service calls use API keys
const serviceKey = process.env.SERVICE_API_KEY;

headers: {
  'X-Service-Key': serviceKey,
  'X-Service-Name': 'ledger-service'
}
```

## Rate Limiting

### Gateway Limits

```typescript
// Per-user rate limiting
const rateLimits = {
  windowMs: 60000,      // 1 minute
  maxRequests: 100,     // 100 requests per minute
};

// Per-service limits
const serviceLimits = {
  'irs-service': 50,    // 50 requests per minute
  'bso-service': 50,
  'ledger-service': 200,
  'banking-service': 100
};
```

## Monitoring

### Metrics

All services expose Prometheus metrics:

```
# Request metrics
http_requests_total{service, method, status}
http_request_duration_seconds{service, endpoint}

# Business metrics
submissions_total{status, form_type}
payments_total{status, provider}
journal_entries_total{entity_type}

# Infrastructure metrics
database_connections_active{service}
cache_hit_rate{service}
queue_depth{queue_name}
```

### Distributed Tracing

```typescript
// OpenTelemetry integration
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('service-name');

const span = tracer.startSpan('operation_name');
try {
  // Do work
  span.setStatus({ code: SpanStatusCode.OK });
} catch (error) {
  span.recordException(error);
  span.setStatus({ code: SpanStatusCode.ERROR });
} finally {
  span.end();
}
```

## Best Practices

1. **Prefer async over sync** - Use events for non-critical operations
2. **Timeout all requests** - Don't wait indefinitely
3. **Implement circuit breakers** - Prevent cascading failures
4. **Log all external calls** - Audit trail for compliance
5. **Use retries with backoff** - Handle transient failures
6. **Monitor dependencies** - Track service health
7. **Version your APIs** - Maintain backward compatibility
8. **Document changes** - Keep API docs up to date
