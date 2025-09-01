#!/bin/bash

# Docker Secrets Setup Script for Persona AI Link
# This script creates Docker secrets for secure credential management

set -e

echo "🔐 Setting up Docker Secrets for Persona AI Link"
echo "================================================"

# Check if Docker Swarm is initialized
if ! docker info | grep -q "Swarm: active"; then
    echo "⚠️  Docker Swarm is not active. Initializing..."
    docker swarm init
    echo "✅ Docker Swarm initialized"
fi

# Function to create a secret
create_secret() {
    local secret_name=$1
    local secret_value=$2
    local description=$3
    
    if docker secret ls | grep -q "$secret_name"; then
        echo "⚠️  Secret '$secret_name' already exists. Skipping..."
    else
        echo "$secret_value" | docker secret create "$secret_name" -
        echo "✅ Created secret: $secret_name ($description)"
    fi
}

# Function to prompt for secret value
prompt_secret() {
    local prompt_text=$1
    local secret_value
    
    echo -n "$prompt_text: "
    read -s secret_value
    echo
    echo "$secret_value"
}

# Function to generate random secret
generate_random_secret() {
    local length=${1:-32}
    openssl rand -base64 $length | tr -d "=+/" | cut -c1-$length
}

echo
echo "📝 Please provide values for the following secrets:"
echo "   (Press Enter to generate a random value where applicable)"
echo

# Database Password
echo "🗄️  Database Configuration"
DB_PASSWORD=$(prompt_secret "Database Password")
if [ -z "$DB_PASSWORD" ]; then
    DB_PASSWORD=$(generate_random_secret 16)
    echo "   Generated random database password"
fi
create_secret "persona_ai_db_password" "$DB_PASSWORD" "Database password"

echo

# JWT Secret
echo "🔑 Authentication Configuration"
JWT_SECRET=$(prompt_secret "JWT Secret (press Enter for random)")
if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(generate_random_secret 64)
    echo "   Generated random JWT secret"
fi
create_secret "persona_ai_jwt_secret" "$JWT_SECRET" "JWT signing secret"

# Admin Password
ADMIN_PASSWORD=$(prompt_secret "Admin Password")
if [ -z "$ADMIN_PASSWORD" ]; then
    ADMIN_PASSWORD=$(generate_random_secret 16)
    echo "   Generated random admin password"
fi
create_secret "persona_ai_admin_password" "$ADMIN_PASSWORD" "Admin user password"

echo

# LDAP Configuration
echo "🏢 LDAP Configuration"
LDAP_PASSWORD=$(prompt_secret "LDAP Password")
if [ -z "$LDAP_PASSWORD" ]; then
    LDAP_PASSWORD=$(generate_random_secret 16)
    echo "   Generated random LDAP password"
fi
create_secret "persona_ai_ldap_password" "$LDAP_PASSWORD" "LDAP user password"

BIND_PASSWORD=$(prompt_secret "LDAP Bind Password")
if [ -z "$BIND_PASSWORD" ]; then
    BIND_PASSWORD=$(generate_random_secret 16)
    echo "   Generated random bind password"
fi
create_secret "persona_ai_bind_password" "$BIND_PASSWORD" "LDAP bind password"

echo

# Webhook Secret
echo "🔗 Webhook Configuration"
WEBHOOK_SECRET=$(prompt_secret "Webhook Secret (press Enter for random)")
if [ -z "$WEBHOOK_SECRET" ]; then
    WEBHOOK_SECRET=$(generate_random_secret 32)
    echo "   Generated random webhook secret"
fi
create_secret "persona_ai_webhook_secret" "$WEBHOOK_SECRET" "Webhook validation secret"

# API Key
API_KEY=$(prompt_secret "API Key (press Enter for random)")
if [ -z "$API_KEY" ]; then
    API_KEY=$(generate_random_secret 32)
    echo "   Generated random API key"
fi
create_secret "persona_ai_api_key" "$API_KEY" "General API key"

# N8N API Key
N8N_API_KEY=$(prompt_secret "N8N API Key")
if [ -z "$N8N_API_KEY" ]; then
    N8N_API_KEY=$(generate_random_secret 32)
    echo "   Generated random N8N API key"
fi
create_secret "persona_ai_n8n_api_key" "$N8N_API_KEY" "N8N integration API key"

echo
echo "✅ All secrets have been created successfully!"
echo
echo "📋 Created secrets:"
docker secret ls --filter name=persona_ai

echo
echo "🚀 Next steps:"
echo "1. Update your application to use docker-compose.secure.yml"
echo "2. Deploy using: docker stack deploy -c docker-compose.secure.yml persona-ai"
echo "3. Verify secrets are not visible in Portainer environment variables"
echo
echo "⚠️  Important: Save these credentials securely!"
echo "   Database Password: $DB_PASSWORD"
echo "   Admin Password: $ADMIN_PASSWORD"
echo "   LDAP Password: $LDAP_PASSWORD"
echo "   LDAP Bind Password: $BIND_PASSWORD"
echo
echo "🔐 Secrets setup completed!"