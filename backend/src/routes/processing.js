const express = require('express');
const fs = require('fs');
const path = require('path');
const { processedFilesManager } = require('../utils/processedFilesManager');
const router = express.Router();

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
      
      // Simulate AI processing (replace with actual AI processing logic)
      const processingResult = await simulateAIProcessing(fileContent, file.filename);
      
      // Update file as processed with results
      const processedFile = await processedFilesManager.updateProcessedStatus(
        fileId, 
        true, 
        { 
          ...file.metadata, 
          status: 'completed',
          processing_result: processingResult,
          processed_at: new Date().toISOString(),
          content_length: fileContent.length
        }
      );
      
      console.log(`File processing completed for: ${file.filename}`);
      
      res.json({
        success: true,
        data: processedFile,
        message: 'File processed successfully',
        processing_result: processingResult
      });
      
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
        
        // Process file (similar logic as single file processing)
        await processedFilesManager.updateProcessedStatus(
          parseInt(fileId), 
          false, 
          { ...file.metadata, status: 'processing' }
        );
        
        const filename = file.file_path ? file.file_path.replace('/uploads/', '') : file.filename;
        const filePath = path.join(__dirname, '../../uploads', filename);
        
        if (fs.existsSync(filePath)) {
          const fileContent = fs.readFileSync(filePath, 'utf8');
          const processingResult = await simulateAIProcessing(fileContent, file.filename);
          
          await processedFilesManager.updateProcessedStatus(
            parseInt(fileId), 
            true, 
            { 
              ...file.metadata, 
              status: 'completed',
              processing_result: processingResult,
              processed_at: new Date().toISOString()
            }
          );
          
          results.push({
            fileId,
            success: true,
            filename: file.filename,
            processing_result: processingResult
          });
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