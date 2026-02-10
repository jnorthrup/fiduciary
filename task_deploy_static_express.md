
# Task: Deploy Static Express App on Cloud Functions

## Objective
Deploy the frontend application as a static site served via a Google Cloud Function (`serveApp`) using Express. This ensures strict control over caching headers (immutable for hashed assets, no-cache for index.html) to emulate `clearflow.app` behavior while leveraging Google Cloud's infrastructure.

## Context
- **Project Structure**: Monorepo-like. Root contains the Vite frontend. `cloud-functions/` contains the backend logic.
- **Current State**: 
    - `serveApp.ts` created with Express logic.
    - `deploy-cloud-functions.sh` updated to build frontend and copy assets.
    - **Issue**: Previous deployment attempt failed with "Missing script: build" during the frontend build phase (or possibly cloud-functions phase).
    - **User Pref**: User prefers `gsed` over `sed`.
    - **Goal**: Fix build scripts, ensure dependencies are correct, and deploy.

## Plan

1.  **Environment & Tooling Check**
    - [ ] Verify `gsed` availability.
    - [ ] Verify root and `cloud-functions` `package.json` scripts.

2.  **Fix Dependencies & Scripts**
    - [ ] Ensure `cloud-functions` has `@types/express`.
    - [ ] Debug the "Missing script: build" error by running the build sequence manually.
    - [ ] Ensure `cloud-functions/package.json` has the correct `build` script (`tsc`).

3.  **Frontend Build & Asset Preparation**
    - [ ] Run `npm run build` in the project root to generate `dist/`.
    - [ ] Copy `dist/` content to `cloud-functions/lib/public/` (mimicking the deploy script logic to verify paths).

4.  **Cloud Function Build**
    - [ ] Run `npm run build` in `cloud-functions/` to compile TS to JS.

5.  **Deployment**
    - [ ] Run the updated `scripts/deploy-cloud-functions.sh` script using `fiduciary-prod` project.
    - [ ] Verify `serveApp` deployment.

6.  **Verification**
    - [ ] Check the deployed function URL.
    - [ ] Verify Cache-Control headers on `/index.html` (should be `no-cache`).
    - [ ] Verify Cache-Control headers on `/assets/foo.hash.js` (should be `immutable`).
