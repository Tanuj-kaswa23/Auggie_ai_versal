// Simple health check endpoint for Vercel
export default function handler(req, res) {
  try {
    console.log('Health check called via /api/health');

    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      vercel: !!process.env.VERCEL,
      message: 'Backend is working via /api directory'
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
