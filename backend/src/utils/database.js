const sql = require('mssql');
const { v4: uuidv4 } = require('uuid');

class DatabaseManager {
  constructor() {
    this.pool = null;
    this.config = {
      server: process.env.DB_SERVER || 'localhost',
      database: process.env.DB_DATABASE || 'PersonaAILink',
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      port: parseInt(process.env.DB_PORT) || 1433,
      options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_CERT === 'true',
        enableArithAbort: true,
        requestTimeout: 30000,
        connectionTimeout: 30000
      },
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
      }
    };
  }

  async initialize() {
    try {
      if (this.pool) {
        await this.pool.close();
      }
      
      this.pool = await sql.connect(this.config);
      console.log('Database connection established');
      
      // Test the connection
      await this.pool.request().query('SELECT 1 as test');
      console.log('Database connection test successful');
      
      return this.pool;
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  async getConnection() {
    if (!this.pool || !this.pool.connected) {
      await this.initialize();
    }
    return this.pool;
  }

  async close() {
    if (this.pool) {
      await this.pool.close();
      this.pool = null;
      console.log('Database connection closed');
    }
  }
}

class SessionManager {
  constructor(dbManager) {
    this.db = dbManager;
  }

  async createSession(title = 'New Conversation', sessionName = null) {
    try {
      const pool = await this.db.getConnection();
      const sessionId = uuidv4();
      const now = new Date();

      const request = pool.request();
      request.input('id', sql.UniqueIdentifier, sessionId);
      request.input('title', sql.NVarChar(255), title);
      request.input('session_name', sql.NVarChar(255), sessionName);
      request.input('created_at', sql.DateTime2, now);
      request.input('updated_at', sql.DateTime2, now);

      await request.query(`
        INSERT INTO sessions (id, title, session_name, created_at, updated_at)
        VALUES (@id, @title, @session_name, @created_at, @updated_at)
      `);

      return {
        id: sessionId,
        title,
        session_name: sessionName,
        created_at: now,
        updated_at: now
      };
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  }

  async getSession(sessionId) {
    try {
      const pool = await this.db.getConnection();
      const request = pool.request();
      request.input('sessionId', sql.UniqueIdentifier, sessionId);

      const result = await request.query(`
        SELECT id, title, session_name, created_at, updated_at
        FROM sessions
        WHERE id = @sessionId
      `);

      return result.recordset[0] || null;
    } catch (error) {
      console.error('Error getting session:', error);
      throw error;
    }
  }

  async getAllSessions(limit = 50) {
    try {
      const pool = await this.db.getConnection();
      const request = pool.request();
      request.input('limit', sql.Int, limit);

      const result = await request.query(`
        SELECT TOP(@limit) id, title, session_name, created_at, updated_at
        FROM sessions
        ORDER BY updated_at DESC
      `);

      return result.recordset;
    } catch (error) {
      console.error('Error getting all sessions:', error);
      throw error;
    }
  }

  async updateSession(sessionId, updates) {
    try {
      const pool = await this.db.getConnection();
      const request = pool.request();
      
      const setClauses = [];
      const allowedFields = ['title', 'session_name'];
      
      request.input('sessionId', sql.UniqueIdentifier, sessionId);
      request.input('updated_at', sql.DateTime2, new Date());
      
      allowedFields.forEach(field => {
        if (updates.hasOwnProperty(field)) {
          setClauses.push(`${field} = @${field}`);
          request.input(field, sql.NVarChar(255), updates[field]);
        }
      });
      
      if (setClauses.length === 0) {
        throw new Error('No valid fields to update');
      }
      
      setClauses.push('updated_at = @updated_at');
      
      const query = `
        UPDATE sessions 
        SET ${setClauses.join(', ')}
        WHERE id = @sessionId
      `;
      
      await request.query(query);
      return await this.getSession(sessionId);
    } catch (error) {
      console.error('Error updating session:', error);
      throw error;
    }
  }

  async deleteSession(sessionId) {
    try {
      const pool = await this.db.getConnection();
      const transaction = new sql.Transaction(pool);
      
      await transaction.begin();
      
      try {
        // Delete messages first (foreign key constraint)
        let request = new sql.Request(transaction);
        request.input('sessionId', sql.UniqueIdentifier, sessionId);
        await request.query('DELETE FROM messages WHERE session_id = @sessionId');
        
        // Delete session
        request = new sql.Request(transaction);
        request.input('sessionId', sql.UniqueIdentifier, sessionId);
        await request.query('DELETE FROM sessions WHERE id = @sessionId');
        
        await transaction.commit();
        return true;
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      throw error;
    }
  }
}

class MessageManager {
  constructor(dbManager) {
    this.db = dbManager;
  }

  async addMessage(sessionId, content, role, metadata = null) {
    try {
      const pool = await this.db.getConnection();
      const messageId = uuidv4();
      const now = new Date();

      const request = pool.request();
      request.input('id', sql.UniqueIdentifier, messageId);
      request.input('session_id', sql.UniqueIdentifier, sessionId);
      request.input('content', sql.NVarChar(sql.MAX), content);
      request.input('role', sql.NVarChar(20), role);
      request.input('metadata', sql.NVarChar(sql.MAX), metadata ? JSON.stringify(metadata) : null);
      request.input('created_at', sql.DateTime2, now);

      await request.query(`
        INSERT INTO messages (id, session_id, content, role, metadata, created_at)
        VALUES (@id, @session_id, @content, @role, @metadata, @created_at)
      `);

      // Update session timestamp
      const updateRequest = pool.request();
      updateRequest.input('sessionId', sql.UniqueIdentifier, sessionId);
      updateRequest.input('updated_at', sql.DateTime2, now);
      await updateRequest.query(`
        UPDATE sessions SET updated_at = @updated_at WHERE id = @sessionId
      `);

      return {
        id: messageId,
        session_id: sessionId,
        content,
        role,
        metadata,
        created_at: now
      };
    } catch (error) {
      console.error('Error adding message:', error);
      throw error;
    }
  }

  async getSessionMessages(sessionId, limit = 100) {
    try {
      const pool = await this.db.getConnection();
      const request = pool.request();
      request.input('sessionId', sql.UniqueIdentifier, sessionId);
      request.input('limit', sql.Int, limit);

      const result = await request.query(`
        SELECT TOP(@limit) id, session_id, content, role, metadata, created_at
        FROM messages
        WHERE session_id = @sessionId
        ORDER BY created_at ASC
      `);

      return result.recordset.map(msg => ({
        ...msg,
        metadata: msg.metadata ? JSON.parse(msg.metadata) : null
      }));
    } catch (error) {
      console.error('Error getting session messages:', error);
      throw error;
    }
  }

  async deleteMessage(messageId) {
    try {
      const pool = await this.db.getConnection();
      const request = pool.request();
      request.input('messageId', sql.UniqueIdentifier, messageId);

      await request.query('DELETE FROM messages WHERE id = @messageId');
      return true;
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }
}

// Singleton instances
const dbManager = new DatabaseManager();
const sessionManager = new SessionManager(dbManager);
const messageManager = new MessageManager(dbManager);

// Initialize database function
async function initializeDatabase() {
  return await dbManager.initialize();
}

// Close database function
async function closeDatabase() {
  return await dbManager.close();
}

module.exports = {
  DatabaseManager,
  SessionManager,
  MessageManager,
  sessionManager,
  messageManager,
  initializeDatabase,
  closeDatabase
};