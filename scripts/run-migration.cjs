const sql = require('mssql');
const fs = require('fs');
const path = require('path');

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

async function runMigration() {
  let pool;
  try {
    console.log('Connecting to database...');
    pool = new sql.ConnectionPool(dbConfig);
    await pool.connect();
    console.log('Database connected successfully');

    // Read the migration script
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '005_add_sso_support.sql');
    const migrationScript = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Executing migration script...');
    
    // Split the script by GO statements and execute each batch
    const batches = migrationScript.split(/\bGO\b/gi).filter(batch => batch.trim());
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i].trim();
      if (batch) {
        console.log(`Executing batch ${i + 1}/${batches.length}...`);
        await pool.request().query(batch);
      }
    }
    
    console.log('Migration completed successfully!');
    
    // Verify the table was created
    const result = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'user_preferences'
    `);
    
    if (result.recordset.length > 0) {
      console.log('✅ user_preferences table exists in database');
    } else {
      console.log('❌ user_preferences table not found');
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log('Database connection closed');
    }
  }
}

runMigration();