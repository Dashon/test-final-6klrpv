# ===== Build Stage =====
FROM node:18.17-alpine3.17 AS builder

# Set working directory
WORKDIR /app

# Set environment variables for build optimization
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    NEXT_OPTIMIZE_FONTS=true \
    NEXT_OPTIMIZE_IMAGES=true \
    NEXT_OPTIMIZE_CSS=true

# Copy package files for dependency installation
COPY package.json package-lock.json ./

# Install dependencies with frozen lockfile for reproducible builds
RUN npm ci --only=production --frozen-lockfile

# Copy application source with optimized .dockerignore
COPY . .

# Build application with optimizations
RUN npm run build && \
    npm prune --production

# ===== Production Stage =====
FROM nginx:1.24-alpine AS production

# Install required packages and remove cache
RUN apk add --no-cache curl && \
    rm -rf /var/cache/apk/*

# Create nginx user and group with restricted permissions
RUN addgroup -g 101 -S nginx && \
    adduser -S -D -H -u 101 -h /var/cache/nginx -s /sbin/nologin -G nginx nginx

# Copy custom nginx configuration
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf

# Copy built application from builder stage
COPY --from=builder --chown=nginx:nginx /app/.next/static /usr/share/nginx/html/_next/static
COPY --from=builder --chown=nginx:nginx /app/public /usr/share/nginx/html

# Configure security headers
RUN echo 'add_header X-Frame-Options "DENY";' >> /etc/nginx/conf.d/security.conf && \
    echo 'add_header X-Content-Type-Options "nosniff";' >> /etc/nginx/conf.d/security.conf && \
    echo 'add_header Referrer-Policy "strict-origin-when-cross-origin";' >> /etc/nginx/conf.d/security.conf && \
    echo 'add_header Permissions-Policy "camera=(), microphone=(), geolocation=()";' >> /etc/nginx/conf.d/security.conf && \
    echo 'add_header Content-Security-Policy "default-src '\''self'\''; script-src '\''self'\'' '\''unsafe-eval'\'' '\''unsafe-inline'\''; style-src '\''self'\'' '\''unsafe-inline'\''; img-src '\''self'\'' data: https:; font-src '\''self'\'' data:; connect-src '\''self'\'' https:;";' >> /etc/nginx/conf.d/security.conf

# Set up health check endpoint
RUN echo "location /health { return 200 'healthy\n'; }" > /etc/nginx/conf.d/health.conf

# Configure nginx worker processes and connections
ENV NGINX_WORKER_PROCESSES=auto \
    NGINX_WORKER_CONNECTIONS=1024

# Set up prometheus metrics endpoint
COPY nginx/nginx-prometheus-exporter.conf /etc/nginx/conf.d/metrics.conf

# Make nginx run on port 80
EXPOSE 80

# Use non-root user
USER nginx

# Set up healthcheck
HEALTHCHECK --interval=30s --timeout=3s \
    CMD curl -f http://localhost/health || exit 1

# Start nginx with proper signal handling
CMD ["nginx", "-g", "daemon off;"]