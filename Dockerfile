# Multi-stage build for React frontend

# Build stage with optimized layer caching
FROM node:18-alpine AS base

# Install security updates
RUN apk update && apk upgrade && \
    rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Dependencies stage
FROM base AS dependencies

# Copy package files for better layer caching
COPY package*.json ./

# Install dependencies with optimizations
RUN npm ci --no-audit --no-fund && \
    npm cache clean --force

# Build stage
FROM dependencies AS build

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage with enhanced security
FROM nginx:alpine AS production

# Install security updates and required packages
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init && \
    rm -rf /var/cache/apk/*

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create non-root user with proper permissions
RUN addgroup -g 1001 -S nginx && \
    adduser -S nginx -u 1001 -G nginx

# Set up proper permissions for nginx
RUN chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    chown -R nginx:nginx /usr/share/nginx/html && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid && \
    chmod 755 /usr/share/nginx/html

# Switch to non-root user
USER nginx

# Expose port
EXPOSE 8080

# Enhanced health check with better error handling
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider --timeout=5 http://localhost:8080/ || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["nginx", "-g", "daemon off;"]