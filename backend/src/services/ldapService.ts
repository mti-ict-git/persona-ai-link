import { Client } from 'ldapts';
import jwt from 'jsonwebtoken';
import { dbManager } from '../utils/database';

export interface LDAPUser {
  username: string;
  displayName: string;
  email: string;
  department?: string;
  title?: string;
  distinguishedName: string;
  employeeId?: string | null;
}

export interface LDAPEntry {
  dn: string;
  sAMAccountName?: string | string[];
  displayName?: string | string[];
  mail?: string | string[];
  department?: string | string[];
  title?: string | string[];
  employeeID?: string | string[];
  employeeNumber?: string | string[];
  employeeId?: string | string[];
  [key: string]: unknown;
}

export interface DatabaseUser {
  id: number;
  username: string;
  email: string;
  displayName?: string;
  department?: string;
  title?: string;
  employeeId?: string;
  distinguishedName?: string;
}

export interface LDAPAuthResult {
  success: boolean;
  user?: LDAPUser;
  error?: string;
  token?: string;
}

class LDAPService {
  private client: Client;
  private bindDN: string;
  private bindPassword: string;
  private baseDN: string;

  constructor() {
    this.client = new Client({
      url: process.env.LDAP_URL || 'ldaps://10.60.10.56:636',
      timeout: parseInt(process.env.LDAP_TIMEOUT || '30000'),
      connectTimeout: parseInt(process.env.LDAP_CONNECT_TIMEOUT || '15000'),
      tlsOptions: {
        rejectUnauthorized: false
      }
    });
    
    this.bindDN = process.env.LDAP_BIND_DN || '';
    this.bindPassword = process.env.LDAP_BIND_PASSWORD || '';
    this.baseDN = process.env.LDAP_BASE_DN || 'DC=mbma,DC=com';
  }

  /**
   * Extract employee ID from LDAP user data
   * Handles various LDAP attribute names and ensures the value satisfies database constraints
   * Returns null if no valid employee ID is found (satisfies CHECK constraint: employeeId IS NULL OR LEN(TRIM(employeeId)) > 0)
   */
  private extractEmployeeId(userEntry: LDAPEntry): string | null {
    const employeeId = userEntry.employeeID || userEntry.employeeNumber || userEntry.employeeId;
    
    if (employeeId) {
      // Handle array values (some LDAP attributes return arrays)
      const value = Array.isArray(employeeId) ? employeeId[0] : employeeId;
      const trimmedValue = String(value).trim();
      return trimmedValue.length > 0 ? trimmedValue : null;
    }
    
    return null;
  }

