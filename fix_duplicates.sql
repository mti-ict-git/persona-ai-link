-- Fix duplicate messages issue
-- This script adds a unique constraint to prevent duplicate messages
-- and removes any existing duplicates

USE [persona_ai_link];
GO

-- First, let's identify and remove duplicate messages
-- Keep only the first occurrence of each duplicate (based on content, role, and session_id)
WITH DuplicateMessages AS (
    SELECT 
        id,
        session_id,
        content,
        role,
        created_at,
        ROW_NUMBER() OVER (
            PARTITION BY session_id, content, role 
            ORDER BY created_at ASC
        ) as rn
    FROM messages
)
DELETE FROM messages 
WHERE id IN (
    SELECT id 
    FROM DuplicateMessages 
    WHERE rn > 1
);

PRINT 'Duplicate messages removed.';

-- Add a unique constraint to prevent future duplicates
-- This constraint ensures that within a session, the same content and role combination cannot exist twice
IF NOT EXISTS (
    SELECT * FROM sys.indexes 
    WHERE name = 'IX_messages_unique_content_per_session' 
    AND object_id = OBJECT_ID('messages')
)
BEGIN
    CREATE UNIQUE INDEX IX_messages_unique_content_per_session 
    ON messages (session_id, content, role);
    PRINT 'Unique constraint added to prevent duplicate messages.';
END
ELSE
BEGIN
    PRINT 'Unique constraint already exists.';
END

-- Show remaining message counts per session
SELECT 
    s.id as session_id,
    s.session_name,
    s.title,
    COUNT(m.id) as message_count
FROM sessions s
LEFT JOIN messages m ON s.id = m.session_id
WHERE s.status = 'active'
GROUP BY s.id, s.session_name, s.title
ORDER BY s.updated_at DESC;

PRINT 'Duplicate message fix completed.';