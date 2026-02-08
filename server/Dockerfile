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
COPY package.json ./

# Install production dependencies (use npm install since we may not have package-lock.json in context)
RUN npm install --omit=dev --no-audit --no-fund

# Copy server source code
COPY . .

# Create public directory for static files (will be populated by build step)
RUN mkdir -p public && chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port (Cloud Run uses PORT env var, default 3001)
EXPOSE 3001

# Health check (use /api/health which is the actual endpoint)
# Note: Cloud Run uses PORT env var (typically 8080), so we use it in the healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e "const p=process.env.PORT||3001;const h=require('http');h.get('http://localhost:'+p+'/api/health',(r)=>{r.statusCode===200?process.exit(0):process.exit(1)}).on('error',()=>process.exit(1))"

# Start server with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "index.js"]
