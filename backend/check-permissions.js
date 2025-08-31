const sql = require('mssql');
require('dotenv').config();

const config = {
  server: process.env.DB_HOST || '10.60.10.47',
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

async function checkPermissions() {
  try {
    await sql.connect(config);
    
    console.log('\n=== Role Permissions ===');
    const permissionsResult = await sql.query('SELECT * FROM role_permissions ORDER BY role, permission');
    permissionsResult.recordset.forEach(row => {
      console.log(`${row.role}: ${row.permission}`);
    });
    
    console.log('\n=== Current User Info ===');
    const userResult = await sql.query(`
      SELECT id, username, email, role, active 
      FROM chat_Users 
      WHERE email = 'mti.admin@merdekabattery.com' OR role = 'superadmin'
      ORDER BY role DESC
    `);
    userResult.recordset.forEach(row => {
      console.log(`ID: ${row.id}, Username: ${row.username}, Email: ${row.email}, Role: ${row.role}, Active: ${row.active}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sql.close();
  }
}

checkPermissions();