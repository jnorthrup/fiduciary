# Plaid Integration - Quick Start Guide

This guide shows how to integrate Plaid for bank account aggregation and transaction processing.

## Overview

Plaid provides a unified API for connecting to thousands of financial institutions. This adapter enables:
- **Account linking** via Plaid Link
- **Account aggregation** (checking, savings, credit cards, investments)
- **Balance checks**
- **Transaction history** (up to 2 years)
- **Account numbers** (routing and account numbers)

**Note:** Plaid is read-only. For payment initiation, use Coinbase ACH or other payment providers.

## Prerequisites

1. Plaid account at https://dashboard.plaid.com
2. Client ID and Secret key
3. Node.js 18+ and npm

## Setup

### 1. Get Plaid Credentials

1. Go to https://dashboard.plaid.com
2. Sign up for an account
3. Navigate to "API Keys"
4. Copy your Client ID and Secret

### 2. Environment Variables

Add to your `.env` file:

```bash
# Plaid Configuration
VITE_PLAID_ENV=sandbox
VITE_PLAID_CLIENT_ID=your-plaid-client-id
VITE_PLAID_SECRET=your-plaid-secret
# Optional: Webhook URL for real-time updates
PLAID_WEBHOOK_URL=https://your-domain.com/api/banking/webhooks/plaid
```

### 3. Install Dependencies

```bash
cd ~/work/fiduciary
npm install
```

### 4. Initialize PlaidAdapter

```typescript
import { PlaidAdapter } from './services/banking';

const plaid = new PlaidAdapter({
  credentials: {
    clientId: process.env.VITE_PLAID_CLIENT_ID,
    secret: process.env.VITE_PLAID_SECRET,
  },
  environment: process.env.VITE_PLAID_ENV || 'sandbox',
  rateLimit: {
    maxRequests: 100,
    perMilliseconds: 60000,
  },
});
```

## Usage Flow

### Step 1: Create Link Token

The frontend uses Plaid Link to authenticate users with their bank:

```typescript
// Server-side: Create link token
const linkToken = await plaid.createLinkToken({
  clientUserId: 'user-' + userId,
});

// Send linkToken to frontend
console.log(linkToken);
```

### Step 2: Initialize Plaid Link (Frontend)

```typescript
// Frontend JavaScript
const handler = Plaid.create({
  token: linkToken,
  onSuccess: async (publicToken, metadata) => {
    // Send publicToken to your server
    await fetch('/api/plaid/exchange-token', {
      method: 'POST',
      body: JSON.stringify({ publicToken }),
    });
  },
});

handler.open();
```

### Step 3: Exchange Public Token (Server-side)

```typescript
// Server-side: Exchange public token for access token
const accessToken = await plaid.exchangePublicToken(publicToken);

// Store accessToken securely associated with user
console.log('Access token:', accessToken);
```

### Step 4: List Accounts

```typescript
// Get all accounts
const accounts = await plaid.listAccounts();

console.log(`Found ${accounts.length} accounts`);

accounts.forEach(account => {
  console.log(`- ${account.displayName}`);
  console.log(`  Type: ${account.type}`);
  console.log(`  Balance: ${account.currentBalance} ${account.currency}`);
});
```

### Step 5: Get Account Balance

```typescript
const balance = await plaid.getBalance('acc-123');

console.log(`Current: ${balance.currentBalance} ${balance.currency}`);
console.log(`Available: ${balance.availableBalance} ${balance.currency}`);
console.log(`Last Updated: ${balance.lastUpdatedAt}`);
```

### Step 6: List Transactions

```typescript
const transactions = await plaid.listTransactions({
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  limit: 100,
});

console.log(`Found ${transactions.length} transactions`);

transactions.forEach(tx => {
  console.log(`- ${tx.date}: ${tx.description} - ${tx.amount} ${tx.currency}`);
  console.log(`  Status: ${tx.status}`);
  console.log(`  Category: ${tx.category}`);
});
```

### Step 7: Get Account Numbers (Optional)

Requires the `auth` product when creating the link token:

```typescript
const numbers = await plaid.getAccountNumbers('acc-123');

if (numbers) {
  console.log(`Account: ****${numbers.accountNumber.slice(-4)}`);
  console.log(`Routing: ${numbers.routingNumber}`);
}
```

### Step 8: Rotate Access Token (Security)

```typescript
// Rotate access token periodically (recommended: every 30 days)
const newAccessToken = await plaid.rotateAccessToken();

console.log('New access token:', newAccessToken);
```

## API Endpoints

The Plaid adapter integrates with the existing banking API:

### Link Token Creation

```bash
curl -X POST http://localhost:3000/api/banking/plaid/link-token \
  -H "Content-Type: application/json" \
  -d '{
    "clientUserId": "user-123"
  }'
```

### Token Exchange

```bash
curl -X POST http://localhost:3000/api/banking/plaid/exchange-token \
  -H "Content-Type: application/json" \
  -d '{
    "publicToken": "public-sandbox-xxx"
  }'
```

### List Accounts

```bash
curl http://localhost:3000/api/banking/accounts?provider=plaid
```

### Get Balance

```bash
curl http://localhost:3000/api/banking/accounts/plaid_acc-123/balance
```

### List Transactions

```bash
curl "http://localhost:3000/api/banking/transactions?provider=plaid&startDate=2024-01-01&limit=50"
```

## Supported Products

Plaid products enabled in this adapter:

- **auth** - Account numbers and routing numbers
- **transactions** - Transaction history (up to 2 years)
- **balance** - Real-time balance checks
- **identity** - Account holder information (optional)

