const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { dbManager } = require('../utils/database');
const Joi = require('joi');

const router = express.Router();

// JWT Secret (should be in environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Validation schemas
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

const resetPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
  newPassword: Joi.string().min(6).required()
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  console.log('[AUTH] =================================');
  console.log('[AUTH] Request URL:', req.method, req.originalUrl);
  console.log('[AUTH] Headers:', JSON.stringify(req.headers, null, 2));
  
  const authHeader = req.headers['authorization'];
  console.log('[AUTH] Auth header:', authHeader);
  
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  console.log('[AUTH] Extracted token:', token ? `${token.substring(0, 20)}...` : 'null');

  if (!token) {
    console.log('[AUTH] ❌ No token provided');
    return res.status(401).json({ error: 'Access token required' });
  }

  console.log('[AUTH] JWT_SECRET being used:', JWT_SECRET ? `${JWT_SECRET.substring(0, 10)}...` : 'undefined');
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log('[AUTH] ❌ JWT verification failed:', err.message);
      console.log('[AUTH] Error details:', err);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    
    console.log('[AUTH] ✅ JWT verification successful');
    console.log('[AUTH] Decoded user:', JSON.stringify(user, null, 2));
    req.user = user;
    next();
  });
};

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    // Validate request body
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, password } = value;
    console.log('Login attempt for email:', email);
    const pool = await dbManager.getConnection();

    // Find user by email
    const result = await pool.request()
      .input('email', email)
      .query('SELECT id, username, email, passwordHash, firstName, lastName, role, active FROM chat_Users WHERE email = @email');

    console.log('User query result:', result.recordset.length, 'users found');
    if (result.recordset.length === 0) {
      console.log('No user found with email:', email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.recordset[0];
    console.log('Found user:', { id: user.id, email: user.email, active: user.active });

    // Check if user is active
    if (!user.active) {
      console.log('User account is deactivated');
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    // Verify password
    console.log('Comparing password...');
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    console.log('Password valid:', isValidPassword);
    if (!isValidPassword) {
      console.log('Password comparison failed');
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Return user data (without password) and token
    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role
    };

    res.json({
      message: 'Login successful',
      token,
      user: userData
    });

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
    console.log('Password reset attempt for email:', email);
    const pool = await dbManager.getConnection();

    // Find user by email
    const userResult = await pool.request()
      .input('email', email)
      .query('SELECT id, email, active FROM chat_Users WHERE email = @email');

    if (userResult.recordset.length === 0) {
      console.log('No user found with email:', email);
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.recordset[0];
    console.log('Found user for password reset:', { id: user.id, email: user.email });

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