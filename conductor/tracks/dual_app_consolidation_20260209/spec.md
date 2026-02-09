# Specification: Dual App Consolidation & Auth Unification

**Track ID:** dual_app_consolidation_20260209
**Status:** Active
**Priority:** CRITICAL (P0)

## Overview

Consolidate the application entry point into a "Dual Splash" screen that routes to distinct UI "skins" (Trust vs. Personal/Clear.Flow) while enforcing a strict, unified backend and authentication model.

**CRITICAL MANDATES:**
1.  **Dual Splash Screen:** The application must start at a decision point (Splash) allowing the user to select their experience.
2.  **Single Identity Source:** Google OAuth is the **ONLY** allowed authentication method.
3.  **Delete Legacy Auth:** All local login dialogs, "Clear.Flow" specific login screens, and non-Google auth UI must be **DELETED**.
4.  **Common Backend:** Both UIs must consume the exact same backend APIs. No "backend for frontend" bifurcation.

## Scope

### In Scope
- **Entry Point Refactoring:**
    - Unified `index.tsx` (or similar root) that renders the Splash Screen.
    - Routing logic to switch between `App-lastrust.tsx` (Trust) and `App-clearflow.tsx` (Personal).
- **Authentication Cleanup:**
    - Remove all code related to "local" or "password" logins.
    - Remove any "Clear.Flow" specific login modals.
    - Ensure `useAuth` or equivalent hook strictly uses Google OAuth.
- **Backend Unification:**
    - Verify both UIs call the same `/api/*` endpoints.
    - Ensure session management is shared (same cookie/token).

### Out of Scope
- NACHA functionality (Deferred).
- New feature development.

## Requirements

### 1. Dual Splash Screen
- **User Story:** As a user, when I open the app, I see a splash screen offering two paths: "Trust Management" and "Personal Finance".
- **Technical:**
    - `index.html` loads a single entry point.
    - Entry point checks for existing session/preference.
    - If no preference, show Splash.
    - "Trust" -> Loads Trust UI tree.
    - "Personal" -> Loads Clear.Flow UI tree.

### 2. Single Payment/Auth Rail (Google)
- **User Story:** I only ever log in with my Google Account. I never see a username/password form.
- **Technical:**
    - **DELETE**: `LoginDialog.tsx`, `LoginForm.tsx`, or any variant used in the Clear.Flow path.
    - **REFACTOR**: Ensure the "Personal" UI triggers the exact same Google Sign-In flow as the "Trust" UI.

### 3. Common API Consumption
- **Technical:**
    - Both UIs must use the same `apiClient` or service layer.
    - No duplicated API routes for different skins.
