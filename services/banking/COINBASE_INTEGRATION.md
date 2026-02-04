# Coinbase ACH Integration - Quick Start

This guide shows how to integrate Coinbase ACH payments into the fiduciary application.

## Prerequisites

1. Coinbase Commerce account
2. API key from https://commerce.coinbase.com/dashboard/settings
3. Node.js 18+ and npm

## Setup

### 1. Environment Variables

Add to your `.env` file:

```bash
# Coinbase Commerce API
COINBASE_ENVIRONMENT=sandbox
COINBASE_API_KEY=your-coinbase-api-key
COINBASE_API_URL=https://api.commerce.coinbase.com
COINBASE_WEBHOOK_SECRET=your-webhook-secret
```

### 2. Install Dependencies

```bash
cd ~/work/fiduciary
npm install
```

### 3. Initialize BankingFacade with Coinbase

```typescript
import { BankingFacade } from './services/banking';
import { BankingProvider } from './types/banking';

const facade = await BankingFacade.initialize([
  {
    provider: BankingProvider.COINBASE,
    config: {
      credentials: {
        apiKey: process.env.COINBASE_API_KEY,
        apiUrl: process.env.COINBASE_API_URL,
      },
      rateLimit: {
        maxRequests: 100,
        perMilliseconds: 60000,
      },
    },
  },
]);
```

## Usage Examples

### List Coinbase Accounts

```typescript
const accounts = await facade.listAllAccounts({
  type: 'checking', // Fiat accounts
});

console.log(`Found ${accounts.length} Coinbase accounts`);

accounts.forEach(account => {
  console.log(`- ${account.displayName}: ${account.currentBalance} ${account.currency}`);
});
```

### Get Account Balance

```typescript
const balance = await facade.getBalance('coinbase_abc123');

console.log(`Current: ${balance.currentBalance} ${balance.currency}`);
console.log(`Available: ${balance.availableBalance} ${balance.currency}`);
```

### List Transactions (Charges)

```typescript
const transactions = await facade.listAllTransactions({
  startDate: '2024-01-01T00:00:00.000Z',
  endDate: '2024-12-31T23:59:59.999Z',
  currency: 'USD',
  limit: 50,
});

console.log(`Found ${transactions.length} transactions`);

transactions.forEach(tx => {
  console.log(`- ${tx.date}: ${tx.description} - ${tx.amount} ${tx.currency}`);
});
```

### Initiate ACH Payment

```typescript
const payment = await facade.initiatePayment({
  sourceAccountId: 'coinbase_usd_wallet',
  beneficiaryName: 'ACME Corporation',
  beneficiaryAccount: '123456789',
  amount: 1500.00,
  currency: 'USD',
  reference: 'Invoice #INV-2024-001',
  method: 'ACH_CREDIT',
});

console.log(`Payment created: ${payment.paymentId}`);
console.log(`Status: ${payment.status}`);
console.log(`Checkout URL: ${payment.metadata.hostedUrl}`);
console.log(`Estimated arrival: ${payment.estimatedArrival}`);
```

### Check Payment Status

```typescript
const transactions = await facade.listAllTransactions({
  limit: 100,
});

const payment = transactions.find(t => t.id === 'coinbase_charge_XYZ789');

if (payment) {
  console.log(`Payment status: ${payment.status}`);
  console.log(`Amount: ${payment.amount} ${payment.currency}`);

  if (payment.status === 'completed') {
    console.log('✅ Payment completed successfully');
  } else if (payment.status === 'pending') {
    console.log('⏳ Payment is processing (1-3 business days)');
  } else if (payment.status === 'failed') {
    console.log('❌ Payment failed');
  }
}
```

## API Endpoints

The Coinbase adapter integrates with the existing banking API:

### Health Check

```bash
curl http://localhost:3000/api/banking/health
```

Response:
```json
{
  "providers": [
    {
      "provider": "coinbase",
      "isHealthy": true,
      "latencyMs": 125,
      "features": {
        "supportsPaymentInitiation": true,
        "supportedPaymentMethods": ["ACH_CREDIT", "ACH_DEBIT", "WIRE"]
      }
    }
  ]
}
```

### List Accounts

```bash
curl http://localhost:3000/api/banking/accounts
```

### Initiate Payment

```bash
curl -X POST http://localhost:3000/api/banking/payments \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "coinbase",
    "sourceAccountId": "coinbase_usd_wallet",
    "beneficiaryName": "Vendor Inc",
    "beneficiaryAccount": "987654321",
    "amount": 500.00,
    "currency": "USD",
    "reference": "Invoice #123",
    "method": "ACH_CREDIT"
  }'
```

### Get Payment Status

```bash
curl http://localhost:3000/api/banking/transactions/coinbase_charge_XYZ789
```

## Testing

Run the Coinbase adapter tests:

```bash
npm test services/banking/CoinbaseAdapter.test.ts
```

## Webhooks

Coinbase sends webhook events for payment status changes. Configure your webhook URL in the Coinbase Commerce dashboard:

```
https://your-domain.com/api/banking/webhooks/coinbase
```

Webhook payload example:

```json
{
  "event": {
    "type": "charge:confirmed",
    "data": {
      "code": "XYZ789",
      "status": "confirmed",
      "amount": "500.00",
      "currency": "USD"
    }
  }
}
```

## Best Practices

1. **Always validate payment amounts** before initiating
2. **Store checkout URLs** for customer redirect
3. **Monitor payment status** using webhooks or polling
4. **Implement retry logic** for failed payments
5. **Log all payment operations** for audit trails
6. **Use idempotency keys** for payment retries
7. **Handle rate limits** (100 requests/minute)

## Troubleshooting

### Common Issues

**Authentication Failed**
- Check API key is correct
- Verify environment (sandbox vs production)

**Rate Limit Exceeded**
- Implement exponential backoff
- Cache responses where possible

**Payment Failed**
- Verify amount is within limits ($0.50 - $50,000)
- Check currency is USD for ACH
- Ensure bank account is verified

### Debug Mode

Enable debug logging:

```bash
DEBUG=coinbase:* npm run dev
```

## Production Checklist

- [ ] Use production API key
- [ ] Configure webhook signature verification
- [ ] Set up monitoring and alerts
- [ ] Implement payment status reconciliation
- [ ] Add idempotency for payment retries
- [ ] Configure rate limiting
- [ ] Set up logging and audit trails
- [ ] Test with small amounts first
- [ ] Document payment reconciliation process
- [ ] Set up Coinbase Commerce alerts

## Resources

- [Coinbase Commerce API Docs](https://commerce.coinbase.com/docs/api)
- [Coinbase Commerce Dashboard](https://commerce.coinbase.com/dashboard)
- [Banking README](./README.md)
- [Core Types](../../types/banking/core.ts)

## Support

For issues or questions:
1. Check the [Banking README](./README.md)
2. Review test cases in [CoinbaseAdapter.test.ts](./CoinbaseAdapter.test.ts)
3. Open an issue in the repository
