# IRS e-Services Portal Authentication

## Overview

The IRS e-Services portal provides web-based access to tax professional services, including:
- Information Returns Intake System (IRIS) management
- Transcript Delivery System (TDS)
- Tax Professional Account (TPA)
- e-File Application
- Preparer Tax Identification Number (PTIN) management

**Critical Distinction**: IRS e-Services portal authentication is **separate** from IRS IRIS API authentication:

| Authentication Type | Purpose | Method | Integration |
|---------------------|---------|--------|-------------|
| **e-Services Portal** | Web portal access for manual operations | Username/Password + 2FA | Playwright automation |
| **IRIS API (A2A)** | Programmatic form submission | TCC + Bearer Token (RS256 JWT) | REST API client |

## Why Portal Automation Is Needed

While the IRIS API handles form submission, certain operations require portal access:

1. **TCC Registration/Management** - Initial TCC setup requires portal login
2. **Account Configuration** - Filer settings, authorized representatives
3. **Historical Submissions** - Viewing past submissions beyond API retention
4. **Error Resolution** - Complex rejection scenarios requiring manual intervention
5. **Audit Trail Downloads** - Compliance documentation and receipts

## Authentication Flow

### Step 1: Credential Login

**URL**: `https://la.www4.irs.gov/e-services/` (production) or `https://fire.irs.gov/` (test environment)

**Form Fields**:
- Username (email or username)
- Password

**Response**:
- Success → Redirect to 2FA selection
- Failure → Error message (invalid credentials, account locked, etc.)

### Step 2: Two-Factor Authentication

IRS e-Services supports multiple 2FA methods:

| Method | Code | Delivery | Typical Use |
|--------|------|----------|-------------|
| SMS | 6-digit numeric | Text message to registered phone | Most common |
| Email | 6-digit numeric | Email to registered address | Backup method |
| Authenticator App | 6-digit TOTP | Google Authenticator, Authy, etc. | Preferred for security |
| Backup Codes | 8-character alphanumeric | Pre-generated recovery codes | Emergency access |

**Process**:
1. User selects 2FA method
2. IRS sends code to selected delivery channel
3. User enters code within time window (typically 5 minutes)
4. IRS validates code
5. Session established with cookie authentication

### Step 3: Session Management

**Session Cookie**: `JSESSIONID` (typically)

**Session Duration**:
- Active session: 30 minutes of inactivity timeout
- Maximum session: 8 hours absolute timeout
- Concurrent sessions: Allowed (multiple browsers/devices)

**Session Storage Format**:
```json
{
  "cookies": [
    {
      "name": "JSESSIONID",
      "value": "...",
      "domain": ".irs.gov",
      "path": "/",
      "expires": 1234567890,
      "httpOnly": true,
      "secure": true,
      "sameSite": "Lax"
    }
  ],
  "origins": [
    {
      "origin": "https://la.www4.irs.gov",
      "localStorage": [],
      "sessionStorage": []
    }
  ]
}
```

## Playwright Automation Strategy

### Architecture

```
IRSLoginModal (UI)
     ↓
IRSPortalClient (Service)
     ↓
Playwright Browser Context
     ↓
IRS e-Services Portal
```

### Session Persistence

**Storage Location**: `test/session-storage/irs-eservices-{username}.json`

**Session Reuse Pattern**:
1. Check for existing valid session file
2. If valid, restore cookies to browser context
3. If expired/invalid, perform fresh login
4. Save new session on successful authentication

**Benefits**:
- Avoid 2FA prompt on every test run
- Faster test execution
- Reduce SMS/email noise
- Preserve session across test runs

### Time-Series Session Recording

**Recording Format**: `test/session-storage/recordings/{session-id}/`

**Captured Data**:
- Request/response pairs (sanitized)
- DOM snapshots at key states
- Network timing data
- Console logs
- Screenshot timeline

**Use Cases**:
1. **Correctness Validation** - Replay session to verify expected state transitions
2. **Debugging** - Investigate failed operations with full context
3. **Compliance Audit** - Demonstrate proper handling of sensitive operations
4. **Performance Analysis** - Identify slow operations in web flow

**Recording Schema**:
```typescript
interface SessionRecording {
  sessionId: string;
  username: string;
  startTime: string;
  endTime: string;
  events: SessionEvent[];
}

interface SessionEvent {
  timestamp: string;
  type: 'navigation' | 'click' | 'input' | 'request' | 'response' | 'screenshot';
  data: any;
  screenshot?: string; // base64 or file path
}
```

## Security Considerations

### Credential Storage

**DO NOT**:
- Commit credentials to git
- Store credentials in plain text
- Log credentials in console or files

**DO**:
- Use environment variables for test credentials
- Encrypt session storage files at rest
- Sanitize logs (redact TIN, passwords, tokens)
- Rotate test credentials regularly

**Environment Variables**:
```bash
# .env (never commit)
IRS_ESERVICES_USERNAME=testuser@example.com
IRS_ESERVICES_PASSWORD=SecurePassword123!
IRS_ESERVICES_2FA_METHOD=app  # sms, email, app, backup
```

### Session Hijacking Protection

