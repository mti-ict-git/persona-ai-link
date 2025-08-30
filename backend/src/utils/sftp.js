const SftpClient = require('ssh2-sftp-client');
const path = require('path');
const fs = require('fs');

// SFTP Configuration from environment variables
const SFTP_CONFIG = {
  host: process.env.SFTP_HOST || '10.60.10.44',
  username: process.env.SFTP_USERNAME || 'it.support',
  password: process.env.SFTP_PASSWORD || 'T$1ngsh4n@24',
  port: parseInt(process.env.SFTP_PORT) || 22,
  readyTimeout: 20000,
  retries: 2
};

/**
 * Create SFTP connection
 * @returns {Promise<SftpClient>} SFTP client instance
 */
async function createSftpConnection() {
  const sftp = new SftpClient();
  try {
    await sftp.connect(SFTP_CONFIG);
    console.log('SFTP connection established successfully');
    return sftp;
  } catch (error) {
    console.error('SFTP connection failed:', error.message);
    throw error;
  }
}

/**
 * Upload file to SFTP server
 * @param {string} localFilePath - Local file path
 * @param {string} remoteFilePath - Remote file path on SFTP server
 * @returns {Promise<boolean>} Success status
 */
async function uploadFileToSftp(localFilePath, remoteFilePath) {
  let sftp = null;
  try {
    // Check if local file exists
    if (!fs.existsSync(localFilePath)) {
      throw new Error(`Local file does not exist: ${localFilePath}`);
    }

    // Create SFTP connection
    sftp = await createSftpConnection();

    // Ensure remote directory exists
    const remoteDir = path.dirname(remoteFilePath).replace(/\\/g, '/');
    try {
      await sftp.mkdir(remoteDir, true);
    } catch (mkdirError) {
      // Directory might already exist, continue
      console.log(`Remote directory handling: ${mkdirError.message}`);
    }

    // Upload file
    await sftp.put(localFilePath, remoteFilePath);
    console.log(`File uploaded successfully: ${localFilePath} -> ${remoteFilePath}`);
    
    return true;
  } catch (error) {
    console.error('SFTP upload failed:', error.message);
    throw error;
  } finally {
    if (sftp) {
      try {
        await sftp.end();
      } catch (closeError) {
        console.error('Error closing SFTP connection:', closeError.message);
      }
    }
  }
}

/**
 * Test SFTP connection
 * @returns {Promise<boolean>} Connection test result
 */
async function testSftpConnection() {
  let sftp = null;
  try {
    sftp = await createSftpConnection();
    const list = await sftp.list('.');
    console.log('SFTP connection test successful. Remote directory listing:', list.length, 'items');
    return true;
  } catch (error) {
    console.error('SFTP connection test failed:', error.message);
    return false;
  } finally {
    if (sftp) {
      try {
        await sftp.end();
      } catch (closeError) {
        console.error('Error closing SFTP connection:', closeError.message);
      }
    }
  }
}

/**
 * Delete file from SFTP server
 * @param {string} remoteFilePath - Remote file path on SFTP server
 * @returns {Promise<boolean>} Success status
 */
async function deleteFileFromSftp(remoteFilePath) {
  let sftp = null;
  try {
    // Create SFTP connection
    sftp = await createSftpConnection();

    // Check if remote file exists
    try {
      await sftp.stat(remoteFilePath);
    } catch (statError) {
      console.warn(`Remote file does not exist: ${remoteFilePath}`);
      return true; // Consider it successful if file doesn't exist
    }

    // Delete file
    await sftp.delete(remoteFilePath);
    console.log(`File deleted successfully from SFTP: ${remoteFilePath}`);
    
    return true;
  } catch (error) {
    console.error('SFTP delete failed:', error.message);
    throw error;
  } finally {
    if (sftp) {
      try {
        await sftp.end();
      } catch (closeError) {
        console.error('Error closing SFTP connection:', closeError.message);
      }
    }
  }
}

/**
 * Generate remote file path for uploaded file
 * @param {string} filename - Original filename
 * @returns {string} Remote file path
 */
function generateRemoteFilePath(filename) {
  const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const uploadPath = process.env.SFTP_UPLOAD_PATH || '/uploads';
  return `${uploadPath}/${timestamp}/${filename}`;
}

module.exports = {
  uploadFileToSftp,
  deleteFileFromSftp,
  testSftpConnection,
  generateRemoteFilePath,
  createSftpConnection
};