// Simple health check endpoint for Vercel
export default function handler(req, res) {
  console.log('Health check called via /api/health');
  
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    vercel: !!process.env.VERCEL,
    message: 'Backend is working via /api directory'
  });
}
