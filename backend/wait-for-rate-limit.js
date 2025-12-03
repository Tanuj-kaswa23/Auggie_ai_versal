#!/usr/bin/env node

/**
 * GitHub Rate Limit Waiter
 * 
 * This script monitors the GitHub API rate limit and waits until it resets,
 * then notifies you when it's safe to retry OAuth authentication.
 */

require('dotenv').config();
const { Octokit } = require('@octokit/rest');

let checkInterval;

async function checkAndWaitForRateLimit() {
  console.log('⏰ Monitoring GitHub API rate limit...');
  console.log('   Press Ctrl+C to stop monitoring\n');

  const startTime = Date.now();

  const checkStatus = async () => {
    try {
      // Simple rate limit check without authentication
      const response = await fetch('https://api.github.com/rate_limit');
      const data = await response.json();
      
      if (response.status === 403) {
        console.log('🚫 Still rate limited...');
        return false;
      }
      
      const core = data.rate;
      const resetTime = new Date(core.reset * 1000);
      const minutesUntilReset = Math.ceil((resetTime - new Date()) / (1000 * 60));
      const elapsedMinutes = Math.floor((Date.now() - startTime) / (1000 * 60));
      
      console.log(`📊 [${new Date().toLocaleTimeString()}] Remaining: ${core.remaining}/${core.limit} | Reset in: ${Math.max(0, minutesUntilReset)}min | Elapsed: ${elapsedMinutes}min`);
      
      if (core.remaining > 10) {
        console.log('\n✅ Rate limit has reset! You can now try OAuth authentication again.');
        console.log('🚀 Run your server with: node index.js');
        return true;
      }
      
      return false;
    } catch (error) {
      console.log(`❌ [${new Date().toLocaleTimeString()}] Error checking rate limit:`, error.message);
      return false;
    }
  };

  // Initial check
  const isReady = await checkStatus();
  if (isReady) {
    return;
  }

  // Set up periodic checking every 2 minutes
  checkInterval = setInterval(async () => {
    const isReady = await checkStatus();
    if (isReady) {
      clearInterval(checkInterval);
    }
  }, 2 * 60 * 1000); // Check every 2 minutes
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Stopping rate limit monitor...');
  if (checkInterval) {
    clearInterval(checkInterval);
  }
  process.exit(0);
});

// Start monitoring
checkAndWaitForRateLimit().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
