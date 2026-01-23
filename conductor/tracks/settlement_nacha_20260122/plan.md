# Track: Settlement → NACHA Integration

**Status:** PLANNING
**Created:** 2026-01-22
**Scope:** Wire ledger payment orders to NACHA file generation and submission

---

## Overview

Connect the existing ledger and settlement systems to the NACHA submission pipeline. This enables ACH payments to be generated from payment orders and tracked end-to-end.

**Architecture:**
```
Journal Entry → Payment Order → NACHA Generator → NACHA Submit → Storage
     ↓               ↓                ↓                ↓
  (ledger)     (settlement)    (nacha-generator)  (gcs-persistence)
```

---

## Phase 1: NACHA Generator Service [checkpoint: 01d7527]

### 1.1 Port Bash Generator to JavaScript
- [x] Task: Create `server/lib/nacha-generator.js`
  - [x] Sub-task: Write tests for `padRight(str, len)` and `padLeft(num, len)`
  - [x] Sub-task: Implement padding utilities
  - [x] Sub-task: Write tests for `generateFileHeader(config)`
  - [x] Sub-task: Implement File Header Record (Type 1)
  - [x] Sub-task: Write tests for `generateBatchHeader(config, batchNum)`
  - [x] Sub-task: Implement Batch Header Record (Type 5)
  - [x] Sub-task: Write tests for `generateEntryDetail(entry, seqNum)`
  - [x] Sub-task: Implement Entry Detail Record (Type 6)
  - [x] Sub-task: Write tests for `generateBatchControl(batch)`
  - [x] Sub-task: Implement Batch Control Record (Type 8)
  - [x] Sub-task: Write tests for `generateFileControl(file)`
  - [x] Sub-task: Implement File Control Record (Type 9)
  - [x] Sub-task: Write tests for block padding (94-char lines, 10-record blocks)
  - [x] Sub-task: Implement padding records

### 1.2 High-Level Generator API
- [x] Task: Implement `generateNachaFile(config, entries)`
  - [x] Sub-task: Write integration tests for complete file generation
  - [x] Sub-task: Implement entry hash calculation
  - [x] Sub-task: Implement debit/credit totals
  - [x] Sub-task: Return Buffer with proper CRLF line endings
  - [x] Sub-task: Validate against existing bash script output

- [x] Task: Conductor - User Manual Verification 'Phase 1 NACHA Generator' [520829a]

---

## Phase 2: Payment Order → NACHA Integration [checkpoint: 481020c]

### 2.1 Settlement Route Enhancement
- [x] Task: Add NACHA generation to payment order execution
  - [x] Sub-task: Write tests for ACH method payment orders
  - [x] Sub-task: On `execute` with method=ACH, call `nacha-generator`
  - [x] Sub-task: Store generated file via `persistence.saveNachaSubmission()`
  - [x] Sub-task: Link `nachaSubmissionId` to payment order record
  - [x] Sub-task: Update payment order status to reflect NACHA state

### 2.2 Sponsor Configuration
- [x] Task: Create `server/config/sponsors.js`
  - [x] Sub-task: Define sponsor interface (odfiRouting, companyId, name)
  - [x] Sub-task: Add default test sponsor
  - [x] Sub-task: Add environment variable overrides for production

- [x] Task: Conductor - User Manual Verification 'Phase 2 Settlement Integration' [95c2afc]

---

## Phase 3: End-to-End Flow Testing [checkpoint: 4904128]

### 3.1 Integration Test Suite
- [x] Task: Create `tests/integration/settlement-nacha.test.ts`
  - [x] Sub-task: Test: Create payment order → Execute → Verify NACHA stored
  - [x] Sub-task: Test: Verify NACHA file contents match payment order
  - [x] Sub-task: Test: List NACHA submissions includes the generated file
  - [x] Sub-task: Test: Payment order contains nachaSubmissionId reference

### 3.2 Manual Verification
- [x] Task: End-to-end curl test
  - [x] Sub-task: POST /api/settlement/payment-orders (method=ACH)
  - [x] Sub-task: POST /api/settlement/payment-orders/:id/execute
  - [x] Sub-task: GET /api/nacha/submissions (verify file appears)
  - [x] Sub-task: Decode and verify NACHA file format

- [ ] Task: Conductor - User Manual Verification 'Phase 3 E2E Flow'

---

## Phase 4: Journal Entry → Payment Order (Optional)

### 4.1 Event-Driven Auto-Pay
- [ ] Task: Subscribe to `journal.entry_posted` events
  - [ ] Sub-task: Detect AP (Accounts Payable) account types
  - [ ] Sub-task: Auto-create payment order for AP debits
  - [ ] Sub-task: Link journal entry ID to payment order

---

## Verification Checkpoints

- [x] NACHA generator produces valid 94-char records
- [x] File header and control records are correct
- [x] Entry hash and totals calculate correctly
- [x] Payment order execution generates and stores NACHA
- [x] NACHA submission links back to payment order
- [x] End-to-end flow works via API calls

---

## Technical Constraints

1. **NACHA Format**: All records must be exactly 94 characters
2. **Block Size**: Files must be padded to 10-record blocks
3. **Line Endings**: CRLF (`\r\n`) per NACHA spec
4. **Test Mode**: Use routing number `091000019` for testing
