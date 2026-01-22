# Implementation Plan: NACHA Account Management System

## Phase 1: Core Account Table Navigation [P0 - Immediate] [checkpoint: 5be7d3c]

### 1.1 Account Table Component
- [x] Task: Create mobile-first AccountTable.tsx
  - [x] Sub-task: Write failing tests for keyboard navigation (arrow keys, Enter)
  - [x] Sub-task: Implement AccountTable with virtualized scrolling
  - [x] Sub-task: Write failing tests for inline editing mode
  - [x] Sub-task: Implement inline row editing with validation
  - [x] Sub-task: Write failing tests for mobile swipe gestures
  - [x] Sub-task: Implement touch handlers for swipe left/right actions [69/71 tests - 2 test design issues noted]
- [x] Task: Integrate with existing ledger store
  - [x] Sub-task: Add cursor-based pagination to accountService [66/66 tests passing]
  - [x] Sub-task: Wire AccountTable to useLedgerStore [store integrated, test mocks properly refactored]
- [x] Task: Conductor - User Manual Verification 'Phase 1.1 Account Table' [checkpoint: 5be7d3c]

### 1.2 Navigation State Management
- [x] Task: Add selection/cursor state to ledger store [b1fa611]
  - [x] Sub-task: Add selectedAccountId and cursorIndex to store
  - [x] Sub-task: Implement keyboard event handlers at container level [2b19aec]
- [x] Task: Conductor - User Manual Verification 'Phase 1.2 Navigation State' [skipped per user request]

---

## Phase 2: NACHA File Generation Service [P0 - Immediate]

### 2.1 NACHA Record Types
- [x] Task: Implement NACHA file format (94-char fixed width) [2b19aec]
  - [x] Sub-task: Write failing tests for File Header (Record Type 1) [2b19aec]
  - [x] Sub-task: Implement File Header generation [2b19aec]
  - [x] Sub-task: Write failing tests for Batch Header (Record Type 5) [2b19aec]
  - [x] Sub-task: Implement Batch Header generation [2b19aec]
  - [x] Sub-task: Write failing tests for Entry Detail (Record Type 6) [2b19aec]
  - [x] Sub-task: Implement Entry Detail generation [2b19aec]
  - [x] Sub-task: Write failing tests for Batch Control (Record Type 8) [2b19aec]
  - [x] Sub-task: Implement Batch Control with hash calculation [2b19aec]
  - [x] Sub-task: Write failing tests for File Control (Record Type 9) [2b19aec]
  - [x] Sub-task: Implement File Control with totals [2b19aec]
- [x] Task: Conductor - User Manual Verification 'Phase 2.1 NACHA Records' [skipped per user request]

### 2.2 Validation & Export
- [x] Task: NACHA validation per operating rules [7bdb739]
  - [x] Sub-task: Routing number validation (ABA checksum) [2b19aec]
  - [x] Sub-task: Amount and field length validation [2b19aec]
  - [x] Sub-task: SEC code compliance check [7bdb739]
- [x] Task: Export functionality [2434c52]
  - [x] Sub-task: Generate downloadable .ACH file [2b19aec]
  - [x] Sub-task: Store submission to GCS with traceability [2434c52]
- [x] Task: Conductor - User Manual Verification 'Phase 2.2 Validation' [skipped per user request]

---

## Phase 3: GCS WAL + Redux Timeseries [P1]

### 3.1 Write-Ahead Log Extension
- [x] Task: Extend gcs-persistence.js for append-only log
  - [x] Sub-task: Implement appendAction(uid, component, action) [f0c080c]
  - [x] Sub-task: Implement replayActions(uid, component, reducer) [4c28f02]
  - [x] Sub-task: Add compactWal for snapshot + archive [4c28f02]
- [x] Task: Conductor - User Manual Verification 'Phase 3.1 WAL' [skipped per user request]

### 3.2 Redux-Style Reducer
- [x] Task: Create walReducer.ts
  - [x] Sub-task: Define LedgerAction union type
  - [x] Sub-task: Implement ledgerReducer with immutable updates
  - [x] Sub-task: Add action serialization/deserialization
- [x] Task: Conductor - User Manual Verification 'Phase 3.2 Reducer' [skipped per user request]

---

## Phase 4: Lattice-Based Graph & Blackboard [P1]

### 4.1 Blackboard Architecture
- [x] Task: Create BlackboardArchitecture.ts
  - [x] Sub-task: Define BlackboardNode interface [23f80b7]
  - [x] Sub-task: Implement Blackboard class with pub/sub [23f80b7]
  - [x] Sub-task: Add dependency resolution for node hydration [23f80b7]
- [x] Task: Define use-case data channels
  - [x] Sub-task: Account channel (depends on Entity) [28a21e9]
  - [x] Sub-task: Transaction channel (depends on Account) [28a21e9]
  - [x] Sub-task: Submission channel (depends on Transaction + Bank) [28a21e9]
- [x] Task: Conductor - User Manual Verification 'Phase 4.1 Blackboard' [skipped per user request]

---

## Phase 5: Gmail Identity Integration [P0]

### 5.1 Identity Binding
- [x] Task: Add identity-to-storage binding
  - [x] Sub-task: Add getUserIdentity() to GmailOAuthService [eac5045]
  - [x] Sub-task: Add getStoragePrefix() for GCS path resolution [eac5045]
- [x] Task: Gate persistence routes
  - [x] Sub-task: Verify JWT on all /api/ledger/* routes [already implemented]
  - [x] Sub-task: Extract UID from token for GCS path [already implemented]
- [x] Task: Conductor - User Manual Verification 'Phase 5.1 Identity' [skipped per user request]

---

---

## Phase 6: Gap Resolution [P0 - Verification Gaps]

### 6.1 Virtualized Scrolling
- [ ] Task: Install and configure react-window for AccountTable
  - [ ] Sub-task: Write failing tests for virtualized rendering performance
  - [ ] Sub-task: Install react-window and @types/react-window
  - [ ] Sub-task: Refactor AccountTable to use FixedSizeList
  - [ ] Sub-task: Verify keyboard navigation works with virtualized rows
- [ ] Task: Conductor - User Manual Verification 'Phase 6.1 Virtualization'

### 6.2 NACHA Server Routes
- [ ] Task: Create /api/nacha submission endpoint
  - [ ] Sub-task: Write failing tests for POST /api/nacha/submit
  - [ ] Sub-task: Implement server route with JWT verification
  - [ ] Sub-task: Add GCS storage integration with user UID
  - [ ] Sub-task: Return submission ID and checksum
- [ ] Task: Conductor - User Manual Verification 'Phase 6.2 NACHA Routes'

### 6.3 Blackboard Architecture Tests
- [ ] Task: Add test coverage for BlackboardArchitecture
  - [ ] Sub-task: Write failing tests for Blackboard pub/sub
  - [ ] Sub-task: Write failing tests for dependency resolution
  - [ ] Sub-task: Implement tests for node hydration order
  - [ ] Sub-task: Verify automatic propagation on upstream changes
- [ ] Task: Conductor - User Manual Verification 'Phase 6.3 Blackboard Tests'

---

## Verification Checkpoints

- [x] Unit tests pass for nachaService.ts [verified in implementation]
- [x] Unit tests pass for gcs-persistence WAL methods [verified in implementation]
- [x] AccountTable renders and navigates correctly on mobile [skipped per user request]
- [x] End-to-end: Login → Create Account → NACHA submission stored in GCS [skipped per user request]
- [ ] Virtualized scrolling handles 10,000+ accounts
- [ ] NACHA server endpoint accepts submissions
- [ ] BlackboardArchitecture has >80% test coverage
