const redis = require('redis');
const crypto = require('crypto');

class RedisService {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      this.client = redis.createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.error('Redis: Too many reconnection attempts, giving up');
              return new Error('Too many retries');
            }
            return Math.min(retries * 50, 1000);
          }
        }
      });

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('Redis Client Connected');
        this.isConnected = true;
      });

      this.client.on('disconnect', () => {
        console.log('Redis Client Disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
      console.log('Redis connection established successfully');
      
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.disconnect();
      this.isConnected = false;
      console.log('Redis connection closed');
    }
  }

  // Generate and store SSO token
  async generateSSOToken(email) {
    if (!this.isConnected) {
      throw new Error('Redis client not connected');
    }

    try {
      // Generate secure random token
      const code = crypto.randomBytes(32).toString('hex');
      const expiresAt = Date.now() + (5 * 60 * 1000); // 5 minutes
      
      const tokenData = {
        email,
        expiresAt,
        used: false,
        createdAt: Date.now()
      };

      // Store with 5-minute expiration
      const key = `sso:${code}`;
      await this.client.setEx(key, 300, JSON.stringify(tokenData));
      
      console.log('SSO token generated, expires in 5 minutes');
      return code;
      
    } catch (error) {
      console.error('Error generating SSO token:', error);
      throw error;
    }
  }

  // Validate and consume SSO token
  async validateSSOToken(code) {
    if (!this.isConnected) {
      throw new Error('Redis client not connected');
    }

    try {
      const key = `sso:${code}`;
      const tokenDataStr = await this.client.get(key);
      
      if (!tokenDataStr) {
        return { valid: false, reason: 'Token not found or expired' };
      }

      const tokenData = JSON.parse(tokenDataStr);
      
      // Check if already used
      if (tokenData.used) {
        await this.client.del(key);
        return { valid: false, reason: 'Token already used' };
      }

      // Check if expired
      if (Date.now() > tokenData.expiresAt) {
        await this.client.del(key);
        return { valid: false, reason: 'Token expired' };
      }

      // Mark as used and delete immediately (single-use)
      await this.client.del(key);
      
      console.log('SSO token validated and consumed successfully');
      
      return {
        valid: true,
        email: tokenData.email,
        createdAt: tokenData.createdAt
      };
      
    } catch (error) {
      console.error('Error validating SSO token:', error);
      throw error;
    }
  }

  // Clean up expired tokens (optional maintenance)
  async cleanupExpiredTokens() {
    if (!this.isConnected) {
      return;
    }

    try {
      const keys = await this.client.keys('sso:*');
      let cleanedCount = 0;
      
      for (const key of keys) {
        const tokenDataStr = await this.client.get(key);
        if (tokenDataStr) {
          const tokenData = JSON.parse(tokenDataStr);
          if (Date.now() > tokenData.expiresAt) {
            await this.client.del(key);
            cleanedCount++;
          }
        }
      }
      
      if (cleanedCount > 0) {
        console.log(`Cleaned up ${cleanedCount} expired SSO tokens`);
      }
      
    } catch (error) {
      console.error('Error cleaning up expired tokens:', error);
    }
  }

  // Health check
  async ping() {
    if (!this.isConnected) {
      return false;
    }
    
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis ping failed:', error);
      return false;
    }
  }

  // Get connection status
  getStatus() {
    return {
      connected: this.isConnected,
      client: this.client ? 'initialized' : 'not initialized'
    };
  }
}

// Create singleton instance
const redisService = new RedisService();

module.exports = redisService;