const { Client } = require('ldapts');
const sql = require('mssql');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

class LDAPService {
    constructor() {
        this.ldapUrl = process.env.LDAP_URL;
        this.baseDN = process.env.LDAP_BASE_DN;
        this.bindDN = process.env.BIND_DN;
        this.bindPassword = process.env.BIND_PW;
        this.baseOU = process.env.BASE_OU;
    }

    async authenticateUser(username, password) {
        const client = new Client({
            url: this.ldapUrl,
            timeout: 10000,
            connectTimeout: 10000,
        });

        try {
            // First, bind with service account to search for user
            await client.bind(this.bindDN, this.bindPassword);
            
            // Search for the user in Active Directory
            const searchOptions = {
                scope: 'sub',
                filter: `(|(sAMAccountName=${username})(userPrincipalName=${username})(mail=${username}))`,
                attributes: [
                    'sAMAccountName',
                    'userPrincipalName', 
                    'displayName',
                    'mail',
                    'givenName',
                    'sn',
                    'memberOf',
                    'distinguishedName'
                ]
            };

            const { searchEntries } = await client.search(this.baseOU, searchOptions);
            
            if (searchEntries.length === 0) {
                throw new Error('User not found in Active Directory');
            }

            const userEntry = searchEntries[0];
            const userDN = userEntry.distinguishedName;

            // Unbind service account
            await client.unbind();

            // Try to bind with user credentials to verify password
            const userClient = new Client({
                url: this.ldapUrl,
                timeout: 10000,
                connectTimeout: 10000,
            });

            try {
                await userClient.bind(userDN, password);
                await userClient.unbind();
            } catch (bindError) {
                throw new Error('Invalid credentials');
            }

            // Extract user information
            const userData = {
                username: userEntry.sAMAccountName || username,
                email: userEntry.mail || `${username}@mbma.com`,
                displayName: userEntry.displayName || userEntry.givenName + ' ' + userEntry.sn,
                firstName: userEntry.givenName || '',
                lastName: userEntry.sn || '',
                groups: Array.isArray(userEntry.memberOf) ? userEntry.memberOf : [userEntry.memberOf].filter(Boolean),
                distinguishedName: userEntry.distinguishedName
            };

            // Check if user exists in local database, if not create them
            const localUser = await this.createOrUpdateLocalUser(userData);
            
            return {
                success: true,
                user: localUser,
                ldapData: userData
            };

        } catch (error) {
            console.error('LDAP Authentication Error:', error.message);
            throw new Error(`Authentication failed: ${error.message}`);
        } finally {
            try {
                await client.unbind();
            } catch (e) {
                // Ignore unbind errors
            }
        }
    }

    async createOrUpdateLocalUser(ldapUserData) {
        try {
            const pool = await sql.connect();
            
            // Check if user exists
            const existingUserResult = await pool.request()
                .input('username', sql.NVarChar, ldapUserData.username)
                .input('email', sql.NVarChar, ldapUserData.email)
                .query(`
                    SELECT id, username, email, role, authMethod, createdAt, updatedAt 
                    FROM chat_Users 
                    WHERE username = @username OR email = @email
                `);

            let user;
            
            if (existingUserResult.recordset.length > 0) {
                // Update existing user
                user = existingUserResult.recordset[0];
                console.log('Existing user found:', JSON.stringify(user, null, 2));
                
                await pool.request()
                    .input('id', sql.NVarChar, user.id.toString())
                    .input('email', sql.NVarChar, ldapUserData.email)
                    .query(`
                        UPDATE chat_Users 
                        SET email = @email, 
                            authMethod = 'ldap',
                            updatedAt = GETDATE()
                        WHERE id = @id
                    `);
                    
                console.log(`Updated existing user: ${ldapUserData.username}`);
            } else {
                // Create new user
                const insertResult = await pool.request()
                    .input('username', sql.NVarChar, ldapUserData.username)
                    .input('email', sql.NVarChar, ldapUserData.email)
                    .input('passwordHash', sql.NVarChar, await bcrypt.hash('ldap_user', 10)) // Placeholder password
                    .input('role', sql.NVarChar, 'user') // Default role
                    .input('authMethod', sql.NVarChar, 'ldap')
                    .query(`
                        INSERT INTO chat_Users (username, email, passwordHash, role, authMethod, createdAt, updatedAt)
                        OUTPUT INSERTED.id, INSERTED.username, INSERTED.email, INSERTED.role, INSERTED.authMethod, INSERTED.createdAt, INSERTED.updatedAt
                        VALUES (@username, @email, @passwordHash, @role, @authMethod, GETDATE(), GETDATE())
                    `);
                    
                user = insertResult.recordset[0];
                console.log(`Created new user: ${ldapUserData.username}`);
            }

            return {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                displayName: ldapUserData.displayName,
                authMethod: 'ldap',
                created_at: user.createdAt,
                updated_at: user.updatedAt
            };
            
        } catch (error) {
            console.error('Database error in createOrUpdateLocalUser:', error);
            throw new Error('Failed to create or update local user record');
        }
    }

    async generateToken(user) {
        const payload = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            authMethod: user.authMethod || 'ldap'
        };
        
        return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });
    }

    // Method to check if LDAP is properly configured
    async testConnection() {
        const client = new Client({
            url: this.ldapUrl,
            timeout: 5000,
            connectTimeout: 5000,
        });

        try {
            await client.bind(this.bindDN, this.bindPassword);
            await client.unbind();
            return { success: true, message: 'LDAP connection successful' };
        } catch (error) {
            return { success: false, message: `LDAP connection failed: ${error.message}` };
        }
    }
}

module.exports = new LDAPService();