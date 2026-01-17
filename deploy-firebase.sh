#!/bin/bash
set -e

# Environment variable initialization
: "${GCP_PROJECT_ID:=gen-lang-client-0754063985}"
: "${FIREBASE_PROJECT:=gen-lang-client-0754063985}"

# Colors
readonly GREEN='\033[0;32m'
readonly BLUE='\033[0;34m'
readonly YELLOW='\033[1;33m'
readonly NC='\033[0m'

echo -e "${BLUE}══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Firebase Hosting Deploy: jnorthrup/fiduciary${NC}"
echo -e "${BLUE}  Commit: 1e0707b (tickler priority/sorting)${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════${NC}"

# Verify we're on the right commit
CURRENT_COMMIT=$(git rev-parse --short HEAD)
if [ "$CURRENT_COMMIT" != "1e0707b" ]; then
    echo -e "${YELLOW}Warning: Expected commit 1e0707b, got $CURRENT_COMMIT${NC}"
    read -p "Continue anyway? (y/N): " CONFIRM
    [[ ! "$CONFIRM" =~ ^[Yy]$ ]] && exit 1
fi

# Step 1: Install dependencies
echo -e "${GREEN}Step 1: Installing dependencies...${NC}"
npm install --quiet

# Step 2: Build Vite app
echo -e "${GREEN}Step 2: Building Vite production bundle...${NC}"
npm run build

# Check dist exists
if [ ! -d "dist" ]; then
    echo -e "${RED}Build failed: dist/ not found${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Build complete${NC}"
ls -lh dist/

# Step 3: Firebase setup check
echo ""
echo -e "${GREEN}Step 3: Checking Firebase configuration...${NC}"

if ! command -v firebase &> /dev/null; then
    echo -e "${YELLOW}Firebase CLI not found. Installing...${NC}"
    npm install -g firebase-tools
fi

# Verify logged in
if ! firebase projects:list &> /dev/null; then
    echo -e "${YELLOW}Not logged in to Firebase${NC}"
    echo "Run: firebase login"
    exit 1
fi

echo -e "${GREEN}✓ Firebase CLI ready${NC}"

# Step 4: Deploy to Firebase Hosting
echo ""
echo -e "${GREEN}Step 4: Deploying to Firebase Hosting...${NC}"
echo -e "${BLUE}Project: $FIREBASE_PROJECT${NC}"

firebase deploy --only hosting --project "$FIREBASE_PROJECT"

# Step 5: Get hosting URL
echo ""
SITE_URL="https://${FIREBASE_PROJECT}.web.app"
echo -e "${GREEN}══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}══════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}Site URL: ${SITE_URL}${NC}"
echo -e "Test: ${BLUE}curl ${SITE_URL}${NC}"
echo ""
echo "Firebase Console:"
echo "  https://console.firebase.google.com/project/$FIREBASE_PROJECT/hosting"
