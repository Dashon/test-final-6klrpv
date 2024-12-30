# ===== Builder Stage =====
FROM node:18-alpine AS builder

# Install build essentials
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

# Set working directory
WORKDIR /app

# Copy package files with layer caching
COPY package*.json ./
COPY tsconfig*.json ./

# Install all dependencies including devDependencies
RUN npm ci

# Copy source code and configs
COPY src/ ./src/
COPY ../shared/ ./src/shared/
COPY ../ml-service/ ./src/ml-service/

# Build TypeScript code with optimizations
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# ===== Production Stage =====
FROM node:18-alpine

# Add labels for container metadata
LABEL maintainer="AI Travel Platform Team" \
    version="1.0.0" \
    service="persona-service" \
    description="AI Persona Management Service" \
    base.image="node:18-alpine" \
    build.date="${BUILD_DATE}" \
    vcs.ref="${VCS_REF}"

# Install production dependencies
RUN apk add --no-cache \
    tzdata \
    python3 \
    # Required for TensorFlow.js
    libc6-compat

# Create non-root user
RUN addgroup -g 1000 persona && \
    adduser -u 1000 -G persona -s /bin/sh -D persona

# Set working directory
WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Create directory for ML models with correct permissions
RUN mkdir -p /app/models && \
    chown -R persona:persona /app && \
    chmod -R 755 /app

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    ML_MODEL_PATH=/app/models \
    MAX_OLD_SPACE_SIZE=4096 \
    TZ=UTC

# Switch to non-root user
USER persona

# Configure health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node dist/health.js

# Expose API port
EXPOSE 3000

# Set resource limits
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Define volumes for ML models and node_modules
VOLUME ["/app/models", "/app/node_modules"]

# Start the application
CMD ["node", "dist/main"]