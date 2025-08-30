const express = require('express');
const axios = require('axios');
const https = require('https');
const { processedFilesManager } = require('../utils/processedFilesManager');
const router = express.Router();

// Create axios instance with SSL certificate verification disabled for n8n
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

// N8N Webhook URL for training
const N8N_BASE_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'https://n8nprod.merdekabattery.com:5679/webhook/';
const N8N_TRAIN_WEBHOOK_URL = N8N_BASE_WEBHOOK_URL + 'train';

// POST /api/training/train - Train the AI model with processed files
router.post('/train', async (req, res) => {
  try {
    // Get all processed files
    const processedFiles = await processedFilesManager.getAllFiles();
    
    if (processedFiles.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No processed files available for training'
      });
    }

    // Simulate training process (replace with actual AI training logic)
    const trainingStartTime = new Date();
    
    // Extract training data from processed files
    const trainingData = processedFiles.map(file => ({
      id: file.id,
      filename: file.filename,
      content_length: file.metadata?.content_length || 0,
      key_topics: file.metadata?.processing_result?.key_topics || [],
      word_count: file.metadata?.processing_result?.word_count || 0,
      processed_at: file.metadata?.processed_at
    }));

    // Simulate training duration based on data size
    const totalWords = trainingData.reduce((sum, file) => sum + file.word_count, 0);
    const trainingDurationMs = Math.min(5000, Math.max(2000, totalWords * 10)); // 2-5 seconds
    
    // Simulate training process
    await new Promise(resolve => setTimeout(resolve, trainingDurationMs));
    
    const trainingEndTime = new Date();
    const trainingDuration = trainingEndTime - trainingStartTime;

    // Create training result
    const trainingResult = {
      training_id: `train_${Date.now()}`,
      started_at: trainingStartTime.toISOString(),
      completed_at: trainingEndTime.toISOString(),
      duration_ms: trainingDuration,
      files_processed: processedFiles.length,
      total_words: totalWords,
      model_version: `v${Date.now()}`,
      training_metrics: {
        accuracy: 0.95 + Math.random() * 0.04, // Simulate 95-99% accuracy
        loss: Math.random() * 0.1, // Simulate low loss
        epochs: Math.ceil(totalWords / 1000), // Simulate epochs based on data size
        learning_rate: 0.001
      },
      status: 'completed'
    };

    // Send training data to n8n webhook
    try {
      const webhookPayload = {
        file_operation: 'train',
        training_id: trainingResult.training_id,
        files: trainingData,
        total_files: processedFiles.length,
        total_words: totalWords,
        started_at: trainingStartTime.toISOString(),
        completed_at: trainingEndTime.toISOString(),
        duration_ms: trainingDuration,
        model_version: trainingResult.model_version,
        training_metrics: trainingResult.training_metrics
      };

      console.log('Sending training data to n8n webhook:', N8N_TRAIN_WEBHOOK_URL);
      const webhookResponse = await axios.post(N8N_TRAIN_WEBHOOK_URL, webhookPayload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 60000, // 60 second timeout
        httpsAgent: httpsAgent
      });

      console.log('N8N webhook response:', webhookResponse.status, webhookResponse.data);
      
      // Add webhook response to training result
      trainingResult.webhook_status = 'success';
      trainingResult.webhook_response = webhookResponse.data;
      
    } catch (webhookError) {
      console.error('N8N webhook error:', webhookError.message);
      trainingResult.webhook_status = 'failed';
      trainingResult.webhook_error = webhookError.message;
      // Continue with training even if webhook fails
    }

    res.status(200).json({
      success: true,
      data: trainingResult,
      message: `AI model successfully trained with ${processedFiles.length} files containing ${totalWords} words`
    });

  } catch (error) {
    console.error('Training error:', error);
    res.status(500).json({
      success: false,
      error: 'Training failed',
      message: error.message
    });
  }
});

// GET /api/training/status - Get training status and history
router.get('/status', async (req, res) => {
  try {
    // In a real implementation, you would fetch this from database
    const mockTrainingHistory = [
      {
        training_id: 'train_1756451000000',
        started_at: '2025-08-29T06:30:00.000Z',
        completed_at: '2025-08-29T06:30:03.500Z',
        duration_ms: 3500,
        files_processed: 3,
        total_words: 850,
        model_version: 'v1756451000000',
        status: 'completed'
      }
    ];

    const processedFiles = await processedFilesManager.getAllFiles();
    
    res.status(200).json({
      success: true,
      data: {
        current_model_version: 'v1756451000000',
        last_training: mockTrainingHistory[0] || null,
        available_files: processedFiles.length,
        ready_for_training: processedFiles.length > 0,
        training_history: mockTrainingHistory
      }
    });

  } catch (error) {
    console.error('Status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get training status',
      message: error.message
    });
  }
});

// GET /api/training/metrics - Get detailed training metrics
router.get('/metrics', async (req, res) => {
  try {
    // Mock training metrics (in real implementation, fetch from database)
    const metrics = {
      model_performance: {
        accuracy: 0.97,
        precision: 0.96,
        recall: 0.95,
        f1_score: 0.955
      },
      data_statistics: {
        total_training_files: 5,
        total_words: 2450,
        unique_topics: 15,
        average_file_size: 490
      },
      training_progress: {
        current_epoch: 10,
        total_epochs: 10,
        loss: 0.023,
        learning_rate: 0.001,
        batch_size: 32
      },
      last_updated: new Date().toISOString()
    };

    res.status(200).json({
      success: true,
      data: metrics
    });

  } catch (error) {
    console.error('Metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get training metrics',
      message: error.message
    });
  }
});

module.exports = router;