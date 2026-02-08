# Track: External Fiduciary Branch Deployment

**Track ID:** deploy_external_fiduciary_20260206
**Type:** Feature
**Created:** 2026-02-06
**Status:** Pending

---

## Overview

Deploy the `fullstack` branch from the external repository `https://github.com/lastrust8808-svg/fiduciary` (or similar) to Google Cloud Run. This ensures that the external codebase is deployed without merging its changes into the main local development branch.

**Why This Matters:**
The user needs to deploy a specific external version of the application, possibly for testing, verification, or a separate environment, while maintaining the integrity of the local workspace.

---

## Functional Requirements

### 1. External Checkout
- Fetch from remote: `https://github.com/lastrust8808-svg/fiduciary`
- Create/Reset local branch: `deploy/external-fullstack`
- Ensure no merge conflicts with current working directory (clean state required).

### 2. Deployment
- Use existing Cloud Build configuration (`cloudbuild.yaml`) if available in the external branch, or adapting the local one.
- Deploy to Cloud Run service (service name to be confirmed, likely `trust-ledger-fullstack` or a variant).
- Verify deployment URL.

---

## Acceptance Criteria

1. ✅ Local branch `deploy/external-fullstack` exists and tracks the external `fullstack` branch.
2. ✅ Cloud Run deployment completes successfully.
3. ✅ Application is accessible at the deployed URL.
4. ✅ Local `main` or current working branch is unaffected.

---

## Risks & Mitigation

- **Risk:** Remote URL incorrect or private.
  - **Mitigation:** Verify URL, ask user if authentication needed.
- **Risk:** Build failure due to environment differences.
  - **Mitigation:** Inspect `cloudbuild.yaml` in the new branch before deploying.
