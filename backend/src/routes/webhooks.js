const express = require('express');
const Joi = require('joi');
const axios = require('axios');
const { sessionManager, messageManager } = require('../utils/database');

const router = express.Router();

// Validation schemas
const sendToN8NSchema = Joi.object({
  session_id: Joi.string().uuid().required(),
  message: Joi.string().required(),
  message_history: Joi.array().items(
    Joi.object({
      role: Joi.string().valid('user', 'assistant').required(),
      content: Joi.string().required(),
      timestamp: Joi.string().optional()
    })
  ).optional().default([])
});

const testWebhookSchema = Joi.object({
  webhook_url: Joi.string().uri().required()
});

// POST /api/webhooks/send-to-n8n - Send message to N8N webhook
router.post('/send-to-n8n', async (req, res, next) => {
  try {
    const { error, value } = sendToN8NSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: error.details
      });
    }

    const { session_id, message, message_history } = value;

    // Get N8N chat webhook URL with priority order:
    // 1. Specific chat URL
    // 2. Primary webhook URL + /chatbot path
    let webhookUrl = process.env.N8N_CHAT_URL;
    
    if (!webhookUrl && process.env.N8N_WEBHOOK_URL) {
      try {
        const url = new URL(process.env.N8N_WEBHOOK_URL);
        url.pathname = '/chatbot';
        webhookUrl = url.toString();
      } catch (urlError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid N8N_WEBHOOK_URL format',
          details: urlError.message
        });
      }
    }
    
    if (!webhookUrl) {
      return res.status(400).json({
        success: false,
        error: 'N8N webhook URL not configured',
        message: 'Please set N8N_CHAT_URL or N8N_WEBHOOK_URL environment variable'
      });
    }
    
    if (!webhookUrl) {
      return res.status(400).json({
        success: false,
        error: 'N8N webhook URL not configured',
        message: 'Please set N8N_CHAT_URL or N8N_WEBHOOK_URL environment variable'
      });
    }

    // Check if session exists
    const session = await sessionManager.getSession(session_id);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Prepare payload for N8N
    const payload = {
      event_type: 'chat_message',
      session_id: session_id,
      message_id: require('uuid').v4(),
      message: {
        content: message,
        role: 'user',
        timestamp: new Date().toISOString()
      },
      context: {
        session_name: session.session_name,
        session_title: session.title,
        message_history: message_history
      }
    };

    try {
      // Send to N8N webhook
      const response = await axios.post(webhookUrl, payload, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PersonaAI-Link/1.0'
        },
        httpsAgent: new (require('https').Agent)({
          rejectUnauthorized: false
        })
      });

      let responseData = response.data;
      let sessionNameUpdate = null;
      let aiMessage = null;

      // Handle different response formats
      if (typeof responseData === 'string') {
        try {
          responseData = JSON.parse(responseData);
        } catch {
          // If it's not JSON, treat as plain text message
          aiMessage = responseData;
        }
      }

      if (typeof responseData === 'object' && responseData !== null) {
        // Extract session name update
        sessionNameUpdate = responseData.session_name_update || responseData.session_name;
        
        // Extract AI message
        aiMessage = responseData.message || 
                   responseData.response || 
                   responseData.output || 
                   responseData.content;
      }

      // Update session name if provided
      if (sessionNameUpdate && sessionNameUpdate !== session.session_name) {
        await sessionManager.updateSession(session_id, {
          session_name: sessionNameUpdate
        });
      }

      // Add user message to database
      await messageManager.addMessage(session_id, message, 'user');

      // Add AI response to database if available
      if (aiMessage) {
        await messageManager.addMessage(
          session_id, 
          aiMessage, 
          'assistant',
          { n8n_response: responseData }
        );
      }

      res.json({
        success: true,
        data: {
          message: aiMessage || 'Message processed successfully',
          session_name_update: sessionNameUpdate,
          raw_response: responseData
        },
        n8n_status: response.status
      });

    } catch (webhookError) {
      console.error('N8N webhook error:', webhookError.message);
      
      // Still add user message to database even if webhook fails
      await messageManager.addMessage(session_id, message, 'user');
      
      // Add error response
      const errorMessage = 'I apologize, but I\'m having trouble connecting to the processing service. Please check your N8N configuration.';
      await messageManager.addMessage(
        session_id, 
        errorMessage, 
        'assistant',
        { error: webhookError.message }
      );

      res.status(200).json({
        success: false,
        data: {
          message: errorMessage,
          error: 'Webhook communication failed'
        },
        webhook_error: webhookError.message
      });
    }

  } catch (error) {
    next(error);
  }
});

