const fs = require('fs');
const path = require('path');

/**
 * Utility class for managing secrets in Docker environment
 * Supports both Docker Secrets (production) and environment variables (development)
 */
class SecretsManager {
  /**
   * Read secret from file if file path is provided, otherwise fallback to environment variable
   * @param {string} fileEnvVar - Environment variable containing the file path
   * @param {string} fallbackEnvVar - Fallback environment variable name
   * @returns {string|null} - Secret value or null if not found
   */
  static readSecretFromFile(fileEnvVar, fallbackEnvVar) {
    try {
      const filePath = process.env[fileEnvVar];
      
      // If file path is provided and file exists, read from file
      if (filePath && fs.existsSync(filePath)) {
        const secret = fs.readFileSync(filePath, 'utf8').trim();
        if (secret) {
          console.log(`✓ Secret loaded from file: ${fileEnvVar}`);
          return secret;
        }
      }
      
      // Fallback to environment variable
      const envValue = process.env[fallbackEnvVar];
      if (envValue) {
        console.log(`⚠ Secret loaded from environment variable: ${fallbackEnvVar}`);
        return envValue;
      }
      
      console.warn(`⚠ Secret not found: ${fileEnvVar} or ${fallbackEnvVar}`);
      return null;
    } catch (error) {
      console.error(`❌ Error reading secret ${fileEnvVar}:`, error.message);
      return process.env[fallbackEnvVar] || null;
    }
  }

  /**
   * Read secret directly from Docker secrets path
   * @param {string} secretName - Name of the secret
   * @returns {string|null} - Secret value or null if not found
   */
  static readDockerSecret(secretName) {
    try {
      const secretPath = `/run/secrets/${secretName}`;
      if (fs.existsSync(secretPath)) {
        const secret = fs.readFileSync(secretPath, 'utf8').trim();
        console.log(`✓ Docker secret loaded: ${secretName}`);
        return secret;
      }
      return null;
    } catch (error) {
      console.error(`❌ Error reading Docker secret ${secretName}:`, error.message);
      return null;
    }
  }

  /**
   * Get database password
   * @returns {string} - Database password
   */
  static getDbPassword() {
    return this.readSecretFromFile('DB_PASSWORD_FILE', 'DB_PASSWORD') || 'default_password';
  }

  /**
   * Get JWT secret
   * @returns {string} - JWT secret
   */
  static getJwtSecret() {
    return this.readSecretFromFile('JWT_SECRET_FILE', 'JWT_SECRET') || 'default_jwt_secret';
  }

  /**
   * Get admin password
   * @returns {string} - Admin password
   */
  static getAdminPassword() {
    return this.readSecretFromFile('ADMIN_PASSWORD_FILE', 'ADMIN_PASSWORD') || 'default_admin_password';
  }

  /**
   * Get LDAP password
   * @returns {string} - LDAP password
   */
  static getLdapPassword() {
    return this.readSecretFromFile('LDAP_PASSWORD_FILE', 'LDAP_PASSWORD') || 'default_ldap_password';
  }

  /**
   * Get LDAP bind password
   * @returns {string} - LDAP bind password
   */
  static getBindPassword() {
    return this.readSecretFromFile('BIND_PW_FILE', 'BIND_PW') || 'default_bind_password';
  }

  /**
   * Get webhook secret
   * @returns {string} - Webhook secret
   */
  static getWebhookSecret() {
    return this.readSecretFromFile('WEBHOOK_SECRET_FILE', 'WEBHOOK_SECRET') || 'default_webhook_secret';
  }

  /**
   * Get API key
   * @returns {string} - API key
   */
  static getApiKey() {
    return this.readSecretFromFile('API_KEY_FILE', 'API_KEY') || 'default_api_key';
  }

  /**
   * Get all secrets for debugging (without exposing values)
   * @returns {object} - Object with secret availability status
   */
  static getSecretsStatus() {
    return {
      dbPassword: !!this.getDbPassword(),
      jwtSecret: !!this.getJwtSecret(),
      adminPassword: !!this.getAdminPassword(),
      ldapPassword: !!this.getLdapPassword(),
      bindPassword: !!this.getBindPassword(),
      webhookSecret: !!this.getWebhookSecret(),
      apiKey: !!this.getApiKey(),
      environment: process.env.NODE_ENV || 'development',
      secretsMode: process.env.DB_PASSWORD_FILE ? 'docker-secrets' : 'environment-variables'
    };
  }

  /**
   * Validate that all required secrets are available
   * @returns {boolean} - True if all secrets are available
   */
  static validateSecrets() {
    const requiredSecrets = [
      'dbPassword',
      'jwtSecret',
      'adminPassword'
    ];

    const status = this.getSecretsStatus();
    const missing = requiredSecrets.filter(secret => !status[secret]);

    if (missing.length > 0) {
      console.error('❌ Missing required secrets:', missing);
      return false;
    }

    console.log('✓ All required secrets are available');
    return true;
  }
}

module.exports = SecretsManager;