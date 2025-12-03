# Multi-User GitHub OAuth Deployment Guide

This guide explains how to deploy your application for multiple users with GitHub OAuth authentication.

## 🎯 **Overview**

Your application is now configured for multi-user access where:
- Each user authenticates with their own GitHub account
- No personal access tokens are required
- Users can only access their own repositories
- Sessions are managed securely

## 🔧 **Development Setup**

### 1. Create GitHub OAuth Application

1. Go to [GitHub Developer Settings](https://github.com/settings/applications/new)
2. Fill in the application details:
   - **Application name**: `Your App Name`
   - **Homepage URL**: `http://localhost:3000` (for development)
   - **Application description**: `Multi-user GitHub repository manager`
   - **Authorization callback URL**: `http://localhost:5000/auth/github/callback`

3. Click "Register application"
4. Copy the **Client ID** and generate a **Client Secret**

### 2. Configure Environment Variables

Update your `backend/.env` file:

```env
# GitHub OAuth Configuration
GITHUB_CLIENT_ID=your_actual_client_id_here
GITHUB_CLIENT_SECRET=your_actual_client_secret_here

# Session Security (generate a secure random string)
SESSION_SECRET=your_super_secure_random_string_here

# Server Configuration
PORT=5000
APP_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000
```

### 3. Generate Secure Session Secret

Use one of these methods to generate a secure session secret:

**Option A: Node.js**
```javascript
require('crypto').randomBytes(64).toString('hex')
```

**Option B: Online Generator**
Visit: https://www.allkeysgenerator.com/Random/Security-Encryption-Key-Generator.aspx

**Option C: Command Line**
```bash
openssl rand -hex 64
```

## 🚀 **Production Deployment**

### 1. Update GitHub OAuth App for Production

1. Go to your GitHub OAuth app settings
2. Update the URLs:
   - **Homepage URL**: `https://yourdomain.com`
   - **Authorization callback URL**: `https://yourdomain.com/auth/github/callback`

### 2. Production Environment Variables

```env
# GitHub OAuth Configuration
GITHUB_CLIENT_ID=your_production_client_id
GITHUB_CLIENT_SECRET=your_production_client_secret

# Session Security
SESSION_SECRET=your_production_session_secret

# Server Configuration
PORT=5000
NODE_ENV=production

# Production URLs
APP_URL=https://yourdomain.com
BACKEND_URL=https://api.yourdomain.com
```

### 3. Security Considerations

- **HTTPS Required**: Always use HTTPS in production
- **Secure Cookies**: Set `cookie.secure = true` in session config
- **Environment Variables**: Never commit secrets to version control
- **Session Duration**: Consider shorter session timeouts for sensitive applications
- **CORS Configuration**: Restrict CORS to your specific domain

### 4. Deployment Platforms

#### **Heroku**
```bash
heroku config:set GITHUB_CLIENT_ID=your_client_id
heroku config:set GITHUB_CLIENT_SECRET=your_client_secret
heroku config:set SESSION_SECRET=your_session_secret
```

#### **Vercel/Netlify**
Add environment variables in your platform's dashboard.

#### **Docker**
```dockerfile
ENV GITHUB_CLIENT_ID=your_client_id
ENV GITHUB_CLIENT_SECRET=your_client_secret
ENV SESSION_SECRET=your_session_secret
```

## 👥 **Multi-User Features**

### User Isolation
- Each user's session is completely isolated
- Users can only access their own GitHub repositories
- No shared state between users

### Session Management
- 7-day session duration for better UX
- Automatic session cleanup
- Secure session storage

### Authentication Flow
1. User visits your application
2. Clicks "Login with GitHub"
3. Redirected to GitHub for authentication
4. GitHub redirects back with authorization code
5. Your app exchanges code for access token
6. User is logged in and can access their repositories

## 🔒 **Security Features**

- **OAuth 2.0**: Industry-standard authentication
- **Session Security**: HTTP-only cookies with CSRF protection
- **Token Management**: Access tokens stored securely in sessions
- **No Token Exposure**: Tokens never sent to client-side
- **Automatic Expiration**: Sessions expire automatically

## 🛠 **Troubleshooting**

### Common Issues

1. **"OAuth not configured"**
   - Ensure GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are set
   - Restart the backend server after setting environment variables

2. **"Authentication failed"**
   - Check callback URL matches exactly in GitHub app settings
   - Verify client ID and secret are correct

3. **"Session expired"**
   - User needs to login again
   - Check session secret is consistent across server restarts

### Testing Multi-User Access

1. Open application in different browsers/incognito windows
2. Login with different GitHub accounts
3. Verify each user sees only their repositories
4. Test logout functionality

## 📊 **Monitoring**

Consider adding:
- User login/logout logging
- Session duration analytics
- API usage monitoring
- Error tracking for authentication failures

## 🔄 **Updates and Maintenance**

- Regularly rotate session secrets
- Monitor GitHub API rate limits
- Update OAuth scopes if needed
- Keep dependencies updated for security
