# Implementation Plan: Production Readiness - NACHA + Ledger

Scope narrowed to core functionality: NACHA posting client and account ledger.

## Phase 1: Demo Code Removal
- [x] Wrap demo functions in import.meta.env.DEV conditionals
- [x] Tree-shake mockData from production bundle
- [x] Production build verified (no mock data strings)

## Phase 2: NACHA Service
- [x] nachaService.ts with 94-char NACHA file generation
- [x] NACHA file validation
- [x] Tests passing (24/24)

## Phase 3: Banking Integration
- [x] Plaid service for routing/account validation
- [x] BankingFacade adapter pattern
- [x] Tests passing (31/31)
- [ ] Configure production Plaid credentials

## Phase 4: Account Ledger
- [x] Account CRUD operations (accountService.ts)
- [x] Journal entry posting
- [x] Balance tracking
- [ ] Account reconciliation view

## Phase 5: ACH Movement Wizard
- [x] ACHMovementWizard uses real nachaService
- [x] NACHA file download
- [x] Routing number validation via Plaid
- [ ] ODFI submission integration

## Phase 6: Production Deployment
- [x] Vite production config
- [x] CI/CD pipeline
- [ ] Production Plaid credentials in .env.production
- [ ] Deploy and verify

## Retired from Scope
- IRS/tax filing (1099, W2, IRIS, MeF)
- CRM features
- Real estate/closing
- DTCC/collateral
- Fiduciary actions
- Gift tax, Credit defense, Chancery filings
- MARAD, Edgar research
- BSO, Administrative process
- Teach mode
