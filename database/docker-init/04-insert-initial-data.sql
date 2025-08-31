-- Docker Database Initialization Script 4: Insert Initial Data
-- MS SQL Server Initial Data for Persona AI Link
-- This script inserts default users, role permissions, and sample data

USE PersonaAILink;
GO

-- Insert role permissions for RBAC system
PRINT 'Inserting role permissions...';

-- Superadmin permissions
IF NOT EXISTS (SELECT 1 FROM role_permissions WHERE role = 'superadmin' AND permission = 'user.create')
    INSERT INTO role_permissions (role, permission) VALUES ('superadmin', 'user.create');
IF NOT EXISTS (SELECT 1 FROM role_permissions WHERE role = 'superadmin' AND permission = 'user.read')
    INSERT INTO role_permissions (role, permission) VALUES ('superadmin', 'user.read');
IF NOT EXISTS (SELECT 1 FROM role_permissions WHERE role = 'superadmin' AND permission = 'user.update')
    INSERT INTO role_permissions (role, permission) VALUES ('superadmin', 'user.update');
IF NOT EXISTS (SELECT 1 FROM role_permissions WHERE role = 'superadmin' AND permission = 'user.delete')
    INSERT INTO role_permissions (role, permission) VALUES ('superadmin', 'user.delete');
IF NOT EXISTS (SELECT 1 FROM role_permissions WHERE role = 'superadmin' AND permission = 'admin.access')
    INSERT INTO role_permissions (role, permission) VALUES ('superadmin', 'admin.access');
IF NOT EXISTS (SELECT 1 FROM role_permissions WHERE role = 'superadmin' AND permission = 'system.config')
    INSERT INTO role_permissions (role, permission) VALUES ('superadmin', 'system.config');
IF NOT EXISTS (SELECT 1 FROM role_permissions WHERE role = 'superadmin' AND permission = 'chat.access')
    INSERT INTO role_permissions (role, permission) VALUES ('superadmin', 'chat.access');
IF NOT EXISTS (SELECT 1 FROM role_permissions WHERE role = 'superadmin' AND permission = 'feedback.manage')
    INSERT INTO role_permissions (role, permission) VALUES ('superadmin', 'feedback.manage');

-- Admin permissions
IF NOT EXISTS (SELECT 1 FROM role_permissions WHERE role = 'admin' AND permission = 'user.read')
    INSERT INTO role_permissions (role, permission) VALUES ('admin', 'user.read');
IF NOT EXISTS (SELECT 1 FROM role_permissions WHERE role = 'admin' AND permission = 'user.update')
    INSERT INTO role_permissions (role, permission) VALUES ('admin', 'user.update');
IF NOT EXISTS (SELECT 1 FROM role_permissions WHERE role = 'admin' AND permission = 'admin.access')
    INSERT INTO role_permissions (role, permission) VALUES ('admin', 'admin.access');
IF NOT EXISTS (SELECT 1 FROM role_permissions WHERE role = 'admin' AND permission = 'chat.access')
    INSERT INTO role_permissions (role, permission) VALUES ('admin', 'chat.access');
IF NOT EXISTS (SELECT 1 FROM role_permissions WHERE role = 'admin' AND permission = 'feedback.view')
    INSERT INTO role_permissions (role, permission) VALUES ('admin', 'feedback.view');

-- User permissions
IF NOT EXISTS (SELECT 1 FROM role_permissions WHERE role = 'user' AND permission = 'chat.access')
    INSERT INTO role_permissions (role, permission) VALUES ('user', 'chat.access');
IF NOT EXISTS (SELECT 1 FROM role_permissions WHERE role = 'user' AND permission = 'feedback.create')
    INSERT INTO role_permissions (role, permission) VALUES ('user', 'feedback.create');

PRINT 'Role permissions inserted successfully';
GO

-- Insert default users
PRINT 'Inserting default users...';

-- Insert superadmin user (password: admin123)
IF NOT EXISTS (SELECT 1 FROM chat_Users WHERE username = 'superadmin')
BEGIN
    INSERT INTO chat_Users (
        id, username, email, passwordHash, firstName, lastName, 
        role, active, authMethod, createdAt, updatedAt
    ) VALUES (
        NEWID(),
        'superadmin',
        'superadmin@personaai.local',
        '$2b$10$8K1p/a0drtIWinzBWz.lO.ctjhkiDY2YkaMrEi4LEBKuxUWFkKFSe', -- admin123
        'Super',
        'Administrator',
        'superadmin',
        1,
        'local',
        GETDATE(),
        GETDATE()
    );
    PRINT 'Superadmin user created successfully';
END
ELSE
BEGIN
    PRINT 'Superadmin user already exists';
END
GO

-- Insert admin user (password: admin123)
IF NOT EXISTS (SELECT 1 FROM chat_Users WHERE username = 'admin')
BEGIN
    INSERT INTO chat_Users (
        id, username, email, passwordHash, firstName, lastName, 
        role, active, authMethod, createdAt, updatedAt
    ) VALUES (
        NEWID(),
        'admin',
        'admin@personaai.local',
        '$2b$10$8K1p/a0drtIWinzBWz.lO.ctjhkiDY2YkaMrEi4LEBKuxUWFkKFSe', -- admin123
        'System',
        'Administrator',
        'admin',
        1,
        'local',
        GETDATE(),
        GETDATE()
    );
    PRINT 'Admin user created successfully';
END
ELSE
BEGIN
    PRINT 'Admin user already exists';
END
GO

-- Insert demo user (password: demo123) for testing
IF NOT EXISTS (SELECT 1 FROM chat_Users WHERE username = 'demo')
BEGIN
    INSERT INTO chat_Users (
        id, username, email, passwordHash, firstName, lastName, 
        role, active, authMethod, createdAt, updatedAt
    ) VALUES (
        NEWID(),
        'demo',
        'demo@personaai.local',
        '$2b$10$YourHashedPasswordForDemo123GoesHere', -- demo123 (placeholder hash)
        'Demo',
        'User',
        'user',
        1,
        'local',
        GETDATE(),
        GETDATE()
    );
    PRINT 'Demo user created successfully';
END
ELSE
BEGIN
    PRINT 'Demo user already exists';
END
GO

PRINT 'Initial data insertion completed successfully';
PRINT 'Default users created:';
PRINT '  - superadmin@personaai.local (password: admin123)';
PRINT '  - admin@personaai.local (password: admin123)';
PRINT '  - demo@personaai.local (password: demo123)';
PRINT 'Database initialization completed!';
GO