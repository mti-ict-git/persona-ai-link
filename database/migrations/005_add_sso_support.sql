-- Migration: Add SSO support to authentication system
-- Date: 2025-09-08
-- Description: Extends authMethod to support SSO and adds sso_provider column

USE [AIChatBot];
GO

-- Keep existing authMethod constraint (local, ldap)
-- SSO will use existing LDAP accounts, no need for separate 'sso' auth method
-- This ensures SharePoint SSO users are associated with their existing LDAP accounts

-- Add sso_provider column for storing SSO provider information (if not exists)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('chat_Users') AND name = 'sso_provider')
BEGIN
    ALTER TABLE chat_Users 
    ADD sso_provider NVARCHAR(50) NULL;
    PRINT 'Added sso_provider column to chat_Users table';
END
ELSE
BEGIN
    PRINT 'sso_provider column already exists in chat_Users table';
END
GO

-- Create index for sso_provider for better query performance (if not exists)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('chat_Users') AND name = 'IX_chat_Users_sso_provider')
BEGIN
    CREATE INDEX IX_chat_Users_sso_provider ON chat_Users(sso_provider);
    PRINT 'Created index IX_chat_Users_sso_provider';
END
ELSE
BEGIN
    PRINT 'Index IX_chat_Users_sso_provider already exists';
END
GO

-- Add last_login column to track user login activity (if not exists)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('chat_Users') AND name = 'last_login')
BEGIN
    ALTER TABLE chat_Users 
    ADD last_login DATETIME2 NULL;
    PRINT 'Added last_login column to chat_Users table';
END
ELSE
BEGIN
    PRINT 'last_login column already exists in chat_Users table';
END
GO

-- Create index for last_login for reporting purposes (if not exists)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('chat_Users') AND name = 'IX_chat_Users_last_login')
BEGIN
    CREATE INDEX IX_chat_Users_last_login ON chat_Users(last_login);
    PRINT 'Created index IX_chat_Users_last_login';
END
ELSE
BEGIN
    PRINT 'Index IX_chat_Users_last_login already exists';
END
GO

-- Add preferences column for storing user preferences as JSON (if not exists)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('chat_Users') AND name = 'preferences')
BEGIN
    ALTER TABLE chat_Users 
    ADD preferences NVARCHAR(MAX) NULL;
    PRINT 'Added preferences column to chat_Users table';
END
ELSE
BEGIN
    PRINT 'preferences column already exists in chat_Users table';
END
GO

-- Add comment to document the sso_provider column purpose (if not exists)
IF NOT EXISTS (
    SELECT * FROM sys.extended_properties 
    WHERE major_id = OBJECT_ID('chat_Users') 
    AND minor_id = (SELECT column_id FROM sys.columns WHERE object_id = OBJECT_ID('chat_Users') AND name = 'sso_provider')
    AND name = 'MS_Description'
)
BEGIN
    EXEC sp_addextendedproperty 
        @name = N'MS_Description',
        @value = N'SSO provider identifier (e.g., sharepoint, azure, google) - required when authMethod is sso',
        @level0type = N'SCHEMA', @level0name = N'dbo',
        @level1type = N'TABLE', @level1name = N'chat_Users',
        @level2type = N'COLUMN', @level2name = N'sso_provider';
    PRINT 'Added description for sso_provider column';
END
ELSE
BEGIN
    PRINT 'Description for sso_provider column already exists';
END
GO

-- Add comment to document the last_login column (if not exists)
IF NOT EXISTS (
    SELECT * FROM sys.extended_properties 
    WHERE major_id = OBJECT_ID('chat_Users') 
    AND minor_id = (SELECT column_id FROM sys.columns WHERE object_id = OBJECT_ID('chat_Users') AND name = 'last_login')
    AND name = 'MS_Description'
)
BEGIN
    EXEC sp_addextendedproperty 
        @name = N'MS_Description',
        @value = N'Timestamp of user last successful login',
        @level0type = N'SCHEMA', @level0name = N'dbo',
        @level1type = N'TABLE', @level1name = N'chat_Users',
        @level2type = N'COLUMN', @level2name = N'last_login';
    PRINT 'Added description for last_login column';
END
ELSE
BEGIN
    PRINT 'Description for last_login column already exists';
END
GO

-- Add comment to document the preferences column (if not exists)
IF NOT EXISTS (
    SELECT * FROM sys.extended_properties 
    WHERE major_id = OBJECT_ID('chat_Users') 
    AND minor_id = (SELECT column_id FROM sys.columns WHERE object_id = OBJECT_ID('chat_Users') AND name = 'preferences')
    AND name = 'MS_Description'
)
BEGIN
    EXEC sp_addextendedproperty 
        @name = N'MS_Description',
        @value = N'JSON string containing user preferences (language, theme, etc.)',
        @level0type = N'SCHEMA', @level0name = N'dbo',
        @level1type = N'TABLE', @level1name = N'chat_Users',
        @level2type = N'COLUMN', @level2name = N'preferences';
    PRINT 'Added description for preferences column';
END
ELSE
BEGIN
    PRINT 'Description for preferences column already exists';
END
GO

-- Update the authMethod column description to include SSO
EXEC sp_updateextendedproperty 
    @name = N'MS_Description',
    @value = N'Authentication method: local for database authentication, ldap for LDAP/Active Directory authentication, sso for Single Sign-On authentication',
    @level0type = N'SCHEMA', @level0name = N'dbo',
    @level1type = N'TABLE', @level1name = N'chat_Users',
    @level2type = N'COLUMN', @level2name = N'authMethod';
GO

PRINT 'Migration 005_add_sso_support.sql completed successfully';
PRINT 'Extended authMethod to support SSO authentication';
PRINT 'Added sso_provider, last_login, and preferences columns';
PRINT 'Added appropriate constraints and indexes';
GO