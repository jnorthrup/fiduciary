# =============================================================================
# Multi-Stage Dockerfile with Idempotent Precheckout Layers
# =============================================================================
# This Dockerfile optimizes build times through:
# 1. Cached dependency layers (invalidated only when lock files change)
# 2. Parallel build capability (frontend and server deps are independent)
# 3. Minimal runtime image (only production assets)
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Base Dependencies (system packages, rarely changes)
# -----------------------------------------------------------------------------
FROM node:22-alpine AS base-deps

# Install dumb-init for proper signal handling in containers
RUN apk add --no-cache dumb-init

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
  adduser -S nodejs -u 1001

WORKDIR /app

# -----------------------------------------------------------------------------
# Stage 2: Frontend Dependencies (cached by package-lock.json hash)
# -----------------------------------------------------------------------------
FROM base-deps AS frontend-deps

# Copy only package files for dependency caching
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci --include=dev

# -----------------------------------------------------------------------------
# Stage 3: Server Dependencies (cached by server/package-lock.json hash)
# -----------------------------------------------------------------------------
FROM base-deps AS server-deps

WORKDIR /app/server

# Copy only server package files
COPY server/package.json server/package-lock.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# -----------------------------------------------------------------------------
# Stage 4: Frontend Build (parallel with server build)
# -----------------------------------------------------------------------------
FROM frontend-deps AS frontend-build

# Copy source files needed for build
COPY . .

# Set production environment variables for optimized build
ENV NODE_ENV=production
ENV VITE_FIREBASE_ENABLED=true
ENV VITE_GMAIL_AUTH_ENABLED=true
ENV VITE_IRS_API_URL=/api
ENV VITE_DEMO_MODE=false

# Build the frontend
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 5: Server Preparation (parallel with frontend build)
# -----------------------------------------------------------------------------
FROM server-deps AS server-build

WORKDIR /app/server

# Copy server source files
COPY server/ ./

# Create public directory for frontend assets
RUN mkdir -p public

# -----------------------------------------------------------------------------
# Stage 6: Runtime (minimal production image)
# -----------------------------------------------------------------------------
FROM node:22-alpine AS runtime

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
  adduser -S nodejs -u 1001

WORKDIR /app

# Copy server with dependencies from server-build stage
COPY --from=server-build --chown=nodejs:nodejs /app/server ./

# Copy frontend build artifacts into server's public directory
COPY --from=frontend-build --chown=nodejs:nodejs /app/dist ./public/

# Switch to non-root user
USER nodejs

# Expose the server port
EXPOSE 3001

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly (prevents zombie processes)
ENTRYPOINT ["dumb-init", "--"]

# Start the server with tsx to handle TypeScript imports
CMD ["npx", "tsx", "index.js"]
