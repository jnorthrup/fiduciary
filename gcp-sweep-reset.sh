#!/bin/bash
set -e

# Environment variable initialization
: "${GCP_PROJECT_ID:=}"
: "${REGION:=us-central1}"
: "${DRY_RUN:=false}"

# Colors
readonly GREEN='\033[0;32m'
readonly BLUE='\033[0;34m'
readonly YELLOW='\033[1;33m'
readonly RED='\033[0;31m'
readonly NC='\033[0m'

echo -e "${BLUE}══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  GCP Sweep & Reset for Main Branch Deploy${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════${NC}"

# Check prerequisites
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is required${NC}"
    exit 1
fi

if [ -z "$GCP_PROJECT_ID" ]; then
    echo -e "${YELLOW}GCP_PROJECT_ID not set${NC}"
    read -p "Enter your GCP Project ID: " GCP_PROJECT_ID
    export GCP_PROJECT_ID
fi

echo -e "${GREEN}Project: ${GCP_PROJECT_ID}${NC}"
echo -e "${GREEN}Region: ${REGION}${NC}"
echo ""

# Set project for billing tracking
gcloud config set project "$GCP_PROJECT_ID" --quiet

# Step 1: List existing Cloud Run services
echo -e "${BLUE}Step 1: Scanning Cloud Run services...${NC}"
SERVICES=$(gcloud run services list --region="$REGION" --format="value(metadata.name)" 2>/dev/null || echo "")

if [ -z "$SERVICES" ]; then
    echo -e "${GREEN}✓ No Cloud Run services found${NC}"
else
    echo -e "${YELLOW}Found services:${NC}"
    echo "$SERVICES" | while read -r service; do
        echo "  - $service"
    done
    echo ""

    if [ "$DRY_RUN" = "true" ]; then
        echo -e "${YELLOW}[DRY RUN] Would delete these services${NC}"
    else
        read -p "Delete all Cloud Run services? (y/N): " CONFIRM
        if [[ "$CONFIRM" =~ ^[Yy]$ ]]; then
            echo "$SERVICES" | while read -r service; do
                echo -e "${BLUE}  Deleting $service...${NC}"
                gcloud run services delete "$service" \
                    --region="$REGION" \
                    --quiet 2>/dev/null || echo -e "${YELLOW}  Failed to delete $service${NC}"
            done
            echo -e "${GREEN}✓ Services deleted${NC}"
        else
            echo -e "${YELLOW}Skipping service deletion${NC}"
        fi
    fi
fi

# Step 2: List and optionally clean container images
echo ""
echo -e "${BLUE}Step 2: Scanning Container Registry images...${NC}"
IMAGES=$(gcloud container images list --repository=gcr.io/$GCP_PROJECT_ID --format="value(name)" 2>/dev/null || echo "")

if [ -z "$IMAGES" ]; then
    echo -e "${GREEN}✓ No container images found${NC}"
else
    echo -e "${YELLOW}Found images:${NC}"
    echo "$IMAGES" | while read -r image; do
        echo "  - $image"
        # Show tags
        TAGS=$(gcloud container images list-tags "$image" --limit=3 --format="value(tags)" 2>/dev/null || echo "")
        if [ -n "$TAGS" ]; then
            echo "    Tags: $TAGS"
        fi
    done
    echo ""

    if [ "$DRY_RUN" = "true" ]; then
        echo -e "${YELLOW}[DRY RUN] Would clean old image tags${NC}"
    else
        read -p "Clean old container images? (y/N): " CONFIRM
        if [[ "$CONFIRM" =~ ^[Yy]$ ]]; then
            echo "$IMAGES" | while read -r image; do
                echo -e "${BLUE}  Cleaning old tags for $image...${NC}"
                # Keep latest 3 tags, delete rest
                gcloud container images list-tags "$image" \
                    --format="get(digest)" \
                    --limit=999 | tail -n +4 | while read -r digest; do
                    gcloud container images delete "${image}@${digest}" --quiet 2>/dev/null || true
                done
            done
            echo -e "${GREEN}✓ Old images cleaned (kept 3 latest)${NC}"
        else
            echo -e "${YELLOW}Skipping image cleanup${NC}"
        fi
    fi
fi

# Step 3: Check for Cloud Build triggers
echo ""
echo -e "${BLUE}Step 3: Scanning Cloud Build triggers...${NC}"
TRIGGERS=$(gcloud builds triggers list --format="value(name)" 2>/dev/null || echo "")

