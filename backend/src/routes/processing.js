const express = require('express');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const https = require('https');
const { processedFilesManager } = require('../utils/processedFilesManager');
const router = express.Router();

// Create axios instance with SSL certificate verification disabled for n8n
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

// N8N webhook configuration
const N8N_BASE_WEBHOOK_URL = process.env.N8N_BASE_WEBHOOK_URL || 'https://n8nprod.merdekabattery.com:5679/webhook/';
const N8N_PROCESS_WEBHOOK_URL = N8N_BASE_WEBHOOK_URL + 'train';

// Processing webhook timeout configuration
const PROCESSING_WEBHOOK_TIMEOUT = parseInt(process.env.PROCESSING_WEBHOOK_TIMEOUT) || 60000;

// POST /api/processing/process/:id - Process a specific file
router.post('/process/:id', async (req, res) => {
  try {
    const fileId = parseInt(req.params.id);
    
    // Get file record
    const file = await processedFilesManager.getFileById(fileId);
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
    
    // Check if file is already processed
    if (file.processed) {
      return res.json({
        success: true,
        data: file,
        message: 'File already processed'
      });
    }
    
    // Update status to processing
    await processedFilesManager.updateProcessedStatus(
      fileId, 
      false, 
      { ...file.metadata, status: 'processing' }
    );
    
    try {
      // Read file content
      const filename = file.file_path ? file.file_path.replace('/uploads/', '') : file.filename;
      const filePath = path.join(__dirname, '../../uploads', filename);
      
      if (!fs.existsSync(filePath)) {
        throw new Error(`Physical file not found: ${filePath}`);
      }
      
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      // Send file metadata to N8N for processing (without content)
    const n8nPayload = {
      file_operation: 'upload',
      file_id: parseInt(fileId),
      filename: file.filename,
      file_path: file.file_path,
      sftp_path: file.metadata?.sftpPath || null,
      word_count: fileContent.split(/\s+/).length,
      uploaded_at: file.uploaded_at,
      metadata: file.metadata
    };
      
      console.log(`Sending file to N8N for processing: ${file.filename}`);
      
      // Send to N8N webhook
      const n8nResponse = await axios.post(N8N_PROCESS_WEBHOOK_URL, n8nPayload, {
        timeout: PROCESSING_WEBHOOK_TIMEOUT,
        headers: {
          'Content-Type': 'application/json'
        },
        httpsAgent: httpsAgent
      });
      
      console.log('N8N Response:', n8nResponse.data);
      
      // Check if N8N processing was successful
      if (n8nResponse.status === 200 && n8nResponse.data) {
        // Extract response data (handle array format from your example)
        const responseData = Array.isArray(n8nResponse.data) ? n8nResponse.data[0]?.response?.body : n8nResponse.data;
        
        if (responseData?.success && responseData?.status === 'Processed') {
          // Update file as processed with N8N results
          const processedFile = await processedFilesManager.updateProcessedStatus(
            fileId, 
            true, 
            { 
              ...file.metadata, 
              status: 'completed',
              processing_result: {
                word_count: n8nPayload.word_count,
                processed_by: 'n8n',
                n8n_message: responseData.message
              },
              processed_at: new Date().toISOString(),
              content_length: fileContent.length
            }
          );
          
          console.log(`File processing completed via N8N for: ${file.filename}`);
          
          res.json({
            success: true,
            data: processedFile,
            message: responseData.message || 'File processed successfully via N8N',
            processing_result: processedFile.metadata.processing_result
          });
        } else {
          throw new Error(`N8N processing failed: ${responseData?.message || 'Unknown error'}`);
        }
      } else {
        throw new Error(`N8N webhook returned status ${n8nResponse.status}`);
      }
      
    } catch (processingError) {
      console.error('Processing error:', processingError);
      
      // Update status to failed
      await processedFilesManager.updateProcessedStatus(
        fileId, 
        false, 
        { 
          ...file.metadata, 
          status: 'failed',
          error: processingError.message,
          failed_at: new Date().toISOString()
        }
      );
      
      res.status(500).json({
        success: false,
        error: 'File processing failed',
        message: processingError.message
      });
    }
    
  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process file',
      message: error.message
    });
  }
});

