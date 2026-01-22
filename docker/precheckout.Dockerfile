# =============================================================================
# CI Precheckout Base Image
# =============================================================================
# This image pre-installs common tools and dependencies to speed up CI builds.
# Build and push monthly or when tooling changes.
#
# Usage:
#   docker build -f docker/precheckout.Dockerfile -t precheckout:latest .
#   docker push us-central1-docker.pkg.dev/fiduciary-prod/trust-ledger/precheckout:latest
# =============================================================================

FROM node:22-alpine

LABEL org.opencontainers.image.title="Trust Ledger CI Precheckout"
LABEL org.opencontainers.image.description="Pre-warmed CI image with common dependencies"
LABEL org.opencontainers.image.version="1.0.0"

# Install system dependencies commonly needed for builds
RUN apk add --no-cache \
    # Build tools
    git \
    curl \
    bash \
    coreutils \
    # For native npm modules
    python3 \
    make \
    g++ \
    # Signal handling
    dumb-init \
    # For Playwright (if needed for e2e)
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Set Playwright to use system Chromium
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Pre-install commonly used global npm packages
RUN npm install -g \
    typescript@5 \
    tsx \
    vitest \
    esbuild \
    vite

# Create app directory
WORKDIR /app

# Pre-fetch common npm packages into cache
# This warms the npm cache for faster installs
COPY package.json package-lock.json ./
RUN npm ci && rm -rf /app/*

COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci && rm -rf /app/*

# Reset workdir
WORKDIR /app

# Default command (overridden in Cloud Build)
CMD ["node", "--version"]
