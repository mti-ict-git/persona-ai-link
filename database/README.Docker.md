# Persona AI Link Database Docker Setup

This directory contains Docker configuration and initialization scripts for the Persona AI Link database using Microsoft SQL Server 2022.

## Overview

The database Docker setup includes:
- **MS SQL Server 2022 Express** as the database engine
- **Automated initialization scripts** for schema creation
- **Default users and permissions** for immediate use
- **Health checks** for container monitoring
- **Volume persistence** for data retention

## Directory Structure

```
database/
├── Dockerfile                    # Database container configuration
├── README.Docker.md             # This documentation
└── docker-init/                 # Initialization scripts
    ├── 01-create-database.sql   # Database creation
    ├── 02-create-schema.sql     # Tables, indexes, constraints
    ├── 03-create-triggers.sql   # Automatic timestamp triggers
    ├── 04-insert-initial-data.sql # Default users and permissions
    └── docker-entrypoint.sh     # Initialization orchestrator
```

## Quick Start

### 1. Build Database Image

```bash
# From project root
docker build -t persona-ai-db ./database
```

### 2. Run Database Container

```bash
# Run with default settings
docker run -d \
  --name persona-ai-database \
  -p 1433:1433 \
  -e MSSQL_SA_PASSWORD="PersonaAI2024!" \
  -v persona-ai-db-data:/var/opt/mssql \
  persona-ai-db
```

### 3. Verify Database Setup

```bash
# Check container health
docker ps

# View initialization logs
docker logs persona-ai-database

# Connect to database
docker exec -it persona-ai-database /opt/mssql-tools/bin/sqlcmd \
  -S localhost -U sa -P "PersonaAI2024!"
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MSSQL_SA_PASSWORD` | `PersonaAI2024!` | SA user password |
| `MSSQL_PID` | `Express` | SQL Server edition |
| `MSSQL_TCP_PORT` | `1433` | Database port |
| `ACCEPT_EULA` | `Y` | Accept license terms |

### Custom Password

```bash
# Use custom SA password
docker run -d \
  --name persona-ai-database \
  -p 1433:1433 \
  -e MSSQL_SA_PASSWORD="YourSecurePassword123!" \
  -v persona-ai-db-data:/var/opt/mssql \
  persona-ai-db
```

### Port Configuration

```bash
# Use different port
docker run -d \
  --name persona-ai-database \
  -p 1434:1433 \
  -e MSSQL_SA_PASSWORD="PersonaAI2024!" \
  -v persona-ai-db-data:/var/opt/mssql \
  persona-ai-db
```

## Database Schema

The initialization scripts create the following tables:

### Core Tables

1. **chat_Users** - User authentication and profiles
   - Supports both local and LDAP authentication
   - Role-based access control (superadmin, admin, user)
   - Automatic timestamp management

2. **sessions** - Chat session management
   - Session metadata and status tracking
   - User association and timestamps

3. **messages** - Individual chat messages
   - Message content and ordering
   - Role identification (user/assistant)
   - Session relationship

4. **role_permissions** - RBAC permission system
   - Granular permission management
   - Role-based access control

5. **ProcessedFiles** - Training data management
   - File processing status tracking
   - Metadata storage

6. **message_feedback** - User feedback system
   - Positive/negative feedback tracking
   - Comment and context storage

### Default Users

The database is initialized with these default accounts:

| Username | Email | Password | Role | Description |
|----------|-------|----------|------|-------------|
| `superadmin` | superadmin@personaai.local | `admin123` | superadmin | Full system access |
| `admin` | admin@personaai.local | `admin123` | admin | Administrative access |
| `demo` | demo@personaai.local | `demo123` | user | Demo/testing account |

> **Security Note**: Change default passwords in production environments!

## Docker Compose Integration

Add to your `docker-compose.yml`:

```yaml
services:
  database:
    build: ./database
    container_name: persona-ai-database
    environment:
      - MSSQL_SA_PASSWORD=PersonaAI2024!
      - ACCEPT_EULA=Y
    ports:
      - "1433:1433"
    volumes:
      - persona-ai-db-data:/var/opt/mssql
    healthcheck:
      test: [
        "CMD", 
        "/opt/mssql-tools/bin/sqlcmd", 
        "-S", "localhost", 
        "-U", "sa", 
        "-P", "PersonaAI2024!", 
        "-Q", "SELECT 1"
      ]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    networks:
      - persona-ai-network

volumes:
  persona-ai-db-data:
    driver: local

networks:
  persona-ai-network:
    driver: bridge
```

## Data Persistence

### Volume Management

```bash
# Create named volume
docker volume create persona-ai-db-data

# Backup database
docker run --rm \
  -v persona-ai-db-data:/source \
  -v $(pwd)/backup:/backup \
  alpine tar czf /backup/database-backup.tar.gz -C /source .

# Restore database
docker run --rm \
  -v persona-ai-db-data:/target \
  -v $(pwd)/backup:/backup \
  alpine tar xzf /backup/database-backup.tar.gz -C /target
```

