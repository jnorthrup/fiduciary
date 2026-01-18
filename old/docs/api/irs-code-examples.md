# IRS IRIS A2A API - Code Examples

Practical examples for common IRS IRIS API operations using the production client.

## Table of Contents

- [Setup](#setup)
- [Authentication](#authentication)
- [Submitting Transmissions](#submitting-transmissions)
- [Status Polling](#status-polling)
- [Error Handling](#error-handling)
- [Advanced Patterns](#advanced-patterns)

---

## Setup

### Initialize Client

```typescript
import { IRISClient } from './services/iris-client';

// Test environment (ATS)
const client = new IRISClient({
  clientId: 'your-api-client-id',
  userId: 'dasmith-345870',
  tcc: 'T1234',  // Test TCC
  privateKey: process.env.IRS_PRIVATE_KEY!,
  keyId: 'your-key-id-from-jwk',
  testMode: true,
});

// Production environment
const prodClient = new IRISClient({
  clientId: 'your-api-client-id',
  userId: 'dasmith-345870',
  tcc: 'D1234',  // Production TCC
  privateKey: process.env.IRS_PRIVATE_KEY!,
  keyId: 'your-key-id-from-jwk',
  testMode: false,
});
```

### Validate TCC Format

```typescript
import { validateTCC, validateUTID } from './services/iris-client';

// Validate TCC
if (validateTCC('D1234')) {
  console.log('Valid production TCC');
}

if (validateTCC('T1234')) {
  console.log('Valid test TCC');
}

// Validate UTID
const utid = 'da20a4de-1357-11ed-861d-0242ac120002:IRIS:D1234::A';
if (validateUTID(utid)) {
  console.log('Valid UTID');
}
```

---

## Authentication

### Single Authentication

```typescript
try {
  await client.authenticate();
  console.log('Authenticated successfully');
} catch (error) {
  console.error('Authentication failed:', error.message);
}
```

### Auto-Refresh on Token Expiry

```typescript
// The client handles token refresh automatically
// Access tokens expire after 15 minutes, refresh after 60

// First call authenticates
const receipt1 = await client.submitTransmission({ xmlPayload, taxYear: '2024' });

// Later call automatically refreshes if needed
await new Promise(resolve => setTimeout(resolve, 16 * 60 * 1000));
const receipt2 = await client.submitTransmission({ xmlPayload, taxYear: '2024' });
```

---

## Submitting Transmissions

### Basic 1099-NEC Submission

```typescript
import { generateIRISXML } from './utils/iris-xml-generator';

const payees = [
  {
    tin: '12-3456789',
    name: 'John Doe',
    address: {
      streetAddress: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      zipCode: '90210',
    },
    amounts: {
      nonemployeeCompensation: 5000,
    },
  },
];

const xmlPayload = generateIRISXML({
  transmitterId: 'D1234',
  softwareId: 'SOFTWARE-001',
  formType: '1099-NEC',
  filer: {
    ein: '12-3456789',
    name: 'ACME Corporation',
    address: {
      streetAddress: '456 Business Ave',
      city: 'Business City',
      state: 'NY',
      zipCode: '10001',
    },
  },
  payees,
});

const receipt = await client.submitTransmission({
  xmlPayload,
  utid: 'uuid:IRIS:D1234::A',  // Optional - auto-generated if omitted
  taxYear: '2024',
});

console.log('Receipt ID:', receipt.receiptId);
// Output: Receipt ID: 2022-68537508811-4386213b8
```

### Correction Submission

```typescript
const correctionReceipt = await client.submitTransmission({
  xmlPayload: generateIRISXML({
    ...submissionData,
    originalReceiptId: '2022-68537508811-4386213b8',  // Original to correct
  }),
  taxYear: '2024',
  transmissionType: 'C',  // C = Correction
});
```

### Batch Submission (Multiple Payees)

```typescript
// Up to 1000 payees per transmission
const batchPayees = Array.from({ length: 100 }, (_, i) => ({
  tin: `12-345678${i.toString().padStart(2, '0')}`,
  name: `Contractor ${i + 1}`,
  address: {
    streetAddress: `${i + 1} Contractor St`,
    city: 'Contractor City',
    state: 'TX',
    zipCode: '75001',
  },
  amounts: {
    nonemployeeCompensation: Math.floor(Math.random() * 10000),
  },
}));

const batchReceipt = await client.submitTransmission({
  xmlPayload: generateIRISXML({
    transmitterId: 'D1234',
    softwareId: 'SOFTWARE-001',
    formType: '1099-NEC',
    filer: filerInfo,
    payees: batchPayees,
  }),
  taxYear: '2024',
});
```

---

## Status Polling

### Basic Status Check

```typescript
const status = await client.getStatus({
  searchId: '2022-68537508811-4386213b8',  // Receipt ID
});

console.log('Status:', status.transmissionStatusCd);
// Output: Status: Processing

if (status.submissionResults) {
  status.submissionResults.forEach(sub => {
    console.log(`Submission ${sub.submissionId}: ${sub.submissionStatusCd}`);
  });
}

if (status.errors) {
  status.errors.forEach(err => {
    console.error(`Error ${err.code}: ${err.message}`);
  });
}
```

### Poll Until Complete

```typescript
// Poll every 30 seconds, up to 60 attempts (30 minutes)
const finalStatus = await client.pollStatus('2022-68537508811-4386213b8', {
  intervalMs: 30000,
  maxAttempts: 60,
});

if (finalStatus.transmissionStatusCd === 'Accepted') {
  console.log('Transmission accepted!');
} else if (finalStatus.transmissionStatusCd === 'Rejected') {
  console.error('Transmission rejected!');
  finalStatus.errors?.forEach(err => {
    console.error(`  ${err.code}: ${err.message}`);
  });
}
```

### Poll with Progress Callback

```typescript
await client.pollStatus('2022-68537508811-4386213b8', {
  intervalMs: 30000,
  maxAttempts: 60,
}).on('progress', (status) => {
  console.log(`Current status: ${status.transmissionStatusCd}`);

  if (status.submissionResults) {
    const accepted = status.submissionResults.filter(s => s.submissionStatusCd === 'Accepted').length;
    const total = status.submissionResults.length;
    console.log(`Progress: ${accepted}/${total} submissions accepted`);
  }
});
```

---

## Error Handling

### Authentication Errors

```typescript
try {
  await client.authenticate();
} catch (error) {
  if (error.message.includes('DECODER routines')) {
    console.error('Invalid private key format');
    console.error('Ensure your private key is valid PEM format');
  } else if (error.message.includes('AUTH')) {
    console.error('Authentication failed:', error.message);
    console.error('Check your credentials and try again');
  }
}
```

### Submission Errors

```typescript
try {
  const receipt = await client.submitTransmission({
    xmlPayload,
    taxYear: '2024',
  });
} catch (error) {
  if (error.message.includes('100MB')) {
    console.error('Payload too large (max 100MB)');
  } else if (error.message.includes('validation')) {
    console.error('XML validation failed:', error.message);
  } else {
    console.error('Submission failed:', error.message);
  }
}
```

### Status Query Errors

```typescript
try {
  const status = await client.getStatus({ searchId: receiptId });
} catch (error) {
  if (error.message.includes('Not Found')) {
    console.error('Receipt ID not found');
    console.error('Check the Receipt ID and try again');
  } else {
    console.error('Status check failed:', error.message);
  }
}
```

---

## Advanced Patterns

### Retry with Exponential Backoff

```typescript
async function submitWithRetry(
  client: IRISClient,
  xmlPayload: string,
  maxRetries = 3
): Promise<IRISReceiptResponse> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await client.submitTransmission({ xmlPayload, taxYear: '2024' });
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;

      const delay = Math.pow(2, attempt) * 1000;  // 1s, 2s, 4s
      console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('All retries exhausted');
}
```

### Parallel Submissions

```typescript
// Submit multiple transmissions in parallel
const submissions = [
  { xmlPayload: xml1, taxYear: '2024' },
  { xmlPayload: xml2, taxYear: '2024' },
  { xmlPayload: xml3, taxYear: '2024' },
];

const receipts = await Promise.all(
  submissions.map(sub => client.submitTransmission(sub))
);

console.log('Submitted', receipts.length, 'transmissions');
```

### Status Polling for Multiple Receipts

```typescript
async function pollMultipleReceipts(
  client: IRISClient,
  receiptIds: string[]
): Promise<Map<string, IRISStatusResponse>> {
  const results = new Map<string, IRISStatusResponse>();

  await Promise.all(
    receiptIds.map(async (receiptId) => {
      const status = await client.pollStatus(receiptId);
      results.set(receiptId, status);
      console.log(`${receiptId}: ${status.transmissionStatusCd}`);
    })
  );

  return results;
}
```

### UTID Generation

```typescript
import { generateUTID, randomUUID } from 'crypto';

// Generate custom UTID
const uuid = randomUUID();
const tcc = 'D1234';
const utid = generateUTID(uuid, tcc);

console.log(utid);
// Output: da20a4de-1357-11ed-861d-0242ac120002:IRIS:D1234::A
```

### Utility Functions

```typescript
import {
  validateTCC,
  validateUTID,
  generateUTID,
  type IRISCredentials
} from './services/iris-client';

// Check credentials before creating client
function validateCredentials(creds: Partial<IRISCredentials>): string[] {
  const errors: string[] = [];

  if (!creds.clientId) errors.push('Missing API Client ID');
  if (!creds.userId) errors.push('Missing IRIS User ID');
  if (!creds.tcc || !validateTCC(creds.tcc)) {
    errors.push('Invalid TCC format (must be 5 chars, start with D/T)');
  }
  if (!creds.privateKey) errors.push('Missing private key');
  if (!creds.keyId) errors.push('Missing Key ID');

  return errors;
}

// Usage
const errors = validateCredentials({
  clientId: 'test-client',
  userId: 'user-123',
  tcc: 'INVALID',
});

if (errors.length > 0) {
  console.error('Invalid credentials:', errors);
}
```

---

## Testing

### Mock Client for Tests

```typescript
import { IRISClient } from './services/iris-client';

const mockClient = new IRISClient({
  clientId: 'test-client-id',
  userId: 'test-user-123',
  tcc: 'T1234',
  privateKey: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG...\n-----END PRIVATE KEY-----',
  keyId: 'test-key-id',
  testMode: true,  // Use test environment
});

// Test authentication
await mockClient.authenticate();

// Test submission (won't actually submit to IRS)
const testReceipt = await mockClient.submitTransmission({
  xmlPayload: '<?xml version="1.0"?><test></test>',
  taxYear: '2024',
});
```

---

## References

- [IRISClient API Reference](../services/iris-client.ts)
- [OpenAPI Specification](../specs/iris-a2a-openapi.yaml)
- [Direct API Setup](./iris-direct-api-setup.md)
