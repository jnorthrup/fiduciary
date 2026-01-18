# IRS API Client Library Reference

TypeScript client library for IRS Information Returns Intake System (IRIS) A2A API.

## Overview

The `IrsApiClient` class provides a high-level TypeScript interface for interacting with the IRS IRIS A2A API. It supports both proxy mode (through backend server) and direct mode (using IRISClient adapter with JWT authentication).

**Module**: `services/irsApiClient.ts`

**Key Features**:
- Dual authentication modes (TCC + Bearer token, or Direct API with JWT)
- Automatic mode detection and switching
- Type-safe request/response handling
- Built-in status polling with exponential backoff
- Comprehensive error handling
- Support for all IRIS form types

---

## Installation & Setup

### Import Client

```typescript
import { irsApi, IrsApiClient } from './services/irsApiClient';

// Use singleton instance
await irsApi.setAuth('T12345', 'bearer-token-here');

// Or create new instance
const client = new IrsApiClient('http://localhost:3001/api/irs');
```

### Configuration

The client automatically detects the operational mode:

**Proxy Mode** (default):
- Routes requests through backend Express server
- Requires TCC or Bearer token for authentication
- Backend handles IRS API communication

**Direct Mode**:
- Uses IRIS adapter for direct IRS API access
- Requires OAuth JWT credentials (configured separately)
- Bypasses backend proxy

```typescript
// Check current mode
if (client.isDirectMode()) {
  console.log('Using direct IRS API access');
} else {
  console.log('Using backend proxy');
}
```

---

## Authentication

### Set Authentication Credentials

```typescript
// TCC authentication (Transmission Control Code)
await irsApi.setAuth('T12345');

// Bearer token authentication (higher priority)
await irsApi.setAuth(undefined, 'eyJhbGciOiJSUzI1NiIs...');

// Direct mode (auto-detects if credentials configured)
await irsApi.setAuth(); // Uses environment credentials
```

**Priority Order**:
1. Direct API auth (if IRIS adapter available)
2. Bearer token
3. TCC

### Clear Authentication

```typescript
irsApi.clearAuth();
```

---

## Core Methods

### Health Check

Verify API availability and retrieve service metadata.

```typescript
const health = await irsApi.healthCheck();

console.log(health);
// Output:
// {
//   status: 'healthy',
//   timestamp: '2026-01-13T17:42:00Z',
//   service: 'IRS IRIS A2A API',
//   version: '1.0.0'
// }
```

**Returns**: `Promise<HealthResponse>`

**Response Type**:
```typescript
interface HealthResponse {
  status: string;       // 'healthy' | 'degraded' | 'unavailable'
  timestamp: string;    // ISO 8601 timestamp
  service: string;      // Service name
  version: string;      // API version
}
```

---

### Submit Batch

Submit an information return batch for processing.

```typescript
import type { SubmissionRequest } from './services/irsApiClient';

const submission: SubmissionRequest = {
  transmitterId: 'T12345',
  softwareId: 'TRUST-LEDGER-V1',
  formType: '1099-NEC',
  submissionType: 'O',  // O = Original, C = Correction
  taxYear: 2024,
  filer: {
    ein: '12-3456789',
    name: 'ACME Corporation',
    address: {
      streetAddress: '123 Business Ave',
      city: 'Anytown',
      state: 'CA',
      zipCode: '90210',
    },
  },
  payees: [
    {
      tin: '987-65-4321',
      tinType: 'SSN',
      name: 'John Contractor',
      address: {
        streetAddress: '456 Main St',
        city: 'Somewhere',
        state: 'NY',
        zipCode: '10001',
      },
      amounts: {
        nonemployeeCompensation: 15000,
        federalIncomeTaxWithheld: 0,
      },
    },
  ],
};

const receipt = await irsApi.submitBatch(submission);

console.log('Receipt ID:', receipt.receiptId);
console.log('Status:', receipt.status);
```

**Parameters**:
- `submission` (SubmissionRequest): Submission data including filer, payees, and amounts

**Returns**: `Promise<SubmissionReceipt>`

**Response Type**:
```typescript
interface SubmissionReceipt {
  receiptId: string;                // Unique receipt identifier
  status: SubmissionStatus;         // Current status
  timestamp: string;                // Submission timestamp (ISO 8601)
  estimatedCompletion?: string;     // Estimated completion time
  message?: string;                 // Status message
  warnings?: string[];              // Non-fatal warnings
  errors?: ValidationError[];       // Validation errors
}

type SubmissionStatus =
  | 'Received'
  | 'Processing'
  | 'Accepted'
  | 'AcceptedWithErrors'
  | 'Rejected'
  | 'Cancelled';
```

