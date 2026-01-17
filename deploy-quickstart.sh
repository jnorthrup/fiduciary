#!/bin/bash
set -e

# Environment variable initialization
: "${GCP_PROJECT_ID:=}"
: "${GEMINI_API_KEY:=}"
: "${REGION:=us-central1}"
: "${CHOICE:=}"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}     5-Minute GCP Cloud Run Deployment Quickstart${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"

# Check prerequisites
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is required${NC}"
    echo "Install: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Get or validate project ID
if [ -z "$GCP_PROJECT_ID" ]; then
    echo -e "${YELLOW}GCP_PROJECT_ID not set${NC}"
    read -p "Enter your GCP Project ID: " GCP_PROJECT_ID
    export GCP_PROJECT_ID
fi

echo -e "${BLUE}Using GCP Project: ${GCP_PROJECT_ID}${NC}"

# Verify project exists and user has access
if ! gcloud projects describe "$GCP_PROJECT_ID" &> /dev/null; then
    echo -e "${RED}Error: Cannot access project ${GCP_PROJECT_ID}${NC}"
    echo "Check project ID and authentication"
    exit 1
fi

# Set default project for billing tracking
gcloud config set project "$GCP_PROJECT_ID"

START_TIME=$(date +%s)

# Option selection
echo ""
echo "Select deployment target:"
echo "  1) Hello World (minimal Express app)"
echo "  2) AI Studio Frontend (React/Vite)"
echo "  3) Fullstack Backend (Node.js + Firebase)"
echo "  4) All (complete deployment)"
read -p "Enter choice [1-4]: " CHOICE

deploy_hello_world() {
    local IMAGE SERVICE_URL

    echo -e "${BLUE}┌─ Deploying Hello World${NC}"

    IMAGE="gcr.io/$GCP_PROJECT_ID/hello-world:$(git rev-parse --short HEAD 2>/dev/null || echo 'latest')"

    echo -e "${BLUE}├─ Building container image...${NC}"
    gcloud builds submit server/hello-world \
        --tag "$IMAGE" \
        --project "$GCP_PROJECT_ID" \
        --quiet

    echo -e "${BLUE}├─ Deploying to Cloud Run...${NC}"
    gcloud run deploy hello-world \
        --image "$IMAGE" \
        --region "$REGION" \
        --platform managed \
        --allow-unauthenticated \
        --project "$GCP_PROJECT_ID" \
        --quiet

    SERVICE_URL=$(gcloud run services describe hello-world \
        --platform managed \
        --region "$REGION" \
        --format='value(status.url)' \
        --project "$GCP_PROJECT_ID")

    echo -e "${GREEN}└─ Hello World deployed: ${SERVICE_URL}${NC}"
    echo ""
    echo -e "Test: ${BLUE}curl ${SERVICE_URL}/health${NC}"
}

deploy_frontend() {
    local IMAGE SERVICE_URL

    echo -e "${BLUE}┌─ Deploying AI Studio Frontend${NC}"

    if [ -z "$GEMINI_API_KEY" ]; then
        echo -e "${YELLOW}├─ Warning: GEMINI_API_KEY not set${NC}"
        read -p "Enter GEMINI_API_KEY (or press Enter to skip): " GEMINI_API_KEY
    fi

    echo -e "${BLUE}├─ Installing dependencies...${NC}"
    npm install --quiet

    echo -e "${BLUE}├─ Building frontend...${NC}"
    VITE_GEMINI_API_KEY="$GEMINI_API_KEY" npm run build

    # Create Dockerfile for frontend if it doesn't exist
    if [ ! -f "Dockerfile.frontend" ]; then
        cat > Dockerfile.frontend << 'EOF'
FROM nginx:alpine
COPY dist /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
EOF
    fi

    IMAGE="gcr.io/$GCP_PROJECT_ID/frontend:$(git rev-parse --short HEAD 2>/dev/null || echo 'latest')"

    echo -e "${BLUE}├─ Building container image...${NC}"
    docker build -f Dockerfile.frontend -t "$IMAGE" .
    docker push "$IMAGE"

    echo -e "${BLUE}├─ Deploying to Cloud Run...${NC}"
    gcloud run deploy frontend \
        --image "$IMAGE" \
        --region "$REGION" \
        --platform managed \
        --allow-unauthenticated \
        --project "$GCP_PROJECT_ID" \
        --quiet

    SERVICE_URL=$(gcloud run services describe frontend \
        --platform managed \
        --region "$REGION" \
        --format='value(status.url)' \
        --project "$GCP_PROJECT_ID")

    echo -e "${GREEN}└─ Frontend deployed: ${SERVICE_URL}${NC}"
}

deploy_backend() {
    local IMAGE SERVICE_URL ENV_VARS SECRET_ARGS

    echo -e "${BLUE}┌─ Deploying Fullstack Backend${NC}"

    if [ -z "$GEMINI_API_KEY" ]; then
        echo -e "${YELLOW}├─ Warning: GEMINI_API_KEY not set${NC}"
        read -p "Enter GEMINI_API_KEY: " GEMINI_API_KEY
    fi

    ENV_VARS="GEMINI_API_KEY=$GEMINI_API_KEY"

    # Check for Firebase credentials
    if [ -f "firebase-sa-key.json" ]; then
        echo -e "${BLUE}├─ Uploading Firebase credentials to Secret Manager...${NC}"

        # Create secret if it doesn't exist
        if ! gcloud secrets describe firebase-sa-key --project "$GCP_PROJECT_ID" &> /dev/null; then
            gcloud secrets create firebase-sa-key \
                --data-file=firebase-sa-key.json \
                --project "$GCP_PROJECT_ID" \
                --quiet
        else
            gcloud secrets versions add firebase-sa-key \
                --data-file=firebase-sa-key.json \
                --project "$GCP_PROJECT_ID" \
                --quiet
        fi

        SECRET_ARGS="--set-secrets=FIREBASE_SERVICE_ACCOUNT=firebase-sa-key:latest"
    else
        echo -e "${YELLOW}├─ Warning: firebase-sa-key.json not found, skipping Firebase setup${NC}"
        SECRET_ARGS=""
    fi

    IMAGE="gcr.io/$GCP_PROJECT_ID/trust-ledger-server:$(git rev-parse --short HEAD 2>/dev/null || echo 'latest')"

    echo -e "${BLUE}├─ Building container image...${NC}"
    gcloud builds submit server \
        --tag "$IMAGE" \
        --project "$GCP_PROJECT_ID" \
        --quiet

    echo -e "${BLUE}├─ Deploying to Cloud Run...${NC}"
    gcloud run deploy api-server \
        --image "$IMAGE" \
        --region "$REGION" \
        --platform managed \
        --allow-unauthenticated \
        --set-env-vars "$ENV_VARS" \
        $SECRET_ARGS \
        --project "$GCP_PROJECT_ID" \
        --quiet

    SERVICE_URL=$(gcloud run services describe api-server \
        --platform managed \
        --region "$REGION" \
        --format='value(status.url)' \
        --project "$GCP_PROJECT_ID")

    echo -e "${GREEN}└─ Backend deployed: ${SERVICE_URL}${NC}"
    echo ""
    echo -e "Test: ${BLUE}curl ${SERVICE_URL}/api/health${NC}"
}

# Execute deployment based on choice
case $CHOICE in
    1)
        deploy_hello_world
        ;;
    2)
        deploy_frontend
        ;;
    3)
        deploy_backend
        ;;
    4)
        deploy_hello_world
        deploy_frontend
        deploy_backend
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

readonly END_TIME=$(date +%s)
readonly ELAPSED=$((END_TIME - START_TIME))
readonly MINUTES=$((ELAPSED / 60))
readonly SECONDS=$((ELAPSED % 60))

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Deployment Complete! Time: ${MINUTES}m ${SECONDS}s${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "Next steps:"
echo "  - Monitor logs: gcloud logging read --limit 20"
echo "  - View services: https://console.cloud.google.com/run?project=$GCP_PROJECT_ID"
echo "  - Set up CI/CD: See .github/workflows/deploy-hello-cloudrun.yml"
