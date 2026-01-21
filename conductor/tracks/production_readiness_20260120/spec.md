# Track: Production Readiness - Demo Code Removal & NACHA Commerce

## Overview

This track addresses critical production readiness issues: (1) remove demo code from production builds while preserving for development, (2) fix Vite build configuration, (3) establish testing infrastructure, and (4) deliver a working NACHA commerce thin slice with real bank API integration.

## Problem Statement

### Issue 1: Demo Code in Production
The deployed production app exposes demo features through LaunchScreen.tsx:
- "Jim's Profile" - Loads specific user's data (James R. Northrup Jr.)
- "Demo Data" - Generates synthetic test transactions (loadSyntheticFuzz)
- "QuickBooks View" - Demo layout mode
- "NCUA Charter Protocol" - Credit union wizard demo

### Issue 2: Vite Configuration Issues
- `process.env.API_KEY` used instead of `import.meta.env.VITE_*`
- ACHMovementWizard uses `process.env.API_KEY` directly (not Vite-compatible)
- Missing production environment variable handling
- No conditional compilation defines for DEV/PROD

### Issue 3: No Testing Infrastructure
- Tests exist but no unified test runner configured
- No coverage reporting configured
- vitest.config.ts exists but not integrated properly
- No CI-compatible test mode

### Issue 4: NACHA Code Not Production-Ready
- nachaService.ts exists with full NACHA generation
- ACHMovementWizard uses AI simulation instead of real nachaService
- No end-to-end commerce flow
- Missing real bank integration path

### Issue 5: QuickBooks Layout Incomplete
- MobileQuickBooksLayout exists but not fully functional
- No production-ready quick action flow
- Missing proper state management for mobile view

## Functional Requirements

### FR-1: Demo Code Removal (Compile-Time Conditional)
- LaunchScreen must not display demo options in production builds
- App.tsx must not pass demo handlers to LaunchScreen in production
- ledgerService.ts demo functions excluded from production builds
- Use `import.meta.env.DEV` for conditional compilation
- Bundle analysis confirms no demo code in production

### FR-2: Vite Configuration Fix
- All environment variables use `VITE_` prefix
- Add `define` for `import.meta.env.DEV` to ensure tree-shaking
- Production builds properly define environment variables
- Development and production builds both work correctly
- Environment variable documentation updated

### FR-3: Testing Infrastructure
- Unified test command (`npm test`) runs all tests
- Coverage reporting enabled with >80% target
- CI-compatible non-interactive mode (`CI=true`)
- Test runner properly configured (vitest)
- Unit and integration tests both runnable

### FR-4: NACHA Commerce Thin Slice with Real Bank APIs
- ACH credit/debit origination using real nachaService
- NACHA file generation, validation, and download
- Ledger integration for ACH records
- Real bank API adapter (Plaid or similar) for account validation
- UI wizard functional end-to-end
- SEC codes supported: CCD, PPD, WEB, TEL

### FR-5: QuickBooks Layout Production Ready
- MobileQuickBooksLayout fully functional
- Quick actions (Invoice, Receipt, Payment, Wire, 1099) working
- Proper state management
- Touch-optimized interactions
- Responsive design verified

## Non-Functional Requirements

- No demo code in production bundle
- Zero runtime overhead for conditional checks (compile-time elimination)
- Type safety maintained (no type errors after conditional exclusion)
- All existing tests pass
- New code covered by tests (>80% coverage)
- Production build optimized (minification, tree-shaking)
- Real bank API integration with proper error handling
- Professional UI/UX consistent with existing design

## Acceptance Criteria

- [ ] Production build shows only "Google Login", "New Account", "Resume Session" on LaunchScreen
- [ ] Development build shows all options including demo features
- [ ] `npm test` runs all tests with coverage report
- [ ] `npm run test:ci` runs tests in CI mode
- [ ] ACH Movement Wizard generates real NACHA files using nachaService
- [ ] NACHA files validate per Green Book standards (94-char fixed width)
- [ ] Bank API integration validates routing numbers and accounts
- [ ] NACHA files downloadable for submission to ODFI
- [ ] QuickBooks layout mode functional with all quick actions
- [ ] Demo handler functions not in production bundle (verified with bundle analyzer)
- [ ] Environment variables work in dev and production
- [ ] All new features have tests >80% coverage

## Technical Implementation Details

### Conditional Compilation Strategy
Use Vite's `define` to replace `import.meta.env.DEV` at build time:
```typescript
// vite.config.ts
define: {
  'import.meta.env.DEV': mode === 'development'
}
```

This ensures demo code branches are completely eliminated from production bundles.

### Bank API Integration
Integrate Plaid API for:
- Routing number validation
- Account verification
- Balance checks (optional)

### NACHA Flow
1. User initiates ACH movement from QuickBooks layout
2. Wizard collects counterparty details
3. Bank API validates routing/account (optional)
4. nachaService generates NACHA file
5. File downloaded for ODFI submission
6. Ledger records ACH transaction

## Out of Scope

- Real-time ODFI submission (manual file upload for now)
- Full Plaid integration UI (just API validation)
- UI redesign of LaunchScreen (keep existing design)
- Changing authentication flow (Google/Manual stays)
- W-2 and other tax form enhancements
- Multi-tenant SaaS features

## Success Metrics

- Production build size reduced by demo code removal
- Test coverage >80% for new code
- NACHA files pass validation
- QuickBooks layout fully functional
- Zero demo features in production
