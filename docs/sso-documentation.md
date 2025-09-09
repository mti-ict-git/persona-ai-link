# SharePoint SSO Integration Documentation

## Overview

This document provides comprehensive documentation for the SharePoint Single Sign-On (SSO) integration implemented in the Persona AI Link application. The SSO system enables users to authenticate through SharePoint and access the chatbot application seamlessly.

## Architecture

### Components

1. **Frontend SSO Callback** (`src/pages/SSOCallback.tsx`)
2. **Backend SSO Routes** (`backend/src/routes/sso.js`)
3. **Redis Token Service** (`backend/src/services/redisService.js`)
4. **Database Integration** (SQL Server)
5. **JWT Authentication** (httpOnly cookies)

### Technology Stack

- **Frontend**: React, TypeScript, Vite
- **Backend**: Node.js, Express.js
- **Database**: SQL Server
- **Cache**: Redis
- **Authentication**: JWT tokens
- **Security**: httpOnly cookies, rate limiting

## SSO Flow

### 1. SSO Initiation

**Endpoint**: `POST /api/sso/start`

```javascript
// Rate limited: 10 requests per 15 minutes per IP
router.post('/start', ssoStartLimiter, async (req, res) => {
  // Validates email format and company domain
  // Generates temporary SSO token
  // Stores token in Redis with 10-minute expiration
  // Returns SharePoint redirect URL
});
```

**Process**:
1. User provides email address
2. System validates email format and company domain
3. Generates temporary SSO token (UUID)
4. Stores token in Redis with user email (10-minute TTL)
5. Returns SharePoint authentication URL with token

### 2. SharePoint Authentication

**External Process**:
1. User is redirected to SharePoint
2. SharePoint handles authentication
3. SharePoint redirects back with authorization code
4. Redirect URL: `{FRONTEND_URL}/sso/callback?code={auth_code}`

### 3. SSO Callback Processing

**Frontend** (`src/pages/SSOCallback.tsx`):
```typescript
if (code) {
  // Redirect to backend to process the code and set JWT cookie
  window.location.href = `/api/sso/continue?code=${code}`;
  return;
}
```

**Backend** (`GET /api/sso/continue`):
1. Validates authorization code from SharePoint
2. Retrieves user email from Redis token
3. Looks up existing LDAP user in database
4. Updates last login timestamp
5. Generates JWT token with user data
6. Sets httpOnly cookie
7. Redirects to frontend with success parameter

### 4. Authentication Completion

**Frontend**:
1. Receives success parameter
2. Refreshes user context
3. Redirects to dashboard
4. User is now authenticated

## Database Schema

### Users Table

```sql
SELECT id, username, email, role, authMethod 
FROM chat_Users 
WHERE email = @email AND authMethod = 'ldap'
```

**Required Fields**:
- `id`: Unique user identifier
- `username`: User's username
- `email`: User's email address
- `role`: User's role (user, admin, superadmin)
- `authMethod`: Must be 'ldap' for SSO users
- `last_login`: Updated on successful SSO

## Security Implementation

### Rate Limiting

```javascript
const ssoStartLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: {
    error: 'Too many SSO requests from this IP, please try again later.'
  }
});
```

### Token Security

- **SSO Tokens**: UUID v4, 10-minute expiration in Redis
- **JWT Tokens**: Signed with JWT_SECRET, 24-hour expiration
- **httpOnly Cookies**: Secure, not accessible via JavaScript

### Email Validation

```javascript
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isCompanyEmail(email) {
  const companyDomains = [
    'mti.co.id',
    'tsindeka.com'
  ];
  return companyDomains.some(domain => email.toLowerCase().endsWith(`@${domain}`));
}
```

### Secure Logging

- No sensitive data (emails, tokens, user details) logged
- Generic status messages for operational visibility
- Production-safe logging practices

## Configuration

### Environment Variables

**Backend** (`.env`):
```bash
# JWT Configuration
JWT_SECRET=your-secret-key-change-this-in-production
JWT_EXPIRES_IN=24h

# Frontend URL for redirects
FRONTEND_URL=http://localhost:8090

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Database Configuration
DB_SERVER=localhost
DB_DATABASE=PersonaAI
DB_USER=your-db-user
DB_PASSWORD=your-db-password
```

### SharePoint Configuration

SharePoint must be configured to redirect to:
```
{FRONTEND_URL}/sso/callback?code={authorization_code}
```

## API Endpoints

### POST /api/sso/start

**Request**:
```json
{
  "email": "user@mti.co.id"
}
```

**Response**:
```json
{
  "redirectUrl": "https://sharepoint.com/auth?token=uuid-token",
  "message": "SSO initiated successfully"
}
```

**Error Responses**:
- `400`: Invalid email format
- `403`: Email domain not allowed
- `500`: Redis connection error
- `429`: Rate limit exceeded

### GET /api/sso/continue

**Query Parameters**:
- `code`: Authorization code from SharePoint

**Success**: Redirects to `{FRONTEND_URL}/sso/callback?success=true`
**Error**: Redirects to `{FRONTEND_URL}/login?error={error_type}`

