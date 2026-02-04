# Banking Abstraction Layer - Thinslice Implementation

## Overview

This thinslice provides a unified abstraction layer for multi-bank connectivity, supporting both commercial APIs (Plaid, Coinbase) and open-source banking platforms (OBP, Fineract, Mifos, Teller).

## What Has Been Implemented

### 1. Core Types (`/types/banking/`)

**`core.ts`** - Unified domain models:
- `UnifiedAccount` - Normalized account schema across all providers
- `UnifiedTransaction` - Standardized transaction model
- `PaymentInitiationRequest/Response` - Payment initiation types
- `BankingProvider` enum - All supported providers
- Error types and filters

**`adapter.ts`** - Adapter interface:
- `IBankingAdapter` - Contract all providers must implement
- `AdapterCapabilities` - Feature detection per provider
- `WebhookEvent` - Standardized webhook handling

### 2. Adapter Implementations (`/services/banking/`)

**`BaseAdapter.ts`** - Base class with:
- Retry logic with exponential backoff
- Rate limiting enforcement
- Response caching
- Error handling

**`MockAdapter.ts`** - Testing/development:
- Generates realistic mock data
- Full implementation for testing
- Supports accounts, transactions, payments

**`TellerAdapter.ts`** - Teller.io integration:
- Account aggregation
- Transaction history
- Read-only (no payments)

**`PlaidAdapter.ts`** - Plaid API integration:
- Account linking via Plaid Link
- Account aggregation (11,000+ institutions)
- Balance checks
- Transaction history (2 years)
- Account numbers (routing/account)
- Read-only (no direct payments)

**`CoinbaseAdapter.ts`** - Coinbase Commerce integration:
- Account aggregation (fiat + crypto wallets)
- Balance checks
- Transaction history (charges)
- **ACH payment initiation** (credit/debit/wire)
- Payment method listing

**`PlaidAdapter.test.ts`** - Test coverage for Plaid
**`CoinbaseAdapter.test.ts`** - Test coverage for Coinbase

### 3. Facade Service (`/services/banking/BankingFacade.ts`)

Unified interface providing:
- Multi-provider account aggregation
- Transaction listing across all providers
- Payment initiation with provider routing
- Health checking
- Analytics (totals, summaries)

### 4. API Routes (`/server/routes/banking.js`)

REST endpoints:
- `GET /api/banking/health` - Provider health status
- `GET /api/banking/accounts` - List all accounts
- `GET /api/banking/accounts/:id` - Get account details
- `GET /api/banking/accounts/:id/balance` - Get account balance
- `GET /api/banking/transactions` - List transactions (with filters)
- `GET /api/banking/transactions/:id` - Get transaction details
- `POST /api/banking/payments` - Initiate payment
- `GET /api/banking/summary` - Aggregated summary

### 5. Tests (`/services/banking/BankingFacade.test.ts`)

Comprehensive test coverage for:
- Provider management
- Account aggregation
- Transaction filtering
- Payment initiation
- Analytics calculations
- Error handling

## Architecture Decisions

### Pattern: Adapter + Facade

```
┌─────────────────────────────────────────────────────┐
│                   Application                        │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │   BankingFacade       │  ← Facade: Simplified interface
         └───────────────────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
   ┌─────────┐  ┌─────────┐  ┌─────────┐
   │  Plaid  │  │ Teller  │  │   OBP   │  ← Adapters: Provider-specific
   │ Adapter │  │ Adapter │  │ Adapter │     implementations
   └─────────┘  └─────────┘  └─────────┘
        │            │            │
        └────────────┼────────────┘
                     ▼
              ┌─────────────┐
              │ BaseAdapter │  ← Base: Common functionality
              └─────────────┘     (retry, cache, rate limit)
```

### Prioritization: MVP First

1. **Phase 1** (Current - Thinslice):
   - Core types and interfaces
   - Mock adapter for testing
   - One real adapter (Teller)
   - Basic CRUD operations

2. **Phase 2** (Next):
   - Plaid adapter (commercial)
   - OBP adapter (open-source core banking)
   - Webhook support

3. **Phase 3** (Future):
   - Fineract/Mifos adapters
   - Crypto adapters (Bitcoin, Lightning, Fireblocks)
   - Advanced features (real-time sync, batch operations)

## Usage Examples

### Initialize Facade