**Throws**: `IrsApiError` on validation or submission failure

---

### Get Submission Status

Retrieve current status for a submitted batch.

```typescript
const status = await irsApi.getSubmissionStatus('2022-68537508811-4386213b8');

console.log('Status:', status.status);
console.log('Accepted:', status.acceptedCount);
console.log('Errors:', status.errorCount);

if (status.errors) {
  status.errors.forEach(err => {
    console.error(`${err.code}: ${err.message}`);
  });
}
```

**Parameters**:
- `receiptId` (string): Receipt ID from submission

**Returns**: `Promise<BatchStatus>`

**Response Type**:
```typescript
interface BatchStatus {
  receiptId: string;              // Receipt identifier
  status: SubmissionStatus;       // Current status
  submittedAt: string;            // Submission timestamp
  completedAt?: string;           // Completion timestamp (if terminal)
  recordCount: number;            // Total payee records
  acceptedCount: number;          // Successfully accepted records
  errorCount: number;             // Records with errors
  warningCount: number;           // Records with warnings
  errors?: SubmissionError[];     // Error details
  warnings?: SubmissionError[];   // Warning details
  processingTime?: number;        // Processing time in milliseconds
}
```

---

### Get Submission Details

Retrieve detailed record-level status for a submission.

```typescript
const details = await irsApi.getSubmissionDetails('2022-68537508811-4386213b8');

details.records.forEach(record => {
  console.log(`Record ${record.recordId}:`);
  console.log(`  TIN: ${record.tin}`);
  console.log(`  Name: ${record.name}`);
  console.log(`  Status: ${record.status}`);

  if (record.errors.length > 0) {
    console.log('  Errors:');
    record.errors.forEach(err => {
      console.log(`    ${err.code}: ${err.message}`);
    });
  }
});
```

**Parameters**:
- `receiptId` (string): Receipt ID from submission

**Returns**: `Promise<SubmissionDetails>`

**Response Type**:
```typescript
interface SubmissionDetails {
  receiptId: string;
  status: SubmissionStatus;
  submittedAt: string;
  completedAt?: string;
  records: RecordStatus[];
}

interface RecordStatus {
  recordId: string;               // Record identifier
  status: 'Accepted' | 'Error' | 'Warning';
  tin: string;                    // Payee TIN
  name: string;                   // Payee name
  errors: SubmissionError[];      // Record errors
  warnings: SubmissionError[];    // Record warnings
}

interface SubmissionError {
  code: string;                   // Error code (e.g., "S1H001")
  message: string;                // Error description
  severity: 'ERROR' | 'WARNING';  // Severity level
  recordRef?: string;             // Reference to affected record
  field?: string;                 // Field name in error
  correctedValue?: string;        // Suggested correction
}
```

---

### Validate TIN

Validate a single Taxpayer Identification Number with IRS TIN Matching Service.

```typescript
const result = await irsApi.validateTin({
  tin: '12-3456789',
  name: 'ACME Corporation',
  requestType: 'FullMatch',
  businessType: 'Corporation',
});

if (result.match) {
  console.log('TIN matches name');
} else {
  console.log('TIN mismatch:', result.message);
}
```

**Parameters**:
- `request` (TinMatchRequest): TIN validation request

**Request Type**:
```typescript
interface TinMatchRequest {
  tin: string;                    // TIN to validate (formatted)
  name: string;                   // Name to match against
  requestType?: 'NameControl' | 'FullMatch';  // Match type (default: FullMatch)
  businessType?: 'SoleProprietor' | 'Corporation' | 'Partnership' | 'Estate';
}
```

**Returns**: `Promise<TinMatchResponse>`

**Response Type**:
```typescript
interface TinMatchResponse {
  code: number;         // 0 = Match, 1 = Mismatch, 2 = Invalid Request
  match: boolean;       // True if TIN matches name
  message: string;      // Result message
  tin: string;          // Validated TIN
  name: string;         // Validated name
}
```

**Note**: TIN validation is only available in proxy mode. Direct mode will throw an error.

---

### Validate TIN Batch

Validate multiple TINs in a single request (up to 50).

