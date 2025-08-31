# Persona AI Link - Docker Deployment Guide

This guide covers how to deploy the Persona AI Link application using Docker containers.

## Architecture Overview

The application consists of three main services:
- **Frontend**: React application served by Nginx
- **Backend**: Node.js Express API server
- **Database**: Microsoft SQL Server

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 4GB RAM available for containers
- Configurable ports (see Port Configuration section below)

## Quick Start

### Production Deployment

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd persona-ai-link
   ```

2. **Set up environment variables**:
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env with your configuration
   ```

3. **Build and start all services**:
   ```bash
   docker-compose up -d
   ```

4. **Access the application**:
   - Frontend: http://localhost:3000 (configurable)
   - Backend API: http://localhost:3001 (configurable)
   - Database: localhost:1433

### Development Setup

For development with hot reloading:

1. **Start development services**:
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

2. **Run frontend locally** (recommended for faster development):
   ```bash
   npm install
   npm run dev
   ```

## Service Configuration

### Environment Variables

Create `backend/.env` file with the following variables:

```env
# Server Configuration
PORT=3001
NODE_ENV=production
FRONTEND_URL=http://localhost:3000

# Database Configuration
DB_SERVER=database
DB_DATABASE=PersonaAILink
DB_USER=sa
DB_PASSWORD=PersonaAI123!
DB_PORT=1433
DB_ENCRYPT=false
DB_TRUST_CERT=true

# N8N Configuration (Optional)
N8N_WEBHOOK_URL=your_n8n_webhook_url
N8N_API_KEY=your_n8n_api_key

# Security
JWT_SECRET=your_jwt_secret_key
API_KEY=your_api_key

# Logging
LOG_LEVEL=info
```

### Frontend Configuration

Set environment variables for the frontend:

```env
VITE_API_BASE_URL=http://localhost:3001/api
VITE_N8N_WEBHOOK_URL=your_n8n_webhook_url
VITE_DEV_MODE=false
VITE_TYPEWRITER_ENABLED=true
VITE_TYPEWRITER_SPEED=50
```

## Port Configuration

The application uses flexible port configuration to avoid conflicts and provide runtime configurability.

### Environment Variables for Ports

Create or update the root `.env` file with the following Docker port configurations:

```env
# Docker Port Configuration
# Frontend port for Docker containers (avoid 8080 conflicts)
FRONTEND_PORT=3000

# Frontend port for Docker development environment
FRONTEND_DEV_PORT=5173

# Backend port (consistent across environments)
BACKEND_PORT=3001

# Docker Network Configuration
DOCKER_NETWORK_SUBNET=172.20.0.0/16
DOCKER_DEV_NETWORK_SUBNET=172.21.0.0/16
```

### Port Strategy

- **Local Development**: Uses port 5173 (Vite default) for frontend, 3001 for backend
- **Docker Production**: Uses port 3000 for frontend, 3001 for backend
- **Docker Development**: Uses port 5173 for frontend, 3001 for backend
- **Port 8080**: Avoided in Docker to prevent conflicts with common services

### Changing Ports

#### Method 1: Environment Variables (Recommended)

1. **Update the root `.env` file**:
   ```env
   # Change frontend port to 4000
   FRONTEND_PORT=4000
   
   # Change backend port to 4001
   BACKEND_PORT=4001
   ```

2. **Restart Docker services**:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

3. **Access the application**:
   - Frontend: http://localhost:4000
   - Backend API: http://localhost:4001

#### Method 2: Docker Compose Override

Create a `docker-compose.override.yml` file:

```yaml
version: '3.8'
services:
  frontend:
    ports:
      - "4000:80"
  
  backend:
    ports:
      - "4001:3001"
    environment:
      - PORT=3001
      - FRONTEND_URL=http://localhost:4000
```

#### Method 3: Command Line Override

```bash
# Override ports at runtime
FRONTEND_PORT=4000 BACKEND_PORT=4001 docker-compose up -d
```

### Development vs Production Ports

| Environment | Frontend Port | Backend Port | Configuration File |
|-------------|---------------|--------------|--------------------|
| Local Dev   | 5173          | 3001         | `npm run dev`      |
| Docker Prod | 3000 (configurable) | 3001 (configurable) | `docker-compose.yml` |
| Docker Dev  | 5173 (configurable) | 3001 (configurable) | `docker-compose.dev.yml` |

### Port Conflict Resolution

If you encounter port conflicts:

