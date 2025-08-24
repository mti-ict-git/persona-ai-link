const express = require('express');
const Joi = require('joi');
const axios = require('axios');
const { sessionManager, messageManager } = require('../utils/database');

const router = express.Router();

// Validation schemas
const sendToN8NSchema = Joi.object({
  event_type: Joi.string().required(),
  sessionId: Joi.string().uuid().required(),
  message: Joi.object({
    content: Joi.string().required(),
    role: Joi.string().valid('user', 'assistant').required(),
    timestamp: Joi.string().required()
  }).required(),
  context: Joi.object({
    session_history: Joi.array().items(
      Joi.object({
        role: Joi.string().valid('user', 'assistant').required(),
        content: Joi.string().required(),
        timestamp: Joi.string().optional()
      })
    ).optional().default([]),
    session_name: Joi.string().optional()
  }).optional()
});

const testWebhookSchema = Joi.object({
  webhook_url: Joi.string().uri().required()
});

// DELETE /api/webhooks/sessions/:sessionId - Delete a session and its messages
router.delete('/sessions/:sessionId', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    
    // Validate sessionId format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sessionId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid session ID format'
      });
    }

    // Check if session exists
    const session = await sessionManager.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Delete the session
    await sessionManager.deleteSession(sessionId);
    
    res.json({
      success: true,
      message: 'Session deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting session:', error);
    next(error);
  }
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

    const { event_type, sessionId, message, context } = value;
    const session_history = context?.session_history || [];

    // Get N8N chat webhook URL with priority order:
    // 1. Specific chat URL
    // 2. Primary webhook URL + chatbot path
    let webhookUrl = process.env.N8N_CHAT_URL;
    
    if (!webhookUrl && process.env.N8N_WEBHOOK_URL) {
      try {
        // Append 'chatbot' to the base URL path
        const baseUrl = process.env.N8N_WEBHOOK_URL;
        webhookUrl = baseUrl.endsWith('/') ? baseUrl + 'chatbot' : baseUrl + '/chatbot';
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
    
    console.log('Send to N8N: Using webhook URL:', webhookUrl);

    // Check if session exists
    const session = await sessionManager.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Prepare payload for N8N
    const payload = {
      event_type: event_type,
      sessionId: sessionId,
      message_id: require('uuid').v4(),
      message: message,
      context: {
        session_name: context?.session_name || session.session_name,
        session_title: session.title,
        session_history: session_history
      }
    };
    
    console.log('Send to N8N: Payload:', JSON.stringify(payload, null, 2));

    try {
      console.log('Sending request to N8N...');
      
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
      
      console.log('N8N Response Status:', response.status);
      console.log('N8N Response Data:', JSON.stringify(response.data, null, 2));

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

      // Handle N8N array response format: [{ output: {...} }]
      if (Array.isArray(responseData) && responseData.length > 0 && responseData[0].output) {
        responseData = responseData[0].output;
      }

      if (typeof responseData === 'object' && responseData !== null) {
        // Check if N8N response indicates success
        if (responseData.success === false) {
          // Handle error response from N8N
          const errorMessage = responseData.fallback_message || 
                              responseData.error?.message || 
                              'N8N processing failed';
          
          // Add user message to database
          await messageManager.addMessage(sessionId, message.content, 'user');
          
          // Add error response to database
          await messageManager.addMessage(
            sessionId, 
            errorMessage, 
            'assistant',
            { n8n_error: responseData.error }
          );
          
          return res.status(500).json({
            success: false,
            error: 'N8N processing failed',
            message: errorMessage,
            details: responseData.error
          });
        }
        
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
        await sessionManager.updateSession(sessionId, {
          session_name: sessionNameUpdate
        });
      }

      // Add user message to database
      await messageManager.addMessage(sessionId, message.content, 'user');

      // Add AI response to database if available
      if (aiMessage) {
        await messageManager.addMessage(
          sessionId, 
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
      console.error('N8N webhook error details:');
      console.error('- Error message:', webhookError.message);
      console.error('- Error code:', webhookError.code);
      console.error('- Response status:', webhookError.response?.status);
      console.error('- Response data:', webhookError.response?.data);
      console.error('- Full error:', webhookError);
      
      // Still add user message to database even if webhook fails
      await messageManager.addMessage(sessionId, message.content, 'user');
      
      // Add error response
      const errorMessage = 'I apologize, but I\'m having trouble connecting to the processing service. Please check your N8N configuration.';
      await messageManager.addMessage(
        sessionId, 
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
    // 2. Primary webhook URL + health path
    let healthCheckUrl = process.env.N8N_HEALTH_URL;
    
    if (!healthCheckUrl) {
      const baseUrl = process.env.N8N_WEBHOOK_URL;
      if (baseUrl) {
        try {
          // Append 'health' to the base URL path
          healthCheckUrl = baseUrl.endsWith('/') ? baseUrl + 'health' : baseUrl + '/health';
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



module.exports = router;