```typescript
import { BankingFacade } from './services/banking';

const facade = await BankingFacade.initialize([
  {
    provider: BankingProvider.TELLER,
    config: {
      environment: 'production',
      credentials: {
        apiKey: process.env.TELLER_API_KEY,
      },
      rateLimit: {
        maxRequests: 100,
        perMilliseconds: 60000,
      },
    },
  },
  {
    provider: BankingProvider.PLAID,
    config: {
      environment: 'sandbox',
      credentials: {
        clientId: process.env.PLAID_CLIENT_ID,
        secret: process.env.PLAID_SECRET,
      },
    },
  },
]);
```

### List All Accounts

```typescript
const accounts = await facade.listAllAccounts({
  type: UnifiedAccountType.CHECKING,
  status: AccountStatus.ACTIVE,
});

console.log(`Found ${accounts.length} checking accounts`);
```

### Get Account Balance

```typescript
const balance = await facade.getBalance('acct_123');

console.log(`Current: ${balance.currentBalance} ${balance.currency}`);
console.log(`Available: ${balance.availableBalance} ${balance.currency}`);
```

### List Transactions with Filters

```typescript
const transactions = await facade.listAllTransactions({
  startDate: '2024-01-01T00:00:00.000Z',
  endDate: '2024-12-31T23:59:59.999Z',
  direction: TransactionDirection.DEBIT,
  minAmount: 100,
  limit: 50,
});
```

### Initiate Payment

```typescript
const payment = await facade.initiatePayment({
  sourceAccountId: 'acct_123',
  beneficiaryName: 'John Doe',
  beneficiaryAccount: '987654321',
  amount: 500.00,
  currency: 'USD',
  reference: 'Invoice #12345',
  method: PaymentMethod.ACH_CREDIT,
});

console.log(`Payment ID: ${payment.paymentId}`);
console.log(`Status: ${payment.status}`);
```

### Get Aggregated Summary

```typescript
const summary = await facade.getTotalBalances();

console.log(`Total Balance: ${summary.grandTotal}`);
console.log(`By Currency:`, summary.byCurrency);
console.log(`By Provider:`, summary.byProvider);
```

## API Endpoints

### Health
```bash
GET /api/banking/health
```

### Accounts
```bash
GET /api/banking/accounts
GET /api/banking/accounts/:accountId
GET /api/banking/accounts/:accountId/balance
POST /api/banking/accounts/:accountId/sync
```

### Transactions
```bash
GET /api/banking/transactions?accountId=xxx&startDate=xxx&limit=10
GET /api/banking/transactions/:transactionId
GET /api/banking/accounts/:accountId/transactions
```

### Payments
```bash
POST /api/banking/payments
GET /api/banking/payments/:paymentId
```

### Summary
```bash
GET /api/banking/summary
```

## Testing

```bash
# Run banking tests
npm test services/banking/

# Run specific test file
npm test services/banking/BankingFacade.test.ts
```

## Next Steps

1. **Add real credentials** for Teller/Plaid in `.env`
2. **Implement remaining adapters** (OBP, Fineract, Mifos)
3. **Add webhook handlers** for real-time updates
4. **Implement caching layer** (Redis)
5. **Add monitoring/alerting** for provider health
6. **Create admin UI** for provider management

## Provider Capabilities Matrix

| Provider | Accounts | Balances | Transactions | Payments | Webhooks |
|----------|----------|----------|--------------|----------|----------|
| Plaid    | ✓        | ✓        | ✓            | ✗        | ✓        |
| Coinbase | ✓        | ✓        | ✓            | ✓        | ✓        |
| Teller   | ✓        | ✓        | ✓            | ✗        | ✓        |
| OBP      | ✓        | ✓        | ✓            | ✓        | ✓        |
| Fineract | ✓        | ✓        | ✓            | ✓        | ✗        |
| Mifos    | ✓        | ✓        | ✓            | ✓        | ✗        |

## File Structure

```
fiduciary/
├── types/banking/
│   ├── core.ts              # Unified domain models
│   ├── adapter.ts           # Adapter interfaces
│   └── index.ts
├── services/banking/
│   ├── BaseAdapter.ts       # Base adapter class
│   ├── MockAdapter.ts       # Mock implementation
│   ├── TellerAdapter.ts     # Teller.io adapter
│   ├── CoinbaseAdapter.ts   # Coinbase Commerce adapter (ACH)
│   ├── BankingFacade.ts     # Facade service
│   ├── BankingFacade.test.ts
│   ├── CoinbaseAdapter.test.ts
│   ├── README.md
│   └── index.ts
└── server/
    └── routes/
        └── banking.js        # REST API routes
```