```typescript
const batchResult = await irsApi.validateTinBatch({
  requests: [
    { tin: '12-3456789', name: 'ACME Corporation' },
    { tin: '98-7654321', name: 'Widget Inc' },
    { tin: '111-22-3333', name: 'John Doe' },
  ],
});

console.log('Request ID:', batchResult.requestId);

batchResult.results.forEach((result, i) => {
  console.log(`TIN ${i + 1}:`, result.match ? 'Match' : 'Mismatch');
});
```

**Parameters**:
- `request` (TinMatchBatchRequest): Batch of TIN validation requests

**Request Type**:
```typescript
interface TinMatchBatchRequest {
  requests: TinMatchRequest[];  // Array of up to 50 TIN validations
}
```

**Returns**: `Promise<TinMatchBatchResponse>`

**Response Type**:
```typescript
interface TinMatchBatchResponse {
  results: TinMatchResponse[];  // Results array (same order as requests)
  requestId: string;            // Unique batch request identifier
}
```

**Performance**: Batch validation completes in <10 seconds for 50 TINs.

---

### Get Form Schema

Retrieve JSON schema for a specific form type.

```typescript
const schema = await irsApi.getFormSchema('1099-NEC');

console.log('Form:', schema.title);
console.log('Required fields:', schema.required);

Object.keys(schema.properties).forEach(field => {
  const prop = schema.properties[field];
  console.log(`${field}: ${prop.type} - ${prop.description || ''}`);
});
```

**Parameters**:
- `formType` (FormType): Form type to retrieve

**Supported Form Types**:
```typescript
type FormType =
  | '1099-NEC' | '1099-MISC' | '1099-INT' | '1099-DIV'
  | '1099-B' | '1099-R' | '1099-S'
  | 'W-2' | 'W-2G'
  | '1042-S' | '3921' | '3922';
```

**Returns**: `Promise<FormSchema>`

**Response Type**:
```typescript
interface FormSchema {
  type: string;                 // Schema type (always 'object')
  title: string;                // Form title
  description: string;          // Form description
  required?: string[];          // Required field names
  properties: Record<string, {
    type: string;               // Field type
    description?: string;       // Field description
    minimum?: number;           // Minimum value (numeric fields)
    [key: string]: any;         // Additional schema properties
  }>;
}
```

**Note**: Form schemas are only available in proxy mode.

---

### Transmission Check

Perform pre-submission validation without actually submitting.

```typescript
const validationResult = await irsApi.transmissionCheck(submission);

if (validationResult.valid) {
  console.log('Submission is valid!');

  if (validationResult.warnings.length > 0) {
    console.log('Warnings:');
    validationResult.warnings.forEach(w => {
      console.log(`  ${w.code}: ${w.message}`);
    });
  }
} else {
  console.log('Validation failed:');
  validationResult.errors.forEach(err => {
    console.log(`  ${err.code}: ${err.message} (${err.field || 'unknown field'})`);
  });
}
```

**Parameters**:
- `submission` (SubmissionRequest): Submission to validate

**Returns**: `Promise<TransmissionCheckResponse>`

**Response Type**:
```typescript
interface TransmissionCheckResponse {
  valid: boolean;               // True if submission is valid
  warnings: ValidationError[];  // Non-fatal warnings
  errors: ValidationError[];    // Fatal errors
}

interface ValidationError {
  code: string;                 // Error code
  message: string;              // Error description
  severity: 'ERROR' | 'WARNING' | 'INFO';
  field?: string;               // Field name in error
  path?: string;                // JSON path to error location
}
```

**Best Practice**: Always run transmission check before submitting to catch validation errors early.

---

### Poll Submission Status

Poll submission status until completion or timeout.

```typescript
// Basic polling
const finalStatus = await irsApi.pollSubmissionStatus(
  '2022-68537508811-4386213b8',
  undefined,  // No callback
  5000,       // Poll every 5 seconds
  300000      // Timeout after 5 minutes
);

console.log('Final status:', finalStatus.status);

// With progress callback
await irsApi.pollSubmissionStatus(
  receiptId,
  (status) => {
    console.log(`Status: ${status.status} | Accepted: ${status.acceptedCount}/${status.recordCount}`);
  },
  2000,   // Poll every 2 seconds
  300000  // 5 minute timeout
);
```

**Parameters**:
- `receiptId` (string): Receipt ID to poll
- `onUpdate?` ((status: BatchStatus) => void): Callback invoked on each status update
- `interval?` (number): Polling interval in milliseconds (default: 2000)
- `timeout?` (number): Maximum polling time in milliseconds (default: 300000)

**Returns**: `Promise<BatchStatus>` - Final batch status

