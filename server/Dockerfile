FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose port (default to 3001, but can be overridden)
EXPOSE 3001

# Start command
CMD ["npm", "start"]
