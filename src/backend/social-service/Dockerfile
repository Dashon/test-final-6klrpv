# -----------------------------------------------------------------------------
# Build Stage
# -----------------------------------------------------------------------------
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++ curl

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies including devDependencies
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript code
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# -----------------------------------------------------------------------------
# Production Stage
# -----------------------------------------------------------------------------
FROM node:18-alpine

# Set labels
LABEL maintainer="DevOps Team" \
      service="social-service" \
      version="${BUILD_VERSION}" \
      environment="production"

# Install production dependencies
RUN apk add --no-cache curl tini

# Create non-root user
RUN addgroup -g 1000 node && \
    adduser -u 1000 -G node -s /bin/sh -D node

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built files from builder stage
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/node_modules ./node_modules

# Set security configurations
RUN mkdir -p /tmp && \
    chown -R node:node /tmp && \
    chmod 1777 /tmp && \
    chmod -R 755 /app

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    WS_PORT=3001 \
    NODE_OPTIONS="--max-old-space-size=2048" \
    TZ=UTC

# Expose ports
EXPOSE 3000 3001

# Switch to non-root user
USER node

# Set up health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Use tini as init system
ENTRYPOINT ["/sbin/tini", "--"]

# Start application
CMD ["node", "dist/index.js"]

# Security configurations
STOPSIGNAL SIGTERM

# Set read-only root filesystem
VOLUME ["/tmp"]

# Resource limits
LABEL com.docker.resource.memory="2Gi" \
      com.docker.resource.cpu="1000m" \
      com.docker.resource.pids="50"