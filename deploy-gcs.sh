#!/bin/bash
set -e

# Deploy to GCS Static Hosting
# Usage: ./deploy-gcs.sh <PROJECT_ID> [REGION]

if [ -z "$1" ]; then
  echo "Usage: ./deploy-gcs.sh <PROJECT_ID>"
  exit 1
fi

PROJECT_ID=$1
BUCKET_NAME="${PROJECT_ID}-fullstack-static"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}Deploying to GCS: ${BUCKET_NAME}${NC}"

# 1. Build with Firebase disabled
echo -e "${BLUE}Building static files (Firebase/Gmail auth disabled)...${NC}"
VITE_FIREBASE_ENABLED=false VITE_GMAIL_AUTH_ENABLED=false npm run build

# 2. Create bucket if it doesn't exist
echo -e "${BLUE}Ensuring GCS bucket exists...${NC}"
gsutil ls -b gs://${BUCKET_NAME} 2>/dev/null || \
  gsutil mb -p ${PROJECT_ID} gs://${BUCKET_NAME}

# 3. Enable website configuration
echo -e "${BLUE}Configuring bucket for website hosting...${NC}"
gsutil web set -m index.html -e 404.html gs://${BUCKET_NAME}

# 4. Upload to GCS
echo -e "${BLUE}Uploading files to GCS...${NC}"
gsutil -m rsync -r -d dist/ gs://${BUCKET_NAME}/

# 5. Set cache headers
echo -e "${BLUE}Setting cache headers...${NC}"
gsutil -m setmeta -h "Cache-Control:public, max-age=31536000, immutable" \
  gs://${BUCKET_NAME}/assets/*.js \
  gs://${BUCKET_NAME}/assets/*.css \
  gs://${BUCKET_NAME}/assets/*.woff* 2>/dev/null || true

gsutil setmeta -h "Cache-Control:public, max-age=3600" \
  gs://${BUCKET_NAME}/index.html 2>/dev/null || true

# 6. Make bucket public
echo -e "${BLUE}Setting public access...${NC}"
gsutil iam ch allUsers:objectViewer gs://${BUCKET_NAME} 2>/dev/null || true

echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "Website URL: ${GREEN}https://storage.googleapis.com/${BUCKET_NAME}/index.html${NC}"
echo -e "Bucket: gs://${BUCKET_NAME}"
