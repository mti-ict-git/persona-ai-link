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

async function setupDatabase() {
  let pool;
  try {
    console.log('Connecting to database...');
    pool = await sql.connect(config);
    console.log('Connected successfully!');

    // Read the schema file
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

    console.log('Executing database schema...');
    
    // Split the SQL into individual statements
    const statements = schemaSQL
      .split(/GO\s*$/gim)
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`Executing statement ${i + 1}/${statements.length}...`);
          await pool.request().query(statement);
          console.log(`Statement ${i + 1} executed successfully.`);
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log(`Statement ${i + 1} skipped (object already exists).`);
          } else {
            console.error(`Error in statement ${i + 1}:`, error.message);
            throw error;
          }
        }
      }
    }

    console.log('Database schema setup completed successfully!');
  } catch (error) {
    console.error('Database setup failed:', error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

setupDatabase();