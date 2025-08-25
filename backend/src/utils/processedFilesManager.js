const sql = require('mssql');
const { v4: uuidv4 } = require('uuid');
const { dbManager } = require('./database');

class ProcessedFilesManager {
  constructor(dbManager) {
    this.db = dbManager;
  }

  // Create a new processed file record
  async createFile(filename, filePath = null, metadata = null) {
    try {
      const pool = await this.db.getConnection();
      const now = new Date();

      const request = pool.request();
      request.input('filename', sql.NVarChar(255), filename);
      request.input('file_path', sql.NVarChar(500), filePath);
      request.input('processed', sql.Bit, false);
      request.input('created_at', sql.DateTime2, now);

      const result = await request.query(`
        INSERT INTO ProcessedFiles (FileName, FilePath, ProcessedDate, processed)
        OUTPUT INSERTED.Id
        VALUES (@filename, @file_path, @created_at, @processed)
      `);

      const insertedId = result.recordset[0].Id;
      
      return {
        id: insertedId,
        filename,
        file_path: filePath,
        processed: false,
        created_at: now
      };
    } catch (error) {
      console.error('Error creating processed file:', error);
      throw error;
    }
  }

  // Get all processed files
  async getAllFiles(limit = 100) {
    try {
      const pool = await this.db.getConnection();
      const request = pool.request();
      request.input('limit', sql.Int, limit);

      const result = await request.query(`
        SELECT TOP(@limit) Id as id, FileName as filename, FilePath as file_path, processed, ProcessedDate as created_at
        FROM ProcessedFiles
        ORDER BY ProcessedDate DESC
      `);

      return result.recordset.map(file => ({
        ...file,
        metadata: null
      }));
    } catch (error) {
      console.error('Error getting processed files:', error);
      throw error;
    }
  }

  // Get a specific file by ID
  async getFileById(fileId) {
    try {
      const pool = await this.db.getConnection();
      const request = pool.request();
      request.input('fileId', sql.Int, fileId);

      const result = await request.query(`
        SELECT Id as id, FileName as filename, FilePath as file_path, processed, ProcessedDate as created_at
        FROM ProcessedFiles
        WHERE Id = @fileId
      `);

      if (result.recordset.length === 0) {
        return null;
      }

      const file = result.recordset[0];
      return {
        ...file,
        metadata: null
      };
    } catch (error) {
      console.error('Error getting processed file by ID:', error);
      throw error;
    }
  }

  // Get a file by filename
  async getFileByName(filename) {
    try {
      const pool = await this.db.getConnection();
      const request = pool.request();
      request.input('filename', sql.NVarChar(255), filename);

      const result = await request.query(`
        SELECT Id as id, FileName as filename, FilePath as file_path, processed, ProcessedDate as created_at
        FROM ProcessedFiles
        WHERE FileName = @filename
      `);

      if (result.recordset.length === 0) {
        return null;
      }

      const file = result.recordset[0];
      return {
        ...file,
        metadata: null
      };
    } catch (error) {
      console.error('Error getting processed file by name:', error);
      throw error;
    }
  }

  // Update file processing status
  async updateProcessedStatus(fileId, processed = true, metadata = null) {
    try {
      const pool = await this.db.getConnection();
      const request = pool.request();
      request.input('fileId', sql.Int, fileId);
      request.input('processed', sql.Bit, processed);

      let query = `
        UPDATE ProcessedFiles 
        SET processed = @processed
      `;

      if (metadata !== null) {
        request.input('metadata', sql.NVarChar(sql.MAX), JSON.stringify(metadata));
        query += `, metadata = @metadata`;
      }

      query += ` WHERE Id = @fileId`;

      await request.query(query);

      return await this.getFileById(fileId);
    } catch (error) {
      console.error('Error updating processed status:', error);
      throw error;
    }
  }

  // Delete a file record
  async deleteFile(fileId) {
    try {
      const pool = await this.db.getConnection();
      const request = pool.request();
      request.input('fileId', sql.Int, fileId);

      const result = await request.query(`
        DELETE FROM ProcessedFiles
        WHERE Id = @fileId
      `);

      return result.rowsAffected[0] > 0;
    } catch (error) {
      console.error('Error deleting processed file:', error);
      throw error;
    }
  }

  // Check if filename already exists
  async fileExists(filename) {
    try {
      const file = await this.getFileByName(filename);
      return file !== null;
    } catch (error) {
      console.error('Error checking if file exists:', error);
      throw error;
    }
  }

  // Get processed files count
  async getProcessedFilesCount() {
    try {
      const pool = await this.db.getConnection();
      const request = pool.request();

      const result = await request.query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN processed = 1 THEN 1 ELSE 0 END) as processed_count,
          SUM(CASE WHEN processed = 0 THEN 1 ELSE 0 END) as pending_count
        FROM ProcessedFiles
      `);

      return result.recordset[0];
    } catch (error) {
      console.error('Error getting processed files count:', error);
      throw error;
    }
  }
}

// Create singleton instance
const processedFilesManager = new ProcessedFilesManager(dbManager);

module.exports = {
  ProcessedFilesManager,
  processedFilesManager
};