## Supported Account Types

- ✅ Checking
- ✅ Savings
- ✅ CDs (Certificate of Deposit)
- ✅ Money Market
- ✅ Credit Cards
- ✅ Loans
- ✅ Brokerage/Investment accounts

## Testing

### Sandbox Testing

Plaid provides sandbox test credentials:

**Username:** `user_good`
**Password:** `pass_good`
**PIN:** `1234`

### Test with specific institutions:

```bash
# Run Plaid adapter tests
npm test services/banking/PlaidAdapter.test.ts

# Run all banking tests
npm test services/banking/

# Test with coverage
npm test -- --coverage services/banking/PlaidAdapter.test.ts
```

## Security Best Practices

### Access Token Storage

- **Never** expose access tokens in frontend code
- Store access tokens securely (encrypted database)
- Associate tokens with user accounts
- Implement proper authentication/authorization

### Token Rotation

```typescript
// Rotate every 30 days (recommended)
setInterval(async () => {
  const newToken = await plaid.rotateAccessToken();
  // Update stored token
}, 30 * 24 * 60 * 60 * 1000);
```

### Webhook Verification

```typescript
// Verify webhook signature
app.post('/api/banking/webhooks/plaid', (req, res) => {
  const signature = req.headers['plaid-verification'];
  const isValid = verifyWebhook(req.body, signature);

  if (!isValid) {
    return res.status(401).send('Invalid signature');
  }

  // Process webhook
});
```

## Webhook Events

Plaid sends webhook events for:

- **LOGIN_REQUIRED** - User needs to re-authenticate
- **TRANSACTIONS** - New transactions available
- **BALANCE** - Balance updated
- **ITEM** - Item status changed

Example webhook payload:

```json
{
  "webhook_type": "TRANSACTIONS",
  "webhook_code": "DEFAULT_UPDATE",
  "item_id": "item-xxx",
  "new_transactions": 5,
  "error": null
}
```

## Error Handling

Common errors:

### ITEM_LOGIN_REQUIRED

```typescript
try {
  await plaid.listAccounts();
} catch (error) {
  if (error.code === 'AUTHENTICATION_FAILED') {
    // User needs to re-authenticate via Plaid Link
    // Prompt user to reconnect account
  }
}
```

### INVALID_ACCESS_TOKEN

```typescript
// Access token expired or invalid
// Solution: Rotate token or re-authenticate user
```

### RATE_LIMIT_EXCEEDED

```typescript
// Too many requests
// Solution: Implement exponential backoff
```

## Limitations

- **Read-only** - Cannot initiate payments through Plaid
- **Rate limits** - 100 requests per minute (default)
- **Transaction history** - Up to 2 years (730 days)
- **Balance checks** - Depends on bank (some real-time, some end-of-day)

## Production Checklist

Before going to production:

- [ ] Use production Plaid API keys
- [ ] Enable HTTPS for all Plaid API calls
- [ ] Implement webhook signature verification
- [ ] Set up webhook endpoint for real-time updates
- [ ] Implement access token rotation
- [ ] Store access tokens securely (encrypted)
- [ ] Add error handling for re-authentication flow
- [ ] Set up monitoring for failed items
- [ ] Test with real bank accounts
- [ ] Implement rate limiting
- [ ] Add logging and audit trails

## Troubleshooting

### Common Issues

**"No access token" error**
- Call `exchangePublicToken()` first
- Ensure access token is stored and retrieved correctly

**"ITEM_LOGIN_REQUIRED" error**
- User needs to re-authenticate
- Initialize Plaid Link again with the same item
- Exchange the new public token

**Rate limit errors**
- Implement exponential backoff
- Cache responses where possible
- Use pagination for large datasets

**Missing transactions**
- Check if `transactions` product is enabled
- Verify date range (max 2 years)
- Some banks have delays in transaction data

### Debug Mode

Enable debug logging:

```bash
DEBUG=plaid:* npm run dev
```

## Best Practices

1. **Always validate** access tokens before use
2. **Store tokens securely** - never in frontend code
3. **Implement re-authentication** flow for expired items
4. **Use webhooks** for real-time updates
5. **Cache responses** to reduce API calls
6. **Rotate tokens** regularly (every 30 days)
7. **Monitor failed items** and notify users
8. **Log all operations** for audit trails
9. **Handle errors gracefully** with user-friendly messages
10. **Test thoroughly** in sandbox first

## Comparison with Other Adapters

| Feature | Plaid | Coinbase | Teller |
|---------|-------|----------|--------|
| Account Aggregation | ✅ | ✅ | ✅ |
| Transaction History | ✅ | ✅ | ✅ |
| Balance Checks | ✅ | ✅ | ✅ |
| Payment Initiation | ❌ | ✅ (ACH) | ❌ |
| Webhooks | ✅ | ✅ | ✅ |
| Institutions | 11,000+ | 1 (Coinbase) | 4,000+ |
| Read-only | Yes | No | Yes |

## Resources

- [Plaid API Docs](https://plaid.com/docs/api)
- [Plaid Link Docs](https://plaid.com/docs/link)
- [Plaid Dashboard](https://dashboard.plaid.com)
- [Banking README](./README.md)
- [Core Types](../../types/banking/core.ts)

## Support

For Plaid-specific issues:
- [Plaid Support](https://plaid.com/support)
- [Plaid Community](https://plaid.com/community)

For adapter issues:
- Check the [Banking README](./README.md)
- Review test cases in [PlaidAdapter.test.ts](./PlaidAdapter.test.ts)
- Open an issue in the repository
