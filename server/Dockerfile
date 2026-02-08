# =============================================================================
# Dockerfile for Server-Only Deployment
# =============================================================================
FROM node:20-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --omit=dev --no-audit --no-fund

# Copy server source code
COPY . .

# Create public directory for static files (will be populated by build step)
RUN mkdir -p public && chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Start server with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "index.js"]