1. **Check what's using the port**:
   ```bash
   # Windows
   netstat -ano | findstr :3000
   
   # Linux/Mac
   lsof -i :3000
   ```

2. **Choose alternative ports**:
   ```env
   # Use alternative ports
   FRONTEND_PORT=3002
   BACKEND_PORT=3003
   ```

3. **Update frontend API URL** if backend port changes:
   ```env
   # In backend/.env
   FRONTEND_URL=http://localhost:3002
   
   # In frontend .env
   VITE_API_BASE_URL=http://localhost:3003/api
   ```

## Docker Commands

### Basic Operations

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f backend

# Rebuild and restart services
docker-compose up -d --build

# Remove all containers and volumes
docker-compose down -v
```

### Development Commands

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# Stop development environment
docker-compose -f docker-compose.dev.yml down

# View development logs
docker-compose -f docker-compose.dev.yml logs -f
```

### Database Operations

```bash
# Connect to database container
docker exec -it persona-ai-db /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P PersonaAI123!

# Backup database
docker exec persona-ai-db /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P PersonaAI123! -Q "BACKUP DATABASE PersonaAILink TO DISK = '/var/opt/mssql/backup/PersonaAILink.bak'"

# Restore database
docker exec persona-ai-db /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P PersonaAI123! -Q "RESTORE DATABASE PersonaAILink FROM DISK = '/var/opt/mssql/backup/PersonaAILink.bak'"
```

## Health Checks

All services include health checks:

```bash
# Check service health
docker-compose ps

# Manual health check endpoints
curl http://localhost:${FRONTEND_PORT:-3000}/health  # Frontend
curl http://localhost:${BACKEND_PORT:-3001}/health  # Backend
```

## Troubleshooting

### Common Issues

1. **Port conflicts**:
   ```bash
   # Check what's using the configured ports
   # Windows
   netstat -ano | findstr :3000  # Frontend (or your configured FRONTEND_PORT)
   netstat -ano | findstr :3001  # Backend (or your configured BACKEND_PORT)
   netstat -ano | findstr :1433  # Database
   
   # Linux/Mac
   netstat -tulpn | grep :3000
   netstat -tulpn | grep :3001
   netstat -tulpn | grep :1433
   ```

2. **Database connection issues**:
   ```bash
   # Check database logs
   docker-compose logs database
   
   # Verify database is accepting connections
   docker exec persona-ai-db /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P PersonaAI123! -Q "SELECT 1"
   ```

3. **Frontend build issues**:
   ```bash
   # Rebuild frontend with no cache
   docker-compose build --no-cache frontend
   ```

4. **Backend API issues**:
   ```bash
   # Check backend logs
   docker-compose logs backend
   
   # Restart backend service
   docker-compose restart backend
   ```

### Performance Optimization

1. **Increase Docker memory limit** (Docker Desktop):
   - Go to Docker Desktop Settings
   - Resources → Advanced
   - Increase memory to at least 4GB

2. **Use multi-stage builds** (already implemented):
   - Frontend uses multi-stage build for smaller image size
   - Backend uses Alpine Linux for minimal footprint

3. **Volume optimization**:
   ```bash
   # Clean up unused volumes
   docker volume prune
   
   # Clean up unused images
   docker image prune -a
   ```

## Security Considerations

1. **Change default passwords** in production
2. **Use environment-specific .env files**
3. **Enable SSL/TLS** for production deployments
4. **Configure firewall rules** for exposed ports
5. **Regular security updates** for base images

## Monitoring and Logging

### Log Management

```bash
# Configure log rotation
docker-compose logs --tail=100 -f

# Export logs to file
docker-compose logs > application.log
```

### Resource Monitoring

```bash
# Monitor resource usage
docker stats

# Monitor specific container
docker stats persona-ai-frontend persona-ai-backend persona-ai-db
```

## Production Deployment

For production deployment:

1. **Use a reverse proxy** (Nginx, Traefik, or cloud load balancer)
2. **Set up SSL certificates** (Let's Encrypt, cloud provider)
3. **Configure backup strategy** for database
4. **Set up monitoring** (Prometheus, Grafana)
5. **Configure log aggregation** (ELK stack, cloud logging)
6. **Use container orchestration** (Docker Swarm, Kubernetes)

## Support

For issues and questions:
1. Check the logs using the commands above
2. Review the troubleshooting section
3. Create an issue in the repository

---

**Note**: This Docker setup is designed for development and testing. For production use, additional security hardening and monitoring should be implemented.