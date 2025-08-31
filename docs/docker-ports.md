# Docker Port Configuration

This document explains how to configure ports for Docker containers while keeping local development unchanged.

## Port Configuration Overview

### Local Development (without Docker)
- Frontend: `http://localhost:8080` (Vite dev server)
- Backend: `http://localhost:3001`

### Docker Containers
- Frontend Production: `http://localhost:3000` (configurable via `FRONTEND_PORT`)
- Frontend Development: `http://localhost:5173` (configurable via `FRONTEND_DEV_PORT`)
- Backend: `http://localhost:3001` (configurable via `BACKEND_PORT`)

## Environment Variables

The following environment variables in `.env` control Docker port mappings:

```bash
# Frontend port for Docker production containers
FRONTEND_PORT=3000

# Frontend port for Docker development containers
FRONTEND_DEV_PORT=5173

# Backend port for all Docker containers
BACKEND_PORT=3001
```

## Usage Examples

### Default Configuration
```bash
# Production Docker
docker-compose up
# Access at: http://localhost:3000

# Development Docker
docker-compose -f docker-compose.dev.yml up
# Access at: http://localhost:5173
```

### Custom Port Configuration
```bash
# Change frontend port to 4000
export FRONTEND_PORT=4000
docker-compose up
# Access at: http://localhost:4000

# Change development port to 3030
export FRONTEND_DEV_PORT=3030
docker-compose -f docker-compose.dev.yml up
# Access at: http://localhost:3030
```

### Override via Command Line
```bash
# Temporary port override
FRONTEND_PORT=5000 docker-compose up
# Access at: http://localhost:5000
```

## Benefits

1. **Conflict Avoidance**: Port 8080 is commonly used by other services
2. **Flexibility**: Easy to change ports without editing Docker files
3. **Environment Separation**: Different ports for dev/prod Docker environments
4. **Local Development Unchanged**: Keep using port 8080 for local Vite dev server

## Notes

- Local development (npm run dev) continues to use port 8080
- Docker containers use different ports to avoid conflicts
- All port configurations have sensible defaults
- Environment variables can be overridden at runtime