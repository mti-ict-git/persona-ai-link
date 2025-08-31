-- Migration: Add Role-Based Access Control
-- Date: 2025-08-31
-- Description: Add role_permissions table and update user roles for RBAC

USE [persona_ai_link];
GO

-- Create role permissions table for granular access control
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='role_permissions' AND xtype='U')
BEGIN
    CREATE TABLE role_permissions (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        role NVARCHAR(20) NOT NULL,
        permission NVARCHAR(50) NOT NULL,
        created_at DATETIME2 DEFAULT GETDATE()
    );
    
    -- Indexes for role_permissions table
    CREATE INDEX IX_role_permissions_role ON role_permissions(role);
    CREATE INDEX IX_role_permissions_permission ON role_permissions(permission);
    CREATE UNIQUE INDEX IX_role_permissions_unique ON role_permissions(role, permission);
    
    PRINT 'Created role_permissions table';
END
ELSE
BEGIN
    PRINT 'role_permissions table already exists';
END
GO

-- Insert role permissions if they don't exist
IF NOT EXISTS (SELECT * FROM role_permissions WHERE role = 'superadmin')
BEGIN
    -- Superadmin can manage users and training
    INSERT INTO role_permissions (role, permission) VALUES 
    ('superadmin', 'manage_users'),
    ('superadmin', 'manage_training'),
    ('superadmin', 'view_admin_dashboard'),
    ('superadmin', 'system_administration');
    
    PRINT 'Added superadmin permissions';
END

IF NOT EXISTS (SELECT * FROM role_permissions WHERE role = 'admin')
BEGIN
    -- Admin can only manage training
    INSERT INTO role_permissions (role, permission) VALUES 
    ('admin', 'manage_training'),
    ('admin', 'view_admin_dashboard');
    
    PRINT 'Added admin permissions';
END

IF NOT EXISTS (SELECT * FROM role_permissions WHERE role = 'user')
BEGIN
    -- Regular user permissions
    INSERT INTO role_permissions (role, permission) VALUES 
    ('user', 'chat_access');
    
    PRINT 'Added user permissions';
END
GO

-- Create superadmin user if it doesn't exist
IF NOT EXISTS (SELECT * FROM chat_Users WHERE username = 'superadmin')
BEGIN
    INSERT INTO chat_Users (username, email, passwordHash, firstName, lastName, role, active) VALUES 
    ('superadmin', 'mti.superadmin@merdekabattery.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Super', 'Admin', 'superadmin', 1);
    
    PRINT 'Created superadmin user';
END
ELSE
BEGIN
    PRINT 'superadmin user already exists';
END
GO

-- Update existing admin user role if needed
IF EXISTS (SELECT * FROM chat_Users WHERE username = 'admin' AND role != 'admin')
BEGIN
    UPDATE chat_Users SET role = 'admin' WHERE username = 'admin';
    PRINT 'Updated admin user role';
END
GO

PRINT 'Role-based access control migration completed successfully';