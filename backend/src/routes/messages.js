const express = require('express');
const Joi = require('joi');
const { messageManager, sessionManager } = require('../utils/database');

const router = express.Router();

// Validation schemas
const addMessageSchema = Joi.object({
  session_id: Joi.string().uuid().required(),
  content: Joi.string().required(),
  role: Joi.string().valid('user', 'assistant').required(),
  message_order: Joi.number().integer().min(1).required(),
  metadata: Joi.object().optional()
});

const sessionIdSchema = Joi.string().uuid().required();
const messageIdSchema = Joi.string().uuid().required();

// GET /api/messages/session/:sessionId - Get messages for a session
router.get('/session/:sessionId', async (req, res, next) => {
  try {
    const { error } = sessionIdSchema.validate(req.params.sessionId);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid session ID format'
      });
    }

    // Check if session exists
    const session = await sessionManager.getSession(req.params.sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    const limit = parseInt(req.query.limit) || 100;
    const messages = await messageManager.getSessionMessages(req.params.sessionId, limit);
    
    res.json({
      success: true,
      data: messages,
      count: messages.length,
      session_id: req.params.sessionId
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/messages - Add new message
router.post('/', async (req, res, next) => {
  try {
    const { error, value } = addMessageSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: error.details
      });
    }

    // Check if session exists
    const session = await sessionManager.getSession(value.session_id);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    const message = await messageManager.addMessage(
      value.session_id,
      value.content,
      value.role,
      value.message_order,
      value.metadata
    );

    res.status(201).json({
      success: true,
      data: message
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/messages/:id - Delete message
router.delete('/:id', async (req, res, next) => {
  try {
    const { error } = messageIdSchema.validate(req.params.id);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid message ID format'
      });
    }

    await messageManager.deleteMessage(req.params.id);

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/messages/batch - Add multiple messages (for bulk operations)
router.post('/batch', async (req, res, next) => {
  try {
    const batchSchema = Joi.object({
      session_id: Joi.string().uuid().required(),
      messages: Joi.array().items(
        Joi.object({
          content: Joi.string().required(),
          role: Joi.string().valid('user', 'assistant').required(),
          metadata: Joi.object().optional()
        })
      ).min(1).max(10).required()
    });

    const { error, value } = batchSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: error.details
      });
    }

    // Check if session exists
    const session = await sessionManager.getSession(value.session_id);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    const addedMessages = [];
    for (const msgData of value.messages) {
      const message = await messageManager.addMessage(
        value.session_id,
        msgData.content,
        msgData.role,
        msgData.metadata
      );
      addedMessages.push(message);
    }

    res.status(201).json({
      success: true,
      data: addedMessages,
      count: addedMessages.length
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;