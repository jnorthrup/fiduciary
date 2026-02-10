FROM node:20-alpine

WORKDIR /app

# Copy server dependencies and install
COPY server/package*.json ./
RUN npm install

# Copy server application code
COPY server/ ./

# Copy built frontend assets to public directory
# (Assumes 'dist' exists in the build context root)
COPY dist/ ./public/

# Expose port (Cloud Run uses PORT env var, defaults to 8080)
EXPOSE 8080

# Start command
CMD ["npx", "tsx", "index.ts"]
