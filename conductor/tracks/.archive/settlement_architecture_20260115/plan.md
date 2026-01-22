# Plan: Settlement Architecture & Rail Adapters

## Goal
Refine the settlement engine to decouple "Obligation" (Ledger) from "Settlement" (Rails) using the **Rail Adapter** pattern. This ensures the system can support multiple settlement methods (ODFI, BaaS, Manual Check, etc.) without coupling the core ledger to a specific provider.

## Context
Ref: Architectural integration on [2026-01-15].
Current implementation (`SettlementEngine.tsx`) tightly couples UI to a specific "Mock ACH" generation. We need to introduce an abstraction layer.

## Core Concepts
1.  **Private Ledger**: Authoritative source for Accounting & Authorization.
2.  **Settlement Rails**: Regulated origination & compliance (External).
3.  **Rail Adapter**: Interface to bridge Ledger -> Rails.

## Tasks

### Phase 1: Interface Definition
- [ ] Define `RailAdapter` interface in `types/settlement.ts`
    - `create_payment(instruction)`
    - `submit_payment(id)`
    - `get_status(id)`
- [ ] Define `PaymentRail` enum options (ODFI_ACH, STRIPE_CONNECT, MANUAL_CHECK, WIRE)

### Phase 2: Adapter Implementation
- [x] Implement `MockODFIAdapter` (Current "Generate NACHA" logic)
- [x] Implement `ManualRailAdapter` (For checks/external wires)
- [ ] (Future) `StripeAdapter` or `ModernTreasuryAdapter`

### Phase 3: Engine Refactoring
- [x] Refactor `SettlementEngine.tsx` to use `RailAdapter`
    - Remove hardcoded ACH string generation from UI
    - Delegate "Execute" to the selected Adapter
- [ ] Update `SettlementInstruction` schema to store `rail_id` and `external_status`

### Phase 4: Reconciliation Logic
- [ ] Implement "Clearing Account" logic in `ledgerService.ts`
    - `submit_payment` -> Dr AP / Cr Clearing
    - `confirm_settlement` -> Dr Clearing / Cr Cash

## Status
**Status**: [ ] Planned
