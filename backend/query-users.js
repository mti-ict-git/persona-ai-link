const { DatabaseManager } = require('./src/utils/database');

async function queryUsers() {
  const dbManager = new DatabaseManager();
  
  try {
    await dbManager.initialize();
    const db = await dbManager.getConnection();
    
    // Query all users
    const result = await db.request()
      .query('SELECT id, username, email, firstName, lastName, role, active, createdAt FROM chat_Users');
    
    console.log('Users in database:');
    console.log('==================');
    
    if (result.recordset.length === 0) {
      console.log('No users found in the database.');
    } else {
      result.recordset.forEach((user, index) => {
        console.log(`User ${index + 1}:`);
        console.log(`  ID: ${user.id}`);
        console.log(`  Username: ${user.username}`);
        console.log(`  Email: ${user.email}`);
        console.log(`  Name: ${user.firstName} ${user.lastName}`);
        console.log(`  Role: ${user.role}`);
        console.log(`  Active: ${user.active}`);
        console.log(`  Created: ${user.createdAt}`);
        console.log('---');
      });
    }
    
  } catch (error) {
    console.error('Error querying users:', error);
  } finally {
    await dbManager.close();
  }
}

queryUsers();