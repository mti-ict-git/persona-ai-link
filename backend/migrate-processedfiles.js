const fs = require('fs');
const path = require('path');
const sql = require('mssql');
require('dotenv').config();

// Database configuration
const config = {
  server: process.env.DB_HOST || process.env.DB_SERVER || '10.60.10.47',
  database: process.env.DB_DATABASE || 'AIChatBot',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'Bl4ck3y34dmin',
  port: parseInt(process.env.DB_PORT) || 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

async function migrateProcessedFiles() {
  let pool;
  try {
    console.log('Connecting to database...');
    pool = await sql.connect(config);
    console.log('Connected successfully!');

    console.log('Checking if ProcessedFiles table exists...');
    
    // Check if table exists
    const checkTableResult = await pool.request().query(`
      SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'ProcessedFiles'
    `);
    
    if (checkTableResult.recordset[0].count > 0) {
      console.log('ProcessedFiles table already exists. Checking for processed column...');
      
      // Check if processed column exists
      const checkColumnResult = await pool.request().query(`
        SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'ProcessedFiles' AND COLUMN_NAME = 'processed'
      `);
      
      if (checkColumnResult.recordset[0].count === 0) {
        console.log('Adding processed column to existing table...');
        await pool.request().query(`
          ALTER TABLE ProcessedFiles 
          ADD processed BIT NOT NULL DEFAULT 0
        `);
        console.log('Processed column added successfully.');
      } else {
        console.log('ProcessedFiles table already has processed column.');
      }
      return;
    }
    
    console.log('Creating ProcessedFiles table...');
    
    // Create the table
    await pool.request().query(`
      CREATE TABLE ProcessedFiles (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          filename NVARCHAR(255) NOT NULL,
          file_path NVARCHAR(500) NULL,
          metadata NVARCHAR(MAX) NULL,
          processed BIT NOT NULL DEFAULT 0,
          created_at DATETIME2 DEFAULT GETDATE(),
          updated_at DATETIME2 DEFAULT GETDATE()
      )
    `);
    
    console.log('Creating indexes...');
    
    await pool.request().query(`
      CREATE INDEX IX_ProcessedFiles_filename ON ProcessedFiles(filename)
    `);
    
    await pool.request().query(`
      CREATE INDEX IX_ProcessedFiles_processed ON ProcessedFiles(processed)
    `);
    
    await pool.request().query(`
      CREATE INDEX IX_ProcessedFiles_created_at ON ProcessedFiles(created_at)
    `);
    
    await pool.request().query(`
       CREATE UNIQUE INDEX IX_ProcessedFiles_filename_unique ON ProcessedFiles(filename)
     `);

    console.log('ProcessedFiles table migration completed successfully!');
  } catch (error) {
    console.error('ProcessedFiles migration failed:', error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

migrateProcessedFiles();