#!/bin/bash

# LM Studio Startup Helper
# Starts LM Studio application and waits for the API server to be ready

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

LM_STUDIO_APP="/Applications/LM Studio.app"
LM_STUDIO_URL="http://localhost:1234/v1"
MAX_WAIT=30  # Maximum seconds to wait for server

echo -e "${YELLOW}LM Studio Startup Helper${NC}"
echo "=============================="
echo ""

# Check if LM Studio is installed
if [ ! -d "$LM_STUDIO_APP" ]; then
    echo -e "${RED}Error: LM Studio not found at $LM_STUDIO_APP${NC}"
    echo "Please install LM Studio from: https://lmstudio.ai/"
    exit 1
fi

# Check if server is already running
if curl -s "$LM_STUDIO_URL/models" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ LM Studio server is already running!${NC}"
    echo ""
    echo "Server URL: $LM_STUDIO_URL"
    echo ""
    echo "To list available models:"
    echo "  curl $LM_STUDIO_URL/models"
    echo ""
    echo "To test a chat completion:"
    echo '  curl -X POST '$LM_STUDIO_URL/chat/completions' -H "Content-Type: application/json" -d '"'"'{"model": "local-model", "messages": [{"role": "user", "content": "Hello"}]}'"'"
    exit 0
fi

echo "LM Studio server is not running. Starting it now..."
echo ""

# Start LM Studio application
open "$LM_STUDIO_APP"

echo -e "${YELLOW}Waiting for LM Studio server to start...${NC}"
echo ""

# Wait for server to be ready
for i in $(seq 1 $MAX_WAIT); do
    if curl -s "$LM_STUDIO_URL/models" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ LM Studio server is ready!${NC}"
        echo ""
        echo "Server URL: $LM_STUDIO_URL"
        echo ""
        echo "Next steps:"
        echo "  1. Open LM Studio application"
        echo "  2. Load a model (recommended: codellama, deepseek-coder, or llama-3.1)"
        echo "  3. Start the server from the 'Local Server' tab"
        echo ""
        echo "To list available models:"
        echo "  curl $LM_STUDIO_URL/models"
        echo ""
        echo "To test a chat completion:"
        echo '  curl -X POST '$LM_STUDIO_URL/chat/completions' -H "Content-Type: application/json" -d '"'"'{"model": "local-model", "messages": [{"role": "user", "content": "Hello"}]}'"'"
        exit 0
    fi
    echo -n "."
    sleep 1
done

echo ""
echo -e "${RED}Error: LM Studio server did not start within $MAX_WAIT seconds${NC}"
echo ""
echo "Please check:"
echo "  1. LM Studio application is open"
echo "  2. Server is started from the 'Local Server' tab"
echo "  3. Server port is 1234 (default)"
exit 1
