# -----------------------------
# Stage 1: Builder
# -----------------------------
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies and security updates
RUN apk update && \
    apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    && rm -rf /var/cache/apk/*

# Copy package files for dependency installation
COPY package*.json ./
COPY turbo.json ./
COPY tsconfig.json ./

# Copy workspace packages
COPY api-gateway/package.json ./api-gateway/
COPY booking-service/package.json ./booking-service/
COPY ml-service/package.json ./ml-service/
COPY persona-service/package.json ./persona-service/
COPY professional-service/package.json ./professional-service/
COPY social-service/package.json ./social-service/
COPY shared/package.json ./shared/

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy source code
COPY . .

# Build TypeScript code
RUN npm run build

# Prune dev dependencies and unnecessary files
RUN npm prune --production

# -----------------------------
# Stage 2: Production
# -----------------------------
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install production dependencies
RUN apk update && \
    apk add --no-cache \
    tini \
    curl \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 nodejs && \
    adduser -S -u 1001 -G nodejs nodejs

# Copy production dependencies and built artifacts
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Copy health check script
COPY --chown=nodejs:nodejs healthcheck.js ./

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    NODE_OPTIONS="--max-old-space-size=2048" \
    TZ=UTC

# Create necessary directories with correct permissions
RUN mkdir -p /app/logs /app/tmp && \
    chown -R nodejs:nodejs /app/logs /app/tmp

# Configure health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD node healthcheck.js

# Switch to non-root user
USER nodejs

# Expose service port
EXPOSE 3000

# Set up volumes for persistent data
VOLUME ["/app/logs", "/app/tmp"]

# Use tini as init system
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application
CMD ["node", "dist/api-gateway/src/main.js"]

# Add metadata labels
LABEL maintainer="AI Travel Platform Team" \
      version="1.0.0" \
      description="AI Travel Platform Backend Services" \
      org.opencontainers.image.source="https://github.com/organization/ai-travel-platform"