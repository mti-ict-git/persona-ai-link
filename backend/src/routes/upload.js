const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { processedFilesManager } = require('../utils/processedFilesManager');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    // Ensure uploads directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

// File filter to only allow specific file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.pdf', '.docx', '.txt', '.doc'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${ext} not allowed. Only PDF, DOCX, TXT, and DOC files are supported.`), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// POST /api/upload - Handle file upload with actual file storage
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const { originalname, filename, path: filePath, size, mimetype } = req.file;
    
    // Check if file with same original name already exists in database
    const existingFile = await processedFilesManager.getFileByName(originalname);
    
    if (existingFile) {
      // Delete the uploaded file since we have a duplicate
      fs.unlinkSync(filePath);
      
      return res.status(409).json({
        success: false,
        error: 'File already exists',
        message: `A file named "${originalname}" already exists. Please delete it first or rename your file.`,
        existingFile: {
          id: existingFile.id,
          filename: existingFile.filename,
          created_at: existingFile.created_at
        }
      });
    }

    // Create file record in database
    const fileRecord = await processedFilesManager.createFile(
      originalname,
      `/uploads/${filename}`, // Store relative path
      {
        originalName: originalname,
        storedName: filename,
        size: size,
        type: mimetype,
        uploadedAt: new Date().toISOString()
      }
    );

    console.log(`File uploaded successfully: ${originalname} -> ${filename}`);

    res.status(201).json({
      success: true,
      data: {
        id: fileRecord.id,
        filename: originalname,
        storedFilename: filename,
        file_path: `/uploads/${filename}`,
        size: size,
        type: mimetype,
        created_at: fileRecord.created_at,
        processed: fileRecord.processed
      },
      message: 'File uploaded successfully'
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    
    // Clean up uploaded file if database operation failed
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large',
        message: 'File size must be less than 10MB'
      });
    }
    
    if (error.message.includes('File type')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file type',
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to upload file',
      message: error.message
    });
  }
});

// GET /api/upload/file/:filename - Serve uploaded files
router.get('/file/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../../uploads', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
    
    // Set appropriate headers
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.sendFile(filePath);
    
  } catch (error) {
    console.error('Error serving file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to serve file',
      message: error.message
    });
  }
});

module.exports = router;