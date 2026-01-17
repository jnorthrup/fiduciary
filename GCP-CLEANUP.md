# GCP Cleanup & Reset Guide

## Overview

Clean up leftover GCP resources and reset to AI Studio's clean main branch commit (`5f76437`), before agentic merges.

## Quick Start

```bash
# Dry run (preview only)
DRY_RUN=true ./gcp-sweep-reset.sh

# Execute cleanup and reset
./gcp-sweep-reset.sh
```

## What Gets Cleaned

### 1. Cloud Run Services
- Lists all services in the configured region
- Prompts to delete each service
- Frees up Cloud Run quotas

### 2. Container Registry Images
- Lists all images in `gcr.io/$GCP_PROJECT_ID`
- Shows image tags
- Keeps 3 most recent tags, deletes rest
- Reduces storage costs

### 3. Cloud Build Triggers
- Lists configured build triggers
- Shows active builds
- No automatic deletion (review only)

### 4. Branch Reset
- Identifies last AI Studio commit: `5f76437`
- Creates new branch from clean state
- Preserves current branch
- Removes agentic merge artifacts

### 5. Main Server Deployment
- Deploys `server/` directory (not `server/hello-world`)
- Uses production configuration
- Configures port 3001
- Sets NODE_ENV=production

## AI Studio Commits (Clean State)

```
5f76437 - Changes before Firebase Studio auto-run (Jan 10 23:39:48)
e58378f - Changes before Firebase Studio auto-run (Jan 10 21:40:39)
d1baa08 - feat: Integrate Google GenAI for IRS status and data retrieval
```

These commits are the clean AI Studio state before agentic modifications.

## Manual Cleanup Commands

If you prefer manual control:

### List Resources
```bash
# List Cloud Run services
gcloud run services list --region=us-central1

# List container images
gcloud container images list --repository=gcr.io/$GCP_PROJECT_ID

# List image tags
gcloud container images list-tags gcr.io/$GCP_PROJECT_ID/IMAGE_NAME

# List Cloud Build triggers
gcloud builds triggers list

# List active builds
gcloud builds list --ongoing
```

### Delete Resources
```bash
# Delete Cloud Run service
gcloud run services delete SERVICE_NAME --region=us-central1 --quiet

# Delete container image
gcloud container images delete gcr.io/$GCP_PROJECT_ID/IMAGE_NAME:TAG --quiet

# Delete all untagged images
gcloud container images list-tags gcr.io/$GCP_PROJECT_ID/IMAGE_NAME \
  --filter='-tags:*' --format='get(digest)' --limit=unlimited | \
  xargs -I {} gcloud container images delete gcr.io/$GCP_PROJECT_ID/IMAGE_NAME@{} --quiet

# Cancel active build
gcloud builds cancel BUILD_ID
```

## Branch Reset Workflow

```bash
# 1. Check current state
git log --oneline -10
git branch --show-current

# 2. Create clean branch from AI Studio commit
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
git checkout -b "clean-studio-${TIMESTAMP}" 5f76437

# 3. Verify clean state
git log --oneline -3
# Should show:
#   5f76437 Changes before Firebase Studio auto-run
#   22a5fc2 wip
#   d1baa08 feat: Integrate Google GenAI

# 4. Deploy clean server
gcloud builds submit server \
  --tag gcr.io/$GCP_PROJECT_ID/trust-ledger-server:latest

gcloud run deploy trust-ledger-server \
  --image gcr.io/$GCP_PROJECT_ID/trust-ledger-server:latest \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3001
```

## Differences: Demo vs Main

| Aspect | Hello-World Demo | Main Server |
|--------|------------------|-------------|
| Directory | `server/hello-world/` | `server/` |
| Port | 8080 | 3001 |
| Dependencies | Express only | Express, Firebase Admin, GenAI |
| Size | 8 lines | ~775 lines |
| Routes | `/`, `/health` | Multiple API routes |
| Features | Basic health check | Full IRS/BSO/Ledger APIs |

## Cost Implications

### Before Cleanup
- Stale Cloud Run services: $0.10-0.50/day (idle charges)
- Old container images: $0.026/GB/month storage
- Multiple revisions: Quota consumption

### After Cleanup
- Only active services running
- Minimal storage (3 recent images)
- Clean quota allocation
- Predictable billing

## Verification

After cleanup and deployment:

```bash
# Check Cloud Run services
gcloud run services list --region=us-central1

# Should show only:
#   trust-ledger-server  (main deployment)

# Test deployment
SERVICE_URL=$(gcloud run services describe trust-ledger-server \
  --region=us-central1 --format='value(status.url)')

curl $SERVICE_URL/api/health
# Expected: {"status":"healthy",...}

# Check billing
gcloud billing accounts list
gcloud billing projects describe $GCP_PROJECT_ID
```

## Rollback Plan

If cleanup goes wrong:

```bash
# 1. Return to original branch
git checkout gallant-wozniak

# 2. Redeploy from current state
./deploy-quickstart.sh

# 3. Check logs
gcloud logging read "resource.type=cloud_run_revision" --limit=50

# 4. List deleted services (within 30 days)
gcloud run services list --region=us-central1 --show-deleted
```

## Environment Variables

Required for sweep script:
```bash
export GCP_PROJECT_ID=gen-lang-client-0754063985
export REGION=us-central1
export DRY_RUN=false  # Set to true for preview mode
```

## Safety Features

The script includes:
- Confirmation prompts before deletion
- Dry run mode for preview
- Preserves original branches
- Keeps 3 most recent image tags
- No automatic trigger deletion
- Billing project tracking

## Integration with CI/CD

After cleanup, update `.github/workflows/deploy-hello-cloudrun.yml`:

```yaml
# Change from demo deployment:
gcloud builds submit server/hello-world --tag "$IMAGE"

# To main deployment:
gcloud builds submit server --tag "$IMAGE"
```

## Next Steps After Sweep

1. Verify clean deployment working
2. Configure environment secrets
3. Enable Firebase integration
4. Set up monitoring/alerting
5. Configure custom domain
6. Enable Cloud CDN
7. Set up backup strategy
