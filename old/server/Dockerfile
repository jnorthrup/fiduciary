# Stage 1: Build the Frontend & Server Dependencies
FROM node:20-alpine as builder

WORKDIR /build

# Copy root package files (if any needed for workspaces, but we'll assume standard structure)
# Copy server package files
COPY server/package*.json ./server/
# Copy frontend (root) package files
COPY package*.json ./

# Install dependencies (including devDependencies for build)
# We need to install in root for Vite, and in server for Express
RUN npm ci
cd server && npm ci

# Copy source code
COPY . .

# Build Frontend
# Assuming build command is in root package.json
RUN npm run build
# Output should be in /build/dist

# Stage 2: Runtime
FROM node:20-alpine

WORKDIR /app

# Copy server dependencies (production only? ideally. For now we copy from builder to check)
# Actually, let's just install prod deps in runtime stage to be clean
COPY server/package*.json ./
RUN npm ci --omit=dev

# Copy server source
COPY --from=builder /build/server .

# Copy built frontend assets to 'public' folder handled by express.static
COPY --from=builder /build/dist ./public

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "index.js"]
