# IRS Portal Authentication API Reference

Backend API endpoints for IRS e-Services portal authentication using Playwright automation.

## Overview

These endpoints provide programmatic access to IRS e-Services portal authentication. They wrap the Playwright-based `IRSPortalClient` service to handle username/password login with 2FA.

**Base URL**: `/api/irs-portal/auth`

**Authentication Flow**:
1. POST `/login` - Initiate login with username/password
2. POST `/2fa` - Submit 2FA code to complete authentication
3. Session established with authenticated cookies

---

## Endpoints

### 1. Initiate Login

Begin IRS e-Services portal authentication with username and password.

```http
POST /api/irs-portal/auth/login
Content-Type: application/json
```

**Request Body**:
```json
{
  "username": "testuser@example.com",
  "password": "SecurePassword123!"
}
```

**Parameters**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `username` | string | Yes | IRS e-Services username or email |
| `password` | string | Yes | IRS e-Services password |

**Response (200 OK - Session Reused)**:
```json
{
  "sessionId": "session-abc123...",
  "status": "authenticated",
  "reused": true,
  "expiresAt": 1736784000000
}
```

**Response (200 OK - New Session)**:
```json
{
  "sessionId": "session-abc123...",
  "status": "awaiting_2fa",
  "available2FAMethods": ["sms", "email", "app"]
}
```

**Response (401 Unauthorized - Invalid Credentials)**:
```json
{
  "error": "invalid_credentials",
  "message": "Invalid username or password."
}
```

**Response (401 Unauthorized - Account Locked)**:
```json
{
  "error": "account_locked",
  "message": "Account is locked due to too many failed attempts."
}
```

**Response (400 Bad Request)**:
```json
{
  "error": "missing_username",
  "message": "Username is required"
}
```

**Response (504 Gateway Timeout)**:
```json
{
  "error": "timeout",
  "message": "Failed to reach IRS portal. Please try again."
}
```

**Error Codes**:

| Code | Status | Description |
|------|--------|-------------|
| `missing_username` | 400 | Username not provided |
| `missing_password` | 400 | Password not provided |
| `invalid_credentials` | 401 | Wrong username or password |
| `account_locked` | 401 | Account locked after failed attempts |
| `timeout` | 504 | Cannot reach IRS portal |
| `2fa_not_available` | 500 | 2FA prompt not detected |
| `login_failed` | 500 | Generic login failure |
| `internal_error` | 500 | Server error |

---

### 2. Submit 2FA Code

Complete authentication by submitting the 2FA verification code.

```http
POST /api/irs-portal/auth/2fa
Content-Type: application/json
```

**Request Body**:
```json
{
  "sessionId": "session-abc123...",
  "code": "123456"
}
```

**Parameters**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sessionId` | string | Yes | Session ID from login response |
| `code` | string | Yes | 6-digit 2FA code |

**Response (200 OK)**:
```json
{
  "authenticated": true,
  "sessionId": "session-abc123...",
  "expiresAt": 1736784000000,
  "cookies": [
    {
      "name": "JSESSIONID",
      "value": "...",
      "domain": ".irs.gov",
      "path": "/",
      "expires": 1736784000,
      "httpOnly": true,
      "secure": true,
      "sameSite": "Lax"
    }
  ]
}
```

**Response (401 Unauthorized - Invalid Code)**:
```json
{
  "error": "invalid_code",
  "message": "Incorrect verification code."
}
```

**Response (401 Unauthorized - Expired Code)**:
```json
{
  "error": "code_expired",
  "message": "2FA code has expired. Please request a new code."
}
```

**Response (404 Not Found)**:
```json
{
  "error": "session_not_found",
  "message": "Session not found or expired."
}
```

**Response (404 Not Found - Expired Session)**:
```json
{
  "error": "session_expired",
  "message": "Session has expired. Please start over."
}
```

**Response (400 Bad Request)**:
```json
{
  "error": "invalid_code_format",
  "message": "2FA code must be 6 digits"
}
```

**Error Codes**:

| Code | Status | Description |
|------|--------|-------------|
| `missing_session_id` | 400 | Session ID not provided |
| `missing_code` | 400 | 2FA code not provided |
| `invalid_code_format` | 400 | Code is not 6 digits |
| `session_not_found` | 404 | Invalid session ID |
| `session_expired` | 404 | Session timeout (15 minutes) |
| `invalid_session_state` | 400 | Session not awaiting 2FA |
| `invalid_code` | 401 | Incorrect code |
| `code_expired` | 401 | Code no longer valid |
| `verification_failed` | 500 | Generic verification failure |
| `internal_error` | 500 | Server error |

---

### 3. Resend 2FA Code

Request a new 2FA code (for SMS/email methods).

```http
POST /api/irs-portal/auth/2fa/resend
Content-Type: application/json
```

**Request Body**:
```json
{
  "sessionId": "session-abc123..."
}
```

**Parameters**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sessionId` | string | Yes | Session ID from login response |