// POST /api/webhooks/test - Test webhook connectivity
router.post('/test', async (req, res, next) => {
  try {
    // Get N8N health check URL with priority order:
    // 1. Specific health URL
    // 2. Primary webhook URL + /health path
    let healthCheckUrl = process.env.N8N_HEALTH_URL;
    
    if (!healthCheckUrl) {
      const baseUrl = process.env.N8N_WEBHOOK_URL;
      if (baseUrl) {
        try {
          const url = new URL(baseUrl);
          url.pathname = '/health';
          healthCheckUrl = url.toString();
        } catch (urlError) {
          return res.status(400).json({
            success: false,
            error: 'Invalid N8N_WEBHOOK_URL format',
            details: urlError.message
          });
        }
      }
    }
    
    if (!healthCheckUrl) {
      return res.status(400).json({
        success: false,
        message: 'N8N configuration missing',
        error: 'Please set N8N_HEALTH_URL or N8N_WEBHOOK_URL environment variable',
        config_help: {
          specific: 'N8N_HEALTH_URL=https://your-n8n-server.com:5679/health',
          fallback: 'N8N_WEBHOOK_URL=https://your-n8n-server.com:5679 (will use /health path)'
        }
      });
    }
    
    try {
      const response = await axios.get(healthCheckUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'PersonaAI-Link/1.0'
        },
        httpsAgent: new (require('https').Agent)({
          rejectUnauthorized: false
        })
      });
      
      res.json({
        success: true,
        message: 'N8N server connection test successful',
        status: response.status,
        response_data: response.data
      });

    } catch (webhookError) {
      // Even a 404 response means we can connect to the server
      if (webhookError.response && webhookError.response.status === 404) {
        res.json({
          success: true,
          message: 'N8N server is reachable (health endpoint returned 404 as expected)',
          status: webhookError.response.status,
          response_data: webhookError.response.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'N8N server connection test failed',
          error: webhookError.message,
          details: {
            code: webhookError.code,
            status: webhookError.response?.status,
            statusText: webhookError.response?.statusText
          }
        });
      }
    }

  } catch (error) {
    next(error);
  }
});

// POST /api/webhooks/session-init - Initialize session with N8N
router.post('/session-init', async (req, res, next) => {
  try {
    const initSchema = Joi.object({
      session_id: Joi.string().uuid().required(),
      initial_message: Joi.string().optional()
    });

    const { error, value } = initSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: error.details
      });
    }

    const { session_id, initial_message } = value;

    // Check if session exists
    const session = await sessionManager.getSession(session_id);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Get N8N session webhook URL with priority order:
    // 1. Specific session URL
    // 2. Primary webhook URL + /session path
    let webhookUrl = process.env.N8N_SESSION_URL;
    
    if (!webhookUrl) {
      const baseUrl = process.env.N8N_WEBHOOK_URL;
      if (baseUrl) {
        try {
          const url = new URL(baseUrl);
          url.pathname = '/session';
          webhookUrl = url.toString();
        } catch (urlError) {
          return res.status(400).json({
            success: false,
            error: 'Invalid N8N_WEBHOOK_URL format',
            details: urlError.message
          });
        }
      }
    }
    
    // If no webhook URL configured, return success without webhook call
    if (!webhookUrl) {
      return res.json({
        success: true,
        data: {
          session_name: null,
          initial_message: null,
          raw_response: null
        }
      });
    }

    // Prepare session initialization payload
    const payload = {
      event_type: 'session_created',
      session_id: session_id,
      timestamp: new Date().toISOString(),
      user_context: {
        user_agent: req.headers['user-agent'] || 'PersonaAI-Link/1.0',
        ip_address: req.ip || req.connection.remoteAddress || '127.0.0.1',
        referrer: req.headers.referer || 'direct'
      },
      session_data: {
        initial_message: initial_message || null,
        language: 'en',
        platform: 'web'
      }
    };

    try {
      const response = await axios.post(webhookUrl, payload, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PersonaAI-Link/1.0'
        },
        httpsAgent: new (require('https').Agent)({
          rejectUnauthorized: false
        })
      });

      let responseData = response.data;
      
      if (typeof responseData === 'string') {
        try {
          responseData = JSON.parse(responseData);
        } catch {
          responseData = { message: responseData };
        }
      }

      // Extract session name from response
      const sessionName = responseData.session_name || responseData.session_title;
      if (sessionName) {
        await sessionManager.updateSession(session_id, {
          session_name: sessionName
        });
      }

      // Extract initial AI message
      const initialAiMessage = responseData.message || responseData.welcome_message;
      if (initialAiMessage) {
        await messageManager.addMessage(
          session_id,
          initialAiMessage,
          'assistant',
          { session_init: true, n8n_response: responseData }
        );
      }

      res.json({
        success: true,
        data: {
          session_name: sessionName,
          initial_message: initialAiMessage,
          raw_response: responseData
        }
      });

    } catch (webhookError) {
      console.error('Session init webhook error:', webhookError.message);
      
      res.status(400).json({
        success: false,
        message: 'Session initialization failed',
        error: webhookError.message
      });
    }

  } catch (error) {
    next(error);
  }
});

module.exports = router;