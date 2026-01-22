# Specification: NACHA Account Management System

**Track ID:** nacha_accounts_20260120
**Status:** Active
**Priority:** P0 (Core NACHA + Ledger functionality)

## Overview

A mobile-first account management system for NACHA (ACH) file generation and submission. Enables users to manage bank accounts, generate ACH files compliant with NACHA operating rules, and persist submission history via Google Cloud Storage Write-Ahead Log.

## Scope

**In Scope:**
- Mobile-first account table with keyboard navigation
- NACHA file generation (94-character fixed width format)
- GCS Write-Ahead Log for submission persistence
- Gmail identity integration for multi-tenant storage

**Out of Scope (Retired):**
- IRS/tax filing (1099, W2, IRIS, MeF)
- CRM features
- Real estate/closing
- DTCC/collateral
- Fiduciary actions
- Gift tax, Credit defense, Chancery filings
- MARAD, Edgar research
- BSO, Administrative process
- Teach mode

---

## Phase 1: Core Account Table Navigation

### 1.1 Account Table Component

**Requirements:**

#### Mobile-First Table UI
- Create `AccountTable.tsx` component optimized for mobile devices
- Implement virtualized scrolling for large account datasets
- Support inline row editing with validation
- Touch-friendly swipe gestures (left/right actions)

#### Keyboard Navigation
- Arrow keys (up/down/left/right) for cell navigation
- Enter key to activate inline editing
- Escape key to cancel editing
- Tab key for sequential field navigation

#### Navigation State
- Selected account ID for detail views
- Cursor index for keyboard positioning
- Pagination state for large datasets

### 1.2 Ledger Store Integration

**Requirements:**
- Extend existing `useLedgerStore` with account navigation state
- Add `selectedAccountId` and `cursorIndex` to store interface
- Cursor-based pagination via `accountService.ts`
- Event handlers at container level for keyboard/touch

---

## Phase 2: NACHA File Generation Service

### 2.1 NACHA Record Types

**Requirements:**

#### File Format
- 94-character fixed width per line
- File Header (Record Type 1)
- Batch Header (Record Type 5)
- Entry Detail (Record Type 6)
- Batch Control (Record Type 8)
- File Control (Record Type 9)

#### Record Specifications

**File Header (Record Type 1):**
- Positions 1-1: Record type "1"
- Positions 2-3: Priority code (01)
- Positions 4-10: Immediate destination (routing number)
- Positions 11-17: Immediate origin (routing number)
- Positions 18-23: File creation date (YYMMDD)
- Positions 24-29: File creation time (HHMM)
- Positions 30-33: File ID modifier
- Positions 35-37: Record size (094)
- Positions 38-39: Blocking factor (10)
- Positions 40-42: Format code (1)
- Positions 44-53: Immediate destination name
- Positions 54-63: Immediate origin name
- Positions 94-94: Record type code "9"

**Batch Header (Record Type 5):**
- Positions 1-1: Record type "5"
- Positions 2-3: Service class code (200, 220, 225)
- Positions 4-10: Company identification
- Positions 11-13: Standard entry class code (PPD, CCD, WEB)
- Positions 14-29: Company entry description
- Positions 30-37: Company descriptive date
- Positions 38-47: Effective entry date
- Positions 54-63: Originating DFI name
- Positions 65-72: Batch number

**Entry Detail (Record Type 6):**
- Positions 1-1: Record type "6"
- Positions 2-3: Transaction code (22, 27, 32, 37)
- Positions 4-11: Receiving DFI identification (routing number)
- Positions 12-13: Check digit
- Positions 14-29: DFI account number
- Positions 30-39: Amount (cents, right-justified, zero-filled)
- Positions 40-43: Individual identification number
- Positions 44-63: Individual name
- Positions 54-79: Discretionary data
- Positions 79-79: Addenda record indicator
- Positions 80-84: Trace number
- Positions 87-94: Batch number

**Batch Control (Record Type 8):**
- Sum of all entry detail amounts
- Hash of all routing numbers
- Count of entry detail records
- Company identification
- Batch number

**File Control (Record Type 9):**
- Total debit amount
- Total credit amount
- Batch count
- Block count
- Entry/addenda count

### 2.2 Validation & Export

**Requirements:**

#### Routing Number Validation
- ABA checksum algorithm (7-digit mod-10 calculation)
- Format validation (exactly 9 digits)
- Real-time validation via Plaid API