**Response (200 OK)**:
```json
{
  "sent": true,
  "cooldownSeconds": 30
}
```

**Response (429 Too Many Requests)**:
```json
{
  "error": "cooldown_active",
  "message": "Please wait before requesting another code.",
  "cooldownSeconds": 15
}
```

**Response (404 Not Found)**:
```json
{
  "error": "session_not_found",
  "message": "Session not found or expired."
}
```

**Response (500 Internal Server Error)**:
```json
{
  "error": "internal_error",
  "message": "Failed to resend code."
}
```

**Error Codes**:

| Code | Status | Description |
|------|--------|-------------|
| `missing_session_id` | 400 | Session ID not provided |
| `session_not_found` | 404 | Invalid session ID |
| `cooldown_active` | 429 | Must wait 30 seconds between resends |
| `internal_error` | 500 | Resend operation failed |

---

### 4. Get Session Status

Retrieve the current status and metadata for an authentication session.

```http
GET /api/irs-portal/auth/session/:sessionId
```

**URL Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `sessionId` | string | Session ID from login response |

**Response (200 OK - Active Session)**:
```json
{
  "sessionId": "session-abc123...",
  "status": "awaiting_2fa",
  "username": "testuser@example.com",
  "createdAt": 1736783000000,
  "expiresAt": 1736783900000
}
```

**Response (200 OK - Expired Session)**:
```json
{
  "sessionId": "session-abc123...",
  "status": "expired",
  "expiresAt": 1736783900000
}
```

**Response (404 Not Found)**:
```json
{
  "error": "session_not_found",
  "message": "Session not found or expired."
}
```

**Session Status Values**:

| Status | Description |
|--------|-------------|
| `initializing` | Login in progress |
| `awaiting_2fa` | Waiting for 2FA code submission |
| `authenticated` | Successfully authenticated |
| `expired` | Session timeout reached |

---

### 5. Delete Session

Delete an authentication session and clean up browser resources.

```http
DELETE /api/irs-portal/auth/session/:sessionId
```

**URL Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `sessionId` | string | Session ID to delete |

**Response (200 OK)**:
```json
{
  "deleted": true
}
```

**Response (404 Not Found)**:
```json
{
  "error": "session_not_found",
  "message": "Session not found."
}
```

---

## Data Types

### Session Object

```typescript
interface AuthSession {
  id: string;                   // Unique session identifier
  username: string;              // IRS e-Services username
  status: SessionStatus;         // Current session state
  createdAt: number;             // Unix timestamp (milliseconds)
  expiresAt: number;             // Unix timestamp (milliseconds)
  available2FAMethods?: string[]; // Available 2FA methods
  sessionData?: {                // Authenticated session data
    cookies: Cookie[];
  };
  lastResend?: number;           // Last 2FA resend timestamp
}

type SessionStatus =
  | 'initializing'
  | 'awaiting_2fa'
  | 'authenticated'
  | 'expired';
```

### Cookie Object

```typescript
interface Cookie {
  name: string;       // Cookie name (e.g., "JSESSIONID")
  value: string;      // Cookie value
  domain: string;     // Cookie domain (e.g., ".irs.gov")
  path: string;       // Cookie path (e.g., "/")
  expires: number;    // Unix timestamp
  httpOnly: boolean;  // HTTP-only flag
  secure: boolean;    // Secure flag
  sameSite: string;   // SameSite policy
}
```

---

## Session Lifecycle

### Timeline

