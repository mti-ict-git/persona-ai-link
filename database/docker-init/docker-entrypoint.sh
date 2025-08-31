#!/bin/bash
# Docker Database Initialization Entrypoint Script
# This script initializes the MS SQL Server database for Persona AI Link

set -e

echo "Starting Persona AI Link database initialization..."

# Wait for SQL Server to be ready
echo "Waiting for SQL Server to be ready..."
for i in {1..50};
do
    /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -Q "SELECT 1" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "SQL Server is ready!"
        break
    else
        echo "Waiting for SQL Server... ($i/50)"
        sleep 2
    fi
done

# Check if SQL Server is ready
/opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -Q "SELECT 1" > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "ERROR: SQL Server is not ready after waiting. Exiting."
    exit 1
fi

# Directory containing initialization scripts
INIT_DIR="/docker-entrypoint-initdb.d"

echo "Executing database initialization scripts..."

# Execute scripts in order
for script in "$INIT_DIR"/*.sql; do
    if [ -f "$script" ]; then
        echo "Executing: $(basename "$script")"
        /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -i "$script"
        if [ $? -eq 0 ]; then
            echo "✓ Successfully executed: $(basename "$script")"
        else
            echo "✗ Failed to execute: $(basename "$script")"
            exit 1
        fi
    fi
done

echo "Database initialization completed successfully!"
echo "Persona AI Link database is ready for use."

# Keep the container running
exec "$@"