  /**
   * Create or update local user in database
   */
  private async createOrUpdateLocalUser(ldapUserData: LDAPUser): Promise<DatabaseUser> {
    try {
      const pool = await dbManager.getConnection();
      
      if (!pool) {
        throw new Error('Database connection failed');
      }
      
      // Sanitize and validate input data
      const sanitizedData = {
        username: (ldapUserData.username || '').toString().trim(),
        email: (ldapUserData.email || '').toString().trim().toLowerCase(),
        firstName: (ldapUserData.displayName || '').toString().trim().split(' ')[0] || '',
        lastName: (ldapUserData.displayName || '').toString().trim().split(' ').slice(1).join(' ') || '',
        employeeId: ldapUserData.employeeId || null
      };

      // Convert empty strings to null for employeeId to satisfy CHECK constraint
      if (sanitizedData.employeeId === '') {
        sanitizedData.employeeId = null;
      }

      // Validate required fields
      if (!sanitizedData.username) {
        throw new Error('Username is required');
      }

      if (!sanitizedData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedData.email)) {
        throw new Error('Valid email is required');
      }

      console.log('Sanitized user data:', sanitizedData);

      // Check if user exists
      const userCheckResult = await pool.request()
        .input('username', sanitizedData.username)
        .query('SELECT id, username, email FROM chat_Users WHERE username = @username');

      if (userCheckResult.recordset.length > 0) {
        // Update existing user
        const updateResult = await pool.request()
          .input('email', sanitizedData.email)
          .input('firstName', sanitizedData.firstName)
          .input('lastName', sanitizedData.lastName)
          .input('employeeId', sanitizedData.employeeId)
          .input('username', sanitizedData.username)
          .query(`
            UPDATE chat_Users 
            SET email = @email, firstName = @firstName, lastName = @lastName, employeeId = @employeeId, updatedAt = GETDATE()
            WHERE username = @username
          `);

        return userCheckResult.recordset[0];
      } else {
        // Create new user
        const insertResult = await pool.request()
          .input('username', sanitizedData.username)
          .input('email', sanitizedData.email)
          .input('firstName', sanitizedData.firstName)
          .input('lastName', sanitizedData.lastName)
          .input('employeeId', sanitizedData.employeeId)
          .query(`
            INSERT INTO chat_Users (username, email, firstName, lastName, employeeId, createdAt, updatedAt)
            OUTPUT INSERTED.id, INSERTED.username, INSERTED.email
            VALUES (@username, @email, @firstName, @lastName, @employeeId, GETDATE(), GETDATE())
          `);

        return insertResult.recordset[0];
      }
    } catch (error) {
      console.error('Database operation failed:', error);
      throw error;
    }
  }

  /**
   * Generate JWT token for user
   */
  private generateToken(user: DatabaseUser): string {
    const payload = {
      id: user.id,
      username: user.username,
      email: user.email
    };

    return jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key', {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });
  }

  /**
   * Authenticate user against Active Directory by email
   */
  async authenticateUserByEmail(email: string, password: string): Promise<LDAPAuthResult> {
    try {
      // First, bind with service account to search for user
      await this.client.bind(this.bindDN, this.bindPassword);
      
      // Search for user by email (mail attribute)
      const searchOptions = {
        scope: 'sub' as const,
        filter: `(mail=${email})`,
        attributes: [
          'sAMAccountName',
          'displayName', 
          'mail',
          'department',
          'title',
          'distinguishedName',
          'employeeID',
          'employeeNumber',
          'employeeId'
        ],
        sizeLimit: 10,
        timeLimit: 30
      };
      
      const searchResult = await this.client.search(this.baseDN, searchOptions);
      
      if (!searchResult.searchEntries || searchResult.searchEntries.length === 0) {
        await this.client.unbind();
        return {
          success: false,
          error: 'User not found in Active Directory'
        };
      }
      
      const userEntry = searchResult.searchEntries[0];
      const userDN = userEntry.dn;
      
      // Unbind service account
      await this.client.unbind();
      
      // Try to bind with user credentials to verify password
      const userClient = new Client({
        url: process.env.LDAP_URL || 'ldaps://10.60.10.56:636',
        timeout: parseInt(process.env.LDAP_TIMEOUT || '30000'),
        connectTimeout: parseInt(process.env.LDAP_CONNECT_TIMEOUT || '15000'),
        tlsOptions: {
          rejectUnauthorized: false
        }
      });
      
      try {
        await userClient.bind(userDN, password);
        await userClient.unbind();
        
        // Authentication successful, prepare user data
        const ldapEntry = userEntry as LDAPEntry;
        const getStringValue = (value: string | string[] | undefined): string => {
          if (!value) return '';
          return Array.isArray(value) ? (value[0] || '') : value;
        };

        const ldapUser: LDAPUser = {
          username: getStringValue(ldapEntry.sAMAccountName).trim(),
          displayName: (getStringValue(ldapEntry.displayName) || email).trim(),
          email: (getStringValue(ldapEntry.mail) || email).trim(),
          department: getStringValue(ldapEntry.department) || undefined,
          title: getStringValue(ldapEntry.title) || undefined,
          distinguishedName: ldapEntry.dn,
          employeeId: this.extractEmployeeId(ldapEntry)
        };

        // Create or update user in local database
        const localUser = await this.createOrUpdateLocalUser(ldapUser);
        
        // Generate JWT token
        const token = this.generateToken(localUser);
        
        return {
          success: true,
          user: ldapUser,
          token
        };
        
      } catch (bindError) {
        await userClient.unbind();
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }
      
    } catch (error) {
      console.error('LDAP Email Authentication Error:', error);
      
      try {
        await this.client.unbind();
      } catch (unbindError) {
        // Ignore unbind errors
      }
      
      return {
        success: false,
        error: 'LDAP connection failed'
      };
    }
  }

  /**
   * Authenticate user against Active Directory
   */
  async authenticateUser(username: string, password: string): Promise<LDAPAuthResult> {
    try {
      // First, bind with service account to search for user
      await this.client.bind(this.bindDN, this.bindPassword);
      
      // Search for user by sAMAccountName (username)
      const searchOptions = {
        scope: 'sub' as const,
        filter: `(sAMAccountName=${username})`,
        attributes: [
          'sAMAccountName',
          'displayName', 
          'mail',
          'department',
          'title',
          'distinguishedName',
          'employeeID',
          'employeeNumber',
          'employeeId'
        ],
        sizeLimit: 10,
        timeLimit: 30
      };
      
      const searchResult = await this.client.search(this.baseDN, searchOptions);
      
      if (!searchResult.searchEntries || searchResult.searchEntries.length === 0) {
        await this.client.unbind();
        return {
          success: false,
          error: 'User not found in Active Directory'
        };
      }
      
      const userEntry = searchResult.searchEntries[0];
      const userDN = userEntry.dn;
      
      // Unbind service account
      await this.client.unbind();
      
      // Try to bind with user credentials to verify password
      const userClient = new Client({
        url: process.env.LDAP_URL || 'ldaps://10.60.10.56:636',
        timeout: parseInt(process.env.LDAP_TIMEOUT || '30000'),
        connectTimeout: parseInt(process.env.LDAP_CONNECT_TIMEOUT || '15000'),
        tlsOptions: {
          rejectUnauthorized: false
        }
      });
      
      try {
        await userClient.bind(userDN, password);
        await userClient.unbind();
        
        // Authentication successful, prepare user data
        const ldapEntry = userEntry as LDAPEntry;
        const getStringValue = (value: string | string[] | undefined): string => {
          if (!value) return '';
          return Array.isArray(value) ? (value[0] || '') : value;
        };

        const ldapUser: LDAPUser = {
          username: getStringValue(ldapEntry.sAMAccountName).trim(),
          displayName: (getStringValue(ldapEntry.displayName) || username).trim(),
          email: getStringValue(ldapEntry.mail).trim(),
          department: getStringValue(ldapEntry.department) || undefined,
          title: getStringValue(ldapEntry.title) || undefined,
          distinguishedName: ldapEntry.dn,
          employeeId: this.extractEmployeeId(ldapEntry)
        };

        // Create or update user in local database
        const localUser = await this.createOrUpdateLocalUser(ldapUser);
        
        // Generate JWT token
        const token = this.generateToken(localUser);
        
        return {
          success: true,
          user: ldapUser,
          token
        };
        
      } catch (bindError) {
        await userClient.unbind();
        return {
          success: false,
          error: 'Invalid username or password'
        };
      }
      
    } catch (error) {
      console.error('LDAP Authentication Error:', error);
      
      try {
        await this.client.unbind();
      } catch (unbindError) {
        // Ignore unbind errors
      }
      
      return {
        success: false,
        error: 'LDAP connection failed'
      };
    }
  }

  /**
   * Search for users in Active Directory
   */
  async searchUsers(searchTerm: string): Promise<LDAPUser[]> {
    try {
      await this.client.bind(this.bindDN, this.bindPassword);
      
      const searchOptions = {
        scope: 'sub' as const,
        filter: `(|(sAMAccountName=*${searchTerm}*)(displayName=*${searchTerm}*)(mail=*${searchTerm}*))`,
        attributes: [
          'sAMAccountName',
          'displayName',
          'mail',
          'department',
          'title',
          'distinguishedName',
          'employeeID',
          'employeeNumber',
          'employeeId'
        ],
        sizeLimit: 50,
        timeLimit: 30
      };
      
      const searchResult = await this.client.search(this.baseDN, searchOptions);
      await this.client.unbind();
      
      if (!searchResult.searchEntries) {
        return [];
      }
      
      return searchResult.searchEntries.map((entry): LDAPUser => {
        const ldapEntry = entry as LDAPEntry;
        const getStringValue = (value: string | string[] | undefined): string => {
          if (!value) return '';
          return Array.isArray(value) ? (value[0] || '') : value;
        };

        return {
          username: getStringValue(ldapEntry.sAMAccountName).trim(),
          displayName: (getStringValue(ldapEntry.displayName) || getStringValue(ldapEntry.sAMAccountName)).trim(),
          email: getStringValue(ldapEntry.mail).trim(),
          department: getStringValue(ldapEntry.department) || undefined,
          title: getStringValue(ldapEntry.title) || undefined,
          distinguishedName: ldapEntry.dn,
          employeeId: this.extractEmployeeId(ldapEntry)
        };
      });
      
    } catch (error) {
      console.error('LDAP Search Error:', error);
      
      try {
        await this.client.unbind();
      } catch (unbindError) {
        // Ignore unbind errors
      }
      
      return [];
    }
  }

  /**
   * Test LDAP connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.client.bind(this.bindDN, this.bindPassword);
      await this.client.unbind();
      return true;
    } catch (error) {
      console.error('LDAP Connection Test Failed:', error);
      return false;
    }
  }
}

export { LDAPService };
export const ldapService = new LDAPService();
export default ldapService;