```
0ms: POST /login
     └→ Session created (status: initializing)
     └→ Playwright navigates to IRS portal
     └→ Credentials submitted
     └→ 2FA prompt detected

5000ms: Response (status: awaiting_2fa)
        └→ Session expires in 15 minutes

10000ms: POST /2fa
         └→ 2FA code submitted
         └→ Authentication successful

12000ms: Response (status: authenticated)
         └→ Session expires in 8 hours
         └→ Cookies returned to client

8 hours: Session expires
         └→ Requires new login
```

### Session Expiration

| Session State | Expiration |
|---------------|------------|
| `awaiting_2fa` | 15 minutes from creation |
| `authenticated` | 8 hours from authentication |

Sessions are automatically cleaned up every 60 seconds.

---

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST `/login` | 5 attempts | Per 15 minutes (per username) |
| POST `/2fa` | 3 attempts | Per session |
| POST `/2fa/resend` | 1 request | Per 30 seconds |

Exceeding rate limits results in:
- `429 Too Many Requests` response
- Exponential backoff required

---

## Security

### Authentication Session Storage

Sessions are stored in-memory (Map) on the backend server. In production, use Redis or similar distributed storage.

**Security Features**:
- Session IDs are UUID v4 (cryptographically random)
- Passwords never stored or logged
- Session auto-cleanup on expiration
- Browser context isolated per session

### Sensitive Data Handling

**Never logged or returned**:
- Passwords
- Full 2FA codes (only validation result)
- Complete cookie values in error responses

**Sanitized logging**:
```typescript
// Bad
console.log('Login failed:', password);

// Good
console.log('Login failed for user:', username);
```

### Session Hijacking Protection

- Sessions tied to specific username
- Session IDs not predictable
- Cookies marked as `httpOnly` and `secure`
- Session reuse validates expiry

---

## Error Handling

### General Error Response Format

```json
{
  "error": "error_code",
  "message": "Human-readable error message",
  "cooldownSeconds": 30  // Optional: for rate limit errors
}
```

### Common Error Scenarios

**1. Account Locked**
```
Cause: Too many failed login attempts
Status: 401 Unauthorized
Resolution: Wait 30 minutes or contact IRS support
```

**2. Session Expired**
```
Cause: Session inactive for >15 minutes (awaiting_2fa) or >8 hours (authenticated)
Status: 404 Not Found
Resolution: Start new login flow
```

**3. Invalid 2FA Code**
```
Cause: Incorrect code or code already used
Status: 401 Unauthorized
Resolution: Request new code if needed
```

**4. Portal Timeout**
```
Cause: IRS portal unreachable or slow
Status: 504 Gateway Timeout
Resolution: Retry after delay
```

---

## Integration Examples

### React/TypeScript Client

```typescript
import { useState } from 'react';

async function loginToIRSPortal(
  username: string,
  password: string
): Promise<{ sessionId: string; cookies: Cookie[] }> {
  // Step 1: Initiate login
  const loginResponse = await fetch('/api/irs-portal/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!loginResponse.ok) {
    const error = await loginResponse.json();
    throw new Error(error.message);
  }

  const loginData = await loginResponse.json();

  // Check if session was reused
  if (loginData.status === 'authenticated') {
    return {
      sessionId: loginData.sessionId,
      cookies: loginData.cookies || [],
    };
  }

  // Step 2: Prompt user for 2FA code
  const code = await prompt2FACode(); // Your UI implementation

  // Step 3: Submit 2FA code
  const twoFactorResponse = await fetch('/api/irs-portal/auth/2fa', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: loginData.sessionId,
      code,
    }),
  });

  if (!twoFactorResponse.ok) {
    const error = await twoFactorResponse.json();
    throw new Error(error.message);
  }

  const authData = await twoFactorResponse.json();

  return {
    sessionId: authData.sessionId,
    cookies: authData.cookies,
  };
}
```

### Error Handling

```typescript
try {
  const session = await loginToIRSPortal(username, password);
  console.log('Authenticated:', session.sessionId);
} catch (error) {
  if (error.message.includes('account_locked')) {
    alert('Account locked. Please try again in 30 minutes.');
  } else if (error.message.includes('invalid_credentials')) {
    alert('Invalid username or password.');
  } else if (error.message.includes('invalid_code')) {
    alert('Incorrect 2FA code. Please try again.');
  } else {
    alert('Login failed: ' + error.message);
  }
}
```

