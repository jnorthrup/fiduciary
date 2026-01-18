#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

if [ -z "$1" ]; then
    echo "Usage: ./deploy-gcp.sh <PROJECT_ID> [REGION]"
    exit 1
fi

PROJECT_ID=$1
REGION=${2:-us-central1}
IMAGE_NAME="gcr.io/$PROJECT_ID/trust-ledger-server"

echo -e "${GREEN}Deploying Thin Demo to GCP ($PROJECT_ID)...${NC}"

# 1. Prerequisites Check
if ! command -v gcloud &> /dev/null; then
    echo "gcloud CLI is required."
    exit 1
fi

# 2. Build & Push Image
echo -e "${BLUE}Building and pushing Docker image...${NC}"
gcloud auth configure-docker gcr.io --quiet
docker build -t $IMAGE_NAME:latest ./server
docker push $IMAGE_NAME:latest

# 3. Configure Cluster Credentials
echo -e "${BLUE}Getting GKE credentials...${NC}"
gcloud container clusters get-credentials trust-ledger-demo --region $REGION --project $PROJECT_ID || {
    echo "Cluster not found. Please run Terraform first."
    exit 1
}

# 4. Prepare Manifests
echo -e "${BLUE}Preparing Kubernetes manifests...${NC}"
mkdir -p k8s/overlays/gcp-demo/build
# Replace placeholder with actual project ID
sed "s/PROJECT_ID_PLACEHOLDER/$PROJECT_ID/g" k8s/overlays/gcp-demo/kustomization.yaml > k8s/overlays/gcp-demo/build/kustomization.yaml
# Copy resources to build dir context logic (Kustomize is path sensitive)
# Instead of complex cp, we just use sed inline on a temp copy or environment variables.
# Simpler approach: Use 'kustomize edit set image' if installed, or just the sed approach on a temp overlay.

# Let's use a temporary overlay to avoid dirtying the git repo
cp -r k8s/overlays/gcp-demo k8s/overlays/gcp-demo-deploy
sed -i.bak "s/PROJECT_ID_PLACEHOLDER/$PROJECT_ID/g" k8s/overlays/gcp-demo-deploy/kustomization.yaml

# 5. Apply
echo -e "${BLUE}Applying configurations...${NC}"
kubectl apply -k k8s/overlays/gcp-demo-deploy

# Cleanup
rm -rf k8s/overlays/gcp-demo-deploy

echo -e "${GREEN}Deployment applied!${NC}"
echo "Wait for the LoadBalancer IP:"
echo "kubectl get svc api-gateway -n fiduciary-system -w"
