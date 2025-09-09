const express = require('express');
const jwt = require('jsonwebtoken');
const { dbManager } = require('../utils/database');
const sql = require('mssql');
const redisService = require('../services/redisService');
const rateLimit = require('express-rate-limit');
const router = express.Router();

// Email validation helper
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Company domain validation (optional - configure as needed)
function isCompanyEmail(email) {
  // Add your company domains here
  const allowedDomains = [
    'merdekabattery.com',
    'tsindeka.com'
    // Add more domains as needed
  ];
  
  const domain = email.split('@')[1]?.toLowerCase();
  return allowedDomains.includes(domain);
}

// Rate limiting for SSO start endpoint
const ssoStartLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: {
    error: 'Too many SSO requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// POST /sso/start - Generate one-time login link
router.post('/start', ssoStartLimiter, async (req, res) => {
  console.log('[SSO START] Request received from IP:', req.ip);
  console.log('[SSO START] Request body:', req.body);
  console.log('[SSO START] Request headers:', req.headers);
  
  try {
    const { email, source } = req.body;
    console.log('[SSO START] Processing SSO start request from source:', source);
    
    // Validate input
    if (!email) {
      console.log('[SSO START ERROR] Missing email in request');
      return res.status(400).json({ 
        error: 'Email is required',
        code: 'MISSING_EMAIL'
      });
    }
    
    if (!isValidEmail(email)) {
      console.log('[SSO START ERROR] Invalid email format:', email);
      return res.status(400).json({ 
        error: 'Invalid email format',
        code: 'INVALID_EMAIL'
      });
    }
    
    // Optional: Validate company domain
    if (!isCompanyEmail(email)) {
      console.warn(`[SSO START WARN] Non-company email attempted: ${email}`);
      // You can either reject or allow - adjust based on your security policy
      // return res.status(403).json({ 
      //   error: 'Email domain not allowed',
      //   code: 'DOMAIN_NOT_ALLOWED'
      // });
    } else {
      console.log('[SSO START] Company email validated');
    }
    
    // Check Redis connection
    const redisStatus = redisService.getStatus();
    console.log('[SSO START] Redis status:', redisStatus);
    if (!redisStatus.connected) {
      console.error('[SSO START ERROR] Redis not connected for SSO request');
      return res.status(503).json({ 
        error: 'Service temporarily unavailable',
        code: 'SERVICE_UNAVAILABLE'
      });
    }
    
    // Generate one-time token
    console.log('[SSO START] Generating SSO token');
    const code = await redisService.generateSSOToken(email);
    console.log('[SSO START] Token generation completed');
    
    // Create login link - use backend endpoint to avoid frontend router conflict
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3006';
    const loginLink = `${backendUrl}/api/sso/continue?code=${code}`;
    console.log('[SSO START] Login link created:', loginLink);
    
    // Log SSO attempt (for security monitoring)
    console.log(`[SSO START SUCCESS] SSO token generated from IP: ${req.ip}`);
    
    res.json({ 
      loginLink,
      expiresIn: 300 // 5 minutes in seconds
    });
    
  } catch (error) {
    console.error('[SSO START ERROR] Error in /sso/start:', error);
    console.error('[SSO START ERROR] Stack trace:', error.stack);
    res.status(500).json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /sso/continue - Validate token and create session
router.get('/continue', async (req, res) => {
  console.log('[SSO CONTINUE] Request received from IP:', req.ip);
  console.log('[SSO CONTINUE] Query params:', req.query);
  console.log('[SSO CONTINUE] Request headers:', req.headers);
  console.log('[SSO CONTINUE] Cookies:', req.cookies);
  
  try {
    const { code } = req.query;
    console.log('[SSO CONTINUE] Processing continue with code:', code ? code.substring(0, 10) + '...' : 'missing');
    
    if (!code) {
      console.warn('[SSO CONTINUE ERROR] SSO continue attempt without code');
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8090';
      console.log('[SSO CONTINUE] Redirecting to login with invalid_code error');
      return res.redirect(`${frontendUrl}/login?error=invalid_code`);
    }
    
    // Check Redis connection
    const redisStatus = redisService.getStatus();
    console.log('[SSO CONTINUE] Redis status:', redisStatus);
    if (!redisStatus.connected) {
      console.error('[SSO CONTINUE ERROR] Redis not connected for SSO continue');
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8090';
      console.log('[SSO CONTINUE] Redirecting to login with service_unavailable error');
      return res.redirect(`${frontendUrl}/login?error=service_unavailable`);
    }
    
    // Validate and consume token
    console.log('[SSO CONTINUE] Validating SSO token...');
    const tokenResult = await redisService.validateSSOToken(code);
    console.log('[SSO CONTINUE] Token validation result:', tokenResult);
    
    if (!tokenResult.valid) {
      console.warn(`[SSO CONTINUE ERROR] SSO token validation failed: ${tokenResult.reason}`);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8090';
      console.log('[SSO CONTINUE] Redirecting to login with expired_code error');
      return res.redirect(`${frontendUrl}/login?error=expired_code&reason=${encodeURIComponent(tokenResult.reason)}`);
    }
    
    const { email } = tokenResult;
    console.log('[SSO CONTINUE] Token validated successfully');
    
    console.log('[SSO CONTINUE] Getting database connection...');
    const pool = await dbManager.getConnection();
    
    // Find existing LDAP user by email
    console.log('[SSO CONTINUE] Looking up LDAP user');
    let user = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT id, username, email, role, authMethod FROM chat_Users WHERE email = @email AND authMethod = \'ldap\'');

    console.log('[SSO CONTINUE] User lookup result:', user.recordset.length, 'users found');
    if (user.recordset.length === 0) {
      console.log('[SSO CONTINUE ERROR] LDAP user not found');
      return res.status(404).json({ 
        error: 'LDAP user not found. Please ensure you have logged in via LDAP at least once before using SharePoint SSO.' 
      });
    }

    const userRecord = user.recordset[0];
    console.log('[SSO CONTINUE] User found in database');

    // Update last login for existing LDAP user
    console.log('[SSO CONTINUE] Updating last login for user:', userRecord.id);
    await pool.request()
      .input('email', sql.NVarChar, email)
      .input('lastLogin', sql.DateTime2, new Date())
      .query('UPDATE chat_Users SET last_login = @lastLogin, updatedAt = GETDATE() WHERE email = @email');
    
    console.log('[SSO CONTINUE SUCCESS] Existing LDAP user logged in via SSO');
    
    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET;
    console.log('[SSO CONTINUE] JWT_SECRET configured:', jwtSecret ? 'yes' : 'no');
    if (!jwtSecret) {
      console.error('[SSO CONTINUE ERROR] JWT_SECRET not configured');
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8090';
      return res.redirect(`${frontendUrl}/login?error=configuration_error`);
    }
    
    console.log('[SSO CONTINUE] Generating JWT token');
    console.log('[SSO CONTINUE] User role configured');
    const token = jwt.sign(
      { 
        id: userRecord.id, 
        email: userRecord.email,
        username: userRecord.username,
        role: userRecord.role,
        authMethod: 'ldap'
      },
      jwtSecret,
      { expiresIn: '24h' }
    );
    console.log('[SSO CONTINUE] JWT token generation completed');
    
    // Set secure cookie
    const isProduction = process.env.NODE_ENV === 'production';
    console.log('[SSO CONTINUE] Setting cookie - Production mode:', isProduction);
    res.cookie('token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/'
    });
    console.log('[SSO CONTINUE] Cookie set successfully');
    
    // Log successful SSO login
    console.log('[SSO CONTINUE SUCCESS] SSO login completed successfully');
    
    // Redirect to frontend application with success parameter
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8090';
    console.log('[SSO CONTINUE] Redirecting to frontend URL:', `${frontendUrl}/sso/continue?success=true`);
    res.redirect(`${frontendUrl}/sso/continue?success=true`);
    
    console.log('[SSO CONTINUE] Redirect response sent');
    
  } catch (error) {
    console.error('Error in /sso/continue:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8090';
    res.redirect(`${frontendUrl}/login?error=internal_error`);
  }
});

// GET /sso/status - Health check endpoint
router.get('/status', async (req, res) => {
  try {
    const redisStatus = redisService.getStatus();
    const redisPing = await redisService.ping();
    
    res.json({
      status: 'ok',
      redis: {
        connected: redisStatus.connected,
        ping: redisPing
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error in /sso/status:', error);
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;