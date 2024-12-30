# Stage 1: Builder
FROM node:18-alpine AS builder

# Add build dependencies for native modules
RUN apk add --no-cache python3 make g++ 

WORKDIR /usr/src/app

# Install dependencies with layer caching
COPY package*.json ./
RUN npm ci --production=false

# Copy source code and configs
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript code
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# Stage 2: Production
FROM node:18-alpine

# Set production environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    TZ=UTC \
    NODE_OPTIONS="--max-old-space-size=2048"

# Create non-root user/group
RUN addgroup -g 1000 nodejs && \
    adduser -u 1000 -G nodejs -s /bin/sh -D nodejs && \
    mkdir -p /usr/src/app && \
    chown -R nodejs:nodejs /usr/src/app

WORKDIR /usr/src/app

# Copy built artifacts from builder stage
COPY --from=builder --chown=nodejs:nodejs /usr/src/app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /usr/src/app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /usr/src/app/package.json ./

# Set proper permissions
RUN chmod -R 555 /usr/src/app && \
    chmod -R 555 /usr/src/app/dist && \
    chmod -R 555 /usr/src/app/node_modules && \
    mkdir -p /tmp && \
    chown -R nodejs:nodejs /tmp && \
    chmod 1777 /tmp

# Configure security
RUN apk add --no-cache wget && \
    rm -rf /var/cache/apk/*

# Add container metadata
LABEL maintainer="DevOps Team <devops@company.com>" \
      com.company.service="booking-service" \
      com.company.version="${BUILD_VERSION:-latest}" \
      com.company.build-date="${BUILD_DATE:-unknown}"

# Set up healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Expose service port
EXPOSE 3000

# Switch to non-root user
USER nodejs

# Define volumes for persistent data
VOLUME ["/tmp"]

# Set read-only root filesystem
RUN chmod a-w /usr/src/app

# Configure container capabilities
RUN setcap 'cap_net_bind_service=+ep' /usr/local/bin/node

# Set entry point with proper signal handling
ENTRYPOINT ["node", "dist/index.js"]