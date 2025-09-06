const sql = require('mssql');

const config = {
  server: '10.60.10.47',
  database: 'AIChatBot',
  user: 'sa',
  password: 'Bl4ck3y34dmin',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function checkCurrentState() {
  let pool;
  try {
    pool = new sql.ConnectionPool(config);
    await pool.connect();
    console.log('Connected to database');
    
    const result = await pool.request().query(`
      SELECT 
        u.username,
        up.preference_key,
        up.preference_value,
        up.updated_at
      FROM user_preferences up 
      JOIN chat_Users u ON up.user_id = u.id 
      WHERE u.username = 'test.user4'
      ORDER BY up.updated_at DESC
    `);
    
    console.log('\n=== Current User Preferences for test.user4 (by update time) ===');
    console.table(result.recordset);
    
    // Check if language dialog should show
    const firstTimeLogin = result.recordset.find(r => r.preference_key === 'firstTimeLogin')?.preference_value;
    const language = result.recordset.find(r => r.preference_key === 'language')?.preference_value;
    
    console.log('\n=== Dialog Logic Check ===');
    console.log('firstTimeLogin:', firstTimeLogin);
    console.log('language:', `'${language}'`);
    console.log('Should show dialog:', firstTimeLogin === 'true' || !language);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

checkCurrentState();