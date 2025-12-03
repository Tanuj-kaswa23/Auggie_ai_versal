const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { Octokit } = require('@octokit/rest');
const git = require('isomorphic-git');
const http = require('isomorphic-git/http/node');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const session = require('express-session');
const rateLimitManager = require('./rateLimitManager');
require('dotenv').config();


const app = express();

// Helper function to get frontend URL
const getFrontendUrl = () => process.env.APP_URL || 'http://localhost:3000';

// Helper function to get backend URL
const getBackendUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    return process.env.BACKEND_URL || process.env.APP_URL || 'https://auggie-ai.vercel.app';
  }
  return 'http://localhost:5000';
};

// CORS configuration for development and production
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.APP_URL, process.env.FRONTEND_URL] // Production URLs
  : ['http://localhost:3000', 'http://localhost:3001']; // Development URLs

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());

// Enhanced session configuration for multi-user support
const isProduction = process.env.NODE_ENV === 'production';

// Session store for production (in production, use Redis or database)
let sessionStore;
if (isProduction) {
  // In production, you should use a proper session store like Redis
  // const RedisStore = require('connect-redis')(session);
  // const redis = require('redis');
  // const client = redis.createClient();
  // sessionStore = new RedisStore({ client: client });
  console.log('⚠️ WARNING: Using memory store for sessions in production. Use Redis for production deployments.');
}

app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-key',
  store: sessionStore, // Use Redis store in production
  resave: false,
  saveUninitialized: false,
  rolling: true, // Reset expiration on activity
  cookie: {
    secure: isProduction, // HTTPS required in production
    maxAge: 24 * 60 * 60 * 1000, // 24 hours for better security
    httpOnly: true, // Prevent XSS attacks
    sameSite: isProduction ? 'strict' : 'lax' // Enhanced CSRF protection in production
  },
  name: 'augment-oauth-session', // Custom session name to avoid conflicts
  genid: () => {
    // Generate unique session IDs with timestamp for better tracking
    return `oauth-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}));

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());

// Rate limit tracking
const rateLimitTracker = {
  lastReset: Date.now(),
  requestCount: 0,
  isLimited: false
};

// Helper function to check rate limit status
const checkRateLimit = () => {
  const now = Date.now();
  const hoursSinceReset = (now - rateLimitTracker.lastReset) / (1000 * 60 * 60);

  // Reset counter every hour
  if (hoursSinceReset >= 1) {
    rateLimitTracker.lastReset = now;
    rateLimitTracker.requestCount = 0;
    rateLimitTracker.isLimited = false;
  }

  return rateLimitTracker;
};

// Custom OAuth implementation to bypass passport-github2 rate limit issues
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {

  // Store user sessions in memory (in production, use Redis or database)
  const userSessions = new Map();

  // Custom OAuth routes that bypass passport-github2
  app.get('/auth/github', (req, res) => {
    console.log('🔄 Initiating custom GitHub OAuth flow...');

    const state = Math.random().toString(36).substring(7);
    req.session.oauthState = state;

    const params = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID,
      redirect_uri: `${getBackendUrl()}/auth/github/callback`,
      scope: 'user:email repo',
      state: state,
      response_type: 'code'
    });

    const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
    res.redirect(authUrl);
  });

  app.get('/auth/github/callback', async (req, res) => {
    const { code, state, error, error_description } = req.query;

    // Handle OAuth errors
    if (error) {
      console.error('❌ OAuth error:', error, error_description);
      return res.redirect(`${getFrontendUrl()}?auth=failed&error=${error}`);
    }

    // Verify state parameter
    if (state !== req.session.oauthState) {
      console.error('❌ OAuth state mismatch');
      return res.redirect(`${getFrontendUrl()}?auth=failed&error=state_mismatch`);
    }

    if (!code) {
      console.error('❌ No authorization code received');
      return res.redirect(`${getFrontendUrl()}?auth=failed&error=no_code`);
    }

    try {
      console.log('🔄 Processing OAuth callback with custom implementation...');

      // Step 1: Exchange code for access token
      console.log('🔑 Exchanging authorization code for access token...');
      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Augment-CLI-UI-App/1.0'
        },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code: code,
          redirect_uri: `${getBackendUrl()}/auth/github/callback`
        })
      });

      if (!tokenResponse.ok) {
        throw new Error(`Token exchange failed: ${tokenResponse.status} ${tokenResponse.statusText}`);
      }

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        throw new Error(`OAuth token error: ${tokenData.error} - ${tokenData.error_description}`);
      }

      const accessToken = tokenData.access_token;
      console.log('✅ Access token obtained successfully');

      // Step 2: Get user profile using the access token (this should have higher rate limits)
      console.log('👤 Fetching user profile with authenticated request...');
      const userResponse = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Augment-CLI-UI-App/1.0'
        }
      });

      if (userResponse.status === 403) {
        const rateLimitRemaining = userResponse.headers.get('x-ratelimit-remaining');
        const rateLimitReset = userResponse.headers.get('x-ratelimit-reset');

        console.error('🚫 Rate limit hit during authenticated user fetch');
        console.error(`   Remaining: ${rateLimitRemaining}`);
        console.error(`   Reset: ${new Date(rateLimitReset * 1000).toLocaleString()}`);

        // Even with authenticated request, we hit rate limit
        // Let's create a minimal user object and fetch profile later
        const minimalUser = {
          id: 'temp_' + Date.now(),
          username: 'github_user',
          displayName: 'GitHub User',
          accessToken: accessToken,
          loginTime: new Date().toISOString(),
          profileFetchPending: true
        };

        req.session.user = minimalUser;
        console.log('⚠️ Created minimal user session, profile will be fetched later');

        req.session.save((err) => {
          if (err) {
            console.error('❌ Session save error:', err);
            return res.redirect(`${getFrontendUrl()}?auth=failed&error=session`);
          }
          res.redirect(`${getFrontendUrl()}?auth=success&warning=profile_pending`);
        });
        return;
      }

      if (!userResponse.ok) {
        throw new Error(`User profile fetch failed: ${userResponse.status} ${userResponse.statusText}`);
      }

      const userData = await userResponse.json();

      // Create complete user object
      const user = {
        id: userData.id.toString(),
        username: userData.login,
        displayName: userData.name || userData.login,
        profileUrl: userData.html_url,
        avatarUrl: userData.avatar_url,
        email: userData.email,
        accessToken: accessToken,
        loginTime: new Date().toISOString(),
        profileFetchPending: false
      };

      req.session.user = user;

      console.log('✅ OAuth authentication successful for user:', user.username);
      console.log('📋 Session ID:', req.sessionID);

      req.session.save((err) => {
        if (err) {
          console.error('❌ Session save error:', err);
          return res.redirect(`${getFrontendUrl()}?auth=failed&error=session`);
        }
        console.log('💾 Session saved successfully');
        res.redirect(`${getFrontendUrl()}?auth=success`);
      });

    } catch (error) {
      console.error('❌ OAuth callback error:', error.message);

      if (error.message.includes('rate limit') || error.message.includes('Rate limit')) {
        console.error('🚫 Rate limit detected in custom OAuth');
        return res.redirect(`${getFrontendUrl()}?auth=failed&error=ratelimit`);
      }

      return res.redirect(`${getFrontendUrl()}?auth=failed&error=oauth`);
    }
  });

} else {
  // Fallback to passport-github2 if custom implementation fails
  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: `${getBackendUrl()}/auth/github/callback`,
    scope: ['user:email', 'repo'],
    userAgent: 'Augment-CLI-UI-App/1.0'
  }, async (accessToken, refreshToken, profile, done) => {
    // Simplified callback
    const user = {
      id: profile.id,
      username: profile.username,
      displayName: profile.displayName || profile.username,
      accessToken: accessToken,
      loginTime: new Date().toISOString()
    };
    return done(null, user);
  }));
}

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

let folderPath = '';
let currentRepo = null; // Store current repository info

// Multi-user session tracking
const activeUsers = new Map(); // Track active users and their sessions

// Middleware to track user activity
const trackUserActivity = (req, res, next) => {
  const user = getUser(req);
  if (user && user.id) {
    const now = Date.now();
    const userActivity = activeUsers.get(user.id) || {
      username: user.username,
      firstSeen: now,
      sessionId: req.sessionID,
      requestCount: 0
    };

    userActivity.lastSeen = now;
    userActivity.requestCount += 1;
    userActivity.sessionId = req.sessionID; // Update session ID if changed

    activeUsers.set(user.id, userActivity);

    // Clean up inactive users (older than 2 hours)
    for (const [userId, activity] of activeUsers.entries()) {
      if (now - activity.lastSeen > 2 * 60 * 60 * 1000) {
        activeUsers.delete(userId);
        rateLimitManager.clearUserCache(userId);
        console.log(`🧹 Cleaned up inactive user: ${activity.username}`);
      }
    }
  }
  next();
};

// Apply activity tracking to all routes
app.use(trackUserActivity);

// Helper function to get Octokit instance for authenticated user (OAuth-only)
const getUserOctokit = (req) => {
  // Check both req.user (passport) and req.session.user (custom implementation)
  const user = req.user || req.session.user;

  if (user && user.accessToken) {
    return new Octokit({
      auth: user.accessToken,
      userAgent: 'Augment-CLI-UI-App/1.0',
      // Add request timeout and retry configuration
      request: {
        timeout: 10000, // 10 second timeout
        retries: 2,
        retryAfter: 3
      }
    });
  }
  // OAuth authentication required - no personal access token fallback
  return null;
};

// Helper function to get user from request
const getUser = (req) => {
  return req.user || req.session.user;
};

// Middleware to ensure OAuth authentication (no personal access token fallback)
const requireOAuthAuth = (req, res, next) => {
  const user = getUser(req);

  if (!user) {
    return res.status(401).json({
      error: "GitHub OAuth authentication required",
      message: "Please login with your GitHub account to access this feature.",
      authenticationRequired: true
    });
  }

  if (!user.accessToken) {
    return res.status(401).json({
      error: "Invalid OAuth session",
      message: "Your GitHub session is invalid. Please login again.",
      authenticationRequired: true
    });
  }

  // Add user info to request for easy access
  req.authenticatedUser = user;
  next();
};

// Authentication routes - DISABLED: Using custom OAuth implementation above
// app.get('/auth/github', (req, res, next) => {
//   if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
//     return res.status(500).json({ error: 'GitHub OAuth not configured' });
//   }
//   passport.authenticate('github', { scope: ['user:email', 'repo'] })(req, res, next);
// });

// DISABLED: Passport-based OAuth callback - Using custom implementation above
// app.get('/auth/github/callback', (req, res, next) => {
//   // ... passport-based callback code disabled to prevent conflicts
// });

app.post('/auth/logout', (req, res) => {
  const user = getUser(req);

  // Clear user-specific cache and rate limit data
  if (user && user.id) {
    rateLimitManager.clearUserCache(user.id);
    console.log(`🧹 Cleared cache for user: ${user.username || user.id}`);
  }

  // Handle both passport and custom session logout
  if (req.logout && typeof req.logout === 'function') {
    // Passport logout
    req.logout((err) => {
      if (err) {
        console.error('Passport logout error:', err);
      }
      // Always destroy session regardless of passport logout result
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ error: 'Session destruction failed' });
        }
        res.json({ message: 'Logged out successfully' });
      });
    });
  } else {
    // Custom session logout
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Session destruction failed' });
      }
      res.json({ message: 'Logged out successfully' });
    });
  }
});

app.get('/auth/user', (req, res) => {
  const rateStatus = checkRateLimit();

  // Check both req.user (passport) and req.session.user (custom implementation)
  const user = req.user || req.session.user;

  if (user) {
    res.json({
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        profileUrl: user.profileUrl,
        avatarUrl: user.avatarUrl,
        email: user.email,
        loginTime: user.loginTime,
        profileFetchPending: user.profileFetchPending || false
      },
      oauthConfigured: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
      implementation: req.session.user ? 'custom' : 'passport',
      rateLimit: {
        isLimited: rateStatus.isLimited,
        requestCount: rateStatus.requestCount,
        lastReset: rateStatus.lastReset
      }
    });
  } else {
    res.json({
      authenticated: false,
      oauthConfigured: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
      implementation: 'none',
      rateLimit: {
        isLimited: rateStatus.isLimited,
        requestCount: rateStatus.requestCount,
        lastReset: rateStatus.lastReset
      }
    });
  }
});

// Rate limit status endpoint (enhanced with per-user tracking)
app.get('/auth/rate-limit', (req, res) => {
  const user = getUser(req);
  const rateStatus = checkRateLimit();
  const now = Date.now();
  const timeSinceReset = now - rateStatus.lastReset;
  const timeUntilReset = (60 * 60 * 1000) - timeSinceReset; // 1 hour in ms

  let userRateLimit = null;
  if (user && user.id) {
    userRateLimit = rateLimitManager.getUserRateLimit(user.id);
  }

  res.json({
    // Global rate limit (IP-based)
    global: {
      isLimited: rateStatus.isLimited,
      requestCount: rateStatus.requestCount,
      lastReset: new Date(rateStatus.lastReset).toISOString(),
      timeUntilReset: Math.max(0, timeUntilReset),
      timeUntilResetMinutes: Math.max(0, Math.ceil(timeUntilReset / (1000 * 60))),
      canRetry: !rateStatus.isLimited || timeUntilReset <= 0
    },
    // User-specific rate limit (OAuth-based)
    user: userRateLimit ? {
      remaining: userRateLimit.remaining,
      limit: userRateLimit.limit,
      reset: new Date(userRateLimit.reset).toISOString(),
      timeUntilReset: Math.max(0, userRateLimit.reset - now),
      timeUntilResetMinutes: Math.max(0, Math.ceil((userRateLimit.reset - now) / (1000 * 60))),
      canMakeRequest: rateLimitManager.canMakeRequest(user.id).allowed
    } : null,
    // Cache statistics
    cache: rateLimitManager.getCacheStats()
  });
});

// Get detailed user profile (OAuth required)
app.get('/auth/profile', requireOAuthAuth, async (req, res) => {
  try {
    const user = getUser(req);
    if (!user) {
      return res.status(401).json({ error: "GitHub authentication required. Please login with GitHub." });
    }

    const userOctokit = getUserOctokit(req);
    if (!userOctokit) {
      return res.status(401).json({ error: "Invalid authentication. Please login again." });
    }

    // Get fresh user data from GitHub
    const { data: githubUser } = await userOctokit.rest.users.getAuthenticated();

    res.json({
      user: user,
      githubProfile: {
        login: githubUser.login,
        name: githubUser.name,
        email: githubUser.email,
        bio: githubUser.bio,
        location: githubUser.location,
        company: githubUser.company,
        blog: githubUser.blog,
        avatar_url: githubUser.avatar_url,
        public_repos: githubUser.public_repos,
        private_repos: githubUser.total_private_repos,
        followers: githubUser.followers,
        following: githubUser.following,
        created_at: githubUser.created_at
      }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);

    // Handle rate limiting specifically
    if (error.status === 403 && error.response?.headers?.['x-ratelimit-remaining'] === '0') {
      const resetTime = error.response.headers['x-ratelimit-reset'];
      const resetDate = new Date(resetTime * 1000);
      const waitMinutes = Math.ceil((resetDate - new Date()) / (1000 * 60));

      return res.status(429).json({
        error: 'GitHub API rate limit exceeded',
        message: `Rate limit will reset in ${waitMinutes} minutes at ${resetDate.toLocaleTimeString()}`,
        resetTime: resetTime,
        rateLimitExceeded: true
      });
    }

    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// GitHub API endpoints

// Get user's repositories (OAuth required)
app.get('/github/repos', requireOAuthAuth, async (req, res) => {
  try {
    const user = req.authenticatedUser;
    const cacheKey = rateLimitManager.getCacheKey('repos', user.id, { sort: 'updated', per_page: 100 });

    // Check cache first
    const cachedRepos = rateLimitManager.getCachedResponse(cacheKey);
    if (cachedRepos) {
      console.log(`💾 Returning cached repositories for user: ${user.username}`);
      return res.json({ repos: cachedRepos, cached: true });
    }

    // Check rate limits before making request
    const rateLimitCheck = rateLimitManager.canMakeRequest(user.id);
    if (!rateLimitCheck.allowed) {
      console.error(`🚫 Rate limit check failed for user ${user.username}: ${rateLimitCheck.reason}`);

      return res.status(429).json({
        error: 'GitHub API rate limit exceeded',
        message: `Your GitHub API rate limit has been exceeded. Please wait ${rateLimitCheck.waitMinutes} minutes.`,
        resetTime: rateLimitCheck.resetTime?.toISOString(),
        rateLimitExceeded: true,
        waitMinutes: rateLimitCheck.waitMinutes
      });
    }

    if (rateLimitCheck.reason === 'rate_limit_warning') {
      console.warn(`⚠️ Rate limit warning for user ${user.username}: ${rateLimitCheck.remaining} requests remaining`);
    }

    const userOctokit = getUserOctokit(req);
    console.log(`📚 Fetching repositories for user: ${user.username}`);

    const response = await userOctokit.rest.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 100,
    });

    // Update rate limit tracking
    if (response.headers) {
      rateLimitManager.updateRateLimit(user.id, response.headers);
    }

    const repos = response.data.map(repo => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      private: repo.private,
      description: repo.description,
      clone_url: repo.clone_url,
      ssh_url: repo.ssh_url,
      updated_at: repo.updated_at,
      language: repo.language,
    }));

    // Cache the response (cache for 5 minutes)
    rateLimitManager.cacheResponse(cacheKey, repos, 5 * 60 * 1000);

    console.log(`✅ Successfully fetched ${repos.length} repositories for ${user.username}`);
    res.json({ repos });
  } catch (error) {
    console.error('Error fetching repositories:', error);

    // Update rate limit info from error response
    if (error.response?.headers) {
      rateLimitManager.updateRateLimit(req.authenticatedUser.id, error.response.headers);
    }

    // Enhanced rate limit handling for OAuth users
    if (error.status === 403) {
      const rateLimitRemaining = error.response?.headers?.['x-ratelimit-remaining'];
      const rateLimitReset = error.response?.headers?.['x-ratelimit-reset'];

      if (rateLimitRemaining === '0' || rateLimitRemaining === 0) {
        const resetDate = new Date(rateLimitReset * 1000);
        const waitMinutes = Math.ceil((resetDate - new Date()) / (1000 * 60));

        console.error(`🚫 Rate limit exceeded for user ${req.authenticatedUser.username}. Reset at: ${resetDate.toLocaleString()}`);

        return res.status(429).json({
          error: 'GitHub API rate limit exceeded',
          message: `Your GitHub API rate limit has been exceeded. It will reset in ${waitMinutes} minutes at ${resetDate.toLocaleTimeString()}`,
          resetTime: rateLimitReset,
          resetDate: resetDate.toISOString(),
          rateLimitExceeded: true,
          waitMinutes: Math.max(0, waitMinutes)
        });
      }
    }

    // Handle authentication errors
    if (error.status === 401) {
      return res.status(401).json({
        error: 'GitHub authentication expired',
        message: 'Your GitHub session has expired. Please login again.',
        authenticationRequired: true
      });
    }

    // Handle other GitHub API errors
    if (error.status) {
      return res.status(error.status).json({
        error: error.message || 'GitHub API error',
        githubError: true
      });
    }

    res.status(500).json({ error: "Failed to fetch repositories", details: error.message });
  }
});

// Clone a repository (OAuth required) - Using isomorphic-git
app.post('/github/clone', requireOAuthAuth, async (req, res) => {
  let targetPath = null; // Declare at function scope for cleanup

  try {
    const { repoUrl, localPath, useSSH = false } = req.body;
    targetPath = localPath; // Store for cleanup

    if (!repoUrl) {
      return res.status(400).json({ error: "Repository URL is required" });
    }

    if (!localPath) {
      return res.status(400).json({ error: "Local path is required" });
    }

    // Ensure the parent directory exists
    const parentDir = path.dirname(localPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    // Check if directory already exists
    if (fs.existsSync(localPath)) {
      return res.status(400).json({ error: "Directory already exists" });
    }

    // Create the target directory
    fs.mkdirSync(localPath, { recursive: true });

    console.log(`🚀 Cloning ${repoUrl} to ${localPath} using isomorphic-git`);
    console.log('👤 User info:', req.authenticatedUser ? `${req.authenticatedUser.login || req.authenticatedUser.username || 'Unknown'} (ID: ${req.authenticatedUser.id})` : 'No user');
    console.log('🔑 Token available:', req.authenticatedUser && req.authenticatedUser.accessToken ? 'Yes' : 'No');
    console.log('🔍 User object keys:', req.authenticatedUser ? Object.keys(req.authenticatedUser) : 'No user');

    // Prepare authentication for private repositories
    const cloneOptions = {
      fs,
      http,
      dir: localPath,
      url: repoUrl,
      singleBranch: true,
      depth: 1 // Shallow clone for faster cloning
    };

    // Add OAuth token for authentication if available
    if (req.authenticatedUser && req.authenticatedUser.accessToken) {
      // Try GitHub OAuth token as username with x-oauth-basic as password
      cloneOptions.onAuth = (url, auth) => {
        console.log('🔐 onAuth called for URL:', url);
        return {
          username: req.authenticatedUser.accessToken,
          password: 'x-oauth-basic'
        };
      };
      console.log('🔐 Using GitHub OAuth token as username for authentication');
      console.log('🔑 Token preview:', req.authenticatedUser.accessToken.substring(0, 10) + '...');
    } else {
      console.log('⚠️ No OAuth token available - attempting public clone');
    }

    // Perform the clone operation
    await git.clone(cloneOptions);

    // Set the folder path and current repo
    folderPath = localPath;
    currentRepo = {
      url: repoUrl,
      path: localPath,
      clonedAt: new Date().toISOString(),
      method: 'isomorphic-git'
    };

    console.log(`✅ Repository cloned successfully to ${localPath}`);

    res.json({
      message: "Repository cloned successfully using isomorphic-git",
      localPath,
      repoUrl,
      method: 'isomorphic-git',
      features: [
        'Pure JavaScript implementation',
        'No Git installation required',
        'OAuth authenticated',
        'Shallow clone for performance'
      ]
    });

  } catch (error) {
    console.error('❌ Error cloning repository with isomorphic-git:', error);

    // Clean up the directory if it was created but clone failed
    if (targetPath && fs.existsSync(targetPath)) {
      try {
        fs.rmSync(targetPath, { recursive: true, force: true });
        console.log('🧹 Cleaned up failed clone directory');
      } catch (cleanupError) {
        console.error('Error cleaning up directory:', cleanupError);
      }
    }

    res.status(500).json({
      error: "Failed to clone repository with isomorphic-git",
      details: error.message,
      suggestion: "Make sure the repository URL is correct and you have access to it"
    });
  }
});

// Test isomorphic-git functionality
app.get('/github/test-isomorphic-git', (req, res) => {
  try {
    // Simple test to verify isomorphic-git is loaded correctly
    const gitModule = require('isomorphic-git');

    res.json({
      message: "Isomorphic-git is working correctly",
      module: typeof gitModule,
      availableFunctions: Object.keys(gitModule).slice(0, 10), // Show first 10 functions
      features: [
        "Pure JavaScript Git implementation",
        "No native Git installation required",
        "Works in browsers and Node.js",
        "Supports clone, pull, push, commit operations",
        "OAuth authentication support"
      ],
      status: "ready"
    });
  } catch (error) {
    res.status(500).json({
      error: "Isomorphic-git test failed",
      details: error.message
    });
  }
});

// Git status for a repository (OAuth required) - Using isomorphic-git
app.get('/github/git-status/:repoPath', requireOAuthAuth, async (req, res) => {
  try {
    const repoPath = decodeURIComponent(req.params.repoPath);

    if (!fs.existsSync(repoPath)) {
      return res.status(404).json({ error: "Repository path not found" });
    }

    console.log(`📊 Getting git status for: ${repoPath}`);

    // Get status using isomorphic-git
    const status = await git.statusMatrix({
      fs,
      dir: repoPath
    });

    // Process status matrix to readable format
    const fileStatuses = status.map(([filepath, headStatus, workdirStatus, stageStatus]) => {
      let status = 'unmodified';
      if (headStatus === 1 && workdirStatus === 1 && stageStatus === 1) status = 'unmodified';
      else if (headStatus === 0 && workdirStatus === 2 && stageStatus === 0) status = 'untracked';
      else if (headStatus === 0 && workdirStatus === 2 && stageStatus === 2) status = 'added';
      else if (headStatus === 1 && workdirStatus === 2 && stageStatus === 1) status = 'modified';
      else if (headStatus === 1 && workdirStatus === 0 && stageStatus === 1) status = 'deleted';
      else if (headStatus === 1 && workdirStatus === 2 && stageStatus === 2) status = 'modified-staged';

      return {
        file: filepath,
        status: status
      };
    }).filter(item => item.status !== 'unmodified');

    res.json({
      message: "Git status retrieved successfully",
      repoPath,
      files: fileStatuses,
      method: 'isomorphic-git'
    });

  } catch (error) {
    console.error('❌ Error getting git status:', error);
    res.status(500).json({
      error: "Failed to get git status",
      details: error.message
    });
  }
});

// Git pull for a repository (OAuth required) - Using isomorphic-git
app.post('/github/git-pull/:repoPath', requireOAuthAuth, async (req, res) => {
  try {
    const repoPath = decodeURIComponent(req.params.repoPath);

    if (!fs.existsSync(repoPath)) {
      return res.status(404).json({ error: "Repository path not found" });
    }

    console.log(`🔄 Pulling latest changes for: ${repoPath}`);

    // Prepare authentication for private repositories
    const pullOptions = {
      fs,
      http,
      dir: repoPath,
      singleBranch: true
    };

    // Add OAuth token for authentication if available
    if (req.authenticatedUser && req.authenticatedUser.accessToken) {
      pullOptions.onAuth = (url, auth) => {
        return {
          oauth2format: 'github',
          token: req.authenticatedUser.accessToken
        };
      };
      console.log('🔐 Using GitHub OAuth2 token for pull authentication');
    }

    // Perform the pull operation
    await git.pull(pullOptions);

    console.log(`✅ Repository pulled successfully: ${repoPath}`);

    res.json({
      message: "Repository pulled successfully using isomorphic-git",
      repoPath,
      method: 'isomorphic-git',
      features: [
        'Pure JavaScript implementation',
        'OAuth authenticated',
        'No Git installation required'
      ]
    });

  } catch (error) {
    console.error('❌ Error pulling repository:', error);
    res.status(500).json({
      error: "Failed to pull repository",
      details: error.message
    });
  }
});

// Get repository information (OAuth required)
app.get('/github/repo-info', requireOAuthAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "GitHub authentication required. Please login with GitHub." });
    }

    const { owner, repo } = req.query;
    if (!owner || !repo) {
      return res.status(400).json({ error: "Owner and repo parameters are required" });
    }

    const userOctokit = getUserOctokit(req);
    if (!userOctokit) {
      return res.status(401).json({ error: "Invalid authentication. Please login again." });
    }

    const { data } = await userOctokit.rest.repos.get({
      owner,
      repo,
    });

    const repoInfo = {
      id: data.id,
      name: data.name,
      full_name: data.full_name,
      description: data.description,
      private: data.private,
      clone_url: data.clone_url,
      ssh_url: data.ssh_url,
      language: data.language,
      size: data.size,
      default_branch: data.default_branch,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    res.json({ repo: repoInfo });

  } catch (error) {
    console.error('Error fetching repository info:', error);
    res.status(500).json({ error: "Failed to fetch repository info", details: error.message });
  }
});

// Search repositories (OAuth required)
app.get('/github/search', requireOAuthAuth, async (req, res) => {
  try {
    const user = req.authenticatedUser;
    if (!user) {
      return res.status(401).json({ error: "GitHub authentication required. Please login with GitHub." });
    }

    const { q, sort = 'updated', per_page = 30 } = req.query;
    if (!q) {
      return res.status(400).json({ error: "Search query is required" });
    }

    const userOctokit = getUserOctokit(req);
    if (!userOctokit) {
      return res.status(401).json({ error: "Invalid authentication. Please login again." });
    }

    const { data } = await userOctokit.rest.search.repos({
      q,
      sort,
      per_page: Math.min(per_page, 100),
    });

    const repos = data.items.map(repo => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description,
      private: repo.private,
      clone_url: repo.clone_url,
      ssh_url: repo.ssh_url,
      language: repo.language,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      updated_at: repo.updated_at,
    }));

    res.json({
      repos,
      total_count: data.total_count,
      incomplete_results: data.incomplete_results
    });

  } catch (error) {
    console.error('Error searching repositories:', error);

    // Handle rate limiting specifically
    if (error.status === 403 && error.response?.headers?.['x-ratelimit-remaining'] === '0') {
      const resetTime = error.response.headers['x-ratelimit-reset'];
      const resetDate = new Date(resetTime * 1000);
      const waitMinutes = Math.ceil((resetDate - new Date()) / (1000 * 60));

      return res.status(429).json({
        error: 'GitHub API rate limit exceeded',
        message: `Rate limit will reset in ${waitMinutes} minutes at ${resetDate.toLocaleTimeString()}`,
        resetTime: resetTime,
        rateLimitExceeded: true
      });
    }

    // Handle other GitHub API errors
    if (error.status) {
      return res.status(error.status).json({
        error: error.message || 'GitHub API error',
        githubError: true
      });
    }

    res.status(500).json({ error: "Failed to search repositories", details: error.message });
  }
});

// Get current repository status
app.get('/github/status', (req, res) => {
  const user = getUser(req);
  res.json({
    currentRepo,
    folderPath,
    authenticated: !!user,
    user: user ? {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      loginTime: user.loginTime
    } : null,
    oauthConfigured: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
    sessionId: req.sessionID
  });
});

// Admin endpoint to view system status and active users
app.get('/admin/status', (req, res) => {
  const user = getUser(req);

  // Basic admin check (in production, implement proper admin authentication)
  const isAdmin = user && (user.username === 'admin' || process.env.ADMIN_USERS?.includes(user.username));

  if (!isAdmin && process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const now = Date.now();
  const activeUsersList = Array.from(activeUsers.entries()).map(([userId, activity]) => ({
    userId,
    username: activity.username,
    sessionId: activity.sessionId,
    firstSeen: new Date(activity.firstSeen).toISOString(),
    lastSeen: new Date(activity.lastSeen).toISOString(),
    requestCount: activity.requestCount,
    minutesSinceLastActivity: Math.floor((now - activity.lastSeen) / (1000 * 60))
  }));

  res.json({
    server: {
      uptime: process.uptime(),
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development',
      port: process.env.PORT || 5000
    },
    oauth: {
      configured: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
      clientId: process.env.GITHUB_CLIENT_ID ? `${process.env.GITHUB_CLIENT_ID.substring(0, 8)}...` : 'Not configured'
    },
    users: {
      active: activeUsersList.length,
      list: activeUsersList
    },
    cache: rateLimitManager.getCacheStats(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
    }
  });
});

app.post('/upload-folder', (req, res) => {
  const { folder } = req.body;
  console.log('Received folder path:', folder);

  if (!folder) {
    return res.status(400).json({ error: "No folder path provided" });
  }

  if (!fs.existsSync(folder) || !fs.lstatSync(folder).isDirectory()) {
    return res.status(400).json({ error: "Folder does not exist or is not a directory" });
  }

  try {
    const files = fs.readdirSync(folder);
    console.log("Folder contents:");
    files.forEach(file => {
      console.log(" -", file);
    });

    // FIX: Set global folderPath here!
    folderPath = folder;

    return res.json({ 
      folderPath: folder, 
      files 
    });

  } catch (err) {
    console.error("Error reading folder:", err);
    return res.status(500).json({ error: "Failed to read folder" });
  }
});


app.post('/query', (req, res) => {
  const { query } = req.body;
  if (!folderPath) return res.status(400).json({ error: "Folder not set!" });
  if (!query || typeof query !== 'string') return res.status(400).json({ error: "Query missing or invalid" });

  // Basic input sanitization
  const trimmedQuery = query.trim();
  if (trimmedQuery.length === 0) {
    return res.status(400).json({ error: "Query cannot be empty" });
  }
  if (trimmedQuery.length > 10000) {
    return res.status(400).json({ error: "Query too long (max 10000 characters)" });
  }

  // Ensure folder path is absolute and exists
  const resolvedFolder = path.resolve(folderPath);
  if (!fs.existsSync(resolvedFolder) || !fs.lstatSync(resolvedFolder).isDirectory()) {
    return res.status(400).json({ error: "Saved folderPath is invalid" });
  }

  // Try to find Auggie binary in common locations
  const possiblePaths = [
    path.resolve(process.env.APPDATA, 'npm', 'auggie.cmd'),
    'auggie.cmd', // In case it's in PATH
    'auggie'      // Unix-style fallback
  ];

  let AUGGIE_BIN = null;
  for (const binPath of possiblePaths) {
    if (fs.existsSync(binPath)) {
      AUGGIE_BIN = binPath;
      break;
    }
  }

  if (!AUGGIE_BIN) {
    console.error("Auggie binary not found in any of these locations:", possiblePaths);
    return res.status(500).json({
      error: "Auggie not found",
      searchedPaths: possiblePaths,
      suggestion: "Make sure Auggie is installed and accessible"
    });
  }

  // Build args; keep them as separate array
  // Use --print for one-shot mode and --workspace-root for directory
  const args = [trimmedQuery, '--print', '--workspace-root', resolvedFolder];

  // Use OAuth token from authenticated user instead of personal access token
  const user = getUser(req);
  if (user && user.accessToken) {
    args.push('--github-api-token');
    args.push(user.accessToken);
    console.log(`🔑 Using OAuth token for user: ${user.username}`);
  } else {
    console.log('⚠️ No OAuth token available - Auggie will run without GitHub integration');
  }

  console.log("Spawning Auggie with:", { AUGGIE_BIN, args });

  // Option A (recommended on Windows): run via cmd.exe /c
  // This is reliable for .cmd/.bat files
  const auggie = spawn('cmd.exe', ['/c', AUGGIE_BIN, ...args], { windowsHide: true });

  // Alternative B: spawn(AUGGIE_BIN, args, { shell: true }) -- also works
  // const auggie = spawn(AUGGIE_BIN, args, { shell: true, windowsHide: true });

  let output = '';
  let responded = false;

  // Set a timeout for long-running processes (5 minutes)
  const timeout = setTimeout(() => {
    if (!responded) {
      responded = true;
      auggie.kill('SIGTERM');
      res.status(408).json({ error: "Auggie process timed out after 5 minutes" });
    }
  }, 5 * 60 * 1000);

  auggie.stdout.on('data', (data) => {
    const s = data.toString();
    console.log('[AUGGIE stdout]', s);
    output += s;
  });

  auggie.stderr.on('data', (data) => {
    const s = data.toString();
    console.error('[AUGGIE stderr]', s);
    output += s;
  });

  auggie.on('error', (err) => {
    if (responded) return;
    responded = true;
    clearTimeout(timeout);
    console.error("Failed to start Auggie:", err);
    // include err.code for more detail
    res.status(500).json({ error: "Failed to start Auggie", details: err.message, code: err.code });
  });

  auggie.on('close', (code, signal) => {
    if (responded) return;
    responded = true;
    clearTimeout(timeout);
    console.log(`Auggie process closed (code=${code}, signal=${signal})`);
    res.json({ result: output, code, signal });
  });
});


// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Multi-User GitHub OAuth Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 GitHub OAuth: ${(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) ? '✅ Configured' : '❌ Not configured - Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET'}`);
  console.log(`👥 Multi-user authentication: OAuth only`);
  console.log(`🌐 Allowed origins: ${allowedOrigins.join(', ')}`);

  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === 'your-super-secret-session-key-here') {
    console.warn('⚠️  WARNING: Please set a secure SESSION_SECRET in production!');
  }
});

// Keep the server alive
server.on('error', (error) => {
  console.error('Server error:', error);
});

// Periodic cleanup of expired cache entries (every 10 minutes)
setInterval(() => {
  rateLimitManager.cleanupCache();
}, 10 * 60 * 1000);

console.log('🧹 Periodic cache cleanup scheduled every 10 minutes');
