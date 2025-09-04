-- Migration: Add employeeId column to store employee ID from LDAP/Active Directory
-- Date: 2025-01-27
-- Description: Adds employeeId column to chat_Users table for LDAP integration

USE [AIChatBot]; -- Database name from .env configuration
GO

-- Add employeeId column to chat_Users table
ALTER TABLE chat_Users 
ADD employeeId NVARCHAR(50) NULL;
GO

-- Create index for employeeId for better query performance
CREATE INDEX IX_chat_Users_employeeId ON chat_Users(employeeId);
GO

-- Add check constraint to ensure employeeId is not empty string if provided
ALTER TABLE chat_Users 
ADD CONSTRAINT CK_chat_Users_employeeId 
CHECK (employeeId IS NULL OR LEN(TRIM(employeeId)) > 0);
GO

-- Add comment to document the column purpose
EXEC sp_addextendedproperty 
    @name = N'MS_Description',
    @value = N'Employee ID from LDAP/Active Directory for user identification',
    @level0type = N'SCHEMA', @level0name = N'dbo',
    @level1type = N'TABLE', @level1name = N'chat_Users',
    @level2type = N'COLUMN', @level2name = N'employeeId';
GO

PRINT 'Migration 003_add_employee_id.sql completed successfully';
PRINT 'Added employeeId column to chat_Users table';
GO