# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

# Install Docker CLI for docker exec commands (YouTube downloads)
RUN apk add --no-cache docker-cli

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Copy database.sql file (needed for initialization)
COPY --from=builder /app/src/config/database.sql ./dist/config/database.sql

# Create storage directories
RUN mkdir -p /app/storage/uploads /app/storage/thumbnails

# Expose port
EXPOSE 3001

# Start the application
CMD ["node", "dist/index.js"]