1. **Validate session on each use** - Check expiry before reuse
2. **Single-user sessions** - Don't share session files across users
3. **Secure file permissions** - `chmod 600` on session storage files
4. **Encryption at rest** - Encrypt session JSON with AES-256

### OFAC/Compliance

Portal access may trigger IRS monitoring for:
- Unusual access patterns
- Geographic anomalies (VPN detection)
- High-frequency operations
- Automated bot behavior

**Mitigation**:
- Use realistic timing delays between operations
- Randomize interaction patterns
- Set human-like user agent strings
- Avoid parallel automation from same IP

## Error Handling

### Common Authentication Errors

| Error | Cause | Resolution |
|-------|-------|------------|
| Invalid credentials | Wrong username/password | Verify credentials in secure vault |
| Account locked | Too many failed attempts | Wait 30 minutes or contact IRS |
| 2FA code expired | Code entered after 5-minute window | Request new code |
| 2FA code invalid | Incorrect code or already used | Verify TOTP sync, request new code |
| Session expired | Inactive >30 minutes or >8 hours total | Re-authenticate |
| Concurrent session limit | Too many active sessions | Close other sessions first |

### Retry Strategy

**Exponential Backoff**:
```typescript
const retryDelays = [1000, 2000, 4000, 8000]; // milliseconds
for (let i = 0; i < retries; i++) {
  try {
    await operation();
    break;
  } catch (error) {
    if (i === retries - 1) throw error;
    await sleep(retryDelays[i]);
  }
}
```

**Circuit Breaker**:
- After 3 consecutive failures, stop automation
- Require manual intervention
- Log detailed error context for debugging

## Implementation Files

| File | Purpose |
|------|---------|
| `services/iris-portal-client.ts` | Core Playwright automation service |
| `services/iris-portal-client.test.ts` | Unit tests for portal client |
| `test/e2e/irs-portal-auth.spec.ts` | E2E authentication tests |
| `services/session-recorder.ts` | Time-series session recording |
| `services/session-storage.ts` | Session persistence and encryption |
| `components/IRSLoginModal.tsx` | UI component (already exists) |

## Integration with IRIS API

Portal authentication and API authentication work together:

1. **Initial Setup** (Portal):
   - User logs into e-Services portal via Playwright
   - Navigates to IRIS A2A section
   - Generates TCC (Transmission Control Code)
   - Downloads bearer token (JWT)

2. **Ongoing Operations** (API):
   - TCC + bearer token used for API authentication
   - No portal access needed for standard submissions
   - API handles all form submission workflows

3. **Maintenance** (Portal):
   - TCC renewal (annually)
   - Configuration changes
   - Historical data retrieval

## Testing Strategy

### Unit Tests (Vitest)
- Session storage/retrieval
- Credential validation
- Error handling
- Session expiry logic

### E2E Tests (Playwright)
- Full login flow (credentials → 2FA → success)
- Session persistence/reuse
- Multiple 2FA methods
- Error scenarios (invalid credentials, expired codes)
- Session timeout handling

### Integration Tests
- IRSLoginModal → IRSPortalClient interaction
- TCC retrieval flow
- Bearer token download

## Performance Targets

| Operation | Target | Measurement |
|-----------|--------|-------------|
| Login (no session) | <10 seconds | Full authentication flow |
| Login (cached session) | <2 seconds | Session restoration |
| 2FA code entry | <5 seconds | Code input to validation |
| TCC retrieval | <15 seconds | Portal navigation to TCC download |
| Session recording overhead | <10% | Performance impact vs. no recording |

## Compliance Requirements

### IRS Record Retention

Portal access logs must be retained for **7 years** per IRS regulations.

**Required Log Data**:
- Authentication timestamps
- Operations performed
- User identifiers
- IP addresses (if available)
- Success/failure status

**Log Format** (example):
```json
{
  "timestamp": "2026-01-13T17:42:00Z",
  "event": "portal_login",
  "username": "testuser@example.com",
  "method": "2fa_sms",
  "status": "success",
  "session_id": "abc123...",
  "ip_address": "203.0.113.42"
}
```

### Audit Trail

Each portal operation should:
1. Log entry in audit database
2. Capture screenshot at critical states
3. Record session event for replay capability
4. Generate compliance report on demand

## References

- [IRS e-Services Registration](https://www.irs.gov/e-file-providers/e-services-online-tools-for-tax-professionals)
- [IRIS A2A Developer Guide](https://fire.irs.gov/iris/developer)
- [Playwright Authentication Guide](https://playwright.dev/docs/auth)
- [NIST Digital Identity Guidelines (SP 800-63B)](https://pages.nist.gov/800-63-3/sp800-63b.html)
- [IRS Publication 4557: Safeguarding Taxpayer Data](https://www.irs.gov/pub/irs-pdf/p4557.pdf)

## Next Steps

1. ✅ Install Playwright (completed)
2. ⏳ Implement IRSPortalClient service
3. ⏳ Add session persistence with encryption
4. ⏳ Implement time-series session recorder
5. ⏳ Integrate with IRSLoginModal component
6. ⏳ Write comprehensive test suite
7. ⏳ Add audit logging and compliance reporting
