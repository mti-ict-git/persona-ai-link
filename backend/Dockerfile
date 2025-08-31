# Multi-stage build for better optimization
FROM node:18-alpine AS base

# Install security updates and dumb-init for proper signal handling
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init && \
    rm -rf /var/cache/apk/*

# Create app directory with proper permissions
WORKDIR /app

# Create non-root user early
RUN addgroup -g 1001 -S backend && \
    adduser -S backend -u 1001 -G backend

# Production dependencies stage
FROM base AS dependencies

# Copy package files for better layer caching
COPY package*.json ./

# Install dependencies with npm ci for faster, reliable builds
RUN npm ci --only=production --no-audit --no-fund && \
    npm cache clean --force

# Production stage
FROM base AS production

# Copy dependencies from previous stage
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/package*.json ./

# Copy source code
COPY --chown=backend:backend src/ ./src/

# Switch to non-root user
USER backend

# Expose port
EXPOSE 3001

# Enhanced health check with better error handling
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/server.js"]