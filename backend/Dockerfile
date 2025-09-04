# Production Dockerfile for Backend
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S backend -u 1001

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src/ ./src/

# Create uploads directory and set permissions
RUN mkdir -p uploads && chown -R backend:nodejs /app

# Install su-exec for user switching
RUN apk add --no-cache su-exec

# Create a script to fix uploads permissions at runtime
RUN echo '#!/bin/sh' > /docker-entrypoint.sh && \
    echo '# Fix uploads directory permissions' >> /docker-entrypoint.sh && \
    echo 'chown -R backend:nodejs /app/uploads 2>/dev/null || true' >> /docker-entrypoint.sh && \
    echo '# Switch to backend user and execute command' >> /docker-entrypoint.sh && \
    echo 'exec su-exec backend "$@"' >> /docker-entrypoint.sh && \
    chmod +x /docker-entrypoint.sh

# Set default port if not provided
ARG PORT=3006
ENV PORT=${PORT}

# Expose port
EXPOSE ${PORT}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:${PORT}/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application with entrypoint script (runs as root, then switches to backend user)
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "src/server.js"]