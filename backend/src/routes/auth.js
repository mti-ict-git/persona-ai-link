const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { dbManager } = require('../utils/database');
const Joi = require('joi');
const ldapService = require('../services/ldapService');

const router = express.Router();

// JWT Secret (should be in environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Validation schemas
const loginSchema = Joi.object({
  email: Joi.string().required(), // Can be email or username for LDAP
  password: Joi.string().min(1).required(),
  authMethod: Joi.string().valid('local', 'ldap').optional().default('local')
});

const resetPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
  newPassword: Joi.string().min(6).required()
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  console.log(`[AUTH] ${req.method} ${req.path} - Authentication check started`);
  console.log('[AUTH] Request IP:', req.ip);
  console.log('[AUTH] User-Agent:', req.headers['user-agent']);
  
  // Check for token in Authorization header first (Bearer TOKEN)
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];
  
  console.log('[AUTH DEBUG] Auth header:', authHeader ? 'present' : 'missing');
  console.log('[AUTH DEBUG] Cookies present:', req.cookies ? Object.keys(req.cookies) : 'none');
  console.log('[AUTH DEBUG] Token from header:', token ? 'present' : 'missing');
  
  // If no Authorization header token, check for cookie (SSO authentication)
  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
    console.log('[AUTH DEBUG] Token from cookie:', token ? 'present' : 'missing');
    console.log('[AUTH DEBUG] Using SSO cookie authentication');
  } else if (token) {
    console.log('[AUTH DEBUG] Using Bearer token authentication');
  }

  if (!token) {
    console.log('[AUTH ERROR] No token found in header or cookies');
    console.log('[AUTH ERROR] Available headers:', Object.keys(req.headers));
    return res.status(401).json({ error: 'Access token required' });
  }
  
  console.log('[AUTH DEBUG] Token validation starting...');

  try {
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        console.log('[AUTH ERROR] Token verification failed:', err.message);
        console.log('[AUTH ERROR] Token type:', typeof token);
        console.log('[AUTH ERROR] Token length:', token.length);
        return res.status(403).json({ error: 'Invalid or expired token' });
      }
      
      console.log('[AUTH SUCCESS] Token verified successfully');
      console.log('[AUTH SUCCESS] User authenticated with valid role');
      req.user = user;
      next();
    });
  } catch (error) {
    console.log('[AUTH ERROR] Token verification exception:', error.message);
    return res.status(401).json({
      error: 'Authentication failed',
      message: 'Invalid or expired token'
    });
  }
};

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    // Validate request body
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, password, authMethod } = value;
    console.log('Login attempt using method:', authMethod);

    let user, token;

    if (authMethod === 'ldap') {
      // LDAP Authentication
      try {
        console.log('Attempting LDAP authentication...');
        const ldapResult = await ldapService.authenticateUser(email, password);
        
        if (ldapResult.success) {
          user = ldapResult.user;
          token = await ldapService.generateToken(user);
          console.log('LDAP authentication successful');
        } else {
          return res.status(401).json({ error: 'LDAP authentication failed' });
        }
      } catch (ldapError) {
        console.error('LDAP authentication error:', ldapError.message);
        return res.status(401).json({ error: 'Authentication failed' });
      }
    } else {
      // Local Database Authentication
      const pool = await dbManager.getConnection();

      // Find user by email
      const result = await pool.request()
        .input('email', email)
        .query('SELECT id, username, email, passwordHash, firstName, lastName, role, active FROM chat_Users WHERE email = @email');

      console.log('User query result:', result.recordset.length, 'users found');
      if (result.recordset.length === 0) {
        console.log('No user found with provided email');
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const dbUser = result.recordset[0];
      console.log('User found in database, checking credentials');

      // Check if user is active
      if (!dbUser.active) {
        console.log('User account is deactivated');
        return res.status(401).json({ error: 'Account is deactivated' });
      }

      // Verify password
      console.log('Comparing password...');
      const isValidPassword = await bcrypt.compare(password, dbUser.passwordHash);
      console.log('Password valid:', isValidPassword);
      if (!isValidPassword) {
        console.log('Password comparison failed');
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Generate JWT token
      token = jwt.sign(
        {
          id: dbUser.id,
          email: dbUser.email,
          username: dbUser.username,
          role: dbUser.role,
          authMethod: 'local'
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      // Prepare user data
      user = {
        id: dbUser.id,
        username: dbUser.username,
        email: dbUser.email,
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
        role: dbUser.role,
        authMethod: 'local'
      };
    }

    res.json({
      message: 'Login successful',
      token,
      user: user
    });

    console.log('Login successful via', user.authMethod || authMethod);

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout endpoint (client-side token removal, but we can blacklist tokens if needed)
router.post('/logout', authenticateToken, (req, res) => {
  // In a more sophisticated setup, you might want to blacklist the token
  // For now, we'll just return success and let the client remove the token
  res.json({ message: 'Logout successful' });
});

// Validate session endpoint
router.get('/validate', authenticateToken, async (req, res) => {
  try {
    const pool = await dbManager.getConnection();
    
    // Get fresh user data from database
    const result = await pool.request()
      .input('id', req.user.id)
      .query('SELECT id, username, email, firstName, lastName, role, active FROM chat_Users WHERE id = @id');

    if (result.recordset.length === 0 || !result.recordset[0].active) {
      return res.status(401).json({ error: 'User not found or deactivated' });
    }

    const user = result.recordset[0];
    res.json({
      valid: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Session validation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test LDAP connection endpoint
router.get('/ldap/test', async (req, res) => {
  try {
    const testResult = await ldapService.testConnection();
    res.json(testResult);
  } catch (error) {
    console.error('LDAP test error:', error);
    res.status(500).json({ success: false, message: 'LDAP test failed', error: error.message });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const pool = await dbManager.getConnection();
    
    const result = await pool.request()
      .input('id', req.user.id)
      .query('SELECT id, username, email, firstName, lastName, role, createdAt FROM chat_Users WHERE id = @id AND active = 1');

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.recordset[0] });

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset password endpoint
router.post('/reset-password', async (req, res) => {
  try {
    // Validate request body
    const { error, value } = resetPasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, newPassword } = value;
    console.log('Password reset attempt initiated');
    const pool = await dbManager.getConnection();

    // Find user by email
    const userResult = await pool.request()
      .input('email', email)
      .query('SELECT id, email, active, authMethod FROM chat_Users WHERE email = @email');

    if (userResult.recordset.length === 0) {
      console.log('No user found for password reset');
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.recordset[0];
    console.log('User found for password reset, checking auth method');
    
    // Prevent password reset for LDAP accounts
    if (user.authMethod === 'ldap') {
      console.log('Password reset blocked for LDAP account');
      return res.status(400).json({ 
        error: 'Cannot reset password for LDAP accounts. Password must be changed through Active Directory.' 
      });
    }

    // Hash the new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    console.log('New password hashed successfully');

    // Update the user's password
    const updateResult = await pool.request()
      .input('id', user.id)
      .input('passwordHash', hashedPassword)
      .input('updatedAt', new Date())
      .query('UPDATE chat_Users SET passwordHash = @passwordHash, updatedAt = @updatedAt WHERE id = @id');

    console.log('Password updated for user:', user.id);

    res.json({
      message: 'Password reset successful',
      email: user.email
    });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = { router, authenticateToken };