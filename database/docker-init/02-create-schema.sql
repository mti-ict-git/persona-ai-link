-- Docker Database Initialization Script 2: Create Schema
-- MS SQL Server Schema Creation for Persona AI Link
-- This script creates all tables, indexes, and constraints

USE PersonaAILink;
GO

-- Users table for authentication
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='chat_Users' AND xtype='U')
BEGIN
    CREATE TABLE chat_Users (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        username NVARCHAR(50) NOT NULL UNIQUE,
        email NVARCHAR(255) NOT NULL UNIQUE,
        passwordHash NVARCHAR(255) NOT NULL,
        firstName NVARCHAR(100) NULL,
        lastName NVARCHAR(100) NULL,
        role NVARCHAR(20) NOT NULL DEFAULT 'user',
        active BIT NOT NULL DEFAULT 1,
        authMethod NVARCHAR(20) NOT NULL DEFAULT 'local',
        createdAt DATETIME2 DEFAULT GETDATE(),
        updatedAt DATETIME2 DEFAULT GETDATE()
    );
    
    -- Indexes for users table
    CREATE INDEX IX_chat_Users_email ON chat_Users(email);
    CREATE INDEX IX_chat_Users_username ON chat_Users(username);
    CREATE INDEX IX_chat_Users_role ON chat_Users(role);
    CREATE INDEX IX_chat_Users_authMethod ON chat_Users(authMethod);
    
    -- Add check constraint for authMethod
    ALTER TABLE chat_Users 
    ADD CONSTRAINT CK_chat_Users_authMethod 
    CHECK (authMethod IN ('local', 'ldap'));
    
    PRINT 'Created chat_Users table with indexes and constraints';
END
ELSE
BEGIN
    PRINT 'chat_Users table already exists';
END
GO

-- Sessions table to store chat sessions
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='sessions' AND xtype='U')
BEGIN
    CREATE TABLE sessions (
        id NVARCHAR(50) PRIMARY KEY,
        session_name NVARCHAR(255) NULL,
        title NVARCHAR(500) NOT NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        user_id NVARCHAR(50) NULL,
        status NVARCHAR(20) DEFAULT 'active',
        metadata NVARCHAR(MAX) NULL
    );
    
    -- Indexes for better performance
    CREATE INDEX IX_sessions_created_at ON sessions(created_at DESC);
    CREATE INDEX IX_sessions_user_id ON sessions(user_id);
    CREATE INDEX IX_sessions_status ON sessions(status);
    
    PRINT 'Created sessions table with indexes';
END
ELSE
BEGIN
    PRINT 'sessions table already exists';
END
GO

-- Messages table to store individual chat messages
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='messages' AND xtype='U')
BEGIN
    CREATE TABLE messages (
        id NVARCHAR(50) PRIMARY KEY,
        session_id NVARCHAR(50) NOT NULL,
        content NVARCHAR(MAX) NOT NULL,
        role NVARCHAR(20) NOT NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        message_order INT NOT NULL,
        metadata NVARCHAR(MAX) NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );
    
    -- Indexes for better performance
    CREATE INDEX IX_messages_session_id ON messages(session_id);
    CREATE INDEX IX_messages_created_at ON messages(created_at);
    CREATE INDEX IX_messages_order ON messages(session_id, message_order);
    
    PRINT 'Created messages table with indexes and foreign keys';
END
ELSE
BEGIN
    PRINT 'messages table already exists';
END
GO

-- Role permissions table for granular access control
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
    
    PRINT 'Created role_permissions table with indexes';
END
ELSE
BEGIN
    PRINT 'role_permissions table already exists';
END
GO

-- ProcessedFiles table for training data management
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ProcessedFiles' AND xtype='U')
BEGIN
    CREATE TABLE ProcessedFiles (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        filename NVARCHAR(255) NOT NULL,
        file_path NVARCHAR(500) NULL,
        metadata NVARCHAR(MAX) NULL,
        processed BIT NOT NULL DEFAULT 0,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
    );
    
    -- Indexes for ProcessedFiles table
    CREATE INDEX IX_ProcessedFiles_filename ON ProcessedFiles(filename);
    CREATE INDEX IX_ProcessedFiles_processed ON ProcessedFiles(processed);
    CREATE INDEX IX_ProcessedFiles_created_at ON ProcessedFiles(created_at);
    
    -- Unique constraint to prevent duplicate filenames
    CREATE UNIQUE INDEX IX_ProcessedFiles_filename_unique ON ProcessedFiles(filename) WHERE processed = 1;
    
    PRINT 'Created ProcessedFiles table with indexes and constraints';
END
ELSE
BEGIN
    PRINT 'ProcessedFiles table already exists';
END
GO

-- Message feedback table for user feedback functionality
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='message_feedback' AND xtype='U')
BEGIN
    CREATE TABLE message_feedback (
        id INT IDENTITY(1,1) PRIMARY KEY,
        message_id NVARCHAR(50) NOT NULL,
        session_id NVARCHAR(50) NOT NULL,
        user_id NVARCHAR(50) NULL,
        feedback_type NVARCHAR(20) NOT NULL CHECK (feedback_type IN ('positive', 'negative')),
        comment NVARCHAR(MAX) NULL,
        message_content NVARCHAR(MAX) NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
    );
    
    -- Create indexes for better performance
    CREATE INDEX IX_message_feedback_session_id ON message_feedback(session_id);
    CREATE INDEX IX_message_feedback_message_id ON message_feedback(message_id);
    CREATE INDEX IX_message_feedback_user_id ON message_feedback(user_id);
    CREATE INDEX IX_message_feedback_type ON message_feedback(feedback_type);
    CREATE INDEX IX_message_feedback_created_at ON message_feedback(created_at DESC);
    
    -- Create foreign key relationships
    ALTER TABLE message_feedback 
    ADD CONSTRAINT FK_message_feedback_session_id 
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;
    
    PRINT 'Created message_feedback table with indexes and foreign keys';
END
ELSE
BEGIN
    PRINT 'message_feedback table already exists';
END
GO

PRINT 'Database schema creation completed successfully';
GO