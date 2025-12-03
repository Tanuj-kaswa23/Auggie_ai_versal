#!/usr/bin/env node

/**
 * Test script to verify clone functionality
 */

const axios = require('axios');

async function testClone() {
  console.log('🧪 Testing clone functionality...');
  
  try {
    // Test without authentication (should fail)
    console.log('\n1. Testing clone without authentication (should fail)...');
    try {
      await axios.post('http://localhost:5000/github/clone', {
        repoUrl: 'https://github.com/octocat/Hello-World.git',
        localPath: 'C:\\temp\\test-clone'
      });
      console.log('❌ ERROR: Clone succeeded without authentication (this should not happen)');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ PASS: Clone correctly requires authentication');
      } else {
        console.log('❌ FAIL: Unexpected error:', error.message);
      }
    }
    
    // Test authentication endpoint
    console.log('\n2. Testing authentication status...');
    const authResponse = await axios.get('http://localhost:5000/auth/user');
    console.log('Auth status:', authResponse.data);
    
    if (!authResponse.data.authenticated) {
      console.log('\n⚠️  To test clone with authentication:');
      console.log('   1. Open http://localhost:3000');
      console.log('   2. Login with GitHub OAuth');
      console.log('   3. Try cloning a repository');
      console.log('   4. Check browser console for detailed logs');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

if (require.main === module) {
  testClone();
}

module.exports = testClone;