### 2FA Code Resend

```typescript
async function resend2FACode(sessionId: string): Promise<void> {
  const response = await fetch('/api/irs-portal/auth/2fa/resend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });

  if (!response.ok) {
    const error = await response.json();

    if (error.error === 'cooldown_active') {
      alert(`Please wait ${error.cooldownSeconds} seconds before requesting another code.`);
      return;
    }

    throw new Error(error.message);
  }

  alert('New verification code sent!');
}
```

### Session Cleanup

```typescript
async function logoutIRSPortal(sessionId: string): Promise<void> {
  await fetch(`/api/irs-portal/auth/session/${sessionId}`, {
    method: 'DELETE',
  });

  console.log('Session deleted');
}
```

---

## Testing

### Unit Tests (Backend)

Test file: `server/routes/irs-portal-auth.test.js`

```javascript
describe('POST /api/irs-portal/auth/login', () => {
  it('should return 400 if username is missing', async () => {
    const response = await request(app)
      .post('/api/irs-portal/auth/login')
      .send({ password: 'test' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('missing_username');
  });

  it('should return 401 for invalid credentials', async () => {
    const response = await request(app)
      .post('/api/irs-portal/auth/login')
      .send({ username: 'wrong', password: 'wrong' });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('invalid_credentials');
  });

  it('should return sessionId for valid credentials', async () => {
    const response = await request(app)
      .post('/api/irs-portal/auth/login')
      .send({ username: 'test@example.com', password: 'ValidPass123!' });

    expect(response.status).toBe(200);
    expect(response.body.sessionId).toBeDefined();
    expect(response.body.status).toBe('awaiting_2fa');
  });
});
```

### E2E Tests (Playwright)

Test file: `test/e2e/irs-portal-auth-api.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test('complete authentication flow', async ({ request }) => {
  // Step 1: Login
  const loginResponse = await request.post('/api/irs-portal/auth/login', {
    data: {
      username: process.env.IRS_TEST_USERNAME,
      password: process.env.IRS_TEST_PASSWORD,
    },
  });

  expect(loginResponse.ok()).toBeTruthy();
  const loginData = await loginResponse.json();
  expect(loginData.sessionId).toBeDefined();

  // Step 2: Submit 2FA (mock code for testing)
  const twoFactorResponse = await request.post('/api/irs-portal/auth/2fa', {
    data: {
      sessionId: loginData.sessionId,
      code: '123456', // Test code
    },
  });

  expect(twoFactorResponse.ok()).toBeTruthy();
  const authData = await twoFactorResponse.json();
  expect(authData.authenticated).toBe(true);
  expect(authData.cookies).toBeDefined();
});
```

---

## Performance

### Expected Response Times

| Endpoint | p50 | p95 | p99 |
|----------|-----|-----|-----|
| POST `/login` | 3s | 8s | 12s |
| POST `/2fa` | 2s | 5s | 8s |
| POST `/2fa/resend` | 1s | 3s | 5s |
| GET `/session/:id` | 10ms | 50ms | 100ms |
| DELETE `/session/:id` | 100ms | 500ms | 1s |

### Optimization Strategies

**Session Reuse**:
- Check for existing valid session before creating new browser context
- Reduces login time from ~10s to ~2s

**Parallel Operations**:
- Multiple users can authenticate simultaneously
- Each session uses isolated browser context

**Resource Cleanup**:
- Sessions auto-deleted after expiration
- Browser contexts closed on session deletion
- Reduces memory usage over time

---

## References

- [IRS e-Services Portal](https://www.irs.gov/e-file-providers/e-services-online-tools-for-tax-professionals)
- [IRSPortalClient Implementation](../../services/iris-portal-client.ts)
- [Portal Authentication Overview](../irs-portal-authentication.md)
- [Playwright API](https://playwright.dev/docs/api/class-playwright)

---

## Related Documentation

- [IRIS A2A API Reference](./irs-api-reference.md) - Direct API authentication (TCC + JWT)
- [Code Examples](./irs-code-examples.md) - Usage patterns and examples
- [Portal Authentication Guide](../irs-portal-authentication.md) - Conceptual overview
