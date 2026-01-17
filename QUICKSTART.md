# 5-Minute Deployment Quickstart

Deploy the hello-world app to GCP Cloud Run in under 5 minutes.

## Prerequisites

- GCP project with billing enabled
- GitHub repository with secrets configured
- gcloud CLI installed and authenticated

## Step 1: Configure GitHub Secrets (30 seconds)

Add these secrets to your GitHub repository:

1. **GCP_PROJECT_ID**: Your GCP project ID (e.g., `my-project-12345`)
2. **GCP_SA_KEY**: Service account JSON key with permissions:
   - Cloud Run Admin
   - Storage Admin
   - Service Account User

Get the service account key:
```bash
export PROJECT_ID="your-project-id"
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions Deployer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

gcloud iam service-accounts keys create key.json \
  --iam-account=github-actions@$PROJECT_ID.iam.gserviceaccount.com
```

Copy the contents of `key.json` to GitHub secret `GCP_SA_KEY`.

## Step 2: Deploy Hello World (2 minutes)

The hello-world app is a minimal Express server in `server/hello-world/`.

### Option A: GitHub Actions (Automatic)

Push to the `gallant-wozniak` branch to trigger deployment:

```bash
git add .
git commit -m "feat: add hello-world deployment"
git push origin gallant-wozniak
```

Monitor deployment: https://github.com/YOUR_ORG/YOUR_REPO/actions

### Option B: Manual Deployment

```bash
export PROJECT_ID="your-project-id"

# Build and push image
gcloud builds submit server/hello-world \
  --tag gcr.io/$PROJECT_ID/hello-world:latest \
  --project $PROJECT_ID

# Deploy to Cloud Run
gcloud run deploy hello-world \
  --image gcr.io/$PROJECT_ID/hello-world:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --project $PROJECT_ID

# Get service URL
gcloud run services describe hello-world \
  --platform managed \
  --region us-central1 \
  --format='value(status.url)' \
  --project $PROJECT_ID
```

Test the deployment:
```bash
curl https://hello-world-XXXXX.run.app/
# Output: Hello, GCP World!
```

## Step 3: Deploy AI Studio Frontend (3 minutes)

Build and deploy the React/Vite frontend with GEMINI_API_KEY integration.

### Configure Environment Variables

1. Set `GEMINI_API_KEY` in Cloud Run environment:
```bash
gcloud run services update hello-world \
  --set-env-vars GEMINI_API_KEY=your-api-key \
  --region us-central1 \
  --project $PROJECT_ID
```

2. For local development, create `.env.local`:
```
GEMINI_API_KEY=your-api-key-here
```

### Build Frontend

```bash
npm install
npm run build
```

### Deploy to Firebase Hosting

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase project
firebase init hosting

# Deploy
firebase deploy --only hosting
```

Or deploy frontend to Cloud Run:
```bash
# Create Dockerfile for frontend
cat > Dockerfile.frontend << 'EOF'
FROM nginx:alpine
COPY dist /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
EOF

# Build and deploy
gcloud builds submit --tag gcr.io/$PROJECT_ID/frontend:latest
gcloud run deploy frontend \
  --image gcr.io/$PROJECT_ID/frontend:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --project $PROJECT_ID
```

## Step 4: Deploy Fullstack with Firebase (5 minutes)

Deploy backend server with Firebase Firestore persistence.

### Configure Firebase

1. Create Firebase project at https://console.firebase.google.com/
2. Enable Firestore Database
3. Download service account key from Project Settings → Service Accounts

### Deploy Backend Server

```bash
# Set Firebase credentials
gcloud run services update hello-world \
  --set-env-vars FIREBASE_SERVICE_ACCOUNT='$(cat firebase-sa-key.json)' \
  --region us-central1 \
  --project $PROJECT_ID

# Or use Secret Manager (recommended)
gcloud secrets create firebase-sa-key --data-file=firebase-sa-key.json
gcloud run services update hello-world \
  --set-secrets=FIREBASE_SERVICE_ACCOUNT=firebase-sa-key:latest \
  --region us-central1 \
  --project $PROJECT_ID
```

Deploy the full backend (`server/index.js`):
```bash
gcloud builds submit server \
  --tag gcr.io/$PROJECT_ID/trust-ledger-server:latest \
  --project $PROJECT_ID

gcloud run deploy api-server \
  --image gcr.io/$PROJECT_ID/trust-ledger-server:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=your-key \
  --set-secrets FIREBASE_SERVICE_ACCOUNT=firebase-sa-key:latest \
  --project $PROJECT_ID
```

## Environment Variable Tracking for Billing

Set the GCP project ID in your shell environment for billing tracking:

```bash
# Add to ~/.bashrc or ~/.zshrc
export GCP_PROJECT_ID="your-project-id"
export CLOUDSDK_CORE_PROJECT="your-project-id"
```

All gcloud commands will use this project by default, ensuring proper billing attribution.

## Verification

1. **Hello-world health check**:
   ```bash
   curl https://hello-world-XXXXX.run.app/health
   # Output: {"status":"ok"}
   ```

2. **Frontend access**:
   ```bash
   curl https://frontend-XXXXX.run.app
   # Should return HTML
   ```

3. **Backend API**:
   ```bash
   curl https://api-server-XXXXX.run.app/api/health
   # Output: {"status":"healthy",...}
   ```

## Continuous Deployment

Once GitHub secrets are configured, every push to `gallant-wozniak` branch automatically deploys to Cloud Run via GitHub Actions.

Monitor deployments: https://github.com/YOUR_ORG/YOUR_REPO/actions

View Cloud Run services: https://console.cloud.google.com/run

## Cost Management

- Cloud Run charges only for requests (free tier: 2 million requests/month)
- Firebase free tier: 50K reads, 20K writes, 1GB storage per day
- Set up billing alerts: https://console.cloud.google.com/billing/

## Troubleshooting

**Error: Permission denied**
- Check service account has correct IAM roles
- Verify `GCP_SA_KEY` secret is valid JSON

**Error: Image not found**
- Ensure Cloud Build API is enabled
- Check image name matches deployment command

**Error: Service not accessible**
- Verify `--allow-unauthenticated` flag
- Check firewall rules
- Confirm region matches deployment

## Next Steps

- Add monitoring with Cloud Logging
- Set up custom domain
- Enable Cloud CDN
- Configure autoscaling
- Add CI/CD for frontend
