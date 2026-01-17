#!/bin/bash
set -e

# Environment variable initialization
: "${GCP_PROJECT_ID:=}"
: "${GEMINI_API_KEY:=}"
: "${REGION:=us-central1}"

# Colors
readonly GREEN='\033[0;32m'
readonly BLUE='\033[0;34m'
readonly YELLOW='\033[1;33m'
readonly NC='\033[0m'

echo -e "${BLUE}══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Vite Demo Build & Release${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════${NC}"

# Step 1: Build Vite app
echo -e "${GREEN}Step 1: Building Vite app...${NC}"
npm run build

# Check build output
if [ ! -d "dist" ]; then
    echo "Build failed: dist directory not found"
    exit 1
fi

echo -e "${GREEN}✓ Build complete: dist/ created${NC}"
ls -lh dist/

# Step 2: Create Dockerfile for static hosting
echo -e "${GREEN}Step 2: Creating production Dockerfile...${NC}"
cat > Dockerfile.demo << 'EOF'
FROM nginx:alpine

# Copy built static files
COPY dist /usr/share/nginx/html

# Create nginx config for SPA routing
RUN echo 'server { \
    listen 8080; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
EOF

echo -e "${GREEN}✓ Dockerfile.demo created${NC}"

# Step 3: Test local preview
echo -e "${GREEN}Step 3: Testing local preview...${NC}"
echo -e "${YELLOW}Run 'npm run preview' to test locally${NC}"
echo -e "${YELLOW}Or use: python3 -m http.server 8000 --directory dist${NC}"

# Step 4: Deploy to Cloud Run (optional)
if [ -n "$GCP_PROJECT_ID" ]; then
    read -p "Deploy to Cloud Run? (y/N): " DEPLOY_CONFIRM

    if [[ "$DEPLOY_CONFIRM" =~ ^[Yy]$ ]]; then
        local IMAGE SERVICE_URL

        echo -e "${GREEN}Step 4: Deploying to Cloud Run...${NC}"

        IMAGE="gcr.io/$GCP_PROJECT_ID/demo-frontend:$(git rev-parse --short HEAD 2>/dev/null || echo 'latest')"

        echo -e "${BLUE}Building container image...${NC}"
        gcloud builds submit . \
            --tag "$IMAGE" \
            --project "$GCP_PROJECT_ID" \
            --timeout=10m

        echo -e "${BLUE}Deploying to Cloud Run...${NC}"
        gcloud run deploy demo-frontend \
            --image "$IMAGE" \
            --region "$REGION" \
            --platform managed \
            --allow-unauthenticated \
            --port 8080 \
            --project "$GCP_PROJECT_ID"

        SERVICE_URL=$(gcloud run services describe demo-frontend \
            --platform managed \
            --region "$REGION" \
            --format='value(status.url)' \
            --project "$GCP_PROJECT_ID")

        echo ""
        echo -e "${GREEN}✓ Demo deployed: ${SERVICE_URL}${NC}"
    fi
else
    echo -e "${YELLOW}GCP_PROJECT_ID not set, skipping Cloud Run deployment${NC}"
fi

echo ""
echo -e "${GREEN}══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Demo Release Complete${NC}"
echo -e "${GREEN}══════════════════════════════════════════════════${NC}"
echo ""
echo "Next steps:"
echo "  - Test locally: npm run preview"
echo "  - Deploy: export GCP_PROJECT_ID=your-project && ./demo-release.sh"
echo "  - View dist: ls -lh dist/"
