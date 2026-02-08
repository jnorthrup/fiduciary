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
# 1. Build & Push Image (Cloud Build)
echo -e "${BLUE}Building & Pushing with Cloud Build...${NC}"
gcloud builds submit --tag $IMAGE_NAME:$TAG .
gcloud container images add-tag $IMAGE_NAME:$TAG $IMAGE_NAME:latest --quiet

# 2. Deploy
if command -v terraform &> /dev/null; then
  echo -e "${BLUE}Applying Terraform...${NC}"
  cd infra/gcp
  terraform init
  terraform apply -auto-approve \
    -var="project_id=$PROJECT_ID" \
    -var="region=$REGION" \
    -var="service_name=$SERVICE_NAME" \
    -var="image_url=$IMAGE_NAME"
else
  echo -e "${BLUE}Terraform not found. Falling back to direct Cloud Run deployment...${NC}"
  gcloud run deploy $SERVICE_NAME \
    --image $IMAGE_NAME:latest \
    --platform managed \
    --region $REGION \
    --project $PROJECT_ID \
    --allow-unauthenticated
fi

# 3. Get URL
echo -e "${GREEN}Deployment Complete!${NC}"
URL=$(gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --project $PROJECT_ID --format 'value(status.url)')
echo -e "Service URL: ${GREEN}$URL${NC}"
