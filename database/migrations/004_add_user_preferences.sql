-- Migration: Add User Preferences Table
-- Date: 2025-01-16
-- Description: Add user_preferences table to store user preferences like language, theme, etc.

USE [AIChatBot];
GO

-- Create user preferences table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='user_preferences' AND xtype='U')
BEGIN
    CREATE TABLE user_preferences (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        user_id NVARCHAR(50) NOT NULL,
        preference_key NVARCHAR(50) NOT NULL,
        preference_value NVARCHAR(MAX) NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        
        -- Foreign key to chat_Users table
        CONSTRAINT FK_user_preferences_user_id 
        FOREIGN KEY (user_id) REFERENCES chat_Users(id) ON DELETE CASCADE
    );
    
    -- Indexes for user_preferences table
    CREATE INDEX IX_user_preferences_user_id ON user_preferences(user_id);
    CREATE INDEX IX_user_preferences_key ON user_preferences(preference_key);
    CREATE UNIQUE INDEX IX_user_preferences_unique ON user_preferences(user_id, preference_key);
    
    PRINT 'Created user_preferences table with indexes and foreign key';
END
ELSE
BEGIN
    PRINT 'user_preferences table already exists';
END
GO

-- Create trigger to update updated_at timestamp
IF NOT EXISTS (SELECT * FROM sys.triggers WHERE name = 'tr_user_preferences_updated_at')
BEGIN
    EXEC('
    CREATE TRIGGER tr_user_preferences_updated_at
    ON user_preferences
    AFTER UPDATE
    AS
    BEGIN
        SET NOCOUNT ON;
        UPDATE user_preferences
        SET updated_at = GETDATE()
        FROM user_preferences up
        INNER JOIN inserted i ON up.id = i.id;
    END
    ');
    
    PRINT 'Created trigger for user_preferences updated_at';
END
ELSE
BEGIN
    PRINT 'Trigger tr_user_preferences_updated_at already exists';
END
GO

-- Insert default preferences for existing users
PRINT 'Inserting default preferences for existing users...';

-- Add default language preference (English) for all existing users
INSERT INTO user_preferences (user_id, preference_key, preference_value)
SELECT 
    id as user_id,
    'language' as preference_key,
    'en' as preference_value
FROM chat_Users 
WHERE id NOT IN (
    SELECT user_id 
    FROM user_preferences 
    WHERE preference_key = 'language'
);

-- Add default theme preference (light) for all existing users
INSERT INTO user_preferences (user_id, preference_key, preference_value)
SELECT 
    id as user_id,
    'theme' as preference_key,
    'light' as preference_value
FROM chat_Users 
WHERE id NOT IN (
    SELECT user_id 
    FROM user_preferences 
    WHERE preference_key = 'theme'
);

-- Add default timezone preference (UTC) for all existing users
INSERT INTO user_preferences (user_id, preference_key, preference_value)
SELECT 
    id as user_id,
    'timezone' as preference_key,
    'UTC' as preference_value
FROM chat_Users 
WHERE id NOT IN (
    SELECT user_id 
    FROM user_preferences 
    WHERE preference_key = 'timezone'
);

PRINT 'Default preferences inserted successfully';
PRINT 'User preferences migration completed!';
GO