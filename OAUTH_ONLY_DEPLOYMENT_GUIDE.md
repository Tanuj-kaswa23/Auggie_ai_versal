# 🚀 OAuth-Only Multi-User Deployment Guide

This guide explains how to deploy the enhanced OAuth-only GitHub CLI UI application for multiple users in production environments.

## 🎯 Key Features

- **OAuth-Only Authentication**: No personal access tokens required
- **Multi-User Support**: Each user gets their own GitHub API rate limits (5,000 requests/hour)
- **Intelligent Rate Limiting**: Automatic rate limit protection and caching
- **Session Management**: Robust session handling for concurrent users
- **Security**: Enhanced security with proper session configuration

## 📋 Prerequisites

1. **GitHub OAuth App**: Create at https://github.com/settings/applications/new
2. **Node.js**: Version 16 or higher
3. **Production Server**: Linux/Windows server with public IP
4. **Domain Name**: For HTTPS and proper OAuth callbacks
5. **SSL Certificate**: Required for production OAuth

## 🔧 Production Setup

### 1. GitHub OAuth App Configuration

Create a new OAuth App with these settings:
- **Application name**: `Your Company - Augment CLI UI`
- **Homepage URL**: `https://yourdomain.com`
- **Authorization callback URL**: `https://yourdomain.com/auth/github/callback`

### 2. Environment Configuration

Create a production `.env` file:

```env
# Production GitHub OAuth Configuration
GITHUB_CLIENT_ID=your_production_client_id
GITHUB_CLIENT_SECRET=your_production_client_secret

# Secure session configuration
SESSION_SECRET=your_super_secure_random_string_64_chars_minimum

# Production server configuration
NODE_ENV=production
PORT=5000

# Application URLs
APP_URL=https://yourdomain.com
BACKEND_URL=https://yourdomain.com

# Optional: Admin users (comma-separated GitHub usernames)
ADMIN_USERS=admin_username1,admin_username2
```

### 3. Session Store Configuration (Recommended)

For production, use Redis for session storage:

```bash
# Install Redis session store
npm install connect-redis redis

# Start Redis server
redis-server
```

Update the session configuration in `index.js`:

```javascript
const RedisStore = require('connect-redis')(session);
const redis = require('redis');
const client = redis.createClient({
  host: 'localhost',
  port: 6379,
  // Add authentication if needed
});

const sessionStore = new RedisStore({ client: client });
```

### 4. Reverse Proxy Configuration

#### Nginx Configuration

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;

    # Frontend (React app)
    location / {
        root /path/to/frontend/build;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:5000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # OAuth endpoints
    location /auth/ {
        proxy_pass http://localhost:5000/auth/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 5. Process Management

Use PM2 for production process management:

```bash
# Install PM2
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'augment-cli-ui-backend',
    script: 'index.js',
    cwd: './backend',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

# Start application
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save
pm2 startup
```

## 🔒 Security Considerations

### 1. Session Security
- Use HTTPS in production (required for secure cookies)
- Set secure session secrets (minimum 64 characters)
- Configure proper CORS origins
- Use Redis for session storage

### 2. Rate Limiting
- The application includes built-in rate limit protection
- Each user gets their own GitHub API limits (5,000/hour)
- Intelligent caching reduces API calls

### 3. Access Control
- OAuth-only authentication (no personal access tokens)
- Session-based authentication with automatic cleanup
- Optional admin user configuration

## 📊 Monitoring and Maintenance

### 1. Admin Dashboard
Access system status at: `https://yourdomain.com/admin/status`

Provides information about:
- Active users and sessions
- Rate limit usage
- Cache statistics
- System memory usage

### 2. Log Monitoring
Monitor application logs:
```bash
# View PM2 logs
pm2 logs augment-cli-ui-backend

# View specific log files
tail -f logs/combined.log
```

### 3. Health Checks
Implement health check endpoints:
- `GET /health` - Basic health check
- `GET /auth/rate-limit` - Rate limit status
- `GET /admin/status` - Detailed system status (admin only)

## 🚀 Deployment Steps

1. **Prepare Server**:
   ```bash
   # Clone repository
   git clone your-repo-url
   cd augment-cli-ui

   # Install dependencies
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. **Build Frontend**:
   ```bash
   cd frontend
   npm run build
   ```

3. **Configure Environment**:
   ```bash
   # Copy and edit environment file
   cp backend/.env.example backend/.env
   # Edit with your production values
   ```

4. **Start Services**:
   ```bash
   # Start Redis (if using)
   sudo systemctl start redis

   # Start application with PM2
   pm2 start ecosystem.config.js --env production
   ```

5. **Configure Nginx**:
   ```bash
   # Copy nginx configuration
   sudo cp nginx.conf /etc/nginx/sites-available/augment-cli-ui
   sudo ln -s /etc/nginx/sites-available/augment-cli-ui /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```

## 🔧 Troubleshooting

### Common Issues

1. **OAuth Callback Mismatch**:
   - Ensure callback URL matches exactly in GitHub OAuth app
   - Check HTTPS configuration

2. **Session Issues**:
   - Verify Redis is running (if using Redis store)
   - Check session secret configuration

3. **Rate Limit Problems**:
   - Monitor rate limits via `/auth/rate-limit` endpoint
   - Check cache configuration

4. **CORS Errors**:
   - Update CORS origins in backend configuration
   - Ensure frontend and backend URLs match

### Support

For additional support:
1. Check application logs
2. Review GitHub OAuth app settings
3. Verify environment configuration
4. Test with `/admin/status` endpoint

## 📈 Scaling Considerations

- Use Redis for session storage across multiple instances
- Implement load balancing for high traffic
- Monitor GitHub API rate limits across users
- Consider implementing request queuing for high-volume usage
