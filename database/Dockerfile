# Dockerfile for Persona AI Link Database
# Based on Microsoft SQL Server 2022 Linux container

FROM mcr.microsoft.com/mssql/server:2022-latest

# Set environment variables
ENV ACCEPT_EULA=Y
ENV MSSQL_PID=Express
ENV MSSQL_SA_PASSWORD=PersonaAI2024!
ENV MSSQL_TCP_PORT=1433

# Create directory for initialization scripts
USER root
RUN mkdir -p /docker-entrypoint-initdb.d

# Copy initialization scripts
COPY docker-init/*.sql /docker-entrypoint-initdb.d/
COPY docker-init/docker-entrypoint.sh /usr/local/bin/

# Make entrypoint script executable
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Create a custom startup script that runs initialization
RUN echo '#!/bin/bash' > /usr/local/bin/start-sqlserver.sh && \
    echo 'set -e' >> /usr/local/bin/start-sqlserver.sh && \
    echo '' >> /usr/local/bin/start-sqlserver.sh && \
    echo '# Start SQL Server in background' >> /usr/local/bin/start-sqlserver.sh && \
    echo '/opt/mssql/bin/sqlservr &' >> /usr/local/bin/start-sqlserver.sh && \
    echo 'SQLSERVER_PID=$!' >> /usr/local/bin/start-sqlserver.sh && \
    echo '' >> /usr/local/bin/start-sqlserver.sh && \
    echo '# Run initialization script' >> /usr/local/bin/start-sqlserver.sh && \
    echo '/usr/local/bin/docker-entrypoint.sh' >> /usr/local/bin/start-sqlserver.sh && \
    echo '' >> /usr/local/bin/start-sqlserver.sh && \
    echo '# Wait for SQL Server process' >> /usr/local/bin/start-sqlserver.sh && \
    echo 'wait $SQLSERVER_PID' >> /usr/local/bin/start-sqlserver.sh && \
    chmod +x /usr/local/bin/start-sqlserver.sh

# Switch back to mssql user
USER mssql

# Expose SQL Server port
EXPOSE 1433

# Health check to ensure database is ready
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -Q "SELECT 1" || exit 1

# Use custom startup script
CMD ["/usr/local/bin/start-sqlserver.sh"]

# Labels for better container management
LABEL maintainer="Persona AI Link Team"
LABEL description="MS SQL Server database for Persona AI Link application"
LABEL version="1.0"
LABEL database.type="mssql"
LABEL database.version="2022"