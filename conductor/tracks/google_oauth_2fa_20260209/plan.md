# Plan: Offload 2FA to Google OAuth Provider

## Phase 1: Auth Service Enhancement
- [x] Task: Add `reauthenticate()` function to authService.tsx using Firebase `reauthenticateWithPopup`
- [x] Task: Add `getLastAuthTime()` helper to check token freshness (< 5 min)
- [x] Task: Create `useStepUpAuth` hook that combines freshness check + re-auth trigger

## Phase 2: Rail 2FA Stubs (Retain Guard Points)
- [x] Task: Create `StepUpAuthProvider` interface with `verify(): Promise<boolean>` contract
- [x] Task: Implement `GoogleReauthProvider` (calls `reauthenticate()` from authService)
- [x] Task: Implement `StubProvider` (always returns true, logs warning — for dev/test)
- [x] Task: Wire rail components (FedGateway, ACHMovementWizard, RailPaymentOrdersPage) to use `StepUpAuthProvider`

## Phase 3: Cleanup Custom 2FA (Non-Rail)
- [x] Task: Delete `components/modals/TwoFactorAuthModal.tsx`
- [x] Task: Remove `VITE_REQUIRE_2FA` from `.env`, `.env.production`, `.env.local` and all code references
- [x] Task: Update IRIS1099Wizard — removed 2FA step, wizard goes Auth → Filer directly
- [x] Task: Remove orphaned 2FA imports from ComplianceWidget and other non-rail components

## Phase 4: Testing & Verification
- [x] Task: Write tests for `reauthenticate()`, `useStepUpAuth`, and both providers [12 tests]
- [x] Task: Verify rail components call StepUpAuthProvider before high-value operations
- [x] Task: Verify IRIS1099Wizard flow works without custom 2FA
- [x] Task: Vite build succeeds clean