**Terminal States** (polling stops):
- `Accepted`
- `AcceptedWithErrors`
- `Rejected`
- `Cancelled`

**Throws**: Error if timeout exceeded

**Direct Mode Behavior**: In direct mode, uses adapter's optimized polling (30s intervals, up to 60 attempts = 30 minutes).

---

## Helper Functions

### Format EIN

Format EIN to standard format `XX-XXXXXXX`.

```typescript
import { formatEIN } from './services/irsApiClient';

const formatted = formatEIN('123456789');
console.log(formatted); // Output: 12-3456789
```

**Parameters**:
- `ein` (string): Unformatted EIN (9 digits)

**Returns**: string - Formatted EIN

**Throws**: Error if EIN is not 9 digits

---

### Format SSN

Format SSN to standard format `XXX-XX-XXXX`.

```typescript
import { formatSSN } from './services/irsApiClient';

const formatted = formatSSN('123456789');
console.log(formatted); // Output: 123-45-6789
```

**Parameters**:
- `ssn` (string): Unformatted SSN (9 digits)

**Returns**: string - Formatted SSN

**Throws**: Error if SSN is not 9 digits

---

### Validate TIN Format

Check if TIN is in valid EIN or SSN format.

```typescript
import { validateTINFormat } from './services/irsApiClient';

console.log(validateTINFormat('12-3456789'));      // true (EIN)
console.log(validateTINFormat('123-45-6789'));     // true (SSN)
console.log(validateTINFormat('123456789'));       // false (no dashes)
console.log(validateTINFormat('12-345678'));       // false (wrong format)
```

**Parameters**:
- `tin` (string): TIN to validate

**Returns**: boolean - True if valid EIN or SSN format

---

### Get TIN Type

Determine whether a TIN is an EIN or SSN based on format.

```typescript
import { getTINType } from './services/irsApiClient';

console.log(getTINType('12-3456789'));    // 'EIN'
console.log(getTINType('123-45-6789'));   // 'SSN'
console.log(getTINType('invalid'));       // null
```

**Parameters**:
- `tin` (string): Formatted TIN

**Returns**: `'EIN' | 'SSN' | null`

---

### Create Submission Template

Create a minimal submission request template with required fields.

```typescript
import { createSubmissionTemplate } from './services/irsApiClient';

const template = createSubmissionTemplate(
  'T12345',              // Transmitter ID
  'TRUST-LEDGER-V1',     // Software ID
  '1099-NEC',            // Form type
  {                      // Filer info
    ein: '12-3456789',
    name: 'ACME Corp',
    address: {
      streetAddress: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      zipCode: '90210',
    },
  }
);

// Template has empty payee array - add payees before submitting
template.payees.push({
  tin: '987-65-4321',
  name: 'John Doe',
  // ... rest of payee data
});
```

**Parameters**:
- `transmitterId` (string): TCC or transmitter ID
- `softwareId` (string): Software identifier
- `formType` (FormType): Form type
- `filer` (FilerInfo): Filer information

**Returns**: SubmissionRequest - Template with empty payees array

---

### Validate Address

Validate address object for required fields.

```typescript
import { validateAddress } from './services/irsApiClient';

const errors = validateAddress({
  streetAddress: '123 Main St',
  city: 'Anytown',
  state: 'CA',
  zipCode: '90210',
});

if (errors.length > 0) {
  console.error('Address validation failed:', errors);
} else {
  console.log('Address is valid');
}
```

**Parameters**:
- `address` (Partial<Address>): Address to validate

**Returns**: string[] - Array of error messages (empty if valid)

**Validation Rules**:
- `streetAddress` is required
- `city` is required
- `state` must be 2-letter code
- `zipCode` must be 5 or 9 digits (XXXXX or XXXXX-XXXX)

---

### Get Form Amount Fields

Get the amount fields for a specific form type (for UI rendering).

```typescript
import { getFormAmountFields } from './services/irsApiClient';

const fields = getFormAmountFields('1099-NEC');

fields.forEach(field => {
  console.log(`${field.label} (${field.key}) - Required: ${field.required}`);
});

// Output:
// Nonemployee Compensation (Box 1) (nonemployeeCompensation) - Required: true
```

**Parameters**:
- `formType` (FormType): Form type

**Returns**: Array<{ key: string; label: string; required: boolean }>

