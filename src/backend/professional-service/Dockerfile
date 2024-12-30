# ===== Builder Stage =====
FROM node:18-alpine AS builder

# Set build arguments
ARG NODE_ENV=production
ARG BUILD_VERSION=1.0.0

# Install build essentials and security updates
RUN apk update && \
    apk add --no-cache \
    python3 \
    make \
    g++ \
    curl \
    && rm -rf /var/cache/apk/*

# Set working directory with appropriate permissions
WORKDIR /app
RUN chown -R node:node /app

# Copy package files with strict ownership
COPY --chown=node:node package*.json ./
COPY --chown=node:node tsconfig*.json ./

# Install dependencies with exact versions and integrity checks
RUN npm ci --only=production && \
    npm cache clean --force

# Copy source code with proper permissions
COPY --chown=node:node . .

# Run TypeScript compilation with optimizations
RUN npm run build && \
    npm prune --production

# Security audit
RUN npm audit

# ===== Production Stage =====
FROM node:18-alpine

# Set build arguments and labels
ARG NODE_ENV=production
ARG BUILD_VERSION=1.0.0

LABEL maintainer="AI Travel Platform Team" \
      service="professional-service" \
      version=${BUILD_VERSION} \
      security.scan="required" \
      backup.policy="daily"

# Install production essentials
RUN apk update && \
    apk add --no-cache \
    curl \
    tini \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 professional-service && \
    adduser -u 1001 -G professional-service -s /bin/sh -D professional-service

# Set working directory
WORKDIR /app

# Copy production artifacts with verified integrity
COPY --from=builder --chown=professional-service:professional-service /app/dist ./dist
COPY --from=builder --chown=professional-service:professional-service /app/node_modules ./node_modules
COPY --chown=professional-service:professional-service package.json ./

# Configure environment with secure defaults
ENV NODE_ENV=production \
    PORT=3000 \
    LOG_LEVEL=info \
    MAX_MEMORY=512M \
    NODE_OPTIONS="--max-old-space-size=512 --max-http-header-size=16384" \
    TZ=UTC

# Create and configure log directory
RUN mkdir -p /app/logs && \
    chown -R professional-service:professional-service /app/logs

# Switch to non-root user
USER professional-service

# Expose service port
EXPOSE 3000

# Health check configuration
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=40s \
    CMD curl -f http://localhost:3000/health || exit 1

# Use tini as init process
ENTRYPOINT ["/sbin/tini", "--"]

# Start the service
CMD ["node", "dist/main"]