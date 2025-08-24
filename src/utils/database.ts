import sql from 'mssql';
import { v4 as uuidv4 } from 'uuid';

// Database configuration from environment variables
const dbConfig: sql.config = {
  server: import.meta.env.VITE_DB_SERVER || 'localhost',
  database: import.meta.env.VITE_DB_NAME || 'PersonaAILink',
  user: import.meta.env.VITE_DB_USER || 'sa',
  password: import.meta.env.VITE_DB_PASSWORD || '',
  options: {
    encrypt: import.meta.env.VITE_DB_ENCRYPT === 'true', // Use encryption for Azure
    trustServerCertificate: import.meta.env.VITE_DB_TRUST_CERT !== 'false', // Trust self-signed certificates
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

// Connection pool
let pool: sql.ConnectionPool | null = null;

// Initialize database connection
export async function initializeDatabase(): Promise<void> {
  try {
    if (!pool) {
      pool = new sql.ConnectionPool(dbConfig);
      await pool.connect();
      console.log('Database connected successfully');
    }
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
}

// Get database connection
export async function getConnection(): Promise<sql.ConnectionPool> {
  if (!pool) {
    await initializeDatabase();
  }
  return pool!;
}

// Close database connection
export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.close();
    pool = null;
    console.log('Database connection closed');
  }
}

// Types
export interface Session {
  id: string;
  session_name?: string;
  title: string;
  created_at: Date;
  updated_at: Date;
  user_id?: string;
  status: 'active' | 'archived' | 'deleted';
  metadata?: any;
}

export interface Message {
  id: string;
  session_id: string;
  content: string;
  role: 'user' | 'assistant';
  created_at: Date;
  message_order?: number;
  metadata?: any;
}

// Session management functions
export class SessionManager {
  // Create a new session
  static async createSession(title: string, initialMessage?: string): Promise<Session> {
    const connection = await getConnection();
    const sessionId = uuidv4();
    
    const request = connection.request();
    request.input('id', sql.NVarChar(50), sessionId);
    request.input('title', sql.NVarChar(500), title);
    request.input('session_name', sql.NVarChar(255), null); // Initially null
    request.input('status', sql.NVarChar(20), 'active');
    
    await request.query(`
      INSERT INTO sessions (id, title, session_name, status, created_at, updated_at)
      VALUES (@id, @title, @session_name, @status, GETDATE(), GETDATE())
    `);
    
    // If there's an initial message, add it
    if (initialMessage) {
      await this.addMessage(sessionId, initialMessage, 'user', 1);
    }
    
    return this.getSession(sessionId);
  }
  
  // Get a session by ID
  static async getSession(sessionId: string): Promise<Session> {
    const connection = await getConnection();
    const request = connection.request();
    request.input('sessionId', sql.NVarChar(50), sessionId);
    
    const result = await request.query(`
      SELECT id, session_name, title, created_at, updated_at, user_id, status, metadata
      FROM sessions
      WHERE id = @sessionId AND status != 'deleted'
    `);
    
    if (result.recordset.length === 0) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    return result.recordset[0];
  }
  
  // Update session name
  static async updateSessionName(sessionId: string, sessionName: string): Promise<void> {
    const connection = await getConnection();
    const request = connection.request();
    request.input('sessionId', sql.NVarChar(50), sessionId);
    request.input('sessionName', sql.NVarChar(255), sessionName);
    
    await request.query(`
      UPDATE sessions
      SET session_name = @sessionName, updated_at = GETDATE()
      WHERE id = @sessionId
    `);
  }
  
  // Get all sessions
  static async getAllSessions(limit: number = 50): Promise<Session[]> {
    const connection = await getConnection();
    const request = connection.request();
    request.input('limit', sql.Int, limit);
    
    const result = await request.query(`
      SELECT TOP (@limit) id, session_name, title, created_at, updated_at, user_id, status, metadata
      FROM sessions
      WHERE status = 'active'
      ORDER BY updated_at DESC
    `);
    
    return result.recordset;
  }
  
  // Add a message to a session
  static async addMessage(
    sessionId: string,
    content: string,
    role: 'user' | 'assistant',
    messageOrder: number,
    metadata?: any
  ): Promise<Message> {
    const connection = await getConnection();
    const messageId = uuidv4();
    
    const request = connection.request();
    request.input('id', sql.NVarChar(50), messageId);
    request.input('sessionId', sql.NVarChar(50), sessionId);
    request.input('content', sql.NVarChar(sql.MAX), content);
    request.input('role', sql.NVarChar(20), role);
    request.input('messageOrder', sql.Int, messageOrder);
    request.input('metadata', sql.NVarChar(sql.MAX), metadata ? JSON.stringify(metadata) : null);
    
    await request.query(`
      INSERT INTO messages (id, session_id, content, role, message_order, metadata, created_at)
      VALUES (@id, @sessionId, @content, @role, @messageOrder, @metadata, GETDATE())
    `);
    
    // Update session's updated_at timestamp
    await this.touchSession(sessionId);
    
    return {
      id: messageId,
      session_id: sessionId,
      content,
      role,
      created_at: new Date(),
      message_order: messageOrder,
      metadata
    };
  }
  
  // Get messages for a session
  static async getSessionMessages(sessionId: string): Promise<Message[]> {
    const connection = await getConnection();
    const request = connection.request();
    request.input('sessionId', sql.NVarChar(50), sessionId);
    
    const result = await request.query(`
      SELECT id, session_id, content, role, created_at, message_order, metadata
      FROM messages
      WHERE session_id = @sessionId
      ORDER BY message_order ASC
    `);
    
    return result.recordset.map(row => ({
      ...row,
      metadata: row.metadata ? JSON.parse(row.metadata) : null
    }));
  }
  
  // Update session's updated_at timestamp
  private static async touchSession(sessionId: string): Promise<void> {
    const connection = await getConnection();
    const request = connection.request();
    request.input('sessionId', sql.NVarChar(50), sessionId);
    
    await request.query(`
      UPDATE sessions
      SET updated_at = GETDATE()
      WHERE id = @sessionId
    `);
  }
  
  // Delete a session (soft delete)
  static async deleteSession(sessionId: string): Promise<void> {
    const connection = await getConnection();
    const request = connection.request();
    request.input('sessionId', sql.NVarChar(50), sessionId);
    
    await request.query(`
      UPDATE sessions
      SET status = 'deleted', updated_at = GETDATE()
      WHERE id = @sessionId
    `);
  }
}

// Initialize database on module load (for development)
if (import.meta.env.DEV) {
  initializeDatabase().catch(console.error);
}