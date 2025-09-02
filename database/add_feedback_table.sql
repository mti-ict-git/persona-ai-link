-- Add Message Feedback Table to Persona AI Link Database
-- SQL Server Script to add feedback functionality

USE AIChatBot;
GO

-- Create message_feedback table
CREATE TABLE message_feedback (
    id INT IDENTITY(1,1) PRIMARY KEY,
    message_id NVARCHAR(50) NOT NULL,
    session_id NVARCHAR(50) NOT NULL,
    user_id NVARCHAR(50) NULL, -- Changed to match user_id type in sessions table
    feedback_type NVARCHAR(20) NOT NULL CHECK (feedback_type IN ('positive', 'negative')),
    comment NVARCHAR(MAX) NULL,
    message_content NVARCHAR(MAX) NULL,
    previous_question NVARCHAR(MAX) NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

-- Create indexes for better performance
CREATE INDEX IX_message_feedback_session_id ON message_feedback(session_id);
CREATE INDEX IX_message_feedback_message_id ON message_feedback(message_id);
CREATE INDEX IX_message_feedback_user_id ON message_feedback(user_id);
CREATE INDEX IX_message_feedback_type ON message_feedback(feedback_type);
CREATE INDEX IX_message_feedback_created_at ON message_feedback(created_at DESC);
-- Note: Cannot create index on NVARCHAR(MAX) column (previous_question)

-- Create foreign key relationships
ALTER TABLE message_feedback 
ADD CONSTRAINT FK_message_feedback_session_id 
FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;

-- Note: message_id foreign key constraint removed to avoid cascade conflicts
-- The message_id will be validated at application level

GO

-- Create trigger to update updated_at timestamp
CREATE TRIGGER tr_message_feedback_updated_at
ON message_feedback
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE message_feedback
    SET updated_at = GETDATE()
    FROM message_feedback mf
    INNER JOIN inserted i ON mf.id = i.id;
END;

GO

PRINT 'Message feedback table created successfully!';
PRINT 'Indexes and foreign key constraints added.';
PRINT 'Trigger for updated_at timestamp created.';