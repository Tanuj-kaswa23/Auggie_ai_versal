#!/usr/bin/env node

/**
 * Comprehensive GitHub Rate Limit Diagnostics
 * 
 * This script diagnoses rate limit issues across different GitHub accounts,
 * OAuth apps, and IP addresses.
 */

require('dotenv').config();

async function diagnoseRateLimit() {
  console.log('🔍 GitHub Rate Limit Comprehensive Diagnosis');
  console.log('═══════════════════════════════════════════════\n');

  // Get current IP address
  try {
    console.log('🌐 Checking your public IP address...');
    const ipResponse = await fetch('https://api.ipify.org?format=json');
    const ipData = await ipResponse.json();
    console.log(`   Your IP: ${ipData.ip}\n`);
  } catch (error) {
    console.log('   Could not determine IP address\n');
  }

  // Check unauthenticated rate limit (IP-based)
  console.log('📊 1. Unauthenticated Rate Limit (IP-based)');
  console.log('─────────────────────────────────────────────');
  try {
    const response = await fetch('https://api.github.com/rate_limit');
    const headers = response.headers;
    
    if (response.status === 403) {
      console.log('❌ RATE LIMITED - IP address has exceeded limits');
      console.log(`   Status: ${response.status} ${response.statusText}`);
      
      // Try to get reset time from headers
      const resetTime = headers.get('x-ratelimit-reset');
      if (resetTime) {
        const resetDate = new Date(resetTime * 1000);
        const minutesUntilReset = Math.ceil((resetDate - new Date()) / (1000 * 60));
        console.log(`   Reset time: ${resetDate.toLocaleString()}`);
        console.log(`   Minutes until reset: ${Math.max(0, minutesUntilReset)}`);
      }
      
      const retryAfter = headers.get('retry-after');
      if (retryAfter) {
        console.log(`   Retry after: ${retryAfter} seconds`);
      }
    } else {
      const data = await response.json();
      const core = data.rate;
      const resetTime = new Date(core.reset * 1000);
      const minutesUntilReset = Math.ceil((resetTime - new Date()) / (1000 * 60));
      
      console.log(`   ✅ Status: ${response.status} OK`);
      console.log(`   Used: ${core.used}/${core.limit} requests`);
      console.log(`   Remaining: ${core.remaining} requests`);
      console.log(`   Reset time: ${resetTime.toLocaleString()}`);
      console.log(`   Minutes until reset: ${Math.max(0, minutesUntilReset)}`);
      
      if (core.remaining < 10) {
        console.log('   ⚠️  WARNING: Very few requests remaining');
      }
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  console.log('\n📱 2. OAuth App Configuration');
  console.log('─────────────────────────────────────────────');
  console.log(`   Client ID: ${process.env.GITHUB_CLIENT_ID || 'Not configured'}`);
  console.log(`   Client Secret: ${process.env.GITHUB_CLIENT_SECRET ? 'Configured' : 'Not configured'}`);
  
  // Test OAuth app rate limit (if configured)
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    try {
      console.log('   Testing OAuth app rate limit...');
      
      // Make a simple request with OAuth credentials
      const authString = Buffer.from(`${process.env.GITHUB_CLIENT_ID}:${process.env.GITHUB_CLIENT_SECRET}`).toString('base64');
      const oauthResponse = await fetch('https://api.github.com/rate_limit', {
        headers: {
          'Authorization': `Basic ${authString}`,
          'User-Agent': 'Augment-CLI-UI-App/1.0'
        }
      });
      
      if (oauthResponse.status === 403) {
        console.log('   ❌ OAuth app is also rate limited');
        const errorText = await oauthResponse.text();
        console.log(`   Error: ${errorText.substring(0, 200)}...`);
      } else if (oauthResponse.ok) {
        const oauthData = await oauthResponse.json();
        const oauthCore = oauthData.rate;
        console.log(`   ✅ OAuth app rate limit: ${oauthCore.remaining}/${oauthCore.limit}`);
      } else {
        console.log(`   ⚠️  OAuth response: ${oauthResponse.status} ${oauthResponse.statusText}`);
      }
    } catch (error) {
      console.log(`   ❌ OAuth test error: ${error.message}`);
    }
  } else {
    console.log('   ⚠️  OAuth credentials not configured');
  }

  console.log('\n🔧 3. Recommendations');
  console.log('─────────────────────────────────────────────');
  
  // Check if we can make a simple request
  try {
    const testResponse = await fetch('https://api.github.com/zen');
    if (testResponse.status === 403) {
      console.log('❌ CRITICAL: Your IP is completely rate limited');
      console.log('   Solutions:');
      console.log('   1. Wait 1 hour for IP rate limit to reset');
      console.log('   2. Use a different network/IP address');
      console.log('   3. Use a Personal Access Token (higher limits)');
      console.log('   4. Use GitHub Codespaces or different environment');
    } else {
      console.log('✅ Basic GitHub API access is working');
      console.log('   The OAuth issue might be specific to user profile fetching');
      console.log('   Try using a Personal Access Token for higher limits');
    }
  } catch (error) {
    console.log(`❌ Network error: ${error.message}`);
  }

  console.log('\n💡 Next Steps:');
  console.log('─────────────────────────────────────────────');
  console.log('1. If IP is rate limited: Wait 1 hour or change network');
  console.log('2. Add Personal Access Token to .env file:');
  console.log('   GITHUB_TOKEN=your_personal_access_token');
  console.log('3. Create token at: https://github.com/settings/tokens');
  console.log('4. Required scopes: repo, user:email');
  console.log('5. Restart server after adding token');
}

// Run diagnosis
diagnoseRateLimit().catch(console.error);
