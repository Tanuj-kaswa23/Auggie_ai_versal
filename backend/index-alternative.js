/**
 * Alternative Server Implementation with Custom OAuth
 * 
 * This version uses custom OAuth implementation to bypass
 * passport-github2 rate limit issues.
 */

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const CustomGitHubOAuth = require('./custom-oauth');
require('dotenv').config();

const app = express();
const oauth = new CustomGitHubOAuth();

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());

// Session configuration
const isProduction = process.env.NODE_ENV === 'production';
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    sameSite: isProduction ? 'strict' : 'lax'
  },
  name: 'github-auth-session'
}));

// Custom OAuth routes
app.get('/auth/github', (req, res) => {
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    return res.status(500).json({ error: 'GitHub OAuth not configured' });
  }

  console.log('🔄 Initiating GitHub OAuth flow...');
  const authUrl = oauth.getAuthorizationUrl();
  res.redirect(authUrl);
});

app.get('/auth/github/callback', async (req, res) => {
  const { code, error, error_description } = req.query;

  if (error) {
    console.error('❌ OAuth error:', error, error_description);
    return res.redirect(`http://localhost:3000?auth=failed&error=${error}`);
  }

  if (!code) {
    console.error('❌ No authorization code received');
    return res.redirect('http://localhost:3000?auth=failed&error=no_code');
  }

  try {
    console.log('🔄 Processing OAuth callback with custom implementation...');
    
    // Use custom OAuth implementation
    const user = await oauth.completeOAuthFlow(code);
    
    // Store user in session
    req.session.user = user;
    
    console.log('✅ OAuth authentication successful for user:', user.username);
    console.log('📋 Session ID:', req.sessionID);
    
    // Save session and redirect
    req.session.save((err) => {
      if (err) {
        console.error('❌ Session save error:', err);
        return res.redirect('http://localhost:3000?auth=failed&error=session');
      }
      console.log('💾 Session saved successfully');
      res.redirect('http://localhost:3000?auth=success');
    });

  } catch (error) {
    console.error('❌ OAuth callback error:', error.message);
    
    // Check for rate limit errors
    if (error.message.includes('rate limit') || error.message.includes('Rate limit')) {
      console.error('🚫 Rate limit detected in custom OAuth');
      return res.redirect('http://localhost:3000?auth=failed&error=ratelimit');
    }
    
    return res.redirect('http://localhost:3000?auth=failed&error=oauth');
  }
});

// User info endpoint
app.get('/auth/user', (req, res) => {
  if (req.session.user) {
    res.json({
      authenticated: true,
      user: {
        id: req.session.user.id,
        username: req.session.user.username,
        displayName: req.session.user.displayName,
        profileUrl: req.session.user.profileUrl,
        avatarUrl: req.session.user.avatarUrl,
        email: req.session.user.email,
        loginTime: req.session.user.loginTime
      },
      oauthConfigured: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
      implementation: 'custom-oauth'
    });
  } else {
    res.json({
      authenticated: false,
      oauthConfigured: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
      implementation: 'custom-oauth'
    });
  }
});

// Logout endpoint
app.post('/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ 
    message: 'Alternative server with custom OAuth is running!',
    timestamp: new Date().toISOString(),
    authenticated: !!req.session.user
  });
});

const PORT = 5001; // Use different port to avoid conflicts
const server = app.listen(PORT, () => {
  console.log(`🚀 Alternative GitHub OAuth Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 GitHub OAuth: ${(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) ? '✅ Configured (Custom Implementation)' : '❌ Not configured'}`);
  console.log(`🌐 Allowed origins: http://localhost:3000, http://localhost:3001`);
  console.log(`💡 This server uses custom OAuth to avoid rate limit issues`);
});

server.on('error', (error) => {
  console.error('Server error:', error);
});
