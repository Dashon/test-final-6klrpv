# Stage 1: Builder stage for TypeScript compilation and dependency installation
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++ git

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for building)
RUN npm ci

# Copy source code and configuration
COPY tsconfig.json ./
COPY src ./src
COPY kong.yml ./

# Build TypeScript code
RUN npm run build

# Run security audit
RUN npm audit

# Remove dev dependencies
RUN npm prune --production

# Clean up build artifacts
RUN rm -rf src tsconfig.json

# Stage 2: Runtime stage with Kong and custom plugins
FROM kong:3.3-alpine AS runtime

# Install additional Kong dependencies
RUN apk add --no-cache \
    nodejs \
    npm \
    curl \
    tzdata \
    && rm -rf /var/cache/apk/*

# Create directories for Kong configuration and plugins
RUN mkdir -p /usr/local/kong/declarative \
    && mkdir -p /usr/local/kong/plugins \
    && mkdir -p /tmp/kong \
    && chown -R kong:kong /usr/local/kong \
    && chown -R kong:kong /tmp/kong

# Copy built artifacts from builder stage
COPY --from=builder /app/dist /usr/local/kong/plugins
COPY --from=builder /app/node_modules /usr/local/kong/plugins/node_modules
COPY --from=builder /app/kong.yml /usr/local/kong/declarative/kong.yml

# Set Kong environment variables
ENV KONG_DATABASE=off \
    KONG_DECLARATIVE_CONFIG=/usr/local/kong/declarative/kong.yml \
    KONG_PROXY_ACCESS_LOG=/dev/stdout \
    KONG_ADMIN_ACCESS_LOG=/dev/stdout \
    KONG_PROXY_ERROR_LOG=/dev/stderr \
    KONG_ADMIN_ERROR_LOG=/dev/stderr \
    KONG_ADMIN_LISTEN=0.0.0.0:8001 \
    KONG_PROXY_LISTEN=0.0.0.0:8000 \
    KONG_PLUGINS=bundled,rate-limiting,jwt,cors,ai-persona-auth \
    NODE_ENV=production

# Configure security parameters
RUN adduser -S -D -H -h /usr/local/kong kong \
    && chown -R kong:kong /usr/local/kong \
    && chmod -R g=u /usr/local/kong

# Health check configuration
HEALTHCHECK --interval=10s --timeout=10s --retries=3 --start-period=5s \
    CMD kong health

# Expose ports
EXPOSE 8000 8001 8443 8444

# Set user
USER kong

# Set entry point
ENTRYPOINT ["kong", "docker-start"]

# Add metadata labels
LABEL maintainer="AI Travel Platform Team <dev@aitravel.com>" \
      description="Kong API Gateway for AI Travel Platform" \
      version="1.0.0" \
      security.scan="required"