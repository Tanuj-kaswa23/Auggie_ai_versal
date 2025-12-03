#!/usr/bin/env node

/**
 * OAuth Flow and Rate Limit Testing Script
 * 
 * This script tests the OAuth implementation and rate limit handling
 * to ensure the multi-user system works correctly.
 */

require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

class OAuthTester {
  constructor() {
    this.testResults = [];
  }

  async runTest(testName, testFunction) {
    console.log(`\n🧪 Running test: ${testName}`);
    console.log('─'.repeat(50));
    
    try {
      const startTime = Date.now();
      const result = await testFunction();
      const duration = Date.now() - startTime;
      
      this.testResults.push({
        name: testName,
        status: 'PASS',
        duration,
        result
      });
      
      console.log(`✅ PASS (${duration}ms)`);
      return result;
    } catch (error) {
      this.testResults.push({
        name: testName,
        status: 'FAIL',
        error: error.message
      });
      
      console.log(`❌ FAIL: ${error.message}`);
      throw error;
    }
  }

  async testServerHealth() {
    const response = await axios.get(`${BASE_URL}/auth/user`);
    if (response.status !== 200) {
      throw new Error(`Server health check failed: ${response.status}`);
    }
    return { status: 'Server is running', oauthConfigured: response.data.oauthConfigured };
  }

  async testOAuthConfiguration() {
    const response = await axios.get(`${BASE_URL}/auth/user`);
    const data = response.data;
    
    if (!data.oauthConfigured) {
      throw new Error('OAuth is not configured. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET');
    }
    
    return { oauthConfigured: true };
  }

  async testRateLimitEndpoint() {
    const response = await axios.get(`${BASE_URL}/auth/rate-limit`);
    const data = response.data;
    
    if (!data.global) {
      throw new Error('Rate limit endpoint not returning expected data structure');
    }
    
    console.log(`   Global rate limit: ${data.global.requestCount} requests made`);
    console.log(`   Time until reset: ${data.global.timeUntilResetMinutes} minutes`);
    
    return data;
  }

  async testAdminStatus() {
    try {
      const response = await axios.get(`${BASE_URL}/admin/status`);
      const data = response.data;
      
      console.log(`   Server uptime: ${Math.floor(data.server.uptime / 60)} minutes`);
      console.log(`   Active users: ${data.users.active}`);
      console.log(`   Cache entries: ${data.cache.totalEntries}`);
      console.log(`   Memory usage: ${data.memory.used}MB / ${data.memory.total}MB`);
      
      return data;
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('   Admin endpoint requires authentication (expected in production)');
        return { adminProtected: true };
      }
      throw error;
    }
  }

  async testGitHubAPIWithoutAuth() {
    try {
      const response = await axios.get(`${BASE_URL}/github/repos`);
      throw new Error('GitHub API should require authentication');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('   ✅ GitHub API correctly requires authentication');
        return { authRequired: true };
      }
      throw error;
    }
  }

  async testRateLimitProtection() {
    // Test the rate limit manager directly
    const rateLimitManager = require('./rateLimitManager');
    
    // Test cache functionality
    const testKey = 'test-user:test-endpoint:param=value';
    const testData = { test: 'data', timestamp: Date.now() };
    
    rateLimitManager.cacheResponse(testKey, testData, 1000); // 1 second TTL
    
    const cachedData = rateLimitManager.getCachedResponse(testKey);
    if (!cachedData || cachedData.test !== testData.test) {
      throw new Error('Cache functionality not working correctly');
    }
    
    // Wait for cache to expire
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    const expiredData = rateLimitManager.getCachedResponse(testKey);
    if (expiredData) {
      throw new Error('Cache expiration not working correctly');
    }
    
    console.log('   ✅ Cache functionality working correctly');
    
    // Test rate limit checking
    const canMakeRequest = rateLimitManager.canMakeRequest('test-user');
    if (!canMakeRequest.allowed) {
      throw new Error('Rate limit check should allow requests for new user');
    }
    
    console.log('   ✅ Rate limit checking working correctly');
    
    return { cacheWorking: true, rateLimitWorking: true };
  }

  async testSessionGeneration() {
    // Test that session IDs are being generated correctly
    const response1 = await axios.get(`${BASE_URL}/github/status`);
    const response2 = await axios.get(`${BASE_URL}/github/status`);
    
    if (!response1.data.sessionId || !response2.data.sessionId) {
      throw new Error('Session IDs not being generated');
    }
    
    // Sessions should be different for different requests (no cookies)
    console.log(`   Session ID format: ${response1.data.sessionId.substring(0, 20)}...`);
    
    return { sessionGeneration: true };
  }

  async runAllTests() {
    console.log('🚀 Starting OAuth Flow and Rate Limit Tests');
    console.log('═'.repeat(60));
    
    try {
      await this.runTest('Server Health Check', () => this.testServerHealth());
      await this.runTest('OAuth Configuration', () => this.testOAuthConfiguration());
      await this.runTest('Rate Limit Endpoint', () => this.testRateLimitEndpoint());
      await this.runTest('Admin Status Endpoint', () => this.testAdminStatus());
      await this.runTest('GitHub API Authentication', () => this.testGitHubAPIWithoutAuth());
      await this.runTest('Rate Limit Protection', () => this.testRateLimitProtection());
      await this.runTest('Session Generation', () => this.testSessionGeneration());
      
    } catch (error) {
      console.log(`\n❌ Test suite failed: ${error.message}`);
    }
    
    this.printSummary();
  }

  printSummary() {
    console.log('\n📊 Test Summary');
    console.log('═'.repeat(60));
    
    const passed = this.testResults.filter(t => t.status === 'PASS').length;
    const failed = this.testResults.filter(t => t.status === 'FAIL').length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${Math.round((passed / this.testResults.length) * 100)}%`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(t => t.status === 'FAIL')
        .forEach(test => {
          console.log(`   - ${test.name}: ${test.error}`);
        });
    }
    
    console.log('\n🎯 Next Steps:');
    if (failed === 0) {
      console.log('   ✅ All tests passed! Your OAuth-only setup is working correctly.');
      console.log('   🚀 You can now test the OAuth flow in your browser:');
      console.log('      1. Open http://localhost:3000');
      console.log('      2. Click "Login with GitHub OAuth"');
      console.log('      3. Complete the OAuth flow');
      console.log('      4. Test repository access');
    } else {
      console.log('   🔧 Fix the failed tests before proceeding');
      console.log('   📖 Check the deployment guide for troubleshooting');
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new OAuthTester();
  tester.runAllTests().catch(console.error);
}

module.exports = OAuthTester;
