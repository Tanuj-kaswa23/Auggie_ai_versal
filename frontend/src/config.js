// API Configuration
const config = {
  // Use environment variable or fallback based on environment
  API_URL: process.env.REACT_APP_API_URL ||
           (window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'https://auggie-ai.vercel.app'),

  // Helper function to get full API endpoint
  getApiUrl: (endpoint) => {
    const baseUrl = config.API_URL;
    // Remove leading slash from endpoint if present
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;

    // For production, use /api prefix for serverless functions
    if (window.location.hostname !== 'localhost') {
      // Convert auth/user to api/auth/user, health to api/health, etc.
      if (cleanEndpoint === 'auth/user') {
        return `${baseUrl}/api/auth/user`;
      }
      if (cleanEndpoint === 'health') {
        return `${baseUrl}/api/health`;
      }
      // For other endpoints, add /api prefix if not already present
      if (!cleanEndpoint.startsWith('api/')) {
        return `${baseUrl}/api/${cleanEndpoint}`;
      }
    }

    return `${baseUrl}/${cleanEndpoint}`;
  }
};

export default config;
