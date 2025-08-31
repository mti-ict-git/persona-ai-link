const jwt = require('jsonwebtoken');

// Create a test JWT token for admin user
const payload = {
  id: 1002,
  userId: 1002,
  username: 'testadmin',
  role: 'superadmin'
};

const token = jwt.sign(payload, 'mti-ai-chatbot-jwt-secret-key-2025-secure', { expiresIn: '1h' });
console.log('Generated JWT token:', token);

// Test user creation
const testUserCreation = async () => {
  try {
    const response = await fetch('http://localhost:3001/api/admin/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        username: 'testuser123',
        email: 'testuser123@example.com',
        password: 'TestPassword123!',
        role: 'user'
      })
    });

    const result = await response.text();
    console.log('Response status:', response.status);
    console.log('Response body:', result);

    if (response.ok) {
      console.log('✅ User creation successful!');
    } else {
      console.log('❌ User creation failed');
    }
  } catch (error) {
    console.error('Error testing user creation:', error.message);
  }
};

testUserCreation();