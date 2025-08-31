const express = require('express');
const Joi = require('joi');
const { sessionManager } = require('../utils/database');
const { authenticateToken } = require('./auth');

const router = express.Router();

// Validation schemas
const createSessionSchema = Joi.object({
  title: Joi.string().max(255).default('New Conversation'),
  session_name: Joi.string().max(255).allow(null).optional()
});

const updateSessionSchema = Joi.object({
  title: Joi.string().max(255).optional(),
  session_name: Joi.string().max(255).allow(null).optional()
}).min(1);

const sessionIdSchema = Joi.string().uuid().required();

// GET /api/sessions - Get all sessions
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const sessions = await sessionManager.getAllSessions(limit, String(req.user.id));
    
    res.json({
      success: true,
      data: sessions,
      count: sessions.length
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/sessions - Create new session
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const { error, value } = createSessionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: error.details
      });
    }

    const session = await sessionManager.createSession(
      value.title,
      value.session_name,
      String(req.user.id)
    );

    res.status(201).json({
      success: true,
      data: session
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/sessions/:id - Get specific session
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { error } = sessionIdSchema.validate(req.params.id);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid session ID format'
      });
    }

    const session = await sessionManager.getSession(req.params.id, String(req.user.id));
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/sessions/:id - Update session
router.put('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { error: idError } = sessionIdSchema.validate(req.params.id);
    if (idError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid session ID format'
      });
    }

    const { error: bodyError, value } = updateSessionSchema.validate(req.body);
    if (bodyError) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: bodyError.details
      });
    }

    // Check if session exists and user owns it
    const existingSession = await sessionManager.getSession(req.params.id, String(req.user.id));
    if (!existingSession) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    const updatedSession = await sessionManager.updateSession(req.params.id, value);

    res.json({
      success: true,
      data: updatedSession
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/sessions/:id - Delete session
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { error } = sessionIdSchema.validate(req.params.id);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid session ID format'
      });
    }

    // Check if session exists and user owns it
    const existingSession = await sessionManager.getSession(req.params.id, String(req.user.id));
    if (!existingSession) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    await sessionManager.deleteSession(req.params.id);

    res.json({
      success: true,
      message: 'Session deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;