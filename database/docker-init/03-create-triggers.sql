-- Docker Database Initialization Script 3: Create Triggers
-- MS SQL Server Triggers for Persona AI Link
-- This script creates triggers for automatic timestamp updates

USE PersonaAILink;
GO

-- Trigger to update updated_at timestamp for sessions table
IF NOT EXISTS (SELECT * FROM sys.triggers WHERE name = 'tr_sessions_updated_at')
BEGIN
    EXEC('CREATE TRIGGER tr_sessions_updated_at
    ON sessions
    AFTER UPDATE
    AS
    BEGIN
        SET NOCOUNT ON;
        UPDATE sessions
        SET updated_at = GETDATE()
        FROM sessions s
        INNER JOIN inserted i ON s.id = i.id;
    END');
    
    PRINT 'Created trigger tr_sessions_updated_at for sessions table';
END
ELSE
BEGIN
    PRINT 'Trigger tr_sessions_updated_at already exists';
END
GO

-- Trigger to update updated_at timestamp for message_feedback table
IF NOT EXISTS (SELECT * FROM sys.triggers WHERE name = 'tr_message_feedback_updated_at')
BEGIN
    EXEC('CREATE TRIGGER tr_message_feedback_updated_at
    ON message_feedback
    AFTER UPDATE
    AS
    BEGIN
        SET NOCOUNT ON;
        UPDATE message_feedback
        SET updated_at = GETDATE()
        FROM message_feedback mf
        INNER JOIN inserted i ON mf.id = i.id;
    END');
    
    PRINT 'Created trigger tr_message_feedback_updated_at for message_feedback table';
END
ELSE
BEGIN
    PRINT 'Trigger tr_message_feedback_updated_at already exists';
END
GO

-- Trigger to update updated_at timestamp for ProcessedFiles table
IF NOT EXISTS (SELECT * FROM sys.triggers WHERE name = 'tr_ProcessedFiles_updated_at')
BEGIN
    EXEC('CREATE TRIGGER tr_ProcessedFiles_updated_at
    ON ProcessedFiles
    AFTER UPDATE
    AS
    BEGIN
        SET NOCOUNT ON;
        UPDATE ProcessedFiles
        SET updated_at = GETDATE()
        FROM ProcessedFiles pf
        INNER JOIN inserted i ON pf.id = i.id;
    END');
    
    PRINT 'Created trigger tr_ProcessedFiles_updated_at for ProcessedFiles table';
END
ELSE
BEGIN
    PRINT 'Trigger tr_ProcessedFiles_updated_at already exists';
END
GO

-- Trigger to update updatedAt timestamp for chat_Users table
IF NOT EXISTS (SELECT * FROM sys.triggers WHERE name = 'tr_chat_Users_updated_at')
BEGIN
    EXEC('CREATE TRIGGER tr_chat_Users_updated_at
    ON chat_Users
    AFTER UPDATE
    AS
    BEGIN
        SET NOCOUNT ON;
        UPDATE chat_Users
        SET updatedAt = GETDATE()
        FROM chat_Users u
        INNER JOIN inserted i ON u.id = i.id;
    END');
    
    PRINT 'Created trigger tr_chat_Users_updated_at for chat_Users table';
END
ELSE
BEGIN
    PRINT 'Trigger tr_chat_Users_updated_at already exists';
END
GO

PRINT 'Database triggers creation completed successfully';
GO