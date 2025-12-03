// Ultra-minimal backend for Vercel debugging
const express = require('express');

const app = express();

// Basic middleware
app.use(express.json());

// Add basic CORS headers manually
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Test routes
app.get('/health', (req, res) => {
  console.log('Health check called');
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    vercel: !!process.env.VERCEL
  });
});

app.get('/auth/user', (req, res) => {
  console.log('Auth user endpoint called');
  res.json({
    authenticated: false,
    oauthConfigured: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
    environment: process.env.NODE_ENV || 'development',
    vercel: !!process.env.VERCEL,
    timestamp: new Date().toISOString()
  });
});

// Catch all for debugging
app.use('*', (req, res) => {
  console.log('Catch-all route hit:', req.method, req.originalUrl);
  res.json({
    message: 'Backend is working',
    method: req.method,
    url: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

// Export for Vercel
module.exports = app;

// For local development
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Fresh backend running on port ${PORT}`);
  });
}