**Supported Forms**:
- `1099-NEC`: Nonemployee compensation
- `1099-MISC`: Rents, royalties, other income
- `1099-INT`: Interest income, early withdrawal penalty
- `1099-DIV`: Ordinary and qualified dividends
- `1099-B`: Proceeds from broker transactions
- `1099-R`: Distributions from pensions, annuities
- `1099-S`: Proceeds from real estate transactions
- `W-2`: Wages and federal tax withheld
- `W-2G`: Gambling winnings
- `1042-S`: Foreign person's income
- `3921`: Exercise of incentive stock option
- `3922`: Transfer of stock acquired through ESPP

---

## Error Handling

### IrsApiError Class

Custom error class for API errors.

```typescript
class IrsApiError extends Error {
  code: string;           // Error code
  status: number;         // HTTP status code
  details?: ErrorResponse; // Full error response

  constructor(code: string, message: string, status: number, details?: ErrorResponse);
}
```

### Error Handling Example

```typescript
try {
  const receipt = await irsApi.submitBatch(submission);
  console.log('Submitted:', receipt.receiptId);
} catch (error) {
  if (error instanceof IrsApiError) {
    console.error(`API Error ${error.code} (${error.status}): ${error.message}`);

    if (error.details?.errors) {
      error.details.errors.forEach(e => {
        console.error(`  ${e.code}: ${e.message} (${e.field || 'unknown field'})`);
      });
    }
  } else {
    console.error('Unexpected error:', error);
  }
}
```

### Common Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| `INVALID_EIN_FORMAT` | EIN format invalid | Use XX-XXXXXXX format |
| `INVALID_TIN_FORMAT` | TIN format invalid | Use XX-XXXXXXX (EIN) or XXX-XX-XXXX (SSN) |
| `PAYEE_LIMIT_EXCEEDED` | More than 1000 payees | Split into multiple submissions |
| `TRANSMISSION_TIMEOUT` | Submission timeout | Retry with exponential backoff |
| `AUTH_MISSING_TCC` | Missing TCC | Set authentication before request |
| `UNKNOWN_ERROR` | Unknown error | Check network and retry |

---

## Type Definitions

### Address

```typescript
interface Address {
  streetAddress: string;    // Street address (required)
  streetAddress2?: string;  // Apt/Suite (optional)
  city: string;             // City (required)
  state: string;            // 2-letter state code (required)
  zipCode: string;          // ZIP code: XXXXX or XXXXX-XXXX (required)
  country?: string;         // Country (default: US)
}
```

### ContactInfo

```typescript
interface ContactInfo {
  name?: string;      // Contact person name
  phone?: string;     // Contact phone
  email?: string;     // Contact email
}
```

### FilerInfo

```typescript
interface FilerInfo {
  ein: string;            // Filer EIN (XX-XXXXXXX)
  name: string;           // Filer legal name
  tradeName?: string;     // Trade name (if different)
  address: Address;       // Filer address
  contact?: ContactInfo;  // Contact information
}
```

### PayeeAmounts

```typescript
interface PayeeAmounts {
  [key: string]: number | undefined;

  // 1099-NEC
  nonemployeeCompensation?: number;

  // 1099-INT
  interestIncome?: number;
  earlyWithdrawalPenalty?: number;

  // 1099-DIV
  ordinaryDividends?: number;
  qualifiedDividends?: number;

  // Common
  federalIncomeTaxWithheld?: number;
  stateTaxWithheld?: number;
}
```

### PayeeRecord

```typescript
interface PayeeRecord {
  recordId?: string;              // Optional record identifier
  tin: string;                    // Payee TIN (formatted)
  tinType?: 'EIN' | 'SSN';        // TIN type (auto-detected if omitted)
  name: string;                   // Payee name
  address: Address;               // Payee address
  accountNumber?: string;         // Account number (optional)
  secondTinNotice?: string;       // Second TIN notice (if applicable)
  amounts?: PayeeAmounts;         // Payment amounts
  stateAmounts?: StateAmount[];   // State withholding
  withholding?: WithholdingInfo;  // Federal withholding
}
```

### SubmissionRequest

```typescript
interface SubmissionRequest {
  transmitterId: string;          // TCC or transmitter ID
  softwareId: string;             // Software identifier
  formType: FormType;             // Form type
  submissionType: SubmissionType; // 'O' (Original) or 'C' (Correction)
  taxYear: number;                // Tax year (e.g., 2024)
  originalReceiptId?: string;     // Receipt ID of original (for corrections)
  sequenceNumber?: string;        // Sequence number (optional)
  filer: FilerInfo;               // Filer information
  payees: PayeeRecord[];          // Payee records (max 1000)
}
```

---