// POST /api/processing/batch - Process multiple files
router.post('/batch', async (req, res) => {
  try {
    const { fileIds } = req.body;
    
    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file IDs array'
      });
    }
    
    const results = [];
    
    for (const fileId of fileIds) {
      try {
        const file = await processedFilesManager.getFileById(parseInt(fileId));
        if (!file || file.processed) {
          results.push({
            fileId,
            success: false,
            error: file ? 'Already processed' : 'File not found'
          });
          continue;
        }
        
        // Process file using N8N webhook (same logic as single file processing)
        await processedFilesManager.updateProcessedStatus(
          parseInt(fileId), 
          false, 
          { ...file.metadata, status: 'processing' }
        );
        
        const filename = file.file_path ? file.file_path.replace('/uploads/', '') : file.filename;
        const filePath = path.join(__dirname, '../../uploads', filename);
        
        if (fs.existsSync(filePath)) {
          const fileContent = fs.readFileSync(filePath, 'utf8');
          
          // Send file metadata to N8N for processing (without content)
      const n8nPayload = {
        file_id: parseInt(fileId),
        filename: file.filename,
        file_path: file.file_path,
        sftp_path: file.metadata?.sftpPath || null,
        word_count: fileContent.split(/\s+/).length,
        uploaded_at: file.uploaded_at,
        metadata: file.metadata
      };
          
          console.log(`Batch processing: Sending file to N8N: ${file.filename}`);
          
          // Send to N8N webhook
           const n8nResponse = await axios.post(N8N_PROCESS_WEBHOOK_URL, n8nPayload, {
             timeout: PROCESSING_WEBHOOK_TIMEOUT,
             headers: {
               'Content-Type': 'application/json'
             },
             httpsAgent: httpsAgent
           });
          
          // Check if N8N processing was successful
          if (n8nResponse.status === 200 && n8nResponse.data) {
            // Extract response data (handle array format)
            const responseData = Array.isArray(n8nResponse.data) ? n8nResponse.data[0]?.response?.body : n8nResponse.data;
            
            if (responseData?.success && responseData?.status === 'Processed') {
              await processedFilesManager.updateProcessedStatus(
                parseInt(fileId), 
                true, 
                { 
                  ...file.metadata, 
                  status: 'completed',
                  processing_result: {
                    word_count: n8nPayload.word_count,
                    processed_by: 'n8n',
                    n8n_message: responseData.message
                  },
                  processed_at: new Date().toISOString(),
                  content_length: fileContent.length
                }
              );
              
              results.push({
                fileId,
                success: true,
                filename: file.filename,
                message: responseData.message || 'File processed successfully via N8N'
              });
            } else {
              throw new Error(`N8N processing failed: ${responseData?.message || 'Unknown error'}`);
            }
          } else {
            throw new Error(`N8N webhook returned status ${n8nResponse.status}`);
          }
        } else {
          throw new Error('Physical file not found');
        }
        
      } catch (error) {
        await processedFilesManager.updateProcessedStatus(
          parseInt(fileId), 
          false, 
          { status: 'failed', error: error.message }
        );
        
        results.push({
          fileId,
          success: false,
          error: error.message
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    
    res.json({
      success: true,
      message: `Processed ${successCount}/${fileIds.length} files successfully`,
      results
    });
    
  } catch (error) {
    console.error('Error in batch processing:', error);
    res.status(500).json({
      success: false,
      error: 'Batch processing failed',
      message: error.message
    });
  }
});

// GET /api/processing/status/:id - Get processing status
router.get('/status/:id', async (req, res) => {
  try {
    const fileId = parseInt(req.params.id);
    const file = await processedFilesManager.getFileById(fileId);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
    
    const status = file.metadata?.status || (file.processed ? 'completed' : 'pending');
    
    res.json({
      success: true,
      data: {
        id: file.id,
        filename: file.filename,
        processed: file.processed,
        status,
        metadata: file.metadata
      }
    });
    
  } catch (error) {
    console.error('Error getting processing status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get processing status',
      message: error.message
    });
  }
});

// Simulate AI processing (replace with actual AI processing logic)
async function simulateAIProcessing(content, filename) {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Extract basic information
  const wordCount = content.split(/\s+/).length;
  const lineCount = content.split('\n').length;
  const charCount = content.length;
  
  // Simulate AI analysis results
  const analysis = {
    word_count: wordCount,
    line_count: lineCount,
    character_count: charCount,
    file_type: path.extname(filename).toLowerCase(),
    summary: `This document contains ${wordCount} words across ${lineCount} lines. `,
    key_topics: extractKeyTopics(content),
    sentiment: analyzeSentiment(content),
    processed_at: new Date().toISOString()
  };
  
  return analysis;
}

// Simple keyword extraction
function extractKeyTopics(content) {
  const words = content.toLowerCase().match(/\b\w{4,}\b/g) || [];
  const frequency = {};
  
  words.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1;
  });
  
  return Object.entries(frequency)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([word, count]) => ({ word, count }));
}

// Simple sentiment analysis
function analyzeSentiment(content) {
  const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic'];
  const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'disappointing', 'poor'];
  
  const words = content.toLowerCase().split(/\s+/);
  let positiveCount = 0;
  let negativeCount = 0;
  
  words.forEach(word => {
    if (positiveWords.includes(word)) positiveCount++;
    if (negativeWords.includes(word)) negativeCount++;
  });
  
  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

module.exports = router;