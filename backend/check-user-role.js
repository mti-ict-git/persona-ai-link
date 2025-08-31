const sql = require('mssql');

const config = {
  server: '10.60.10.47',
  database: 'AIChatBot',
  user: 'sa',
  password: 'Bl4ck3y34dmin',
  port: 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function checkAndUpdateUser() {
  try {
    const pool = await sql.connect(config);
    
    // Check current user role
    const result = await pool.request().query(`
      SELECT id, username, email, role, active 
      FROM chat_Users 
      WHERE email = 'mti.admin@merdekabattery.com'
    `);
    
    console.log('User details:', result.recordset);
    
    if (result.recordset.length > 0) {
      const user = result.recordset[0];
      console.log('Current role:', user.role);
      
      if (user.role !== 'superadmin') {
        console.log('Updating user role to superadmin...');
        await pool.request()
          .input('userId', sql.Int, user.id)
          .query(`UPDATE chat_Users SET role = 'superadmin' WHERE id = @userId`);
        console.log('User role updated to superadmin');
        
        // Verify the update
        const verifyResult = await pool.request()
          .input('userId', sql.Int, user.id)
          .query(`SELECT role FROM chat_Users WHERE id = @userId`);
        console.log('New role:', verifyResult.recordset[0].role);
      } else {
        console.log('User already has superadmin role');
      }
    } else {
      console.log('User not found');
    }
    
    await pool.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkAndUpdateUser();