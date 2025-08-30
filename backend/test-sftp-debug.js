require('dotenv').config();
const { uploadFileToSftp, generateRemoteFilePath, testSftpConnection } = require('./src/utils/sftp');
const fs = require('fs');
const path = require('path');

async function debugSftpUpload() {
  console.log('=== SFTP Debug Test ===');
  
  // Test SFTP connection first
  console.log('\n1. Testing SFTP connection...');
  try {
    await testSftpConnection();
    console.log('✅ SFTP connection test passed');
  } catch (error) {
    console.error('❌ SFTP connection test failed:', error.message);
    return;
  }
  
  // Create a test file
  const testFileName = 'sftp-debug-test.txt';
  const testFilePath = path.join(__dirname, testFileName);
  const testContent = `SFTP Debug Test - ${new Date().toISOString()}`;
  
  console.log('\n2. Creating test file...');
  fs.writeFileSync(testFilePath, testContent);
  console.log(`✅ Test file created: ${testFilePath}`);
  
  // Generate remote path
  console.log('\n3. Generating remote path...');
  const remotePath = generateRemoteFilePath(testFileName);
  console.log(`📁 Remote path: ${remotePath}`);
  
  // Test file upload
  console.log('\n4. Testing file upload...');
  try {
    await uploadFileToSftp(testFilePath, remotePath);
    console.log('✅ File uploaded successfully to SFTP server');
    console.log(`📤 Uploaded to: ${remotePath}`);
  } catch (error) {
    console.error('❌ File upload failed:', error.message);
    console.error('Full error:', error);
  }
  
  // Clean up
  console.log('\n5. Cleaning up...');
  try {
    fs.unlinkSync(testFilePath);
    console.log('✅ Test file cleaned up');
  } catch (error) {
    console.log('⚠️ Could not clean up test file:', error.message);
  }
  
  console.log('\n=== Debug Test Complete ===');
}

debugSftpUpload().catch(console.error);