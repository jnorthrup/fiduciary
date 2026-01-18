#!/bin/bash
set -e

# Skip if gcloud is not installed (e.g. widely distributed dev env)
if ! command -v gcloud &> /dev/null; then
    echo "Warning: gcloud not found. Skipping local deployment check."
    echo "Push will proceed to trigger remote Cloud Build."
    exit 0
fi

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

if [ -z "$1" ]; then
    echo "Usage: ./deploy-fullstack.sh <PROJECT_ID> [REGION]"
    exit 1
fi

PROJECT_ID=$1
REGION=${2:-us-central1}
SERVICE_NAME="trust-ledger-fullstack"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"
# Use a timestamp or short sha tag
TAG=$(git rev-parse --short HEAD)

echo -e "${GREEN}Deploying Fullstack App to Cloud Run ($PROJECT_ID)...${NC}"

# 1. Build & Push Image
echo -e "${BLUE}Building Docker image (Frontend + Backend)...${NC}"
# Use root context because Dockerfile needs root package.json and server/
docker build -f server/Dockerfile -t $IMAGE_NAME:$TAG -t $IMAGE_NAME:latest .

echo -e "${BLUE}Pushing Docker image...${NC}"
docker push $IMAGE_NAME:$TAG
docker push $IMAGE_NAME:latest

# 2. Deploy infrastructure via Terraform
echo -e "${BLUE}Applying Terraform...${NC}"
cd infra/gcp
terraform init
terraform apply -auto-approve \
  -var="project_id=$PROJECT_ID" \
  -var="region=$REGION" \
  -var="service_name=$SERVICE_NAME" \
  -var="image_url=$IMAGE_NAME:$TAG"

# 3. Get URL
echo -e "${GREEN}Deployment Complete!${NC}"
URL=$(gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)')
echo -e "Service URL: ${GREEN}$URL${NC}"
