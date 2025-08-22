# template/docker/Dockerfile
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY functions/package*.json ./functions/

# Install dependencies
RUN npm ci --only=production
RUN cd functions && npm ci --only=production

# Copy application code
COPY . .

# Build Vue app
RUN npm run build

# Production image
FROM node:18-alpine

WORKDIR /app

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/functions ./functions
COPY --from=builder /app/node_modules ./node_modules

# Install Firebase tools
RUN npm install -g firebase-tools

# Expose port
EXPOSE 8080

# Start the application
CMD ["npm", "run", "serve:production"]