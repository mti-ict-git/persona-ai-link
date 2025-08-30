require('dotenv').config();
const { deleteFileFromSftp, generateRemoteFilePath, uploadFileToSftp } = require('./src/utils/sftp');
const fs = require('fs');
const path = require('path');

async function testSftpDelete() {
  console.log('Testing SFTP delete functionality...');
  
  const testFileName = 'sftp-delete-test.txt';
  const testFilePath = path.join(__dirname, testFileName);
  
  try {
    // Create a test file
    fs.writeFileSync(testFilePath, 'This is a test file for SFTP delete functionality.');
    console.log(`Test file created: ${testFilePath}`);
    
    // Generate remote path
    const remoteFilePath = generateRemoteFilePath(testFileName);
    console.log(`Remote path: ${remoteFilePath}`);
    
    // Upload file to SFTP
    console.log('Uploading file to SFTP...');
    await uploadFileToSftp(testFilePath, remoteFilePath);
    console.log('File uploaded successfully');
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Delete file from SFTP
    console.log('Deleting file from SFTP...');
    await deleteFileFromSftp(remoteFilePath);
    console.log('File deleted successfully from SFTP');
    
    // Test deleting non-existent file (should not throw error)
    console.log('Testing deletion of non-existent file...');
    await deleteFileFromSftp('/non-existent/path/file.txt');
    console.log('Non-existent file deletion handled gracefully');
    
    console.log('\n✅ SFTP delete test completed successfully!');
    
  } catch (error) {
    console.error('❌ SFTP delete test failed:', error.message);
    process.exit(1);
  } finally {
    // Clean up local test file
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
      console.log('Local test file cleaned up');
    }
  }
}

// Run the test
testSftpDelete();