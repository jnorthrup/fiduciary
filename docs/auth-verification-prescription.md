# Authentication Verification Prescription
## Remote Verification of Google Chrome Profile Cookie Login

**Document Version:** 1.0  
**Date:** 2026-01-21  
**Author:** Antigravity AI Assistant  
**Patient:** Development Environment — fiduciary-prod  

---

## Page 1: Diagnosis & Prerequisites

### 1.1 Objective

Remotely verify that the Google Chrome profile cookie-based authentication is functioning correctly for the `fiduciary` application during active development sessions.

### 1.2 Scope

This prescription covers:
- Firebase Authentication state verification
- Google OAuth session cookie persistence
- ID Token acquisition and validation
- Server-side token verification round-trip

### 1.3 Prerequisites

Before remote verification can proceed, the following conditions must be met:

| Requirement | Verification Method | Expected State |
|-------------|---------------------|----------------|
| Chrome Profile Logged In | `chrome://settings/people` | Google account visible |
| Dev Server Running | `npm run dev` terminal | Port 5173 active |
| Backend Server Running | `npm run server:dev` terminal | Port 3001 active |
| Firebase Project | Console check | `fiduciary-prod` exists |
| OAuth Consent Screen | GCP Console | Configured, test users added |
| Authorized Domains | Firebase Console → Auth | `localhost` included |

### 1.4 Authentication Flow Under Test

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  Chrome Profile │      │  Firebase Auth  │      │  Backend Server │
│  (Cookie Store) │      │  (Google OAuth) │      │  (Token Verify) │
└────────┬────────┘      └────────┬────────┘      └────────┬────────┘
         │                        │                        │
         │  1. signInWithPopup()  │                        │
         │───────────────────────►│                        │
         │                        │                        │
         │  2. Google OAuth Flow  │                        │
         │◄──────────────────────►│                        │
         │     (uses Chrome       │                        │
         │      profile cookies)  │                        │
         │                        │                        │
         │  3. Firebase User +    │                        │
         │     ID Token returned  │                        │
         │◄───────────────────────│                        │
         │                        │                        │
         │  4. API Request w/     │                        │
         │     Bearer Token       │───────────────────────►│
         │                        │                        │
         │                        │  5. Verify ID Token    │
         │                        │◄───────────────────────│
         │                        │                        │
         │  6. Authenticated      │                        │
         │     Response           │◄───────────────────────│
         │◄────────────────────────────────────────────────│
```

### 1.5 Cookie Dependencies

The Google OAuth popup leverages the following Chrome profile cookies:

| Cookie Domain | Cookie Name | Purpose |
|---------------|-------------|---------|
| `accounts.google.com` | `GAPS` | Account chooser state |
| `accounts.google.com` | `LSID` | Login session ID |
| `accounts.google.com` | `SID` | Session identifier |
| `accounts.google.com` | `HSID` | Security cookie |
| `accounts.google.com` | `SSID` | Secure session ID |
| `accounts.google.com` | `APISID` | API session ID |
| `accounts.google.com` | `SAPISID` | Secure API session ID |

**Note:** These cookies are HttpOnly and inaccessible to JavaScript. They are used internally by the OAuth popup window.

---

## Page 2: Verification Procedure

### 2.1 Remote Verification Steps

The AI assistant will execute the following verification procedure:

#### Step 1: Browser State Inspection
```
Action: Launch browser subagent
Target: http://localhost:5173
Verify: Page loads without errors
```

#### Step 2: Pre-Auth State Check
```
Action: Inspect DOM for auth indicators
Verify: 
  - "Sign In" button is visible
  - No user avatar/email displayed
  - useAuth().user === null
```

#### Step 3: Trigger Authentication
```
Action: Click "Sign In" or "Login with Google" button
Verify: Google OAuth popup opens
Note: Popup will auto-authenticate if Chrome profile has valid session
```

#### Step 4: Post-Auth State Check
```
Action: Wait for popup to close, inspect DOM
Verify:
  - User avatar/photo displayed (from Google profile)
  - User email displayed
  - "Sign Out" button visible
```

#### Step 5: Token Acquisition Test
```
Action: Execute in browser console:
  const auth = useAuth();
  const token = await auth.getIdToken();
  console.log('Token prefix:', token?.substring(0, 20));

Verify: Token is returned (not null)
```

#### Step 6: Backend Round-Trip
```
Action: Make authenticated API call
  fetch('/api/health', {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json()).then(console.log)

Verify: Response contains { status: 'healthy' }
```

### 2.2 Success Criteria

| Test | Pass Condition |
|------|----------------|
| Page Load | HTTP 200, no console errors |
| Pre-Auth | Sign-in button visible |
| OAuth Popup | Opens to accounts.google.com |
| Cookie Auth | Auto-selects logged-in account (no password prompt) |
| Post-Auth | Photo URL populated from Google |
| Token | getIdToken() returns non-null string |
| Backend | Protected endpoint returns 200 |

### 2.3 Failure Modes & Remediation

| Failure | Cause | Remediation |
|---------|-------|-------------|
| Popup blocked | Browser settings | Allow popups for localhost |
| `redirect_uri_mismatch` | OAuth config | Add `http://localhost:5173` to authorized origins |
| `invalid_client` | Wrong client ID | Verify `VITE_FIREBASE_*` env vars |
| Password prompt despite login | Chrome profile not synced | Sign into Chrome, not just website |
| Token null | Firebase not initialized | Check console for Firebase init errors |
| 401 from backend | Token expired or invalid | Re-authenticate, check server logs |

### 2.4 Execution Authorization

To authorize remote verification, the user must:

1. **Confirm dev servers are running** (Vite on 5173, backend on 3001)
2. **Confirm Chrome profile is logged into Google**
3. **Issue command:** "Proceed with auth verification"

Upon receiving this command, the AI assistant will:
- Launch a browser session to `http://localhost:5173`
- Capture screenshot evidence at each verification step
- Report pass/fail status for each criterion
- Record the session as a WebP video artifact

### 2.5 Signature

```
Prescribed by: Antigravity AI Assistant
Date: 2026-01-21T18:09:43-06:00
Valid for: Current development session
Refills: Unlimited (re-run on demand)
```

---

**END OF PRESCRIPTION**
