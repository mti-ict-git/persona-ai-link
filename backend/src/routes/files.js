const express = require('express');
const Joi = require('joi');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const https = require('https');
const { processedFilesManager } = require('../utils/processedFilesManager');
const { deleteFileFromSftp, generateRemoteFilePath } = require('../utils/sftp');
const { authenticateToken } = require('./auth');
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

// External Source Management Routes

// Helper function to validate URL accessibility
const validateUrlAccess = async (url) => {
  try {
    // Check if URL is reachable with a HEAD request
    const response = await axios.head(url, {
      timeout: 5000,
      httpsAgent,
      validateStatus: (status) => status < 500 // Accept redirects and client errors
    });
    return { accessible: true, status: response.status };
  } catch (error) {
    // If HEAD fails, try GET with limited data
    try {
      const response = await axios.get(url, {
        timeout: 5000,
        httpsAgent,
        maxContentLength: 1024, // Only download first 1KB
        validateStatus: (status) => status < 500
      });
      return { accessible: true, status: response.status };
    } catch (getError) {
      return { 
        accessible: false, 
        error: getError.code || getError.message,
        status: getError.response?.status
      };
    }
  }
};

// Enhanced validation schema for external sources
const externalSourceSchema = Joi.object({
  name: Joi.string().min(1).max(255).required()
    .pattern(/^[a-zA-Z0-9\s\-_\.\(\)]+$/)
    .messages({
      'string.pattern.base': 'Name can only contain letters, numbers, spaces, hyphens, underscores, dots, and parentheses'
    }),
  url: Joi.string().uri({ scheme: ['http', 'https'] }).required()
    .messages({
      'string.uri': 'URL must be a valid HTTP or HTTPS URL'
    }),
  type: Joi.string().valid('download', 'view', 'edit', 'onedrive', 'googledrive', 'dropbox', 'url').default('view'),
  description: Joi.string().max(500).optional().allow('', null)
});

const updateExternalSourceSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional()
    .pattern(/^[a-zA-Z0-9\s\-_\.\(\)]+$/)
    .messages({
      'string.pattern.base': 'Name can only contain letters, numbers, spaces, hyphens, underscores, dots, and parentheses'
    }),
  url: Joi.string().uri({ scheme: ['http', 'https'] }).optional()
    .messages({
      'string.uri': 'URL must be a valid HTTP or HTTPS URL'
    }),
  type: Joi.string().valid('download', 'view', 'edit', 'onedrive', 'googledrive', 'dropbox', 'url').optional(),
  description: Joi.string().max(500).optional().allow('', null)
});

// GET /api/files/:id/sources - Get all external sources for a file
router.get('/:id/sources', authenticateToken, async (req, res) => {
  try {
    const fileId = req.params.id;
    const file = await processedFilesManager.getFileById(fileId);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    const externalSources = file.metadata?.externalSources || [];
    
    res.json({
      success: true,
      data: externalSources,
      count: externalSources.length
    });
  } catch (error) {
    console.error('Error fetching external sources:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch external sources',
      message: error.message
    });
  }
});

// POST /api/files/:id/sources - Add external source to a file
router.post('/:id/sources', authenticateToken, async (req, res) => {
  try {
    const { error, value } = externalSourceSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details
      });
    }

    const fileId = req.params.id;
    const file = await processedFilesManager.getFileById(fileId);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    // Skip URL accessibility validation to allow authenticated URLs (SharePoint, OneDrive, etc.)

    // Initialize metadata if it doesn't exist
    const metadata = file.metadata || {};
    const externalSources = metadata.externalSources || [];
    
    // Check for duplicate URLs
    const existingSource = externalSources.find(source => source.url === value.url);
    if (existingSource) {
      return res.status(400).json({
        success: false,
        error: 'URL already exists for this file',
        details: { existingSource: existingSource.name }
      });
    }
    
    // Create new external source
    const newSource = {
      id: `source-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: value.name,
      url: value.url,
      type: value.type,
      description: value.description || '',
      addedAt: new Date().toISOString()
    };
    
    // Add to sources array
    externalSources.push(newSource);
    metadata.externalSources = externalSources;
    
    // Update file metadata
    await processedFilesManager.updateProcessedStatus(fileId, file.processed, metadata);
    
    res.status(201).json({
      success: true,
      data: newSource,
      message: 'External source added successfully'
    });
  } catch (error) {
    console.error('Error adding external source:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add external source',
      message: error.message
    });
  }
});

// PUT /api/files/:id/sources/:sourceId - Update external source
router.put('/:id/sources/:sourceId', authenticateToken, async (req, res) => {
  try {
    const { error, value } = updateExternalSourceSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details
      });
    }

    const fileId = req.params.id;
    const sourceId = req.params.sourceId;
    const file = await processedFilesManager.getFileById(fileId);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    const metadata = file.metadata || {};
    const externalSources = metadata.externalSources || [];
    
    // Find the source to update
    const sourceIndex = externalSources.findIndex(source => source.id === sourceId);
    if (sourceIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'External source not found'
      });
    }
    
    // If URL is being updated, validate accessibility
    let urlValidation = null;
    if (value.url && value.url !== externalSources[sourceIndex].url) {
      // Check for duplicate URLs (excluding current source)
      const existingSource = externalSources.find((source, index) => 
        index !== sourceIndex && source.url === value.url
      );
      if (existingSource) {
        return res.status(400).json({
          success: false,
          error: 'URL already exists for this file',
          details: { existingSource: existingSource.name }
        });
      }
      
      // Skip URL accessibility validation to allow authenticated URLs
    }
    
    // Update the source
    const updatedSource = {
      ...externalSources[sourceIndex],
      ...value,
      updatedAt: new Date().toISOString()
    };
    
    externalSources[sourceIndex] = updatedSource;
    metadata.externalSources = externalSources;
    
    // Update file metadata
    await processedFilesManager.updateProcessedStatus(fileId, file.processed, metadata);
    
    res.json({
      success: true,
      data: updatedSource,
      message: 'External source updated successfully'
    });
  } catch (error) {
    console.error('Error updating external source:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update external source',
      message: error.message
    });
  }
});

// DELETE /api/files/:id/sources/:sourceId - Remove external source
router.delete('/:id/sources/:sourceId', authenticateToken, async (req, res) => {
  try {
    const fileId = req.params.id;
    const sourceId = req.params.sourceId;
    const file = await processedFilesManager.getFileById(fileId);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    const metadata = file.metadata || {};
    const externalSources = metadata.externalSources || [];
    
    // Find and remove the source
    const sourceIndex = externalSources.findIndex(source => source.id === sourceId);
    if (sourceIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'External source not found'
      });
    }
    
    const removedSource = externalSources.splice(sourceIndex, 1)[0];
    metadata.externalSources = externalSources;
    
    // Update file metadata
    await processedFilesManager.updateProcessedStatus(fileId, file.processed, metadata);
    
    res.json({
      success: true,
      data: removedSource,
      message: 'External source removed successfully'
    });
  } catch (error) {
    console.error('Error removing external source:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove external source',
      message: error.message
    });
  }
});

module.exports = router;