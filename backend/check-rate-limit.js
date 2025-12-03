#!/usr/bin/env node

/**
 * GitHub Rate Limit Checker
 * 
 * This script checks the current GitHub API rate limit status
 * and provides information about when you can retry OAuth authentication.
 */

require('dotenv').config();
const { Octokit } = require('@octokit/rest');

async function checkGitHubRateLimit() {
  console.log('🔍 Checking GitHub API rate limit status...\n');

  try {
    // Check rate limit without authentication first (to see unauthenticated limits)
    console.log('📡 Checking unauthenticated rate limit...');
    const response = await fetch('https://api.github.com/rate_limit');

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const rateLimit = await response.json();
    
    console.log('📊 Rate Limit Status:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Core API limits
    const core = rateLimit.rate;
    const coreUsed = core.limit - core.remaining;
    const coreResetTime = new Date(core.reset * 1000);
    const coreMinutesUntilReset = Math.ceil((coreResetTime - new Date()) / (1000 * 60));
    
    console.log(`🔧 Core API:`);
    console.log(`   Used: ${coreUsed}/${core.limit} requests`);
    console.log(`   Remaining: ${core.remaining} requests`);
    console.log(`   Resets at: ${coreResetTime.toLocaleString()}`);
    console.log(`   Time until reset: ${Math.max(0, coreMinutesUntilReset)} minutes`);
    
    if (core.remaining === 0) {
      console.log('   ❌ RATE LIMITED - Core API exhausted');
    } else if (core.remaining < 100) {
      console.log('   ⚠️  WARNING - Low remaining requests');
    } else {
      console.log('   ✅ OK - Sufficient requests remaining');
    }
    
    console.log();
    
    // Search API limits (if available)
    if (rateLimit.search) {
      const search = rateLimit.search;
      const searchUsed = search.limit - search.remaining;
      const searchResetTime = new Date(search.reset * 1000);
      const searchMinutesUntilReset = Math.ceil((searchResetTime - new Date()) / (1000 * 60));
      
      console.log(`🔍 Search API:`);
      console.log(`   Used: ${searchUsed}/${search.limit} requests`);
      console.log(`   Remaining: ${search.remaining} requests`);
      console.log(`   Resets at: ${searchResetTime.toLocaleString()}`);
      console.log(`   Time until reset: ${Math.max(0, searchMinutesUntilReset)} minutes`);
      
      if (search.remaining === 0) {
        console.log('   ❌ RATE LIMITED - Search API exhausted');
      } else {
        console.log('   ✅ OK - Search API available');
      }
    }
    
    console.log('\n💡 Recommendations:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (core.remaining === 0) {
      console.log(`⏰ Wait ${coreMinutesUntilReset} minutes before trying OAuth again`);
      console.log('🔄 Rate limits reset every hour');
      console.log('📱 Consider using a Personal Access Token for higher limits');
    } else if (core.remaining < 100) {
      console.log('⚠️  You\'re close to the rate limit. Use API calls sparingly.');
    } else {
      console.log('✅ You should be able to authenticate with GitHub OAuth now');
      console.log('🚀 Try running your application again');
    }
    
  } catch (error) {
    console.error('❌ Error checking rate limit:', error.message);
    
    if (error.status === 401) {
      console.log('\n💡 This might be due to invalid OAuth credentials.');
      console.log('   Check your GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in .env');
    } else if (error.status === 403) {
      console.log('\n🚫 Rate limit exceeded - you\'ll need to wait before checking again');
      console.log('   This is likely the same issue affecting your OAuth authentication');
    }
  }
}

// Run the check
checkGitHubRateLimit().catch(console.error);
