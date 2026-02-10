#!/bin/bash
# deploy-cloud-functions.sh
# Deploys Cloud Functions for orchestration and rollback

set -e

PROJECT_ID="${1:-${GCP_PROJECT_ID:-fiduciary-prod}}"
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

# Determine script and project directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Generate Build ID
BUILD_ID=$(date +%Y%m%d%H%M%S)
NEW_BUCKET="${PROJECT_ID}-static-${BUILD_ID}"
PERSISTENCE_BUCKET="fiduciary-persistence-${PROJECT_ID}"

# Build functions
echo ""
echo "Building Cloud Functions..."
# Ensure frontend is built first
echo "Building frontend assets..."
cd "$PROJECT_ROOT"
npm install
npm run build

echo "Building cloud-functions..."
cd "$PROJECT_ROOT/cloud-functions"
npm install
npm run build

# Manage GCS Buckets
echo ""
echo "Ensuring persistence bucket exists: gs://${PERSISTENCE_BUCKET}..."
gsutil mb -p "$PROJECT_ID" -l "$REGION" "gs://${PERSISTENCE_BUCKET}" 2>/dev/null || echo "Persistence bucket already exists"

echo "Creating build bucket: gs://${NEW_BUCKET}..."
gsutil mb -p "$PROJECT_ID" -l "$REGION" "gs://${NEW_BUCKET}" || true


echo "Uploading assets to gs://${NEW_BUCKET}..."
gsutil -m cp -r "$PROJECT_ROOT/dist/*" "gs://${NEW_BUCKET}/"

# Set public access (optional, since GCF proxies, but if we want direct GCS backup)
# gsutil iam ch allUsers:objectViewer "gs://${NEW_BUCKET}"

# Cleanup old buckets (keep last 5)
echo "Cleaning up old build buckets..."
BUCKETS=$(gsutil ls -p "$PROJECT_ID" | grep "${PROJECT_ID}-static-" | sort -r)
COUNT=0
for B in $BUCKETS; do
  COUNT=$((COUNT+1))
  if [ $COUNT -gt 5 ]; then
    echo "Deleting old bucket: $B (Parallel)"
    gsutil -m rm -r "$B"
  fi
done

# Deploy functions using gcloud (Force pure serverless)
echo ""
echo "Deploying Cloud Functions via gcloud..."

# Create a trap to delete the NEW_BUCKET if the script fails before completion
cleanup_on_failure() {
  local exit_code=$?
  if [ $exit_code -ne 0 ]; then
    echo ""
    echo "!!! Deployment failed (Exit Code: $exit_code). Cleaning up failed deployment unit: gs://${NEW_BUCKET} (Parallel) ..."
    gsutil -m rm -r "gs://${NEW_BUCKET}" || true
    echo "Cleaned up failed unit. Exiting."
    exit $exit_code
  fi
}
trap cleanup_on_failure EXIT

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
  --project="$PROJECT_ID" --quiet

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
  --project="$PROJECT_ID" --quiet

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
  --project="$PROJECT_ID" --quiet

# Deploy serveApp function (Static Express)
echo "Deploying serveApp function..."
gcloud functions deploy serveApp \
  --gen2 \
  --region="$REGION" \
  --trigger-http \
  --entry-point=serveApp \
  --runtime=nodejs22 \
  --memory=512Mi \
  --timeout=60s \
  --allow-unauthenticated \
  --set-env-vars=GCP_PROJECT_ID="$PROJECT_ID",NODE_ENV=production,STATIC_BUCKET="$NEW_BUCKET",PERSISTENCE_BUCKET="$PERSISTENCE_BUCKET",GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID:-}" \
  --project="$PROJECT_ID" --quiet

# If we reached here, deployment was successful
echo "Deployment successful. Current bucket: gs://${NEW_BUCKET}"
trap - EXIT

cd "$PROJECT_ROOT"

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
