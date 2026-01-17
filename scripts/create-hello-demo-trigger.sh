#!/usr/bin/env bash
set -euo pipefail

# Thin wrapper to create and optionally run a Cloud Build trigger that deploys Hello World
# Defaults:
#  - project: must be provided via --project or env PROJECT_ID
#  - repo owner/name: must be provided
#  - branch: demo/hello-world
#  - build-config: cloudbuild-hello.yaml
#  - trigger-name: trust-ledger-hello-demo-trigger

usage() {
  cat <<EOF
Usage: $0 --project PROJECT_ID --repo-owner OWNER --repo-name NAME [--run]

Creates a Cloud Build GitHub trigger that deploys the Hello World overlay on pushes to 'demo/hello-world'.

Options:
  --project       GCP project id
  --repo-owner    GitHub owner/org
  --repo-name     GitHub repository name
  --run           Run the trigger once after creating it

Example:
  ./scripts/create-hello-demo-trigger.sh --project my-project --repo-owner myorg --repo-name trust-ledger --run
EOF
  exit 1
}

PROJECT_ID=""
REPO_OWNER=""
REPO_NAME=""
RUN_AFTER=false
BRANCH="demo/hello-world"
BUILD_CONFIG="cloudbuild-hello.yaml"
TRIGGER_NAME="trust-ledger-hello-demo-trigger"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --project) PROJECT_ID="$2"; shift 2;;
    --repo-owner) REPO_OWNER="$2"; shift 2;;
    --repo-name) REPO_NAME="$2"; shift 2;;
    --run) RUN_AFTER=true; shift 1;;
    -h|--help) usage;;
    *) echo "Unknown arg: $1"; usage;;
  esac
done

if [ -z "$PROJECT_ID" ] || [ -z "$REPO_OWNER" ] || [ -z "$REPO_NAME" ]; then
  echo "Missing required arguments."; usage
fi

if ! command -v gcloud &>/dev/null; then
  echo "gcloud not found. Install and configure it, then re-run. https://cloud.google.com/sdk/docs/install"
  exit 1
fi

# Create trigger wrapped from existing script
./scripts/create-cloudbuild-trigger.sh --project "$PROJECT_ID" --repo-owner "$REPO_OWNER" --repo-name "$REPO_NAME" --branch "$BRANCH" --build-config "$BUILD_CONFIG" --trigger-name "$TRIGGER_NAME"

if [ "$RUN_AFTER" = true ]; then
  echo "Running trigger now..."
  gcloud beta builds triggers run "$TRIGGER_NAME" --branch="$BRANCH" --project="$PROJECT_ID"
fi

echo "Done. Trigger '$TRIGGER_NAME' will fire on pushes to branch '$BRANCH'."