## Best Practices

### 1. Always Use Transmission Check

Validate before submitting to catch errors early:

```typescript
const validationResult = await irsApi.transmissionCheck(submission);

if (!validationResult.valid) {
  // Handle errors
  return;
}

// Only submit if validation passes
const receipt = await irsApi.submitBatch(submission);
```

### 2. Poll with Progress Callback

Provide user feedback during long-running operations:

```typescript
await irsApi.pollSubmissionStatus(
  receiptId,
  (status) => {
    updateUI({
      status: status.status,
      progress: `${status.acceptedCount}/${status.recordCount} records processed`,
    });
  }
);
```

### 3. Handle Errors Gracefully

Distinguish between validation errors and system errors:

```typescript
try {
  await irsApi.submitBatch(submission);
} catch (error) {
  if (error instanceof IrsApiError) {
    if (error.status === 400) {
      // Validation error - show field-level errors
      displayValidationErrors(error.details.errors);
    } else if (error.status >= 500) {
      // System error - retry with backoff
      retryWithBackoff(() => irsApi.submitBatch(submission));
    }
  }
}
```

### 4. Batch TIN Validation

Validate multiple TINs at once for better performance:

```typescript
// Good - Single batch request
const results = await irsApi.validateTinBatch({
  requests: payees.map(p => ({ tin: p.tin, name: p.name })),
});

// Bad - Multiple individual requests
for (const payee of payees) {
  await irsApi.validateTin({ tin: payee.tin, name: payee.name });
}
```

### 5. Use Helpers for Formatting

Ensure consistent TIN formatting:

```typescript
import { formatEIN, formatSSN, getTINType } from './services/irsApiClient';

// Format based on detected type
const tin = getTINType(rawTin) === 'EIN'
  ? formatEIN(rawTin)
  : formatSSN(rawTin);
```

---

## Testing

### Mock Client for Tests

```typescript
import { IrsApiClient } from './services/irsApiClient';

// Create test client
const testClient = new IrsApiClient('http://localhost:3001/api/irs');

// Mock authentication
await testClient.setAuth('T12345');

// Test submission
const receipt = await testClient.submitBatch(testSubmission);
expect(receipt.receiptId).toBeDefined();
```

### Unit Test Example

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { IrsApiClient } from './services/irsApiClient';

describe('IrsApiClient', () => {
  let client: IrsApiClient;

  beforeEach(() => {
    client = new IrsApiClient();
  });

  it('should format EIN correctly', () => {
    const formatted = formatEIN('123456789');
    expect(formatted).toBe('12-3456789');
  });

  it('should validate TIN format', () => {
    expect(validateTINFormat('12-3456789')).toBe(true);
    expect(validateTINFormat('123-45-6789')).toBe(true);
    expect(validateTINFormat('invalid')).toBe(false);
  });

  it('should detect TIN type', () => {
    expect(getTINType('12-3456789')).toBe('EIN');
    expect(getTINType('123-45-6789')).toBe('SSN');
  });
});
```

---

## Performance

### Expected Response Times

| Method | p50 | p95 | p99 |
|--------|-----|-----|-----|
| `healthCheck()` | 50ms | 200ms | 500ms |
| `submitBatch()` | 2s | 5s | 10s |
| `getSubmissionStatus()` | 100ms | 500ms | 1s |
| `validateTin()` | 200ms | 1s | 2s |
| `validateTinBatch()` (50 TINs) | 2s | 5s | 10s |
| `transmissionCheck()` | 500ms | 2s | 5s |

### Optimization Tips

**Batch Operations**:
- Use `validateTinBatch()` instead of multiple `validateTin()` calls
- Submit up to 1000 payees per batch (don't split unnecessarily)

**Status Polling**:
- Use longer intervals for large batches (5-10 seconds)
- Set reasonable timeouts (5-10 minutes for 1000 records)

**Caching**:
- Cache form schemas (rarely change)
- Cache TIN validation results for 24 hours

---

## References

- [IRIS A2A API Reference](./irs-api-reference.md)
- [Code Examples](./irs-code-examples.md)
- [IRS Portal Auth API](./irs-portal-auth-api.md)
- [Source Code](../../services/irsApiClient.ts)

---

## Related Documentation

- [IRIS Direct API Setup](../iris-direct-api-setup.md) - Configure JWT credentials for direct mode
- [Portal Authentication](../irs-portal-authentication.md) - Portal login automation
- [Developer Resources](./iris-developer-resources.md) - Official IRS documentation
