-- Persona AI Link Database Schema
-- MS SQL Server Database Schema

-- Users table for authentication
CREATE TABLE chat_Users (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    username NVARCHAR(50) NOT NULL UNIQUE,
    email NVARCHAR(255) NOT NULL UNIQUE,
    passwordHash NVARCHAR(255) NOT NULL,
    firstName NVARCHAR(100) NULL,
    lastName NVARCHAR(100) NULL,
    role NVARCHAR(20) NOT NULL DEFAULT 'user',
    active BIT NOT NULL DEFAULT 1,
    createdAt DATETIME2 DEFAULT GETDATE(),
    updatedAt DATETIME2 DEFAULT GETDATE()
);

-- Indexes for users table
CREATE INDEX IX_chat_Users_email ON chat_Users(email);
CREATE INDEX IX_chat_Users_username ON chat_Users(username);
CREATE INDEX IX_chat_Users_role ON chat_Users(role);

GO

-- Sessions table to store chat sessions
CREATE TABLE sessions (
    id NVARCHAR(50) PRIMARY KEY,
    session_name NVARCHAR(255) NULL, -- Meaningful name for the session (can be null initially)
    title NVARCHAR(500) NOT NULL, -- Original title based on first message
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    user_id NVARCHAR(50) NULL, -- For future user management
    status NVARCHAR(20) DEFAULT 'active', -- active, archived, deleted
    metadata NVARCHAR(MAX) NULL -- JSON field for additional session data
);

-- Messages table to store individual chat messages
CREATE TABLE messages (
    id NVARCHAR(50) PRIMARY KEY,
    session_id NVARCHAR(50) NOT NULL,
    content NVARCHAR(MAX) NOT NULL,
    role NVARCHAR(20) NOT NULL, -- 'user' or 'assistant'
    created_at DATETIME2 DEFAULT GETDATE(),
    message_order INT NOT NULL, -- Order of message in session
    metadata NVARCHAR(MAX) NULL, -- JSON field for additional message data
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Indexes for better performance
CREATE INDEX IX_sessions_created_at ON sessions(created_at DESC);
CREATE INDEX IX_sessions_user_id ON sessions(user_id);
CREATE INDEX IX_sessions_status ON sessions(status);
CREATE INDEX IX_messages_session_id ON messages(session_id);
CREATE INDEX IX_messages_created_at ON messages(created_at);
CREATE INDEX IX_messages_order ON messages(session_id, message_order);
GO

-- Trigger to update updated_at timestamp
CREATE TRIGGER tr_sessions_updated_at
ON sessions
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE sessions
    SET updated_at = GETDATE()
    FROM sessions s
    INNER JOIN inserted i ON s.id = i.id;
END;

-- Role permissions table for granular access control
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

GO

-- Insert role permissions
-- Superadmin can manage users and training
INSERT INTO role_permissions (role, permission) VALUES 
('superadmin', 'manage_users'),
('superadmin', 'manage_training'),
('superadmin', 'view_admin_dashboard'),
('superadmin', 'system_administration');

-- Admin can only manage training
INSERT INTO role_permissions (role, permission) VALUES 
('admin', 'manage_training'),
('admin', 'view_admin_dashboard');

-- Regular user permissions
INSERT INTO role_permissions (role, permission) VALUES 
('user', 'chat_access');

GO

-- Create superadmin user (upgraded from admin)
-- Password: P@ssw0rd.123 (hashed with bcrypt)
INSERT INTO chat_Users (username, email, passwordHash, firstName, lastName, role, active) VALUES 
('superadmin', 'mti.superadmin@merdekabattery.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Super', 'Admin', 'superadmin', 1);

-- Create regular admin user for training management
INSERT INTO chat_Users (username, email, passwordHash, firstName, lastName, role, active) VALUES 
('admin', 'mti.admin@merdekabattery.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin', 'User', 'admin', 1);

-- Sample data for testing (optional)
-- INSERT INTO sessions (id, title, session_name) VALUES 
-- ('test-session-1', 'Test Chat Session', 'AI Assistant Conversation'),
-- ('test-session-2', 'Another Test', 'Data Analysis Discussion');

-- INSERT INTO messages (id, session_id, content, role, message_order) VALUES
-- ('msg-1', 'test-session-1', 'Hello, how can you help me?', 'user', 1),
-- ('msg-2', 'test-session-1', 'I can help you with various tasks. What would you like to know?', 'assistant', 2);

GO

-- ProcessedFiles table for training data management
CREATE TABLE ProcessedFiles (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    filename NVARCHAR(255) NOT NULL,
    file_path NVARCHAR(500) NULL,
    metadata NVARCHAR(MAX) NULL, -- JSON field for additional file data
    processed BIT NOT NULL DEFAULT 0, -- Boolean flag for processing status
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

-- Indexes for ProcessedFiles table
CREATE INDEX IX_ProcessedFiles_filename ON ProcessedFiles(filename);
CREATE INDEX IX_ProcessedFiles_processed ON ProcessedFiles(processed);
CREATE INDEX IX_ProcessedFiles_created_at ON ProcessedFiles(created_at);

-- Unique constraint to prevent duplicate filenames
CREATE UNIQUE INDEX IX_ProcessedFiles_filename_unique ON ProcessedFiles(filename) WHERE processed = 1;