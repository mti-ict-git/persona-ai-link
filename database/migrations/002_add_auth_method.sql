-- Migration: Add authMethod column to distinguish between local and LDAP accounts
-- Date: 2025-08-31
-- Description: Adds authMethod column to chat_Users table to separate authentication types

USE [your_database_name]; -- Replace with your actual database name
GO

-- Add authMethod column to chat_Users table
ALTER TABLE chat_Users 
ADD authMethod NVARCHAR(20) NOT NULL DEFAULT 'local';
GO

-- Create index for authMethod for better query performance
CREATE INDEX IX_chat_Users_authMethod ON chat_Users(authMethod);
GO

-- Update existing users to have 'local' authMethod (they were created before LDAP integration)
UPDATE chat_Users 
SET authMethod = 'local' 
WHERE authMethod = 'local'; -- This is redundant but explicit for clarity
GO

-- Add check constraint to ensure only valid authMethod values
ALTER TABLE chat_Users 
ADD CONSTRAINT CK_chat_Users_authMethod 
CHECK (authMethod IN ('local', 'ldap'));
GO

-- Optional: Add comment to document the column purpose
EXEC sp_addextendedproperty 
    @name = N'MS_Description',
    @value = N'Authentication method: local for database authentication, ldap for LDAP/Active Directory authentication',
    @level0type = N'SCHEMA', @level0name = N'dbo',
    @level1type = N'TABLE', @level1name = N'chat_Users',
    @level2type = N'COLUMN', @level2name = N'authMethod';
GO

PRINT 'Migration 002_add_auth_method.sql completed successfully';
PRINT 'Added authMethod column to chat_Users table';
PRINT 'All existing users have been set to authMethod = ''local''';
GO