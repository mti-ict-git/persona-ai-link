const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./auth');
const sql = require('mssql');
const { dbManager } = require('../utils/database');
const { 
  requireAdminAccess, 
  requireUserManagement, 
  requireTrainingManagement,
  requireSuperAdmin 
} = require('../middleware/rbac');

// Apply authentication to all admin routes
router.use((req, res, next) => {
  console.log('[ADMIN] 🚀 Admin route accessed:', req.method, req.originalUrl);
  next();
});
router.use(authenticateToken);
router.use((req, res, next) => {
  console.log('[ADMIN] ✅ Authentication passed, checking admin access...');
  next();
});
router.use(requireAdminAccess()); // Require admin dashboard access
router.use((req, res, next) => {
  console.log('[ADMIN] ✅ Admin access granted, proceeding to route handler...');
  next();
});

// GET /api/admin/users - Get all users with pagination (superadmin only)
router.get('/users', requireUserManagement(), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    
    const pool = await dbManager.getConnection();
    const request = pool.request();
    request.input('limit', sql.Int, limit);
    request.input('offset', sql.Int, offset);
    request.input('search', sql.NVarChar(255), `%${search}%`);
    
    // Get users with session and message counts
    const result = await request.query(`
      SELECT 
        u.id,
        u.username,
        u.email,
        u.role,
        u.createdAt as created_at,
        COUNT(DISTINCT s.id) as session_count,
        COUNT(DISTINCT m.id) as message_count
      FROM chat_Users u
      LEFT JOIN sessions s ON u.id = CAST(s.user_id AS INT)
      LEFT JOIN messages m ON s.id = m.session_id
      WHERE u.username LIKE @search OR u.email LIKE @search
      GROUP BY u.id, u.username, u.email, u.role, u.createdAt
      ORDER BY u.createdAt DESC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `);
    
    // Get total count
    const countRequest = pool.request();
    countRequest.input('search', sql.NVarChar(255), `%${search}%`);
    const countResult = await countRequest.query(`
      SELECT COUNT(*) as total
      FROM chat_Users
      WHERE username LIKE @search OR email LIKE @search
    `);
    
    const total = countResult.recordset[0].total;
    const totalPages = Math.ceil(total / limit);
    
    res.json({
      users: result.recordset,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/admin/users/:id - Get specific user details
router.get('/users/:id', requireUserManagement(), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    const pool = await dbManager.getConnection();
    const request = pool.request();
    request.input('userId', sql.Int, userId);
    
    const result = await request.query(`
      SELECT 
        u.id,
        u.username,
        u.email,
        u.role,
        u.createdAt as created_at,
        COUNT(DISTINCT s.id) as session_count,
        COUNT(DISTINCT m.id) as message_count
      FROM chat_Users u
      LEFT JOIN sessions s ON u.id = CAST(s.user_id AS INT)
      LEFT JOIN messages m ON s.id = m.session_id
      WHERE u.id = @userId
      GROUP BY u.id, u.username, u.email, u.role, u.createdAt
    `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// PUT /api/admin/users/:id - Update user
router.put('/users/:id', requireUserManagement(), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { username, email, role } = req.body;
    
    // Validate input
    if (!username || !email || !role) {
      return res.status(400).json({ error: 'Username, email, and role are required' });
    }
    
    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be admin or user' });
    }
    
    const pool = await dbManager.getConnection();
    const request = pool.request();
    request.input('userId', sql.Int, userId);
    request.input('username', sql.NVarChar(50), username);
    request.input('email', sql.NVarChar(255), email);
    request.input('role', sql.NVarChar(20), role);
    
    const result = await request.query(`
      UPDATE chat_Users 
      SET username = @username, email = @email, role = @role
      WHERE id = @userId
    `);
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    if (error.number === 2627) { // Unique constraint violation
      res.status(400).json({ error: 'Username or email already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update user' });
    }
  }
});

// DELETE /api/admin/users/:id - Delete user
router.delete('/users/:id', requireUserManagement(), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    // Prevent admin from deleting themselves
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    const pool = await dbManager.getConnection();
    const request = pool.request();
    request.input('userId', sql.Int, userId);
    
    // Delete user (cascading deletes will handle sessions and messages)
    const result = await request.query(`
      DELETE FROM chat_Users WHERE id = @userId
    `);
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// GET /api/admin/stats - Get system statistics
router.get('/stats', async (req, res) => {
  try {
    const pool = await dbManager.getConnection();
    const request = pool.request();
    
    const result = await request.query(`
      SELECT 
        (SELECT COUNT(*) FROM chat_Users) as total_users,
        (SELECT COUNT(*) FROM chat_Users WHERE role = 'admin') as admin_users,
        (SELECT COUNT(*) FROM sessions) as total_sessions,
        (SELECT COUNT(*) FROM messages) as total_messages,
        (SELECT COUNT(*) FROM chat_Users WHERE createdAt >= DATEADD(day, -7, GETDATE())) as active_users_week,
        (SELECT COUNT(*) FROM sessions WHERE created_at >= DATEADD(day, -7, GETDATE())) as sessions_this_week,
        (SELECT COUNT(*) FROM messages WHERE created_at >= DATEADD(day, -7, GETDATE())) as messages_this_week
    `);
    
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// GET /api/admin/sessions - Get all sessions with user info
router.get('/sessions', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    const pool = await dbManager.getConnection();
    const request = pool.request();
    request.input('limit', sql.Int, limit);
    request.input('offset', sql.Int, offset);
    
    const result = await request.query(`
      SELECT 
        s.id,
        s.title,
        s.session_name,
        s.created_at,
        s.updated_at,
        u.username,
        u.email,
        COUNT(m.id) as message_count
      FROM sessions s
      LEFT JOIN chat_Users u ON u.id = CAST(s.user_id AS INT)
      LEFT JOIN messages m ON s.id = m.session_id
      GROUP BY s.id, s.title, s.session_name, s.created_at, s.updated_at, u.username, u.email
      ORDER BY s.updated_at DESC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `);
    
    // Get total count
    const countRequest = pool.request();
    const countResult = await countRequest.query('SELECT COUNT(*) as total FROM sessions');
    const total = countResult.recordset[0].total;
    const totalPages = Math.ceil(total / limit);
    
    res.json({
      sessions: result.recordset,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// DELETE /api/admin/sessions/:id - Delete session
router.delete('/sessions/:id', async (req, res) => {
  try {
    const sessionId = req.params.id;
    
    const pool = await dbManager.getConnection();
    const request = pool.request();
    request.input('sessionId', sql.NVarChar(50), sessionId);
    
    const result = await request.query(`
      DELETE FROM sessions WHERE id = @sessionId
    `);
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

// POST /api/admin/users - Create new user (superadmin only)
router.post('/users', (req, res, next) => {
  console.log('[ADMIN] 👤 POST /users route accessed - checking superadmin permissions...');
  console.log('[ADMIN] Request body:', JSON.stringify(req.body, null, 2));
  next();
}, requireSuperAdmin(), async (req, res) => {
  console.log('[ADMIN] 🔐 SuperAdmin check passed, creating user...');
  try {
    const { username, email, password, role } = req.body;
    
    // Validate input
    if (!username || !email || !password || !role) {
      return res.status(400).json({ error: 'Username, email, password, and role are required' });
    }
    
    if (!['admin', 'user', 'superadmin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be admin, user, or superadmin' });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const pool = await dbManager.getConnection();
    const request = pool.request();
    request.input('username', sql.NVarChar(50), username);
    request.input('email', sql.NVarChar(255), email);
    request.input('password', sql.NVarChar(255), hashedPassword);
    request.input('role', sql.NVarChar(20), role);
    
    const result = await request.query(`
      INSERT INTO chat_Users (username, email, passwordHash, role, createdAt)
      OUTPUT INSERTED.id, INSERTED.username, INSERTED.email, INSERTED.role, INSERTED.createdAt
      VALUES (@username, @email, @password, @role, GETDATE())
    `);
    
    const newUser = result.recordset[0];
    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        created_at: newUser.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    if (error.number === 2627) { // Unique constraint violation
      res.status(400).json({ error: 'Username or email already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create user' });
    }
  }
});

// POST /api/admin/users/:id/reset-password - Reset user password (superadmin only)
router.post('/users/:id/reset-password', requireSuperAdmin(), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { newPassword } = req.body;
    
    // Validate input
    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required' });
    }
    
    // Validate password strength
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const pool = await dbManager.getConnection();
    const request = pool.request();
    request.input('userId', sql.Int, userId);
    request.input('password', sql.NVarChar(255), hashedPassword);
    
    const result = await request.query(`
      UPDATE chat_Users 
      SET passwordHash = @password
      WHERE id = @userId
    `);
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

module.exports = router;