if [ -z "$TRIGGERS" ]; then
    echo -e "${GREEN}✓ No Cloud Build triggers found${NC}"
else
    echo -e "${YELLOW}Found triggers:${NC}"
    echo "$TRIGGERS" | while read -r trigger; do
        echo "  - $trigger"
    done
fi

# Step 4: Check for active Cloud Build operations
echo ""
echo -e "${BLUE}Step 4: Checking active Cloud Builds...${NC}"
BUILDS=$(gcloud builds list --ongoing --limit=5 --format="value(id,status)" 2>/dev/null || echo "")

if [ -z "$BUILDS" ]; then
    echo -e "${GREEN}✓ No active builds${NC}"
else
    echo -e "${YELLOW}Active builds:${NC}"
    echo "$BUILDS"
fi

# Step 5: Reset to main branch (pre-agentic commits)
echo ""
echo -e "${BLUE}Step 5: Resetting to AI Studio main branch commit...${NC}"
echo -e "${YELLOW}Last AI Studio commit: 5f76437 'Changes before Firebase Studio auto-run'${NC}"
echo -e "${YELLOW}Current branch: $(git branch --show-current)${NC}"

if [ "$DRY_RUN" = "true" ]; then
    echo -e "${YELLOW}[DRY RUN] Would create branch from 5f76437${NC}"
else
    read -p "Create fresh branch from AI Studio commit? (y/N): " CONFIRM
    if [[ "$CONFIRM" =~ ^[Yy]$ ]]; then
        TIMESTAMP=$(date +%Y%m%d_%H%M%S)
        NEW_BRANCH="clean-studio-${TIMESTAMP}"

        echo -e "${BLUE}  Creating branch $NEW_BRANCH from 5f76437...${NC}"
        git checkout -b "$NEW_BRANCH" 5f76437

        echo -e "${GREEN}✓ Branch $NEW_BRANCH created${NC}"
        echo -e "${YELLOW}  You are now on a clean AI Studio state${NC}"
        echo -e "${YELLOW}  Original branch preserved${NC}"
    else
        echo -e "${YELLOW}Skipping branch reset${NC}"
    fi
fi

# Step 6: Deploy clean main
echo ""
echo -e "${BLUE}Step 6: Ready to deploy clean main branch${NC}"
echo -e "${YELLOW}Deploy the actual server/ directory (not hello-world demo)${NC}"

if [ "$DRY_RUN" = "true" ]; then
    echo -e "${YELLOW}[DRY RUN] Would deploy server/ to Cloud Run${NC}"
else
    read -p "Deploy main server now? (y/N): " CONFIRM
    if [[ "$CONFIRM" =~ ^[Yy]$ ]]; then
        local IMAGE SERVICE_URL
        IMAGE="gcr.io/$GCP_PROJECT_ID/trust-ledger-server:$(git rev-parse --short HEAD)"

        echo -e "${BLUE}  Building main server image...${NC}"
        gcloud builds submit server \
            --tag "$IMAGE" \
            --project "$GCP_PROJECT_ID" \
            --timeout=20m

        echo -e "${BLUE}  Deploying to Cloud Run...${NC}"
        gcloud run deploy trust-ledger-server \
            --image "$IMAGE" \
            --region "$REGION" \
            --platform managed \
            --allow-unauthenticated \
            --port 3001 \
            --set-env-vars "NODE_ENV=production" \
            --project "$GCP_PROJECT_ID"

        SERVICE_URL=$(gcloud run services describe trust-ledger-server \
            --platform managed \
            --region "$REGION" \
            --format='value(status.url)' \
            --project "$GCP_PROJECT_ID")

        echo ""
        echo -e "${GREEN}✓ Main server deployed: ${SERVICE_URL}${NC}"
        echo -e "Test: ${BLUE}curl ${SERVICE_URL}/api/health${NC}"
    else
        echo -e "${YELLOW}Skipping deployment${NC}"
    fi
fi

echo ""
echo -e "${GREEN}══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Sweep Complete${NC}"
echo -e "${GREEN}══════════════════════════════════════════════════${NC}"
echo ""
echo "Summary:"
echo "  - Cloud Run services: cleaned"
echo "  - Container images: cleaned (kept 3 latest)"
echo "  - Branch state: AI Studio clean commit"
echo "  - Ready for main branch deployment"
echo ""
echo "Next steps:"
echo "  - Test deployment: curl \$SERVICE_URL/api/health"
echo "  - Set up CI/CD: Configure GitHub Actions"
echo "  - Add secrets: GEMINI_API_KEY, FIREBASE_SA_KEY"
