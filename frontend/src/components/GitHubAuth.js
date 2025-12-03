import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaGithub, FaSignOutAlt } from 'react-icons/fa';
import config from '../config';

const GitHubAuth = ({ onAuthChange }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [oauthConfigured, setOauthConfigured] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState(null);

  useEffect(() => {
    const checkAuth = async (retryCount = 0) => {
      try {
        console.log('🔍 Checking authentication status...');
        const response = await axios.get(config.getApiUrl('auth/user'), {
          withCredentials: true
        });

        console.log('📋 Auth response:', response.data);
        setUser(response.data.authenticated ? response.data.user : null);
        setOauthConfigured(response.data.oauthConfigured !== false);
        setRateLimitInfo(response.data.rateLimit);
        onAuthChange(response.data.authenticated, response.data.user);
      } catch (error) {
        console.error('Error checking auth status:', error);
        setUser(null);
        onAuthChange(false, null);
      } finally {
        setLoading(false);
      }
    };

    // Check for OAuth callback parameters first
    const urlParams = new URLSearchParams(window.location.search);
    const authStatus = urlParams.get('auth');
    const errorType = urlParams.get('error');

    if (authStatus === 'failed') {
      let errorMessage = 'GitHub authentication failed. Please try again.';
      if (errorType === 'ratelimit') {
        const resetTime = urlParams.get('resetTime');
        errorMessage = resetTime
          ? `GitHub API rate limit exceeded. Please wait until ${new Date(resetTime).toLocaleTimeString()} and try again.`
          : 'GitHub API rate limit exceeded. Please wait a few minutes and try again.';
      } else if (errorType === 'config') {
        errorMessage = 'OAuth configuration error. Please contact your administrator.';
      } else if (errorType === 'oauth') {
        errorMessage = 'GitHub OAuth authentication failed. Please try again or contact support if the issue persists.';
      }
      alert(errorMessage);
      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      checkAuth();
    } else if (authStatus === 'success') {
      console.log('✅ OAuth success detected, checking auth with retry...');
      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);

      // Simplified authentication check with reduced retries
      const retryAuth = async (attempt = 0) => {
        const maxRetries = 2; // Reduced from 5 to 2
        const delay = 1000; // Fixed 1 second delay instead of exponential backoff

        try {
          console.log(`🔄 Auth check attempt ${attempt + 1}/${maxRetries}`);
          const response = await axios.get(config.getApiUrl('auth/user'), {
            withCredentials: true,
            timeout: 5000 // 5 second timeout
          });

          if (response.data.authenticated) {
            console.log('✅ Authentication successful!');
            setUser(response.data.user);
            setOauthConfigured(response.data.oauthConfigured !== false);
            setRateLimitInfo(response.data.rateLimit);
            onAuthChange(true, response.data.user);
            setLoading(false);
          } else if (attempt < maxRetries - 1) {
            console.log(`⏳ Not authenticated yet, retrying in ${delay}ms...`);
            setTimeout(() => retryAuth(attempt + 1), delay);
          } else {
            console.log('❌ Authentication failed after retries');
            setUser(null);
            onAuthChange(false, null);
            setLoading(false);
          }
        } catch (error) {
          console.error(`❌ Auth check attempt ${attempt + 1} failed:`, error);
          if (attempt < maxRetries - 1 && !error.code === 'ECONNABORTED') {
            setTimeout(() => retryAuth(attempt + 1), delay);
          } else {
            console.log('❌ Authentication check failed - stopping retries');
            setUser(null);
            onAuthChange(false, null);
            setLoading(false);
          }
        }
      };

      retryAuth();
    } else {
      // Normal auth check
      checkAuth();
    }
  }, [onAuthChange]);



  const handleLogin = () => {
    // Redirect to GitHub OAuth
    window.location.href = config.getApiUrl('auth/github');
  };

  const handleLogout = async () => {
    try {
      await axios.post(config.getApiUrl('auth/logout'), {}, {
        withCredentials: true
      });
      setUser(null);
      onAuthChange(false, null);
    } catch (error) {
      console.error('Error logging out:', error);
      alert('Failed to logout. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="github-auth loading">
        <div className="auth-spinner">Loading...</div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="github-auth authenticated">
        <div className="user-info">
          {user.avatarUrl && (
            <img src={user.avatarUrl} alt="GitHub Avatar" className="user-avatar" />
          )}
          <div className="user-details">
            <span className="username">{user.displayName || user.username}</span>
            <span className="github-handle">@{user.username}</span>
            {user.email && <span className="email">{user.email}</span>}
            <span className="auth-status">✓ OAuth Authenticated</span>
            {rateLimitInfo && rateLimitInfo.user && (
              <span className="rate-limit-info" title={`Rate limit resets at ${new Date(rateLimitInfo.user.reset).toLocaleTimeString()}`}>
                API: {rateLimitInfo.user.remaining}/{rateLimitInfo.user.limit}
              </span>
            )}
          </div>
        </div>
        <button className="logout-btn" onClick={handleLogout} title="Logout">
          <FaSignOutAlt />
        </button>
      </div>
    );
  }

  if (!oauthConfigured) {
    return (
      <div className="github-auth unauthenticated">
        <div className="login-prompt">
          <FaGithub className="github-icon" />
          <h3>Authentication Setup Required</h3>
          <p>This application requires GitHub OAuth to be configured by the administrator.</p>
          <p>Please contact your system administrator to complete the setup.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="github-auth unauthenticated">
      <div className="login-prompt">
        <FaGithub className="github-icon" />
        <h3>GitHub OAuth Authentication</h3>
        <p>🔐 Secure OAuth-based GitHub integration</p>
        <p>Sign in with your GitHub account to access your repositories</p>
        <button className="login-btn" onClick={handleLogin}>
          <FaGithub />
          Login with GitHub OAuth
        </button>
      </div>
    </div>
  );
};

export default GitHubAuth;
