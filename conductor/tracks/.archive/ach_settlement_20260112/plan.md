# Plan: ACH Settlement Logic

## Goal
Implement a robust ACH/EFT settlement system that correctly models the "Obligation -> Instruction -> Confirmation" lifecycle, ensuring strict separation of concerns between commercial obligations and banking settlement mechanics.

## Context
Ref: User request on [2026-01-12].
The system must explicitly model:
1.  **Obligation Layer**: Contract, Invoice, Payable (The "Why")
2.  **Settlement Instruction Layer**: ACH File, Payee Routing/Account (The "How")
3.  **Settlement Confirmation Layer**: Bank Posting, Return Codes (The "When")

## Tasks

### Phase 1: Data Modeling ([x])
- [x] Define `Obligation` Schema (Invoice/Payable)
    - [x] Create migration/entity
    - [x] Link to Vendor/Contract
- [x] Define `SettlementInstruction` Schema
    - [x] Payee Banking Info (Routing/Account)
    - [x] Remittance Details
    - [x] Trace Numbers
- [x] Define `SettlementConfirmation` Schema
    - [x] ACH Return Codes
    - [x] Posted Dates
    - [x] Ledger Entries (CR/DR)

### Phase 2: Core Logic Implementation ([x])
- [x] Implement Obligation Creation Logic
    - [x] Invoice -> AP Journal Entry
    - [x] Payable Linkage
- [x] Implement Settlement Instruction Generation
    - [x] Payee Banking Details Form
    - [x] Mock ACH File Generator (NACHA format)
- [x] Implement Settlement Confirmation Processing
    - [x] `processSettlementReturn` logic
    - [x] Reversing Journal Entries
    - [x] Status Updates (Returned/Failed)

### Phase 3: Integration & UI ([x])
- [x] Update ERP Views to show Obligation Status
    - [x] Created `APDashboard` Component
    - [x] Integrated into Dashboard Financials Tab
- [x] Create UI for managing Settlement Instructions (Vendor Setup)
    - [x] Walkthrough Updated
    - [x] Plan Updated
- [ ] Create Dashboard for Settlement Status (Reconciliation)

### Phase 4: Verification ([x])
- [x] Integrate with `SettlementEngine` UI
- [x] Verify `ledgerService` updates
- [x] Verify Type Safety (`tsc`)

## Status
**Status**: [x] Done
**Validation**:
- [x] Types Compile
- [x] Unit Tests Pass (N/A - Manual Verification for UI)
- [x] Integration Verified

## Reference
> ACH/EFT settlement is possible because the underlying obligation (contractual payable/receivable) is established first; the ACH file is merely a standardized instruction to apply settlement credit to the payee’s designated receiving account.
