#!/bin/bash
# =============================================================================
# Production Deployment via Cloud Build (Git-Synced)
# =============================================================================
# 1. Pushes changes to GitHub
# 2. Triggers remote Cloud Build (saves bandwidth)
# 3. Deploys to Cloud Run
# =============================================================================

set -euo pipefail

# Configuration
export PROJECT_ID="fiduciary-prod"
export SERVICE_NAME="trust-ledger-fullstack"
export REGION="us-central1"
export IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

echo "=== DEPLOYMENT: $SERVICE_NAME ==="
echo "Project: $PROJECT_ID"
echo "Region:  $REGION"

# -----------------------------------------------------------------------------
# 1. Git Sync
# -----------------------------------------------------------------------------
echo ""
echo ">>> 1. Syncing with GitHub..."

# Add all changes
git add .

# Commit (allow empty if no changes)
git commit -m "Deploy: $(date '+%Y-%m-%d %H:%M:%S')" || echo "No new changes to commit."

# Push to Main
git push origin main
echo "✓ Code synced to remote repository."

# -----------------------------------------------------------------------------
# 2. Prepare Build Configuration
# -----------------------------------------------------------------------------
echo ""
echo ">>> 2. Configuring Remote Build..."

# Create Root .gcloudignore to prevent uploading node_modules/dist
cat > .gcloudignore <<EOF
.git/
node_modules/
dist/
test-results/
test-artifacts/
server/node_modules/
EOF

# Create cloudbuild.yaml
cat > cloudbuild.yaml <<EOF
steps:
  # 1. Install & Build Frontend
  - name: 'node:20-alpine'
    entrypoint: 'sh'
    args:
      - '-c'
      - |
        npm ci
        export VITE_FIREBASE_ENABLED=true
        export VITE_GMAIL_AUTH_ENABLED=true
        export VITE_IRS_API_URL=/api
        export VITE_DEMO_MODE=false
        npm run build

  # 2. Prepare Server Directory
  - name: 'alpine'
    script: |
      rm -rf server/public
      mkdir -p server/public
      cp -r dist/* server/public/

  # 3. Build & Publish Container (Cloud Native Buildpacks)
  #    "We are serverless" -> No Dockerfile required.
  - name: 'gcr.io/k8s-skaffold/pack'
    entrypoint: 'pack'
    args:
      - 'build'
      - '$IMAGE_NAME'
      - '--builder=gcr.io/buildpacks/builder:google-22'
      - '--path=./server'
      - '--publish'

  # 4. Deploy to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - '$SERVICE_NAME'
      - '--image'
      - '$IMAGE_NAME'
      - '--region'
      - '$REGION'
      - '--platform'
      - 'managed'
      - '--allow-unauthenticated'
      - '--memory'
      - '512Mi'
      - '--set-env-vars'
      - 'NODE_ENV=production'

images:
  - '$IMAGE_NAME'
EOF

# -----------------------------------------------------------------------------
# 3. Trigger Remote Build
# -----------------------------------------------------------------------------
echo ""
echo ">>> 3. Submitting Build to Cloud Build..."
echo "    (Source will be uploaded minus ignored files)"
echo "    (Build happens remotely)"

gcloud builds submit --project "$PROJECT_ID" --config cloudbuild.yaml .

echo ""
echo "=== DEPLOYMENT COMPLETE ==="
echo "Service URL:"
gcloud run services describe "$SERVICE_NAME" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --format='value(status.url)'
