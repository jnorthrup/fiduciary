# IRS IRIS A2A API Reference

Complete reference for the IRS Information Returns Intake System Application-to-Application API.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Endpoints](#endpoints)
- [Data Types](#data-types)
- [Error Codes](#error-codes)
- [Examples](#examples)

---

## Overview

The IRS IRIS A2A API enables direct electronic filing of information returns (Forms 1099 series, W-2G, 3921, 3922, 5498 series).

**Base URLs:**
- Production: `https://api.www4.irs.gov/RIntakeAcceptanceA2A/1.0/irisa2a/v1`
- Test (ATS): `https://api.alt.www4.irs.gov/RIntakeAcceptanceA2A/1.0/irisa2a/v1`

**Key Requirements:**
- All transmissions use XML format (not JSON)
- OAuth 2.0 JWT-based authentication with RS256 signing
- Maximum payload size: 100MB
- Access token expires after 15 minutes

---

## Authentication

### OAuth 2.0 JWT Bearer Flow

IRIS uses a dual-JWT authentication mechanism:

1. **Client JWT** - Represents the application
2. **User JWT** - Represents the resource owner

Both JWTs must be signed with RS256 using keys from a JWK uploaded to your API Client ID application.

### Token Endpoint

```
POST https://api.www4.irs.gov/auth/oauth/v2/token
Content-Type: application/x-www-form-urlencoded
```

**Request Parameters:**

| Parameter | Value |
|-----------|-------|
| `grant_type` | `urn:ietf:params:oauth:grant-type:jwt-bearer` |
| `assertion` | User JWT (represents resource owner) |
| `client_assertion_type` | `urn:ietf:params:oauth:client-assertion-type:jwt-bearer` |
| `client_assertion` | Client JWT (represents client application) |

### JWT Structure

**Header:**
```json
{
  "kid": "your-key-id-from-jwk",
  "alg": "RS256"
}
```

**Payload (Client JWT):**
```json
{
  "iss": "your-api-client-id",
  "sub": "your-api-client-id",
  "aud": "https://api.irs.gov",
  "iat": 1736697600,
  "exp": 1736698500,
  "jti": "unique-jwt-id"
}
```

**Payload (User JWT):**
```json
{
  "iss": "your-api-client-id",
  "sub": "your-full-iris-user-id",
  "aud": "https://api.irs.gov",
  "iat": 1736697600,
  "exp": 1736698500,
  "jti": "unique-jwt-id"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6I...",
  "token_type": "Bearer",
  "refresh_token": "refresh_token_value",
  "expires_in": 900
}
```

---

## Endpoints

### 1. Get OAuth Token

Obtain an access token for API calls.

```
POST /auth/oauth/v2/token
```

**Request:**
```http
POST /auth/oauth/v2/token HTTP/1.1
Host: api.www4.irs.gov
Content-Type: application/x-www-form-urlencoded

grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer
&assertion=<user-jwt>
&client_assertion_type=urn%3Aietf%3Aparams%3Aoauth%3Aclient-assertion-type%3Ajwt-bearer
&client_assertion=<client-jwt>
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6I...",
  "token_type": "Bearer",
  "refresh_token": "refresh_token_value",
  "expires_in": 900
}
```

**Errors:**
| Code | Description |
|------|-------------|
| 400 | Invalid JWT or missing required fields |
| 401 | JWT validation failed |

---

### 2. Submit Transmission

Submit an IRIS information return transmission for processing.

```
POST /intake-acceptance
```

**Request:**
```http
POST /intake-acceptance HTTP/1.1
Host: api.www4.irs.gov
Authorization: Bearer <access-token>
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary

------WebKitFormBoundary
Content-Disposition: form-data; name="file"; filename="submission.xml"
Content-Type: text/xml

<?xml version="1.0" encoding="UTF-8"?>
<IRTransmission xmlns="urn:us:gov:treasury:irs:common">
  <IRTransmissionHeader>
    <TransmitterId>D1234</TransmitterId>
    <SoftwareId>SOFTWARE-001</SoftwareId>
    <TransmissionTs>2025-01-12T12:00:00Z</TransmissionTs>
  </IRTransmissionHeader>
  <IRSubmissionHeader>
    <!-- Submission data -->
  </IRSubmissionHeader>
</IRTransmission>
------WebKitFormBoundary--
```

**Response (200 OK):**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<ReceiptId>2022-68537508811-4386213b8</ReceiptId>
```

**Errors:**
| Code | Description |
|------|-------------|
| 400 | Bad request (validation failed) |
| 404 | Invalid endpoint |
| 500 | Internal server error |
| 503 | Service unavailable |

---

### 3. Get Transmission Status

Retrieve the current status and acknowledgment for a transmission.

```
POST /transstatusorack
```

**Request:**
```http
POST /transstatusorack HTTP/1.1
Host: api.www4.irs.gov
Authorization: Bearer <access-token>
Content-Type: application/xml

<?xml version="1.0" encoding="UTF-8"?>
<IRISStatusRequest>
  <SearchId>2022-68537508811-4386213b8</SearchId>
</IRISStatusRequest>
```

**Response (200 OK):**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<IRISStatusResponse>
  <SearchId>2022-68537508811-4386213b8</SearchId>
  <TCC>D1234</TCC>
  <UTID>da20a4de-1357-11ed-861d-0242ac120002:IRIS:D1234::A</UTID>
  <TransmissionStatusCd>Accepted</TransmissionStatusCd>
  <SubmissionResultGrp>
    <SubmissionId>SID-001</SubmissionId>
    <SubmissionStatusCd>Accepted</SubmissionStatusCd>
  </SubmissionResultGrp>
</IRISStatusResponse>
```

**Status Codes:**
| Status | Description |
|--------|-------------|
| `Accepted` | Transmission processed and accepted |
| `Rejected` | Transmission rejected (errors provided) |
| `Processing` | Still being processed |
| `Partially Accepted` | Some submissions accepted, some rejected |
| `Accepted with Errors` | Accepted with non-fatal errors |
| `Not Found` | Receipt ID or UTID not found |

---

## Data Types

### TransmissionStatusCd
```typescript
type TransmissionStatusCd =
  | 'Accepted'
  | 'Rejected'
  | 'Processing'
  | 'Partially Accepted'
  | 'Accepted with Errors'
  | 'Not Found';
```

### SubmissionStatusCd
```typescript
type SubmissionStatusCd =
  | 'Accepted'
  | 'Rejected'
  | 'Processing'
  | 'Accepted with Errors'
  | 'Not Found';
```

### ErrorDetail
```typescript
interface ErrorDetail {
  code: string;           // Business rule error code (e.g., "TMFST001", "S1H001")
  message: string;        // Error description
  value?: string;         // The value that caused the error
  elementPath?: string;   // XPath to the element in error
  severity?: 'Error' | 'Warning';
}
```

---

## Error Codes

### Authentication Errors

| Code | Message | Resolution |
|------|---------|------------|
| `AUTH_MISSING_TCC` | Transmitter Control Code required | Provide valid TCC |
| `AUTH_INVALID_JWT` | JWT validation failed | Check JWT signature and claims |
| `AUTH_EXPIRED_TOKEN` | Access token expired | Refresh or re-authenticate |

### Validation Errors

| Code | Message | Resolution |
|------|---------|------------|
| `TMFST001` | Invalid transmission format | Fix XML schema compliance |
| `S1H001` | Invalid TIN format | Use XX-XXXXXXX for EIN |
| `S1H002` | Missing required field | Add required field |
| `PAYEE_LIMIT` | Maximum 1000 payees exceeded | Split into multiple transmissions |

---

## Examples

### Complete Submission Flow

```typescript
import { IRISClient } from './services/iris-client';

const client = new IRISClient({
  clientId: 'your-client-id',
  userId: 'your-iris-user-id',
  tcc: 'D1234',
  privateKey: `-----BEGIN PRIVATE KEY-----
${process.env.IRS_PRIVATE_KEY}
-----END PRIVATE KEY-----`,
  keyId: 'your-key-id',
  testMode: true,
});

// 1. Authenticate
await client.authenticate();

// 2. Submit transmission
const receipt = await client.submitTransmission({
  xmlPayload: generateIRISXML(submissionData),
  taxYear: '2024',
});

console.log('Receipt ID:', receipt.receiptId);

// 3. Poll for completion
const status = await client.pollStatus(receipt.receiptId, {
  intervalMs: 30000,  // Poll every 30 seconds
  maxAttempts: 60,    // Up to 30 minutes
});

console.log('Final Status:', status.transmissionStatusCd);
```

### Error Handling

```typescript
try {
  const receipt = await client.submitTransmission({
    xmlPayload: xmlData,
    taxYear: '2024',
  });
} catch (error) {
  if (error.message.includes('TMFST001')) {
    console.error('Invalid XML format:', error.message);
  } else if (error.message.includes('AUTH')) {
    console.error('Authentication failed:', error.message);
  }
}
```

---

## References

- [Publication 5718 - IRIS A2A Specifications](https://www.irs.gov/pub/irs-pdf/p5718.pdf)
- [IRIS Schemas and Business Rules](https://www.irs.gov/irisschema)
- [Get an API Client ID](https://www.irs.gov/tax-professionals/get-an-api-client-id)
- [OpenAPI Specification](../specs/iris-a2a-openapi.yaml)
