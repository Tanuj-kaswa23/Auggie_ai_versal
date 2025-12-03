// OAuth user status endpoint for Vercel
export default function handler(req, res) {
  try {
    console.log('Auth user endpoint called via /api/auth/user');

    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({
      authenticated: false,
      oauthConfigured: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
      environment: process.env.NODE_ENV || 'development',
      vercel: !!process.env.VERCEL,
      timestamp: new Date().toISOString(),
      message: 'OAuth endpoint working via /api directory'
    });
  } catch (error) {
    console.error('Auth user error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
