#!/bin/bash
# =============================================================================
# Production Deployment via Cloud Build (Git-Synced)
# =============================================================================
# 1. Commits local changes
# 2. Pulls and merges remote changes
# 3. Pushes to GitHub, triggering the Cloud Build pipeline
# =============================================================================

set -e

# Configuration
export PROJECT_ID="fiduciary-prod"
export SERVICE_NAME="trust-ledger-fullstack"

echo "=== DEPLOYMENT: $SERVICE_NAME ==="
echo "Project: $PROJECT_ID"
echo "Trigger: Git Push to Main"

# -----------------------------------------------------------------------------
# 1. Git Sync
# -----------------------------------------------------------------------------
echo ""
echo ">>> 1. Staging and Committing changes..."

# Add all changes
git add .

# Commit (allow empty if no changes)
if git diff-index --quiet HEAD --; then
    echo "No changes to commit."
else
    git commit -m "Deploy: $(date '+%Y-%m-%d %H:%M:%S')"
fi

echo ""
echo ">>> 2. Pulling latest changes..."
git pull origin main

echo ""
echo ">>> 3. Pushing to Main..."
git push origin main

echo ""
echo "=== DEPLOYMENT TRIGGERED ==="
echo "Changes pushed to GitHub. Cloud Build should automatically trigger."
echo "View builds here: https://console.cloud.google.com/cloud-build/builds?project=$PROJECT_ID"
