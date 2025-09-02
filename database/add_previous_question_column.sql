-- Add previous_question column to message_feedback table
-- SQL Server Script to enhance feedback functionality with question context

USE AIChatBot;
GO

-- Add previous_question column to message_feedback table
ALTER TABLE message_feedback
ADD previous_question NVARCHAR(MAX) NULL;
GO

-- Note: Cannot create index on NVARCHAR(MAX) column
-- Index creation skipped for previous_question column due to SQL Server limitations
GO

PRINT 'Successfully added previous_question column to message_feedback table';
GO