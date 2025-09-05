const sql = require('mssql');

// Database configuration (from backend .env)
const dbConfig = {
  server: '10.60.10.47',
  database: 'AIChatBot',
  user: 'sa',
  password: 'Bl4ck3y34dmin',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

async function checkSchema() {
  let pool;
  try {
    console.log('Connecting to database...');
    pool = new sql.ConnectionPool(dbConfig);
    await pool.connect();
    console.log('Database connected successfully');

    // Check chat_Users table structure
    console.log('\n=== chat_Users table structure ===');
    const usersResult = await pool.request().query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE,
        COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'chat_Users'
      ORDER BY ORDINAL_POSITION
    `);
    
    if (usersResult.recordset.length > 0) {
      console.table(usersResult.recordset);
    } else {
      console.log('chat_Users table not found');
    }
    
    // Check if user_preferences table exists
    console.log('\n=== user_preferences table check ===');
    const prefsTableResult = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'user_preferences'
    `);
    
    if (prefsTableResult.recordset.length > 0) {
      console.log('✅ user_preferences table exists');
      
      // Show structure
      const prefsResult = await pool.request().query(`
        SELECT 
          COLUMN_NAME,
          DATA_TYPE,
          CHARACTER_MAXIMUM_LENGTH,
          IS_NULLABLE,
          COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'user_preferences'
        ORDER BY ORDINAL_POSITION
      `);
      console.table(prefsResult.recordset);
    } else {
      console.log('❌ user_preferences table does not exist');
    }
    
    // List all tables
    console.log('\n=== All tables in database ===');
    const tablesResult = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);
    console.log('Tables:', tablesResult.recordset.map(r => r.TABLE_NAME).join(', '));
    
  } catch (error) {
    console.error('Schema check failed:', error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log('\nDatabase connection closed');
    }
  }
}

checkSchema();