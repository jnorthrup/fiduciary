# IRS IRIS Developer Resources

Comprehensive list of IRS IRIS A2A API documentation, schemas, and developer resources.

## Official IRS Resources

### Core Documentation

| Resource | URL | Description |
|----------|-----|-------------|
| **IRIS Portal** | https://www.irs.gov/iris | Main IRIS information page |
| **Publication 5718** | [PDF](https://www.irs.gov/pub/irs-pdf/p5718.pdf) | IRIS A2A Specifications |
| **Get API Client ID** | [Link](https://www.irs.gov/tax-professionals/get-an-api-client-id) | OAuth/JWT credentials setup |
| **Schemas & Business Rules** | [Link](https://www.irs.gov/e-file-providers/iris-schemas-and-business-rules) | XML schemas (requires TCC) |
| **E-file with IRIS** | [Link](https://www.irs.gov/filing/e-file-information-returns-with-iris) | General filing information |

### Help & Support

| Resource | Contact |
|----------|---------|
| **e-Services Help Desk** | 866-937-4130 |
| **IRIS Email** | irisa2a@irs.gov |

---

## Schemas and Business Rules

### Access Requirements

⚠️ **IRIS TCC Required**: To access XML schemas and business rules, you must have an IRIS Transmitter Control Code (TCC).

With an IRIS TCC, schema packages are delivered to your e-Services mailbox (Secure Object Repository - SOR).

### Tax Year 2025 Schemas

| Version | Status | ATS Date | Production Date |
|---------|--------|----------|-----------------|
| **2025v1.1** | Final | Nov 2025 | Jan 2026 |
| 2025v1.0 | Draft | Nov 2025 | Jan 2026 |

**Forms Supported (TY2025):**
1042-S, 1097-BTC, 1098, 1098-C, 1098-E, 1098-F, 1098-Q, 1098-T, 1099-A, 1099-B, 1099-C, 1099-CAP, 1099-DA, 1099-DIV, 1099-G, 1099-H, 1099-INT, 1099-K, 1099-LS, 1099-LTC, 1099-MISC, 1099-NEC, 1099-OID, 1099-PATR, 1099-Q, 1099-QA, 1099-R, 1099-S, 1099-SA, 1099-SB, 3921, 3922, 5498, 5498-ESA, 5498-QA, 5498-SA, W-2G, 8809

### Tax Year 2024 Schemas

| Version | Status | Available |
|---------|--------|-----------|
| 2024v1.2 | Current | 9/25/2025 |
| 2024v1.1 | Previous | 8/29/2024 |
| 2024v1.0 | Original | 7/18/2024 |

### Tax Year 2023 Schemas

| Version | Status | Available |
|---------|--------|-----------|
| 2023v1.4 | Current | 9/25/2025 |
| 2023v1.0 | Original | 9/11/2023 |

---

## API Endpoints

### Production Environment
```
https://api.www4.irs.gov/RIntakeAcceptanceA2A/1.0/irisa2a/v1
```

### Test Environment (ATS)
```
https://api.alt.www4.irs.gov/RIntakeAcceptanceA2A/1.0/irisa2a/v1
```

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/oauth/v2/token` | POST | Get OAuth access token |
| `/intake-acceptance` | POST | Submit transmission |
| `/transstatusorack` | POST | Get transmission status |

---

## Important Dates

### 2025-2026 Timeline

| Date | Event |
|------|-------|
| **January 10, 2025** | IRIS began accepting returns via Taxpayer Portal and A2A |
| **November 2025** | TY2025 ATS available for testing |
| **January 6, 2026** | TY2025 Production API goes live (9:00 AM ET) |
| **2026** | FIRE system shutdown (legacy system) |

---

## Working Group Meetings

IRS holds regular IRIS Working Group meetings with updates on schema changes and business rules.

| Date | Meeting Notes |
|------|--------------|
| October 8, 2025 | [PDF](https://www.irs.gov/pub/irs-efile/iris-working-group-meeting-10082025.pdf) |
| September 10, 2025 | [PDF](https://www.irs.gov/pub/irs-efile/iris-working-group-meeting-09102025.pdf) |
| August 20, 2025 | [PDF](https://www.irs.gov/pub/irs-efile/iris-working-group-meeting-08202025.pdf) |
| June 11, 2025 | [PDF](https://www.irs.gov/pub/irs-efile/iris-working-group-meeting-06112025.pdf) |
| January 15, 2025 | [PDF](https://www.irs.gov/pub/irs-efile/iris-working-group-meeting-01152025.pdf) |

---

## Technical Specifications

### Authentication

- **Grant Type**: `urn:ietf:params:oauth:grant-type:jwt-bearer`
- **Signing Algorithm**: RS256 (RSA-SHA256)
- **Token Expiry**: 15 minutes (access), 60 minutes (refresh)

### Transmission Format

- **Payload**: XML (not JSON)
- **Encoding**: UTF-8 without BOM
- **Max Size**: 100MB
- **Content-Type**: `multipart/form-data`

### UTID Format

```
UUID:IRIS:TCC::A
```

Example: `da20a4de-1357-11ed-861d-0242ac120002:IRIS:D1234::A`

### Status Codes

| Code | Description |
|------|-------------|
| `Accepted` | Transmission processed and accepted |
| `Rejected` | Transmission rejected |
| `Processing` | Still being processed |
| `Partially Accepted` | Some submissions accepted, some rejected |
| `Accepted with Errors` | Accepted with non-fatal errors |
| `Not Found` | Receipt ID/UTID not found |

---

## Developer Setup

### 1. Get API Client ID

1. Visit [Get an API Client ID](https://www.irs.gov/tax-professionals/get-an-api-client-id)
2. Complete the application in e-Services
3. Receive your API Client ID

### 2. Generate RSA Key Pair

```bash
# Generate private key
openssl genrsa -out iris-private-key.pem 2048

# Extract public key for JWK
openssl rsa -in iris-private-key.pem -pubout -out iris-public-key.pem
```

### 3. Upload JWK

1. Convert public key to JWK format
2. Upload to your API Client ID application
3. Note the `kid` (Key ID)

### 4. Get TCC

1. Apply for IRIS Transmitter Control Code
2. Test TCC starts with 'T'
3. Production TCC starts with 'D'

### 5. Configure Environment

```bash
VITE_IRIS_DIRECT_API=true
VITE_IRS_CLIENT_ID=your-client-id
VITE_IRS_USER_ID=your-iris-user-id
VITE_IRS_TCC=D1234
VITE_IRS_PRIVATE_KEY="PEM..."
VITE_IRS_KEY_ID=your-key-id
VITE_IRS_TEST_MODE=true
```

---

## External References

- [Sovos: FIRE to IRIS Transition](https://sovos.com/blog/trr/irs-fire-system-iris-transition/)
- [Tax Data Exchange: IRIS Overview](https://taxdataexchange.org/irs-information-return-intake-system.html)

---

## Sources

- [Publication 5718 - IRIS A2A Specifications](https://www.irs.gov/pub/irs-pdf/p5718.pdf)
- [IRIS Schemas and Business Rules](https://www.irs.gov/e-file-providers/iris-schemas-and-business-rules)
- [Get an API Client ID](https://www.irs.gov/tax-professionals/get-an-api-client-id)
- [E-file with IRIS](https://www.irs.gov/filing/e-file-information-returns-with-iris)
