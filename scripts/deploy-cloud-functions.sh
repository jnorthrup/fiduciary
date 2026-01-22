#!/bin/bash
# deploy-cloud-functions.sh
# Deploys Cloud Functions for orchestration and rollback

set -e

PROJECT_ID="${GCP_PROJECT_ID}"
REGION="${GCP_REGION:-us-central1}"

echo "=== Deploying Cloud Functions for $PROJECT_ID ==="
echo "Region: $REGION"
echo ""

# Check if gcloud is configured
if ! command -v gcloud &> /dev/null; then
  echo "Error: gcloud not found. Please install Google Cloud SDK."
  exit 1
fi

# Set project
echo "Setting project to $PROJECT_ID..."
gcloud config set project "$PROJECT_ID"

# Enable required APIs
echo ""
echo "Enabling required APIs..."
gcloud services enable \
  cloudfunctions.googleapis.com \
  pubsub.googleapis.com \
  monitoring.googleapis.com \
  container.googleapis.com \
  firebase.googleapis.com

# Create Pub/Sub topics
echo ""
echo "Creating Pub/Sub topics..."
gcloud pubsub topics create deploy.signal --project="$PROJECT_ID" 2>/dev/null || echo "Topic deploy.signal already exists"
gcloud pubsub topics create rollback.signal --project="$PROJECT_ID" 2>/dev/null || echo "Topic rollback.signal already exists"
gcloud pubsub topics create build.status --project="$PROJECT_ID" 2>/dev/null || echo "Topic build.status already exists"
gcloud pubsub topics create ledger.events --project="$PROJECT_ID" 2>/dev/null || echo "Topic ledger.events already exists"

# Build functions
echo ""
echo "Building Cloud Functions..."
cd cloud-functions
npm install
npm run build

# Deploy functions using Firebase Functions or gcloud
echo ""
echo "Deploying Cloud Functions..."

if command -v firebase &> /dev/null; then
  echo "Using Firebase CLI to deploy..."
  firebase deploy --only functions --project="$PROJECT_ID"
else
  echo "Firebase CLI not found. Using gcloud to deploy..."

  # Deploy onDeploy function
  echo "Deploying onDeploy function..."
  gcloud functions deploy onDeploy \
    --gen2 \
    --region="$REGION" \
    --trigger-topic=deploy.signal \
    --entry-point=onDeploy \
    --runtime=nodejs22 \
    --memory=512Mi \
    --timeout=300s \
    --set-env-vars=GCP_PROJECT_ID="$PROJECT_ID",GCP_REGION="$REGION",K8S_NAMESPACE=ledger-pwa,GKE_CLUSTER=ledger-pwa-cluster \
    --project="$PROJECT_ID"

  # Deploy onRollback function
  echo "Deploying onRollback function..."
  gcloud functions deploy onRollback \
    --gen2 \
    --region="$REGION" \
    --trigger-topic=rollback.signal \
    --entry-point=onRollback \
    --runtime=nodejs22 \
    --memory=512Mi \
    --timeout=300s \
    --set-env-vars=GCP_PROJECT_ID="$PROJECT_ID",GCP_REGION="$REGION",K8S_NAMESPACE=ledger-pwa,GKE_CLUSTER=ledger-pwa-cluster \
    --project="$PROJECT_ID"

  # Deploy triggerManualRollback function
  echo "Deploying triggerManualRollback function..."
  gcloud functions deploy triggerManualRollback \
    --gen2 \
    --region="$REGION" \
    --trigger-http \
    --entry-point=triggerManualRollback \
    --runtime=nodejs22 \
    --memory=256Mi \
    --timeout=60s \
    --allow-unauthenticated \
    --set-env-vars=GCP_PROJECT_ID="$PROJECT_ID" \
    --project="$PROJECT_ID"
fi

cd ..

# Get function URLs
echo ""
echo "=== Cloud Functions Deployed ==="
echo ""
echo "Functions:"
gcloud functions list --project="$PROJECT_ID" --format="table(name,status,httpTrigger,buildStatus)" || true

echo ""
echo "Pub/Sub topics:"
gcloud pubsub topics list --project="$PROJECT_ID" || true

echo ""
echo "✓ Cloud Functions deployment complete"
echo ""
echo "To test the manual rollback function:"
echo "  curl -X POST https://$REGION-$PROJECT_ID.cloudfunctions.net/triggerManualRollback \\"
echo "    -H \"Content-Type: application/json\" \\"
echo "    -d '{\"deploymentName\": \"ledger-pwa\", \"namespace\": \"ledger-pwa\", \"reason\": \"Test rollback\"}'"
