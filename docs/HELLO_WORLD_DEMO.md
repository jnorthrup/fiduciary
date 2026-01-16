Hello World Demo Branch

This repository contains a demo workflow that deploys the Hello World app when code is pushed to a dedicated demo branch. IMPORTANT: This demo flow does NOT modify `main` — all changes and triggers live on `demo/hello-world`.

Workflow summary

- Branch: `demo/hello-world`
- Cloud Build config: `cloudbuild-hello.yaml`
- Trigger name: `trust-ledger-hello-demo-trigger`
- Trigger creation helper: `scripts/create-hello-demo-trigger.sh`

Create the demo trigger (example):

  ./scripts/create-hello-demo-trigger.sh --project YOUR_PROJECT_ID --repo-owner YOUR_GH_OWNER --repo-name YOUR_REPO --run

Notes

- The script assumes the Cloud Build GitHub App is installed in the repository. See `docs/CI_TRIGGER.md` for more detail.
- The trigger will only respond to pushes to `demo/hello-world` — it will not fire for `main`.
- Do NOT modify `main` in this workflow. All demo-only changes should be committed to `demo/hello-world`.
