const sql = require('mssql');
const { dbManager } = require('../utils/database');

/**
 * Role-Based Access Control Middleware
 * Checks if user has required permissions based on their role
 */

/**
 * Get user permissions from database
 * @param {string} userId - User ID
 * @returns {Array} Array of permissions
 */
async function getUserPermissions(userId) {
    try {
        const pool = await dbManager.getConnection();
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query(`
                SELECT DISTINCT rp.permission, u.role, u.email
                FROM chat_Users u
                INNER JOIN role_permissions rp ON u.role = rp.role
                WHERE u.id = @userId AND u.active = 1
            `);
        
        console.log(`[RBAC] User ${userId} permissions:`, result.recordset);
        return result.recordset.map(row => row.permission);
    } catch (error) {
        console.error('Error fetching user permissions:', error);
        return [];
    }
}

/**
 * Check if user has specific permission
 * @param {string} userId - User ID
 * @param {string} permission - Required permission
 * @returns {boolean} True if user has permission
 */
async function hasPermission(userId, permission) {
    const permissions = await getUserPermissions(userId);
    return permissions.includes(permission);
}

/**
 * Middleware to require specific permission
 * @param {string} requiredPermission - Permission required to access route
 * @returns {Function} Express middleware function
 */
function requirePermission(requiredPermission) {
    return async (req, res, next) => {
        try {
            console.log(`[RBAC] Checking permission '${requiredPermission}' for user:`, req.user);
            
            // Check if user is authenticated
            if (!req.user || !req.user.id) {
                console.log('[RBAC] No user or user ID found in request');
                return res.status(401).json({ 
                    error: 'Authentication required',
                    code: 'AUTH_REQUIRED'
                });
            }

            // Check if user has required permission
            const hasAccess = await hasPermission(req.user.id, requiredPermission);
            console.log(`[RBAC] User ${req.user.id} has access to '${requiredPermission}':`, hasAccess);
            
            if (!hasAccess) {
                console.log(`[RBAC] Permission denied for user ${req.user.id}`);
                return res.status(403).json({ 
                    error: 'Insufficient permissions',
                    code: 'INSUFFICIENT_PERMISSIONS',
                    required: requiredPermission
                });
            }

            console.log(`[RBAC] Permission granted for user ${req.user.id}`);
            // User has permission, continue to next middleware
            next();
        } catch (error) {
            console.error('RBAC middleware error:', error);
            res.status(500).json({ 
                error: 'Internal server error during permission check',
                code: 'RBAC_ERROR'
            });
        }
    };
}

/**
 * Middleware to require any of multiple permissions
 * @param {Array<string>} permissions - Array of permissions (user needs at least one)
 * @returns {Function} Express middleware function
 */
function requireAnyPermission(permissions) {
    return async (req, res, next) => {
        try {
            if (!req.user || !req.user.id) {
                return res.status(401).json({ 
                    error: 'Authentication required',
                    code: 'AUTH_REQUIRED'
                });
            }

            const userPermissions = await getUserPermissions(req.user.id);
            const hasAnyPermission = permissions.some(permission => 
                userPermissions.includes(permission)
            );
            
            if (!hasAnyPermission) {
                return res.status(403).json({ 
                    error: 'Insufficient permissions',
                    code: 'INSUFFICIENT_PERMISSIONS',
                    required: permissions
                });
            }

            next();
        } catch (error) {
            console.error('RBAC middleware error:', error);
            res.status(500).json({ 
                error: 'Internal server error during permission check',
                code: 'RBAC_ERROR'
            });
        }
    };
}

/**
 * Middleware to check if user is superadmin
 * @returns {Function} Express middleware function
 */
function requireSuperAdmin() {
    return requirePermission('system_administration');
}

/**
 * Middleware to check if user can manage users
 * @returns {Function} Express middleware function
 */
function requireUserManagement() {
    return requirePermission('manage_users');
}

/**
 * Middleware to check if user can manage training
 * @returns {Function} Express middleware function
 */
function requireTrainingManagement() {
    return requirePermission('manage_training');
}

/**
 * Middleware to check if user can access admin dashboard
 * @returns {Function} Express middleware function
 */
function requireAdminAccess() {
    return requirePermission('view_admin_dashboard');
}

module.exports = {
    getUserPermissions,
    hasPermission,
    requirePermission,
    requireAnyPermission,
    requireSuperAdmin,
    requireUserManagement,
    requireTrainingManagement,
    requireAdminAccess
};