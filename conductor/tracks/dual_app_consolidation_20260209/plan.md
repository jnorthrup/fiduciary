# Implementation Plan: Dual App Consolidation & Auth Unification

## Phase 1: Authentication Cleanup (The Purge)
- [x] Task: Delete legacy/local login components
    - [x] Sub-task: Identify all components named `*Login*` or `*Auth*` that are NOT Google OAuth.
    - [x] Sub-task: **DELETE** `components/auth/LocalLoginForm.tsx` (if exists).
    - [x] Sub-task: **DELETE** clear.flow specific login dialogs.
    - [x] Sub-task: Grep for "password" input fields and remove them.
- [x] Task: Enforce Google OAuth in Clear.Flow
    - [x] Sub-task: Update Clear.Flow root to use the shared `AuthProvider`.
    - [x] Sub-task: Verify it redirects to Google for sign-in.

## Phase 2: Entry Point & Dual Splash
- [x] Task: Unify `index.*` entry points
    - [x] Sub-task: Ensure `index.html` points to a single `main.tsx` (or `index.tsx`).
    - [x] Sub-task: refactor `index.tsx` to render a `Root` component.
- [x] Task: Implement `DualSplash` component
    - [x] Sub-task: Create visual selection screen (Trust vs Personal).
    - [x] Sub-task: Store user selection (localStorage or state).
- [x] Task: Routing Logic
    - [x] Sub-task: implement condition: `if (!selected) return <DualSplash />`
    - [x] Sub-task: `if (selected === 'TRUST') return <TrustApp />`
    - [x] Sub-task: `if (selected === 'PERSONAL') return <ClearFlowApp />`

## Phase 3: Backend Verification
- [x] Task: Verify API Usage
    - [x] Sub-task: Spot check Clear.Flow components to ensure they use `services/*` and not internal mocks or separate routes.

## Verification Checklist
- [x] App launches to Splash Screen (if fresh).
- [x] "Personal" option leads to Clear.Flow UI.
- [x] "Trust" option leads to Trust UI.
- [x] NO username/password fields exist anywhere in the codebase (except API secrets).
- [x] Login flow unified at entry point via Google OAuth.
