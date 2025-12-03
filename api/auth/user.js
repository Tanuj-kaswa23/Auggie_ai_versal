// OAuth user status endpoint for Vercel
export default function handler(req, res) {
  console.log('Auth user endpoint called via /api/auth/user');
  
  res.status(200).json({
    authenticated: false,
    oauthConfigured: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
    environment: process.env.NODE_ENV || 'development',
    vercel: !!process.env.VERCEL,
    timestamp: new Date().toISOString(),
    message: 'OAuth endpoint working via /api directory'
  });
}
