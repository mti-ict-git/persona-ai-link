const axios = require('axios');

// Test RBAC with a sample token
// You'll need to replace this with your actual JWT token from the browser
const testToken = 'YOUR_JWT_TOKEN_HERE';

async function testRBAC() {
  try {
    console.log('Testing RBAC with admin endpoints...');
    
    // Test /api/admin/users endpoint
    console.log('\n=== Testing /api/admin/users ===');
    const usersResponse = await axios.get('http://localhost:3001/api/admin/users', {
      headers: {
        'Authorization': `Bearer ${testToken}`
      }
    });
    console.log('Users endpoint response:', usersResponse.status);
    
    // Test /api/admin/stats endpoint
    console.log('\n=== Testing /api/admin/stats ===');
    const statsResponse = await axios.get('http://localhost:3001/api/admin/stats', {
      headers: {
        'Authorization': `Bearer ${testToken}`
      }
    });
    console.log('Stats endpoint response:', statsResponse.status);
    
  } catch (error) {
    console.error('Error testing RBAC:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
  }
}

// Instructions for getting the token
console.log('To test RBAC:');
console.log('1. Open browser dev tools (F12)');
console.log('2. Go to Application/Storage > Local Storage');
console.log('3. Find the "token" key and copy its value');
console.log('4. Replace YOUR_JWT_TOKEN_HERE in this file with the actual token');
console.log('5. Run: node test-rbac.js');
console.log('\nAlternatively, check the backend logs when you access the admin page in the browser.');

// Uncomment the line below and add your token to run the test
// testRBAC();