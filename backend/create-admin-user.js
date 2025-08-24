const { DatabaseManager } = require('./src/utils/database');
const bcrypt = require('bcrypt');

async function createAdminUser() {
  const dbManager = new DatabaseManager();
  
  try {
    await dbManager.initialize();
    const db = await dbManager.getConnection();
    
    // Check if admin user already exists
    const existingUser = await db.request()
      .input('email', 'mti.admin@merdekabattery.com')
      .query('SELECT id FROM chat_Users WHERE email = @email');
    
    if (existingUser.recordset.length > 0) {
      console.log('Admin user already exists');
      return;
    }
    
    // Hash the password
    const passwordHash = await bcrypt.hash('MTI@2024!Admin', 12);
    
    // Insert admin user
    await db.request()
      .input('username', 'mti.admin')
      .input('email', 'mti.admin@merdekabattery.com')
      .input('passwordHash', passwordHash)
      .input('firstName', 'MTI')
      .input('lastName', 'Admin')
      .input('role', 'admin')
      .query(`
        INSERT INTO chat_Users (username, email, passwordHash, firstName, lastName, role, active)
        VALUES (@username, @email, @passwordHash, @firstName, @lastName, @role, 1)
      `);
    
    console.log('Admin user created successfully!');
    console.log('Email: mti.admin@merdekabattery.com');
    console.log('Password: MTI@2024!Admin');
    
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await dbManager.close();
  }
}

createAdminUser();