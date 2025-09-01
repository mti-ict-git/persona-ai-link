const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const sessionRoutes = require('./routes/sessions');
const messageRoutes = require('./routes/messages');
const webhookRoutes = require('./routes/webhooks');
const filesRoutes = require('./routes/files');
const uploadRoutes = require('./routes/upload');
const processingRoutes = require('./routes/processing');
const feedbackRoutes = require('./routes/feedback');
const trainingRoutes = require('./routes/training');
const adminRoutes = require('./routes/admin');
const { router: authRoutes } = require('./routes/auth');
const { initializeDatabase } = require('./utils/database');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:8090',
    'http://localhost:8090',
    'http://10.60.10.59:8090',
    'http://127.0.0.1:8090',
    'https://tsindeka.merdekabattery.com',
    'http://frontend:8090',  // Docker service name
    'http://persona-ai-frontend-prod:8090'  // Docker container name
  ],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'authorization', 'X-Requested-With', 'Accept'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  exposedHeaders: ['Authorization']
}));

// Handle preflight requests explicitly
app.options('*', (req, res) => {
  console.log('[PREFLIGHT] OPTIONS request for:', req.originalUrl);
  console.log('[PREFLIGHT] Headers:', req.headers);
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:8090',
    'http://localhost:8090',
    'http://10.60.10.59:8090',
    'http://127.0.0.1:8090',
    'https://tsindeka.merdekabattery.com'
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, authorization, X-Requested-With, Accept');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/processing', processingRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/webhooks', webhookRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.details
    });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or missing authentication'
    });
  }
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong' 
      : err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`
  });
});

// Initialize database and start server
async function startServer() {
  try {
    await initializeDatabase();
    console.log('Database initialized successfully');
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:8080'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

startServer();

module.exports = app;