### Bind Mounts

```bash
# Use local directory for data
docker run -d \
  --name persona-ai-database \
  -p 1433:1433 \
  -e MSSQL_SA_PASSWORD="PersonaAI2024!" \
  -v ./data/mssql:/var/opt/mssql \
  persona-ai-db
```

## Monitoring and Maintenance

### Health Checks

```bash
# Check container health
docker inspect persona-ai-database | grep Health -A 10

# Manual health check
docker exec persona-ai-database /opt/mssql-tools/bin/sqlcmd \
  -S localhost -U sa -P "PersonaAI2024!" -Q "SELECT @@VERSION"
```

### Performance Monitoring

```bash
# Monitor resource usage
docker stats persona-ai-database

# View database logs
docker logs -f persona-ai-database

# Check database size
docker exec persona-ai-database /opt/mssql-tools/bin/sqlcmd \
  -S localhost -U sa -P "PersonaAI2024!" \
  -Q "SELECT name, size*8/1024 as 'Size (MB)' FROM sys.master_files WHERE database_id = DB_ID('PersonaAILink')"
```

### Database Maintenance

```bash
# Update statistics
docker exec persona-ai-database /opt/mssql-tools/bin/sqlcmd \
  -S localhost -U sa -P "PersonaAI2024!" \
  -Q "USE PersonaAILink; EXEC sp_updatestats;"

# Check database integrity
docker exec persona-ai-database /opt/mssql-tools/bin/sqlcmd \
  -S localhost -U sa -P "PersonaAI2024!" \
  -Q "USE PersonaAILink; DBCC CHECKDB;"
```

## Troubleshooting

### Common Issues

1. **Container won't start**
   ```bash
   # Check logs for errors
   docker logs persona-ai-database
   
   # Verify password complexity
   # Password must be at least 8 characters with uppercase, lowercase, numbers, and symbols
   ```

2. **Connection refused**
   ```bash
   # Check if container is running
   docker ps | grep persona-ai-database
   
   # Verify port mapping
   docker port persona-ai-database
   
   # Test connection
   telnet localhost 1433
   ```

3. **Initialization failed**
   ```bash
   # Check initialization logs
   docker logs persona-ai-database | grep -A 10 -B 10 "ERROR"
   
   # Restart with fresh volume
   docker rm -f persona-ai-database
   docker volume rm persona-ai-db-data
   # Then run container again
   ```

4. **Permission denied**
   ```bash
   # Check file permissions
   ls -la database/docker-init/
   
   # Fix permissions if needed
   chmod +x database/docker-init/docker-entrypoint.sh
   ```

### Performance Issues

```bash
# Increase memory allocation
docker run -d \
  --name persona-ai-database \
  --memory=2g \
  --cpus=2 \
  -p 1433:1433 \
  -e MSSQL_SA_PASSWORD="PersonaAI2024!" \
  -v persona-ai-db-data:/var/opt/mssql \
  persona-ai-db
```

## Security Considerations

### Production Deployment

1. **Change default passwords**
   ```bash
   # Use strong, unique passwords
   -e MSSQL_SA_PASSWORD="$(openssl rand -base64 32)"
   ```

2. **Restrict network access**
   ```bash
   # Bind to localhost only
   -p 127.0.0.1:1433:1433
   ```

3. **Use secrets management**
   ```yaml
   # In docker-compose.yml
   secrets:
     db_password:
       file: ./secrets/db_password.txt
   
   services:
     database:
       secrets:
         - db_password
       environment:
         - MSSQL_SA_PASSWORD_FILE=/run/secrets/db_password
   ```

4. **Enable TLS encryption**
   ```bash
   # Mount certificates
   -v ./certs:/var/opt/mssql/certs
   ```

### Backup Strategy

```bash
# Automated backup script
#!/bin/bash
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Database backup
docker exec persona-ai-database /opt/mssql-tools/bin/sqlcmd \
  -S localhost -U sa -P "PersonaAI2024!" \
  -Q "BACKUP DATABASE PersonaAILink TO DISK='/tmp/backup.bak'"

# Copy backup file
docker cp persona-ai-database:/tmp/backup.bak "$BACKUP_DIR/"

# Volume backup
docker run --rm \
  -v persona-ai-db-data:/source \
  -v "$BACKUP_DIR":/backup \
  alpine tar czf /backup/volume-backup.tar.gz -C /source .
```

## Support

For issues related to:
- **Database schema**: Check initialization scripts in `docker-init/`
- **Container startup**: Review Dockerfile and entrypoint script
- **Performance**: Monitor resource usage and adjust container limits
- **Connectivity**: Verify network configuration and port mappings

## References

- [Microsoft SQL Server Docker Documentation](https://docs.microsoft.com/en-us/sql/linux/sql-server-linux-docker-container-deployment)
- [SQL Server 2022 Express Edition](https://www.microsoft.com/en-us/sql-server/sql-server-downloads)
- [Docker Best Practices for Databases](https://docs.docker.com/develop/dev-best-practices/)