const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
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
const ssoRoutes = require('./routes/sso');
const preferencesRoutes = require('./routes/preferences');
const { initializeDatabase } = require('./utils/database');
const redisService = require('./services/redisService');

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
    'https://merdekabattery.sharepoint.com',  // SharePoint SSO origin
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
    'http://localhost:3000',
    'http://10.60.10.59:8090',
    'http://127.0.0.1:8090',
    'https://tsindeka.merdekabattery.com',
    'https://merdekabattery.sharepoint.com'  // SharePoint SSO origin
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

// Rate limiting - more permissive for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 1000 : 10000, // Higher limits for development
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use('/api/', limiter);

// Cookie parsing middleware
app.use(cookieParser());

// Logging
app.use(morgan('combined'));

// Body parsing - conditionally apply to exclude upload routes
app.use((req, res, next) => {
  // Skip body parsing for upload routes to allow multer to handle multipart data
  if (req.path.startsWith('/api/upload')) {
    return next();
  }
  express.json({ limit: '10mb' })(req, res, next);
});
app.use((req, res, next) => {
  // Skip URL encoding for upload routes
  if (req.path.startsWith('/api/upload')) {
    return next();
  }
  express.urlencoded({ extended: true })(req, res, next);
});

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
app.use('/api/sso', ssoRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/processing', processingRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/preferences', preferencesRoutes);
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
    
    // Initialize Redis for SSO
    try {
      await redisService.connect();
      console.log('Redis service initialized successfully');
    } catch (redisError) {
      console.warn('Redis connection failed - SSO features will be unavailable:', redisError.message);
    }
    
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
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  try {
    await redisService.disconnect();
  } catch (error) {
    console.error('Error disconnecting Redis:', error);
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  try {
    await redisService.disconnect();
  } catch (error) {
    console.error('Error disconnecting Redis:', error);
  }
  process.exit(0);
});

startServer();

module.exports = app;