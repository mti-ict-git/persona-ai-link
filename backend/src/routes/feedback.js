const express = require('express');
const sql = require('mssql');
const router = express.Router();
const { authenticateToken } = require('./auth');
const { dbManager } = require('../utils/database');

// Use existing database manager instance

// Initialize database connection
const initializeDatabase = async () => {
  try {
    await dbManager.initialize();
    console.log('Feedback database connection initialized');
  } catch (error) {
    console.error('Error initializing feedback database:', error);
  }
};

// Initialize on module load
initializeDatabase();

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

    const pool = await dbManager.getConnection();
    const request = pool.request();

    // Check if feedback already exists for this message
    request.input('messageId', sql.NVarChar(50), messageId);
    request.input('userId', sql.NVarChar(50), String(req.user.id));
    
    const existingFeedback = await request.query(
      'SELECT id FROM message_feedback WHERE message_id = @messageId AND user_id = @userId'
    );

    if (existingFeedback.recordset.length > 0) {
      // Update existing feedback
      const updateRequest = pool.request();
      updateRequest.input('feedbackType', sql.NVarChar(20), feedbackType);
      updateRequest.input('comment', sql.NVarChar(sql.MAX), comment || '');
      updateRequest.input('messageId', sql.NVarChar(50), messageId);
      updateRequest.input('userId', sql.NVarChar(50), String(req.user.id));
      
      const result = await updateRequest.query(`
        UPDATE message_feedback 
        SET feedback_type = @feedbackType, comment = @comment, updated_at = GETDATE()
        OUTPUT INSERTED.id
        WHERE message_id = @messageId AND user_id = @userId
      `);

      res.json({
        success: true,
        id: result.recordset[0].id,
        message: 'Feedback updated successfully'
      });
    } else {
      // Insert new feedback
      const insertRequest = pool.request();
      insertRequest.input('messageId', sql.NVarChar(50), messageId);
      insertRequest.input('sessionId', sql.NVarChar(50), sessionId);
      insertRequest.input('userId', sql.NVarChar(50), String(req.user.id));
      insertRequest.input('feedbackType', sql.NVarChar(20), feedbackType);
      insertRequest.input('comment', sql.NVarChar(sql.MAX), comment || '');
      insertRequest.input('messageContent', sql.NVarChar(sql.MAX), messageContent || '');
      
      const result = await insertRequest.query(`
        INSERT INTO message_feedback (
          message_id, session_id, user_id, feedback_type, comment, message_content
        ) 
        OUTPUT INSERTED.id
        VALUES (@messageId, @sessionId, @userId, @feedbackType, @comment, @messageContent)
      `);

      res.json({
        success: true,
        id: result.recordset[0].id,
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

    const pool = await dbManager.getConnection();
    const request = pool.request();

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
      LEFT JOIN chat_Users u ON mf.user_id = u.id
      WHERE 1=1
    `;

    if (startDate) {
      query += ` AND mf.created_at >= @startDate`;
      request.input('startDate', sql.DateTime2, new Date(startDate));
    }

    if (endDate) {
      query += ` AND mf.created_at <= @endDate`;
      request.input('endDate', sql.DateTime2, new Date(endDate));
    }

    if (feedbackType) {
      query += ` AND mf.feedback_type = @feedbackType`;
      request.input('feedbackType', sql.NVarChar(20), feedbackType);
    }

    if (sessionId) {
      query += ` AND mf.session_id = @sessionId`;
      request.input('sessionId', sql.NVarChar(50), sessionId);
    }

    query += ' ORDER BY mf.created_at DESC';

    const result = await request.query(query);

    res.json({
      success: true,
      data: result.recordset,
      total: result.recordset.length
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

    const pool = await dbManager.getConnection();
    const request = pool.request();

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
      LEFT JOIN chat_Users u ON mf.user_id = u.id
      WHERE 1=1
    `;

    if (startDate) {
      query += ` AND mf.created_at >= @startDate`;
      request.input('startDate', sql.DateTime2, new Date(startDate));
    }

    if (endDate) {
      query += ` AND mf.created_at <= @endDate`;
      request.input('endDate', sql.DateTime2, new Date(endDate));
    }

    if (feedbackType) {
      query += ` AND mf.feedback_type = @feedbackType`;
      request.input('feedbackType', sql.NVarChar(20), feedbackType);
    }

    if (sessionId) {
      query += ` AND mf.session_id = @sessionId`;
      request.input('sessionId', sql.NVarChar(50), sessionId);
    }

    query += ' ORDER BY mf.created_at DESC';

    const result = await request.query(query);

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

    result.recordset.forEach(row => {
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

    const pool = await dbManager.getConnection();
    const request = pool.request();

    let query = `
      SELECT 
        feedback_type,
        COUNT(*) as count,
        COUNT(CASE WHEN comment IS NOT NULL AND comment != '' THEN 1 END) as with_comments
      FROM message_feedback
      WHERE 1=1
    `;

    if (sessionId) {
      query += ` AND session_id = @sessionId`;
      request.input('sessionId', sql.NVarChar(50), sessionId);
    }

    if (startDate) {
      query += ` AND created_at >= @startDate`;
      request.input('startDate', sql.DateTime2, new Date(startDate));
    }

    if (endDate) {
      query += ` AND created_at <= @endDate`;
      request.input('endDate', sql.DateTime2, new Date(endDate));
    }

    query += ' GROUP BY feedback_type';

    const result = await request.query(query);

    const stats = {
      positive: 0,
      negative: 0,
      total: 0,
      positiveWithComments: 0,
      negativeWithComments: 0
    };

    result.recordset.forEach(row => {
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