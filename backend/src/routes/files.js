const express = require('express');
const Joi = require('joi');
const { processedFilesManager } = require('../utils/processedFilesManager');
const router = express.Router();

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

// DELETE /api/files/:id - Delete a file record
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

    const deleted = await processedFilesManager.deleteFile(id);
    
    if (deleted) {
      res.json({
        success: true,
        message: 'File deleted successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to delete file'
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