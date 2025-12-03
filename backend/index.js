const express = require('express');
// const cors = require('cors'); // Temporarily disabled for debugging

const app = express();

// Serverless environment detection
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY;

// Helper function to get backend URL
const getBackendUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    return process.env.BACKEND_URL || process.env.APP_URL || 'https://auggie-ai.vercel.app';
  }
  return 'http://localhost:5000';
};

// CORS configuration - disabled for debugging
// app.use(cors({
//   origin: true,
//   credentials: true
// }));

app.use(express.json());

// Test route
app.get('/auth/user', (req, res) => {
  console.log('🔍 Auth user endpoint called');
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Serverless:', isServerless);
  console.log('GitHub Client ID:', process.env.GITHUB_CLIENT_ID ? 'Set' : 'Not set');
  
  res.json({
    authenticated: false,
    oauthConfigured: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
    environment: process.env.NODE_ENV || 'development',
    serverless: isServerless,
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// For local development
if (!isServerless) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Test server running on port ${PORT}`);
  });
} else {
  console.log('🚀 Running in serverless mode');
}

// Export for Vercel
module.exports = app;
