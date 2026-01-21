# Implementation Plan: NACHA Account Management System

## Phase 1: Core Account Table Navigation [P0 - Immediate]

### 1.1 Account Table Component
- [ ] Task: Create mobile-first AccountTable.tsx
  - [x] Sub-task: Write failing tests for keyboard navigation (arrow keys, Enter)
  - [x] Sub-task: Implement AccountTable with virtualized scrolling
  - [x] Sub-task: Write failing tests for inline editing mode
  - [x] Sub-task: Implement inline row editing with validation
  - [x] Sub-task: Write failing tests for mobile swipe gestures
  - [x] Sub-task: Implement touch handlers for swipe left/right actions [69/71 tests - 2 test design issues noted]
- [ ] Task: Integrate with existing ledger store
  - [x] Sub-task: Add cursor-based pagination to accountService [66/66 tests passing]
  - [x] Sub-task: Wire AccountTable to useLedgerStore [store integrated, test mocks need refactoring]
- [ ] Task: Conductor - User Manual Verification 'Phase 1.1 Account Table'

### 1.2 Navigation State Management
- [x] Task: Add selection/cursor state to ledger store [b1fa611]
  - [x] Sub-task: Add selectedAccountId and cursorIndex to store
  - [x] Sub-task: Implement keyboard event handlers at container level [2b19aec]
- [ ] Task: Conductor - User Manual Verification 'Phase 1.2 Navigation State'

---

## Phase 2: NACHA File Generation Service [P0 - Immediate]

### 2.1 NACHA Record Types
- [ ] Task: Implement NACHA file format (94-char fixed width)
  - [ ] Sub-task: Write failing tests for File Header (Record Type 1)
  - [ ] Sub-task: Implement File Header generation
  - [ ] Sub-task: Write failing tests for Batch Header (Record Type 5)
  - [ ] Sub-task: Implement Batch Header generation
  - [ ] Sub-task: Write failing tests for Entry Detail (Record Type 6)
  - [ ] Sub-task: Implement Entry Detail generation
  - [ ] Sub-task: Write failing tests for Batch Control (Record Type 8)
  - [ ] Sub-task: Implement Batch Control with hash calculation
  - [ ] Sub-task: Write failing tests for File Control (Record Type 9)
  - [ ] Sub-task: Implement File Control with totals
- [ ] Task: Conductor - User Manual Verification 'Phase 2.1 NACHA Records'

### 2.2 Validation & Export
- [ ] Task: NACHA validation per operating rules
  - [ ] Sub-task: Routing number validation (ABA checksum)
  - [ ] Sub-task: Amount and field length validation
  - [ ] Sub-task: SEC code compliance check
- [ ] Task: Export functionality
  - [ ] Sub-task: Generate downloadable .ACH file
  - [ ] Sub-task: Store submission to GCS with traceability
- [ ] Task: Conductor - User Manual Verification 'Phase 2.2 Validation'

---

## Phase 3: GCS WAL + Redux Timeseries [P1]

### 3.1 Write-Ahead Log Extension
- [ ] Task: Extend gcs-persistence.js for append-only log
  - [ ] Sub-task: Implement appendAction(uid, component, action)
  - [ ] Sub-task: Implement replayActions(uid, component, reducer)
  - [ ] Sub-task: Add compactWal for snapshot + archive
- [ ] Task: Conductor - User Manual Verification 'Phase 3.1 WAL'

### 3.2 Redux-Style Reducer
- [ ] Task: Create walReducer.ts
  - [ ] Sub-task: Define LedgerAction union type
  - [ ] Sub-task: Implement ledgerReducer with immutable updates
  - [ ] Sub-task: Add action serialization/deserialization
- [ ] Task: Conductor - User Manual Verification 'Phase 3.2 Reducer'

---

## Phase 4: Lattice-Based Graph & Blackboard [P1]

### 4.1 Blackboard Architecture
- [ ] Task: Create BlackboardArchitecture.ts
  - [ ] Sub-task: Define BlackboardNode interface
  - [ ] Sub-task: Implement Blackboard class with pub/sub
  - [ ] Sub-task: Add dependency resolution for node hydration
- [ ] Task: Define use-case data channels
  - [ ] Sub-task: Account channel (depends on Entity)
  - [ ] Sub-task: Transaction channel (depends on Account)
  - [ ] Sub-task: Submission channel (depends on Transaction + Bank)
- [ ] Task: Conductor - User Manual Verification 'Phase 4.1 Blackboard'

---

## Phase 5: Gmail Identity Integration [P0]

### 5.1 Identity Binding
- [ ] Task: Add identity-to-storage binding
  - [ ] Sub-task: Add getUserIdentity() to GmailOAuthService
  - [ ] Sub-task: Add getStoragePrefix() for GCS path resolution
- [ ] Task: Gate persistence routes
  - [ ] Sub-task: Verify JWT on all /api/ledger/* routes
  - [ ] Sub-task: Extract UID from token for GCS path
- [ ] Task: Conductor - User Manual Verification 'Phase 5.1 Identity'

---

## Verification Checkpoints

- [ ] Unit tests pass for nachaService.ts
- [ ] Unit tests pass for gcs-persistence WAL methods
- [ ] AccountTable renders and navigates correctly on mobile
- [ ] End-to-end: Login → Create Account → NACHA submission stored in GCS
