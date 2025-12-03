// Simple test script to verify GitHub integration
require('dotenv').config();
const { Octokit } = require('@octokit/rest');

async function testGitHubConnection() {
  console.log('Testing GitHub connection...');
  
  if (!process.env.GITHUB_TOKEN) {
    console.error('❌ GITHUB_TOKEN not found in .env file');
    console.log('Please add your GitHub Personal Access Token to the .env file');
    return;
  }

  try {
    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    // Test authentication by getting user info
    const { data: user } = await octokit.rest.users.getAuthenticated();
    console.log(`✅ Successfully authenticated as: ${user.login}`);
    console.log(`   Name: ${user.name || 'Not set'}`);
    console.log(`   Public repos: ${user.public_repos}`);
    console.log(`   Private repos: ${user.total_private_repos || 'Unknown'}`);

    // Test repository listing
    const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser({
      per_page: 5,
      sort: 'updated'
    });

    console.log(`\n📁 Recent repositories (showing first 5):`);
    repos.forEach((repo, index) => {
      console.log(`   ${index + 1}. ${repo.full_name} ${repo.private ? '(private)' : '(public)'}`);
    });

    console.log('\n🎉 GitHub integration is working correctly!');
    
  } catch (error) {
    console.error('❌ GitHub connection failed:', error.message);
    
    if (error.status === 401) {
      console.log('This usually means your GitHub token is invalid or expired.');
      console.log('Please check your token at: https://github.com/settings/tokens');
    }
  }
}

testGitHubConnection();
