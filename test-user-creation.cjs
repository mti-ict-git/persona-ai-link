const jwt = require('jsonwebtoken');
const http = require('http');

// Generate a valid JWT token for the admin user
const token = jwt.sign(
  {
    id: 1002,
    userId: 1002,
    email: 'mti.admin@merdekabattery.com'
  },
  'mti-ai-chatbot-jwt-secret-key-2025-secure'
);

console.log('Generated JWT Token:', token);

// Test user creation
const testUserCreation = () => {
  const postData = JSON.stringify({
    username: 'test.user',
    email: 'test.user@merdekabattery.com',
    password: 'P@ssw0rd.123',
    role: 'user'
  });

  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/admin/users',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const jsonData = JSON.parse(data);
        if (res.statusCode === 200 || res.statusCode === 201) {
          console.log('✅ User creation successful!');
          console.log('Response:', jsonData);
        } else {
          console.log('❌ User creation failed!');
          console.log('Status:', res.statusCode);
          console.log('Error:', jsonData);
        }
      } catch (error) {
        console.log('❌ Failed to parse response!');
        console.log('Status:', res.statusCode);
        console.log('Raw response:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.log('❌ Request failed!');
    console.log('Error:', error.message);
  });

  req.write(postData);
   req.end();
 };

testUserCreation();