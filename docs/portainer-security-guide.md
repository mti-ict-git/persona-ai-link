# Portainer Credential Security Guide

## Problem
Portainer exposes all environment variables in the container inspection view, making sensitive credentials visible to anyone with access to the Portainer interface.

## Current Exposure Points
- Database passwords (`DB_PASSWORD`, `EXTERNAL_DB_PASSWORD`)
- JWT secrets (`JWT_SECRET`)
- Admin credentials (`ADMIN_PASSWORD`)
- LDAP passwords (`LDAP_PASSWORD`, `BIND_PW`)
- Webhook secrets (`WEBHOOK_SECRET`)
- API keys (`API_KEY`, `VITE_N8N_API_KEY`)

## Solutions

### 1. Docker Secrets (Recommended for Production)

#### Step 1: Create Docker Secrets
```bash
# Create secrets for sensitive data
echo "your-secure-db-password" | docker secret create db_password -
echo "your-secure-jwt-secret" | docker secret create jwt_secret -
echo "your-secure-admin-password" | docker secret create admin_password -
echo "your-secure-ldap-password" | docker secret create ldap_password -
echo "your-secure-webhook-secret" | docker secret create webhook_secret -
```

#### Step 2: Update docker-compose.yml
```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: persona-ai-backend-prod
    environment:
      - NODE_ENV=production
      - PORT=${BACKEND_PORT}
      - DB_HOST=${EXTERNAL_DB_HOST}
      - DB_PORT=${EXTERNAL_DB_PORT}
      - DB_NAME=${EXTERNAL_DB_NAME}
      - DB_USER=${EXTERNAL_DB_USER}
      # Secrets are mounted as files, not env vars
      - DB_PASSWORD_FILE=/run/secrets/db_password
      - JWT_SECRET_FILE=/run/secrets/jwt_secret
      - ADMIN_PASSWORD_FILE=/run/secrets/admin_password
      - LDAP_PASSWORD_FILE=/run/secrets/ldap_password
      - WEBHOOK_SECRET_FILE=/run/secrets/webhook_secret
    secrets:
      - db_password
      - jwt_secret
      - admin_password
      - ldap_password
      - webhook_secret
    ports:
      - "${BACKEND_PORT}:${BACKEND_PORT}"
    restart: unless-stopped

secrets:
  db_password:
    external: true
  jwt_secret:
    external: true
  admin_password:
    external: true
  ldap_password:
    external: true
  webhook_secret:
    external: true
```

#### Step 3: Update Backend Code to Read Secrets
```javascript
// utils/secretsManager.js
const fs = require('fs');
const path = require('path');

function readSecret(secretName) {
  const secretPath = `/run/secrets/${secretName}`;
  if (fs.existsSync(secretPath)) {
    return fs.readFileSync(secretPath, 'utf8').trim();
  }
  // Fallback to environment variable for development
  return process.env[secretName.toUpperCase()];
}

function readSecretFromFile(fileEnvVar, fallbackEnvVar) {
  const filePath = process.env[fileEnvVar];
  if (filePath && fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf8').trim();
  }
  return process.env[fallbackEnvVar];
}

module.exports = {
  getDbPassword: () => readSecretFromFile('DB_PASSWORD_FILE', 'DB_PASSWORD'),
  getJwtSecret: () => readSecretFromFile('JWT_SECRET_FILE', 'JWT_SECRET'),
  getAdminPassword: () => readSecretFromFile('ADMIN_PASSWORD_FILE', 'ADMIN_PASSWORD'),
  getLdapPassword: () => readSecretFromFile('LDAP_PASSWORD_FILE', 'LDAP_PASSWORD'),
  getWebhookSecret: () => readSecretFromFile('WEBHOOK_SECRET_FILE', 'WEBHOOK_SECRET')
};
```

### 2. External Secret Management (Azure Key Vault)

#### Step 1: Install Azure SDK
```bash
npm install @azure/keyvault-secrets @azure/identity
```

#### Step 2: Create Secret Manager
```javascript
// utils/azureSecrets.js
const { SecretClient } = require('@azure/keyvault-secrets');
const { DefaultAzureCredential } = require('@azure/identity');

class AzureSecretManager {
  constructor() {
    const credential = new DefaultAzureCredential();
    const vaultName = process.env.AZURE_KEY_VAULT_NAME;
    const url = `https://${vaultName}.vault.azure.net`;
    this.client = new SecretClient(url, credential);
  }

  async getSecret(secretName) {
    try {
      const secret = await this.client.getSecret(secretName);
      return secret.value;
    } catch (error) {
      console.error(`Failed to retrieve secret ${secretName}:`, error);
      throw error;
    }
  }
}

module.exports = AzureSecretManager;
```

### 3. Immediate Workaround: Restrict Portainer Access

#### Option A: Role-Based Access Control
1. Create restricted user roles in Portainer
2. Limit container inspection permissions
3. Use Portainer Teams feature to segregate access

#### Option B: Environment Variable Filtering
```yaml
# docker-compose.override.yml (for hiding in Portainer)
version: '3.8'

services:
  backend:
    labels:
      - "portainer.hide.environment=DB_PASSWORD,JWT_SECRET,ADMIN_PASSWORD,LDAP_PASSWORD"
```

### 4. Development vs Production Strategy

#### Development (Current)
- Keep using `.env` files for local development
- Ensure `.env` files are in `.gitignore`
- Use placeholder values in tracked `.env.example` files

#### Production
- Use Docker Secrets or Azure Key Vault
- Remove sensitive environment variables from docker-compose.yml
- Implement secret rotation policies

## Implementation Priority

### Immediate (Today)
1. Change all exposed passwords in production
2. Restrict Portainer access to essential personnel only
3. Enable Portainer authentication and RBAC

### Short-term (This Week)
1. Implement Docker Secrets for production deployment
2. Update backend code to read from secret files
3. Test secret management in staging environment

### Medium-term (This Month)
1. Migrate to Azure Key Vault for enterprise-grade secret management
2. Implement automatic secret rotation
3. Set up monitoring for secret access

## Security Best Practices

1. **Never expose secrets in environment variables** in production
2. **Use secret management systems** (Docker Secrets, Azure Key Vault)
3. **Implement least privilege access** in Portainer
4. **Regular secret rotation** (monthly for critical secrets)
5. **Audit secret access** and monitor for unauthorized access
6. **Separate development and production secrets** completely

## Verification

After implementing Docker Secrets:
1. Check Portainer container inspection - secrets should not be visible
2. Verify application still functions correctly
3. Test secret rotation procedures
4. Confirm backup and recovery processes

## Emergency Response

If credentials are compromised:
1. Immediately rotate all exposed secrets
2. Review Portainer access logs
3. Update all affected systems
4. Implement additional monitoring
5. Document the incident for future prevention