# GCS Static Hosting Deployment Guide

## Overview

Replaces Firebase Hosting (https://${GCP_PROJECT_ID}.web.app) with Google Cloud Storage static hosting.

**Changes:**
- Firebase/Gmail authentication **DISABLED**
- Automatic CI/CD deployment on push to `fullstack` branch
- Static files served from GCS with Cloud CDN caching

## Infrastructure

### Terraform Resources (infra/gcp/main.tf)

| Resource | Purpose |
|----------|---------|
| `google_storage_bucket.static_hosting` | GCS bucket for static files |
| `google_compute_backend_bucket.static_backend` | Cloud CDN backend |
| `google_compute_global_forwarding_rule.static_forwarding` | Public IP/Load Balancer |
| `google_cloudbuild_trigger.gcs_static_deploy` | CI/CD trigger for fullstack branch |

### Cloud Build Configuration

File: `cloudbuild-gcs.yaml`
- Runs on push to `fullstack` branch
- Builds with `VITE_FIREBASE_ENABLED=false` and `VITE_GMAIL_AUTH_ENABLED=false`
- Uploads to GCS bucket: `{PROJECT_ID}-fullstack-static`

## Access URLs

After deployment:

| Type | URL |
|------|-----|
| Direct GCS | `https://storage.googleapis.com/{PROJECT_ID}-fullstack-static/index.html` |
| Cloud CDN (IP) | See Terraform output `cdn_lb_ip` |

## Manual Deployment

```bash
# Deploy to GCS
./deploy-gcs.sh <PROJECT_ID>

# Example
./deploy-gcs.sh ${GCP_PROJECT_ID}
```

## Environment Variables

Set in `.env.production`:

```bash
VITE_FIREBASE_ENABLED=false
VITE_GMAIL_AUTH_ENABLED=false
```

## Firebase Cleanup (Optional)

To remove the old Firebase Hosting:

```bash
# Uninstall Firebase tools (optional)
npm uninstall -g firebase-tools

# Or disable Firebase Hosting site
firebase hosting:disable --only ${GCP_PROJECT_ID}
```

## Terraform Deployment

```bash
cd infra/gcp
terraform init
terraform apply \
  -var="project_id=${GCP_PROJECT_ID}" \
  -var="enable_gcs_hosting=true" \
  -var="enable_cloud_cdn=true"
```

## Disabled Features

The following are **DISABLED** in GCS deployment:
- Google Sign-In / Firebase Auth
- Gmail OAuth integration
- Firebase Analytics
- Firebase Firestore sync

The app runs in "dev mode" with local state only.