**Error Types**:
- `invalid_code`: Missing authorization code
- `expired_code`: SSO token expired or invalid
- `service_unavailable`: Redis connection error
- `configuration_error`: Missing JWT_SECRET

### GET /api/sso/status

**Response**:
```json
{
  "sso": {
    "enabled": true,
    "redis_connected": true
  }
}
```

## Limitations

### 1. Existing LDAP User Requirement

**Critical Limitation**: Users must have logged in via LDAP at least once before using SSO.

**Reason**: The system only looks up existing LDAP users:
```javascript
let user = await pool.request()
  .input('email', sql.NVarChar, email)
  .query('SELECT id, username, email, role, authMethod FROM chat_Users WHERE email = @email AND authMethod = \'ldap\'');

if (user.recordset.length === 0) {
  return res.status(404).json({ 
    error: 'LDAP user not found. Please ensure you have logged in via LDAP at least once before using SharePoint SSO.' 
  });
}
```

**Impact**: New users cannot use SSO directly and must first authenticate through regular LDAP login.

### 2. Company Domain Restriction

SSO is restricted to specific company domains:
- `mti.co.id`
- `tsindeka.com`

### 3. Redis Dependency

SSO functionality requires Redis for token storage. If Redis is unavailable:
- SSO initiation fails
- Users are redirected to login with service unavailable error

## Error Handling

### Frontend Error Handling

```typescript
// SSOCallback.tsx
const error = searchParams.get('error');
if (error) {
  switch (error) {
    case 'invalid_code':
      setMessage('Invalid SSO code. Please try again.');
      break;
    case 'expired_code':
      setMessage('SSO session expired. Please try again.');
      break;
    case 'service_unavailable':
      setMessage('SSO service temporarily unavailable.');
      break;
    default:
      setMessage('SSO authentication failed.');
  }
}
```

### Backend Error Logging

- All errors logged with context but no sensitive data
- Redis connection status monitored
- Database connection errors handled gracefully
- Rate limiting violations logged

## Monitoring and Debugging

### Log Patterns

**SSO Start**:
```
[SSO START] SSO initiation request received
[SSO START] Email validation completed
[SSO START] Redis status: connected
[SSO START] SSO token generated and stored
[SSO START] SSO initiated successfully
```

**SSO Continue**:
```
[SSO CONTINUE] Processing continue request
[SSO CONTINUE] Token validation result: valid
[SSO CONTINUE] User lookup result: 1 users found
[SSO CONTINUE] JWT token generated
[SSO CONTINUE] SSO authentication completed successfully
```

### Health Checks

- Redis connection status: `GET /api/sso/status`
- Database connectivity verified during user lookup
- JWT secret configuration validated

## Deployment Considerations

### Production Security

1. **JWT Secret**: Use strong, randomly generated JWT_SECRET
2. **HTTPS**: Ensure all communications use HTTPS
3. **Cookie Security**: httpOnly cookies with secure flag
4. **Rate Limiting**: Monitor and adjust rate limits as needed
5. **Redis Security**: Secure Redis instance with authentication

### Scaling

- Redis can be clustered for high availability
- Multiple backend instances can share Redis state
- Database connection pooling for performance

### Monitoring

- Monitor SSO success/failure rates
- Track Redis connection health
- Monitor rate limiting violations
- Database query performance

## Future Enhancements

### 1. Auto-User Creation

Implement automatic user creation for new SSO users:
```javascript
// If user not found, create new LDAP user
if (user.recordset.length === 0) {
  const newUser = await createLDAPUser(email);
  // Continue with authentication
}
```

### 2. Enhanced Error Handling

- More granular error codes
- User-friendly error messages
- Retry mechanisms for transient failures

### 3. Audit Logging

- Comprehensive audit trail for SSO events
- User activity tracking
- Security event monitoring

### 4. Multi-Domain Support

- Dynamic domain configuration
- Per-domain SSO settings
- Domain-specific user roles

## Troubleshooting

### Common Issues

1. **"LDAP user not found" Error**
   - **Cause**: User hasn't logged in via LDAP before
   - **Solution**: User must first authenticate through regular LDAP login

2. **"Service unavailable" Error**
   - **Cause**: Redis connection failure
   - **Solution**: Check Redis service status and configuration

3. **"Configuration error" Error**
   - **Cause**: Missing JWT_SECRET environment variable
   - **Solution**: Set JWT_SECRET in backend environment

4. **Rate Limiting**
   - **Cause**: Too many SSO requests from same IP
   - **Solution**: Wait 15 minutes or adjust rate limits

### Debug Steps

1. Check Redis connectivity: `GET /api/sso/status`
2. Verify environment variables are set
3. Check database user exists with authMethod='ldap'
4. Monitor backend logs for detailed error information
5. Verify SharePoint redirect URL configuration

---

**Last Updated**: 2025-09-09  
**Version**: 1.0  
**Author**: AI Coder  
**Status**: Production Ready (with limitations)