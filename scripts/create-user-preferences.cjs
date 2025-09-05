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

async function createUserPreferencesTable() {
  let pool;
  try {
    console.log('Connecting to database...');
    pool = new sql.ConnectionPool(dbConfig);
    await pool.connect();
    console.log('Database connected successfully');

    // First, check if table already exists
    const checkResult = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'user_preferences'
    `);
    
    if (checkResult.recordset.length > 0) {
      console.log('✅ user_preferences table already exists');
      return;
    }

    console.log('Creating user_preferences table...');
    
    // Create table without foreign key first
    await pool.request().query(`
      CREATE TABLE user_preferences (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        user_id NVARCHAR(50) NOT NULL,
        preference_key NVARCHAR(50) NOT NULL,
        preference_value NVARCHAR(MAX) NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
      )
    `);
    console.log('✅ Table created successfully');
    
    // Create indexes
    console.log('Creating indexes...');
    await pool.request().query(`
      CREATE INDEX IX_user_preferences_user_id ON user_preferences(user_id)
    `);
    await pool.request().query(`
      CREATE INDEX IX_user_preferences_key ON user_preferences(preference_key)
    `);
    await pool.request().query(`
      CREATE UNIQUE INDEX IX_user_preferences_unique ON user_preferences(user_id, preference_key)
    `);
    console.log('✅ Indexes created successfully');
    
    // Try to add foreign key constraint
    console.log('Adding foreign key constraint...');
    try {
      await pool.request().query(`
        ALTER TABLE user_preferences
        ADD CONSTRAINT FK_user_preferences_user_id 
        FOREIGN KEY (user_id) REFERENCES chat_Users(id) ON DELETE CASCADE
      `);
      console.log('✅ Foreign key constraint added successfully');
    } catch (fkError) {
      console.log('⚠️  Warning: Could not add foreign key constraint:', fkError.message);
      console.log('Table created successfully but without foreign key constraint');
    }
    
    // Create trigger for updated_at
    console.log('Creating trigger...');
    await pool.request().query(`
      CREATE TRIGGER tr_user_preferences_updated_at
      ON user_preferences
      AFTER UPDATE
      AS
      BEGIN
          SET NOCOUNT ON;
          UPDATE user_preferences
          SET updated_at = GETDATE()
          FROM user_preferences up
          INNER JOIN inserted i ON up.id = i.id;
      END
    `);
    console.log('✅ Trigger created successfully');
    
    console.log('\n🎉 user_preferences table setup completed!');
    
  } catch (error) {
    console.error('Failed to create user_preferences table:', error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log('Database connection closed');
    }
  }
}

createUserPreferencesTable();