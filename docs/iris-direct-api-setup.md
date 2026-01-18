# IRS IRIS Direct API Configuration

This project supports direct communication with the IRS IRIS A2A API, bypassing the need for a backend proxy server.

## Architecture

Two modes are supported:

1. **Proxy Mode** (default): Routes through `localhost:3001/api/irs` backend server
2. **Direct Mode**: Uses OAuth 2.0 JWT authentication to communicate directly with IRS

## Direct API Setup

### Prerequisites

To use Direct Mode, you need credentials from IRS e-Services:

1. **API Client ID** - Obtained from [IRS e-Services Application](https://www.irs.gov/tax-professionals/get-an-api-client-id)
2. **IRIS User ID** - Full user ID (e.g., "dasmith-345870")
3. **Transmitter Control Code (TCC)** - 5-character code starting with 'D' (production) or 'T' (test)
4. **RSA Private Key** - PEM format private key for JWT signing
5. **Key ID** - Matches the JWK uploaded to your API Client ID application

### Environment Variables

Create a `.env.local` file in the project root:

```bash
# Enable Direct IRS API Mode
VITE_IRIS_DIRECT_API=true

# OAuth Credentials
VITE_IRS_CLIENT_ID=your-client-id-from-irs
VITE_IRS_USER_ID=your-full-iris-user-id
VITE_IRS_TCC=D1234
VITE_IRS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
-----END PRIVATE KEY-----"
VITE_IRS_KEY_ID=your-key-id-from-jwk

# Test Mode (true for ATS, false for production)
VITE_IRS_TEST_MODE=true
```

### Generating RSA Keys

Generate an RSA key pair for JWT signing:

```bash
# Generate private key
openssl genrsa -out iris-private-key.pem 2048

# Extract public key for JWK upload
openssl rsa -in iris-private-key.pem -pubout -out iris-public-key.pem

# Convert public key to JWK format
# Use https://ruderich.org/simon/tools/ssh-jwk or similar tool
```

### JWK Upload

1. Go to your API Client ID application in IRS e-Services
2. Upload the public key as a JWK (JSON Web Key)
3. Note the `kid` (Key ID) from the JWK - this goes in `VITE_IRS_KEY_ID`

## IRS Environments

### Test Environment (ATS - Assurance Testing System)
- URL: `https://api.alt.www4.irs.gov`
- Use for testing before production
- Requires TCC starting with 'T'

### Production Environment
- URL: `https://api.www4.irs.gov`
- For actual submissions to IRS
- Requires TCC starting with 'D'

Set `VITE_IRS_TEST_MODE=false` for production.

## How It Works

1. **Authentication**: The client generates two JWTs (client + user) signed with your private key
2. **Token Exchange**: JWTs are exchanged for an OAuth access token (15-minute expiry)
3. **Submission**: XML payload is submitted via multipart/form-data
4. **Polling**: Status is polled until terminal state (Accepted/Rejected)

## XML Generation

The adapter generates IRIS-compliant XML from your `SubmissionRequest`. The XML structure follows IRS Publication 5718 specifications.

## Security Notes

- Private keys are stored in environment variables and never exposed to the browser
- JWTs are generated client-side using the Web Crypto API
- All communication uses HTTPS/TLS
- Access tokens expire after 15 minutes and are refreshed automatically

## Troubleshooting

### "IRIS client not configured"
- Ensure `VITE_IRIS_DIRECT_API=true`
- Verify all required environment variables are set
- Check that your private key is valid PEM format

### "JWT validation failed"
- Verify `VITE_IRS_KEY_ID` matches the JWK uploaded to IRS
- Check that your private key corresponds to the public key in the JWK
- Ensure system time is synchronized (JWT timestamps are strict)

### "Polling timeout"
- IRS processing can take up to 30 minutes
- Check status later using the Receipt ID

## References

- [IRS Publication 5718 - IRIS A2A Specifications](https://www.irs.gov/pub/irs-pdf/p5718.pdf)
- [IRIS Schemas and Business Rules](https://www.irs.gov/irisschema)
- [Get an API Client ID](https://www.irs.gov/tax-professionals/get-an-api-client-id)
