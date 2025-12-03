/**
 * Custom GitHub OAuth Implementation
 * 
 * This bypasses passport-github2 to avoid rate limit issues
 * during the profile fetch step.
 */

require('dotenv').config();

class CustomGitHubOAuth {
  constructor() {
    this.clientId = process.env.GITHUB_CLIENT_ID;
    this.clientSecret = process.env.GITHUB_CLIENT_SECRET;
    this.redirectUri = 'http://localhost:5001/auth/github/callback';
  }

  // Generate OAuth authorization URL
  getAuthorizationUrl(state = null) {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'user:email repo',
      response_type: 'code'
    });

    if (state) {
      params.append('state', state);
    }

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  // Exchange authorization code for access token
  async exchangeCodeForToken(code) {
    try {
      console.log('🔄 Exchanging authorization code for access token...');
      
      const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Augment-CLI-UI-App/1.0'
        },
        body: JSON.stringify({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code: code,
          redirect_uri: this.redirectUri
        })
      });

      if (!response.ok) {
        throw new Error(`Token exchange failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(`OAuth error: ${data.error} - ${data.error_description}`);
      }

      console.log('✅ Access token obtained successfully');
      return data.access_token;
    } catch (error) {
      console.error('❌ Token exchange error:', error.message);
      throw error;
    }
  }

  // Get user profile with minimal API calls
  async getUserProfile(accessToken) {
    try {
      console.log('👤 Fetching user profile with rate limit protection...');
      
      // Use authenticated request with higher rate limits
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Augment-CLI-UI-App/1.0'
        }
      });

      if (response.status === 403) {
        // Check if it's a rate limit issue
        const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
        const rateLimitReset = response.headers.get('x-ratelimit-reset');
        
        if (rateLimitRemaining === '0') {
          const resetTime = new Date(rateLimitReset * 1000);
          throw new Error(`Rate limit exceeded. Resets at ${resetTime.toLocaleString()}`);
        }
        
        const errorText = await response.text();
        throw new Error(`GitHub API error: ${response.status} - ${errorText}`);
      }

      if (!response.ok) {
        throw new Error(`Profile fetch failed: ${response.status} ${response.statusText}`);
      }

      const profile = await response.json();
      
      console.log('✅ User profile fetched successfully');
      console.log(`   Username: ${profile.login}`);
      console.log(`   Name: ${profile.name || 'Not set'}`);
      console.log(`   Email: ${profile.email || 'Private'}`);

      // Return standardized user object
      return {
        id: profile.id.toString(),
        username: profile.login,
        displayName: profile.name || profile.login,
        profileUrl: profile.html_url,
        avatarUrl: profile.avatar_url,
        email: profile.email,
        accessToken: accessToken,
        loginTime: new Date().toISOString(),
        rawProfile: {
          nodeId: profile.node_id,
          type: profile.type,
          publicRepos: profile.public_repos,
          followers: profile.followers,
          following: profile.following
        }
      };
    } catch (error) {
      console.error('❌ Profile fetch error:', error.message);
      throw error;
    }
  }

  // Complete OAuth flow
  async completeOAuthFlow(code) {
    try {
      const accessToken = await this.exchangeCodeForToken(code);
      const user = await this.getUserProfile(accessToken);
      return user;
    } catch (error) {
      console.error('❌ OAuth flow error:', error.message);
      throw error;
    }
  }
}

module.exports = CustomGitHubOAuth;
