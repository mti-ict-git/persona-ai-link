# Production Dockerfile for Frontend
FROM node:20-alpine as build

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies needed for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage with nginx
FROM nginx:alpine

# Set default ports if not provided
ARG FRONTEND_PORT=8090
ARG BACKEND_PORT=3006
ENV FRONTEND_PORT=${FRONTEND_PORT}
ENV BACKEND_PORT=${BACKEND_PORT}

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration template
COPY nginx.conf /etc/nginx/conf.d/default.conf.template

# Expose port
EXPOSE ${FRONTEND_PORT}

# Start nginx with environment variable substitution
CMD ["/bin/sh", "-c", "envsubst '${FRONTEND_PORT} ${BACKEND_PORT}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]