const express = require('express');
const Joi = require('joi');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const https = require('https');
const { processedFilesManager } = require('../utils/processedFilesManager');
const { deleteFileFromSftp, generateRemoteFilePath } = require('../utils/sftp');
const router = express.Router();

// Create HTTPS agent to handle self-signed certificates
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

// Processing webhook timeout configuration
const PROCESSING_WEBHOOK_TIMEOUT = parseInt(process.env.PROCESSING_WEBHOOK_TIMEOUT) || 60000;

// Validation schemas
const createFileSchema = Joi.object({
  filename: Joi.string().min(1).max(255).required(),
  file_path: Joi.string().min(1).max(500).required(),
  metadata: Joi.object().optional().allow(null)
});

const updateFileSchema = Joi.object({
  processed: Joi.boolean().optional(),
  metadata: Joi.object().optional().allow(null)
});

// GET /api/files - Get all processed files
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const files = await processedFilesManager.getAllFiles(limit);
    
    res.json({
      success: true,
      data: files,
      count: files.length
    });
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch files',
      message: error.message
    });
  }
});

// GET /api/files/stats - Get file statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await processedFilesManager.getProcessedFilesCount();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching file stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch file statistics',
      message: error.message
    });
  }
});

// GET /api/files/:id - Get a specific file by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const file = await processedFilesManager.getFileById(id);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
    
    res.json({
      success: true,
      data: file
    });
  } catch (error) {
    console.error('Error fetching file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch file',
      message: error.message
    });
  }
});

// GET /api/files/check/:filename - Check if filename exists
router.get('/check/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const exists = await processedFilesManager.fileExists(filename);
    const file = exists ? await processedFilesManager.getFileByName(filename) : null;
    
    res.json({
      success: true,
      data: {
        exists,
        file: file
      }
    });
  } catch (error) {
    console.error('Error checking file existence:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check file existence',
      message: error.message
    });
  }
});

// POST /api/files - Create a new file record
router.post('/', async (req, res) => {
  try {
    const { error, value } = createFileSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details
      });
    }

    const { filename, file_path, metadata } = value;
    
    // Check if file already exists
    const exists = await processedFilesManager.fileExists(filename);
    if (exists) {
      return res.status(409).json({
        success: false,
        error: 'File already exists',
        message: `A file with the name '${filename}' already exists`
      });
    }

    const file = await processedFilesManager.createFile(filename, file_path, metadata);
    
    res.status(201).json({
      success: true,
      data: file,
      message: 'File record created successfully'
    });
  } catch (error) {
    console.error('Error creating file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create file record',
      message: error.message
    });
  }
});

// PUT /api/files/:id - Update file processing status
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = updateFileSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details
      });
    }

    const { processed, metadata } = value;
    
    // Check if file exists
    const existingFile = await processedFilesManager.getFileById(id);
    if (!existingFile) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    const updatedFile = await processedFilesManager.updateProcessedStatus(id, processed, metadata);
    
    res.json({
      success: true,
      data: updatedFile,
      message: 'File updated successfully'
    });
  } catch (error) {
    console.error('Error updating file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update file',
      message: error.message
    });
  }
});

// DELETE /api/files/:id - Delete a file record and physical file
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if file exists
    const existingFile = await processedFilesManager.getFileById(id);
    if (!existingFile) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    // Send webhook to n8n for Supabase record deletion FIRST
    try {
      const n8nBaseUrl = process.env.N8N_BASE_WEBHOOK_URL || 'https://n8nprod.merdekabattery.com:5679/webhook/';
      const n8nWebhookUrl = n8nBaseUrl + 'train'; // Use same endpoint as processing
      
      const webhookPayload = {
        file_operation: 'delete',
        file_id: parseInt(id),
        filename: existingFile.filename,
        file_path: existingFile.file_path,
        sftp_path: existingFile.metadata?.sftpPath || generateRemoteFilePath(existingFile.filename),
        metadata: existingFile.metadata
      };
      
      console.log('Sending delete request to n8n:', webhookPayload);
      
      const n8nResponse = await axios.post(n8nWebhookUrl, webhookPayload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: PROCESSING_WEBHOOK_TIMEOUT,
        httpsAgent: httpsAgent
      });
      
      console.log('N8N delete response:', n8nResponse.data);
      
      // Check if N8N deletion was successful
      if (n8nResponse.status !== 200) {
        throw new Error(`N8N delete request failed with status ${n8nResponse.status}`);
      }
      
      console.log('Successfully deleted from n8n/Supabase');
    } catch (webhookError) {
      console.error('Error sending delete request to n8n:', webhookError.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete from Supabase',
        message: webhookError.message
      });
    }

    // After successful n8n deletion, delete physical file
    if (existingFile.file_path) {
      try {
        // Extract filename from file_path (remove /uploads/ prefix)
        const filename = existingFile.file_path.replace('/uploads/', '');
        const physicalFilePath = path.join(__dirname, '../../uploads', filename);
        
        if (fs.existsSync(physicalFilePath)) {
          fs.unlinkSync(physicalFilePath);
          console.log(`Physical file deleted: ${physicalFilePath}`);
        } else {
          console.warn(`Physical file not found: ${physicalFilePath}`);
        }
      } catch (fileError) {
        console.error('Error deleting physical file:', fileError);
        // Continue with database deletion even if physical file deletion fails
      }
    }

    // Delete file from SFTP server
    if (existingFile.filename) {
      try {
        const remoteFilePath = existingFile.metadata?.sftpPath || generateRemoteFilePath(existingFile.filename);
        await deleteFileFromSftp(remoteFilePath);
        console.log(`SFTP file deleted: ${remoteFilePath}`);
      } catch (sftpError) {
        console.error('Error deleting SFTP file:', sftpError.message);
        // Continue with database deletion even if SFTP deletion fails
      }
    }

    // Delete database record
    const deleted = await processedFilesManager.deleteFile(id);
    
    if (deleted) {
      res.json({
        success: true,
        message: 'File and database record deleted successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to delete file from database'
      });
    }
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete file',
      message: error.message
    });
  }
});

module.exports = router;