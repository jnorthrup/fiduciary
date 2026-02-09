# Specification: Offload 2FA to Google OAuth Provider

## Overview
Replace custom 2FA implementation (TwoFactorAuthModal with 6-digit TOTP codes) with Google's built-in authentication security. Firebase Auth already handles Google OAuth — users with Google 2-Step Verification get MFA automatically. For high-value operations requiring step-up auth, use Google re-authentication (signInWithPopup) instead of a custom TOTP modal.

## Problem Statement
The current codebase has a custom `TwoFactorAuthModal` that simulates TOTP verification with a 6-digit code and `setTimeout` delay. This is:
1. Not connected to any real TOTP backend (no secret generation, no verification)
2. Duplicating security that Google already provides via 2-Step Verification
3. Adding UI complexity without real security value

## Goals
1. **Delete custom 2FA UI**: Remove `TwoFactorAuthModal.tsx` and its usage
2. **Leverage Google re-auth**: For high-value operations (IRS submissions, large transfers), prompt Google re-authentication via `reauthenticateWithPopup`
3. **Remove VITE_REQUIRE_2FA**: The env flag becomes unnecessary — Google handles MFA at the provider level
4. **Simplify IRIS wizard flow**: Remove the custom 2FA step from IRS1099Wizard, replace with Google re-auth check

## Functional Requirements

### 1. Google Re-Authentication Service
- Add `reauthenticate()` to authService.tsx using Firebase's `reauthenticateWithPopup`
- Returns a fresh ID token proving the user just re-verified their identity
- Google's own 2-Step Verification (if enabled on the user's Google account) provides the MFA layer

### 2. High-Value Operation Guard
- Create a `useStepUpAuth` hook or utility that:
  - Checks if the user's last auth was recent (within 5 minutes)
  - If stale, triggers Google re-authentication popup
  - Returns a fresh token for the operation
- Used by: IRIS1099Wizard, FedGateway, ACHMovementWizard (any high-value flow)

### 3. Rail 2FA Guard Points (Retained)
- Rail operations (FedGateway, ACHMovementWizard, payment orders) keep step-up auth guard points
- `StepUpAuthProvider` interface: `verify(): Promise<boolean>` — pluggable strategy
- `GoogleReauthProvider`: production implementation using `reauthenticateWithPopup`
- `StubProvider`: dev/test fallback that always passes (with console warning)
- Rail components call `stepUpAuth.verify()` before submitting high-value operations

### 4. Cleanup (Non-Rail)
- Delete `TwoFactorAuthModal.tsx` (custom TOTP modal)
- Remove `VITE_REQUIRE_2FA` env var from all files and .env configs
- Update IRIS1099Wizard to use Google re-auth instead of custom 2FA step
- Remove orphaned 2FA imports from non-rail components

## Non-Functional Requirements
- Zero custom cryptographic code for auth verification
- All auth complexity delegated to Google/Firebase SDK
- No new UI modals — Google's popup handles the interaction

## Acceptance Criteria
- [ ] `TwoFactorAuthModal.tsx` deleted
- [ ] `VITE_REQUIRE_2FA` removed from codebase and env files
- [ ] `reauthenticate()` function added to authService.tsx
- [ ] IRIS1099Wizard uses Google re-auth for step-up verification
- [ ] Build succeeds clean
- [ ] Auth flow tests pass

## Out of Scope
- Firebase MFA enrollment UI (users manage 2-Step Verification in their Google account settings)
- Backend token verification changes (Firebase Admin SDK already verifies tokens)
- Phone number MFA via Firebase (Google account 2-Step Verification is sufficient)