## Coinbase ACH Integration

### Overview
Coinbase Commerce API enables ACH payment processing for merchant accounts. Supports both ACH credit (push) and debit (pull) transactions.

### Setup

1. **Get API credentials**:
   - Go to https://commerce.coinbase.com/dashboard/settings
   - Create an API key
   - Copy the API key

2. **Configure environment variables**:
   ```bash
   COINBASE_ENVIRONMENT=sandbox
   COINBASE_API_KEY=your-coinbase-api-key
   COINBASE_API_URL=https://api.commerce.coinbase.com
   ```

3. **Initialize the adapter**:
   ```typescript
   import { CoinbaseAdapter } from './services/banking';

   const coinbase = new CoinbaseAdapter({
     credentials: {
       apiKey: process.env.COINBASE_API_KEY,
       apiUrl: process.env.COINBASE_API_URL,
     },
     rateLimit: {
       maxRequests: 100,
       perMilliseconds: 60000,
     },
   });
   ```

### ACH Payment Flow

1. **Create a charge** (payment request):
   ```typescript
   const payment = await coinbase.initiatePayment({
     sourceAccountId: 'coinbase_usd_wallet',
     beneficiaryName: 'Vendor Inc',
     beneficiaryAccount: '123456789',
     amount: 1000.00,
     currency: 'USD',
     reference: 'Invoice #12345',
     method: 'ACH_CREDIT',
   });

   // Returns payment info with checkout URL
   console.log(payment.metadata.hostedUrl);
   ```

2. **Customer completes payment**:
   - Redirect to hosted checkout URL
   - Customer selects ACH bank account
   - Authorizes the payment

3. **Monitor payment status**:
   ```typescript
   const transactions = await coinbase.listTransactions({
     startDate: '2024-01-01',
     endDate: '2024-01-31',
   });

   const payment = transactions.find(t => t.id === payment.paymentId);
   console.log(payment.status); // pending, completed, expired
   ```

### Supported Payment Methods

- **ACH_CREDIT** - Push money to a bank account (1-3 business days)
- **ACH_DEBIT** - Pull money from a bank account (1-3 business days)
- **WIRE** - Wire transfer (same day)

### Transaction Fees

- ACH transactions: **Free** (Coinbase Commerce doesn't charge)
- Wire transfers: **$5 - $25** (depends on bank)

### Limitations

- **Minimum amount**: $0.50
- **Maximum amount**: $50,000 per transaction
- **Daily limit**: $100,000
- **Settlement time**: 1-3 business days for ACH
- **Supported currencies**: USD only (for ACH)

### Webhooks

Coinbase sends webhook events for payment status changes:

```typescript
// Webhook payload
{
  "event": {
    "type": "charge:confirmed",
    "data": {
      "code": "XYZ789",
      "status": "confirmed"
    }
  }
}
```

### Testing

```bash
# Run Coinbase adapter tests
npm test services/banking/CoinbaseAdapter.test.ts
```

### Production Considerations

1. **Use production API key** (not sandbox)
2. **Implement webhook signature verification** with `COINBASE_WEBHOOK_SECRET`
3. **Monitor rate limits** (100 requests/minute)
4. **Set up alerts** for failed payments
5. **Implement idempotency** for payment retries
6. **Store checkout URLs** for customer redirect

### Error Handling

Common errors:

- **AUTHENTICATION_FAILED** - Invalid API key
- **RATE_LIMIT_EXCEEDED** - Too many requests
- **PROVIDER_UNAVAILABLE** - Coinbase API downtime
- **INVALID_AMOUNT** - Amount below minimum or above maximum
- **UNSUPPORTED_CURRENCY** - Non-USD currency for ACH

## Integration Points

The banking abstraction layer integrates with existing systems:

1. **Ledger Service** - Bank transactions can be synced to journal entries
2. **Audit Service** - All banking operations are logged
3. **Account Manager** - Bank accounts linked to entity accounts

## Security Considerations

- Credentials stored in environment variables
- Rate limiting per provider
- Retry logic with exponential backoff
- No sensitive data in logs
- Webhook signature verification (TODO)

## Performance

- Response caching with TTL
- Rate limiting to prevent API abuse
- Efficient aggregation algorithms
- Pagination support for large datasets