#### Field Validation
- Amount limits (max $99,999,999.99 per entry)
- Character restrictions (alphanumeric only where specified)
- Length validation for all fixed-width fields

#### SEC Code Compliance
- PPD (Prearranged Payment and Deposit)
- CCD (Cash Concentration and Disbursement)
- WEB (Internet-initiated entries)

#### Export Functionality
- Generate `.ACH` file for download
- Base64 encode for storage
- Submit to GCS with traceability metadata
- Include timestamp, user identity, and checksum

---

## Phase 3: GCS WAL + Redux Timeseries

### 3.1 Write-Ahead Log Extension

**Requirements:**

#### Append-Only Log
- `appendAction(uid, component, action)` - Append immutable action
- `replayActions(uid, component, reducer)` - Replay from WAL
- `compactWal(uid, snapshot)` - Merge log into snapshot

#### Storage Structure
```
gs://<bucket>/users/<uid>/wal/<component>/<date>/actions.jsonl
gs://<bucket>/users/<uid>/snapshots/<component>/<timestamp>.json
```

### 3.2 Redux-Style Reducer

**Requirements:**

#### Action Types
- `CREATE_ACCOUNT`
- `UPDATE_ACCOUNT`
- `DELETE_ACCOUNT`
- `SUBMIT_NACHA`
- `UPDATE_BALANCE`

#### Reducer Interface
```typescript
type LedgerAction =
  | { type: 'CREATE_ACCOUNT'; payload: Account }
  | { type: 'UPDATE_ACCOUNT'; payload: { id: string; changes: Partial<Account> } }
  | { type: 'SUBMIT_NACHA'; payload: NACHASubmission }

interface LedgerState {
  accounts: Account[]
  submissions: NACHASubmission[]
  cursor: { index: number; accountId: string }
}

function ledgerReducer(state: LedgerState, action: LedgerAction): LedgerState
```

#### Serialization
- JSON serialization for GCS storage
- Type guards for deserialization
- Version migration support

---

## Phase 4: Lattice-Based Graph & Blackboard

### 4.1 Blackboard Architecture

**Requirements:**

#### Blackboard Node Interface
```typescript
interface BlackboardNode<T> {
  id: string
  dependencies: string[]  // Node IDs that must hydrate first
  hydrate(): Promise<T>
  notify(change: T): void
}
```

#### Blackboard Class
- Pub/sub for data change notifications
- Dependency resolution for node hydration
- Automatic propagation on upstream changes

#### Data Channels
- **Entity Channel** (base) - Business entities
- **Account Channel** (depends on Entity) - Bank accounts
- **Transaction Channel** (depends on Account) - Journal entries
- **Submission Channel** (depends on Transaction + Bank) - NACHA submissions

---

## Phase 5: Gmail Identity Integration

### 5.1 Identity Binding

**Requirements:**

#### Identity Resolution
- `getUserIdentity()` - Extract UID from Gmail OAuth token
- `getStoragePrefix(uid)` - Generate GCS path prefix

#### Route Protection
- Verify JWT on all `/api/ledger/*` endpoints
- Extract UID from token for GCS path resolution
- Reject unauthorized requests with 403

---

## Verification Checkpoints

### Unit Tests
- [ ] `nachaService.ts` - All record types, validation
- [ ] `gcs-persistence.js` - WAL append, replay, compact
- [ ] `AccountTable.tsx` - Navigation, editing, gestures
- [ ] `walReducer.ts` - All action types

### Integration Tests
- [ ] Login → Create Account → NACHA submission stored in GCS
- [ ] WAL replay restores ledger state
- [ ] Identity gating prevents cross-user access

### Manual Verification
- [ ] AccountTable renders and navigates on mobile
- [ ] Generated NACHA file validates with external tool
- [ ] GCS contains submission with correct metadata

---

## Technical Constraints

### Frontend
- React 19.2.3 with TypeScript 5.8.2
- Tailwind CSS for styling
- Lucide React for icons

### Backend
- Node.js with Express 4.18.2
- Firebase Auth for identity
- Google Cloud Storage for persistence

### Testing
- Vitest for unit tests
- Target >80% code coverage
- Mobile testing required for UI components

---

## Dependencies

### Existing Code
- `useLedgerStore` - State management
- `accountService.ts` - Account CRUD
- `GmailOAuthService` - Authentication
- `nachaService.ts` - NACHA generation (Phase 2 only)

### External APIs
- Plaid - Routing number validation
- Google Cloud Storage - Submission persistence
- Firebase Auth - Identity verification
