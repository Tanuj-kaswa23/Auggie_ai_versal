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
    return `${baseUrl}/${cleanEndpoint}`;
  }
};

export default config;
