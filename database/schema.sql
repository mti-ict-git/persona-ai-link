-- Persona AI Link Database Schema
-- MS SQL Server Database Schema

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

-- Sample data for testing (optional)
-- INSERT INTO sessions (id, title, session_name) VALUES 
-- ('test-session-1', 'Test Chat Session', 'AI Assistant Conversation'),
-- ('test-session-2', 'Another Test', 'Data Analysis Discussion');

-- INSERT INTO messages (id, session_id, content, role, message_order) VALUES
-- ('msg-1', 'test-session-1', 'Hello, how can you help me?', 'user', 1),
-- ('msg-2', 'test-session-1', 'I can help you with various tasks. What would you like to know?', 'assistant', 2);