const express = require('express');
const { Pool } = require('pg');
const router = express.Router();
const { authenticateToken } = require('./auth');

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'persona_ai',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

// Create feedback table if it doesn't exist
const createFeedbackTable = async () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS message_feedback (
      id SERIAL PRIMARY KEY,
      message_id VARCHAR(255) NOT NULL,
      session_id VARCHAR(255) NOT NULL,
      user_id INTEGER,
      feedback_type VARCHAR(20) NOT NULL CHECK (feedback_type IN ('positive', 'negative')),
      comment TEXT,
      message_content TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_message_feedback_session_id ON message_feedback(session_id);
    CREATE INDEX IF NOT EXISTS idx_message_feedback_type ON message_feedback(feedback_type);
    CREATE INDEX IF NOT EXISTS idx_message_feedback_created_at ON message_feedback(created_at);
  `;
  
  try {
    await pool.query(createTableQuery);
    console.log('Message feedback table created or already exists');
  } catch (error) {
    console.error('Error creating message feedback table:', error);
  }
};

// Initialize table on module load
createFeedbackTable();

// Submit message feedback
router.post('/message', authenticateToken, async (req, res) => {
  try {
    const {
      messageId,
      sessionId,
      feedbackType,
      comment,
      messageContent,
      timestamp
    } = req.body;

    // Validate required fields
    if (!messageId || !sessionId || !feedbackType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: messageId, sessionId, feedbackType'
      });
    }

    // Validate feedback type
    if (!['positive', 'negative'].includes(feedbackType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid feedback type. Must be "positive" or "negative"'
      });
    }

    // Check if feedback already exists for this message
    const existingFeedback = await pool.query(
      'SELECT id FROM message_feedback WHERE message_id = $1 AND user_id = $2',
      [messageId, req.user.id]
    );

    if (existingFeedback.rows.length > 0) {
      // Update existing feedback
      const updateQuery = `
        UPDATE message_feedback 
        SET feedback_type = $1, comment = $2, updated_at = CURRENT_TIMESTAMP
        WHERE message_id = $3 AND user_id = $4
        RETURNING id
      `;
      
      const result = await pool.query(updateQuery, [
        feedbackType,
        comment || '',
        messageId,
        req.user.id
      ]);

      res.json({
        success: true,
        id: result.rows[0].id,
        message: 'Feedback updated successfully'
      });
    } else {
      // Insert new feedback
      const insertQuery = `
        INSERT INTO message_feedback (
          message_id, session_id, user_id, feedback_type, comment, message_content
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `;
      
      const result = await pool.query(insertQuery, [
        messageId,
        sessionId,
        req.user.id,
        feedbackType,
        comment || '',
        messageContent || ''
      ]);

      res.json({
        success: true,
        id: result.rows[0].id,
        message: 'Feedback submitted successfully'
      });
    }
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get feedback data for export
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      feedbackType,
      sessionId
    } = req.query;

    let query = `
      SELECT 
        mf.id,
        mf.message_id,
        mf.session_id,
        mf.feedback_type,
        mf.comment,
        mf.message_content,
        mf.created_at,
        u.username,
        u.email
      FROM message_feedback mf
      LEFT JOIN users u ON mf.user_id = u.id
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramIndex = 1;

    if (startDate) {
      query += ` AND mf.created_at >= $${paramIndex}`;
      queryParams.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND mf.created_at <= $${paramIndex}`;
      queryParams.push(endDate);
      paramIndex++;
    }

    if (feedbackType) {
      query += ` AND mf.feedback_type = $${paramIndex}`;
      queryParams.push(feedbackType);
      paramIndex++;
    }

    if (sessionId) {
      query += ` AND mf.session_id = $${paramIndex}`;
      queryParams.push(sessionId);
      paramIndex++;
    }

    query += ' ORDER BY mf.created_at DESC';

    const result = await pool.query(query, queryParams);

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching feedback data:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Export feedback as CSV
router.get('/export/csv', authenticateToken, async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      feedbackType,
      sessionId
    } = req.query;

    let query = `
      SELECT 
        mf.id,
        mf.message_id,
        mf.session_id,
        mf.feedback_type,
        mf.comment,
        mf.message_content,
        mf.created_at,
        u.username,
        u.email
      FROM message_feedback mf
      LEFT JOIN users u ON mf.user_id = u.id
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramIndex = 1;

    if (startDate) {
      query += ` AND mf.created_at >= $${paramIndex}`;
      queryParams.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND mf.created_at <= $${paramIndex}`;
      queryParams.push(endDate);
      paramIndex++;
    }

    if (feedbackType) {
      query += ` AND mf.feedback_type = $${paramIndex}`;
      queryParams.push(feedbackType);
      paramIndex++;
    }

    if (sessionId) {
      query += ` AND mf.session_id = $${paramIndex}`;
      queryParams.push(sessionId);
      paramIndex++;
    }

    query += ' ORDER BY mf.created_at DESC';

    const result = await pool.query(query, queryParams);

    // Generate CSV content
    const csvHeaders = [
      'ID',
      'Message ID',
      'Session ID',
      'Feedback Type',
      'Comment',
      'Message Content',
      'Created At',
      'Username',
      'Email'
    ];

    let csvContent = csvHeaders.join(',') + '\n';

    result.rows.forEach(row => {
      const csvRow = [
        row.id,
        `"${(row.message_id || '').replace(/"/g, '""')}"`,
        `"${(row.session_id || '').replace(/"/g, '""')}"`,
        row.feedback_type,
        `"${(row.comment || '').replace(/"/g, '""')}"`,
        `"${(row.message_content || '').substring(0, 200).replace(/"/g, '""')}"`,
        row.created_at,
        `"${(row.username || '').replace(/"/g, '""')}"`,
        `"${(row.email || '').replace(/"/g, '""')}"`
      ];
      csvContent += csvRow.join(',') + '\n';
    });

    // Set headers for file download
    const filename = `feedback_export_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Pragma', 'no-cache');

    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting feedback CSV:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get feedback statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { sessionId, startDate, endDate } = req.query;

    let query = `
      SELECT 
        feedback_type,
        COUNT(*) as count,
        COUNT(CASE WHEN comment IS NOT NULL AND comment != '' THEN 1 END) as with_comments
      FROM message_feedback
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramIndex = 1;

    if (sessionId) {
      query += ` AND session_id = $${paramIndex}`;
      queryParams.push(sessionId);
      paramIndex++;
    }

    if (startDate) {
      query += ` AND created_at >= $${paramIndex}`;
      queryParams.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND created_at <= $${paramIndex}`;
      queryParams.push(endDate);
      paramIndex++;
    }

    query += ' GROUP BY feedback_type';

    const result = await pool.query(query, queryParams);

    const stats = {
      positive: 0,
      negative: 0,
      total: 0,
      positiveWithComments: 0,
      negativeWithComments: 0
    };

    result.rows.forEach(row => {
      if (row.feedback_type === 'positive') {
        stats.positive = parseInt(row.count);
        stats.positiveWithComments = parseInt(row.with_comments);
      } else if (row.feedback_type === 'negative') {
        stats.negative = parseInt(row.count);
        stats.negativeWithComments = parseInt(row.with_comments);
      }
    });

    stats.total = stats.positive + stats.negative;

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching feedback stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;