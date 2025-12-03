import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { FaGithub, FaLock, FaUnlock, FaStar, FaCodeBranch, FaSearch, FaDownload, FaSync } from 'react-icons/fa';
import GitHubAuth from './GitHubAuth';

const GitHubRepos = ({ onRepoSelect, selectedRepo }) => {

  const [repos, setRepos] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('my-repos');
  const [cloneLoading, setCloneLoading] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState(null);

  const handleAuthChange = useCallback((authenticated, userData) => {
    console.log('🔄 GitHubRepos: Auth change detected', { authenticated, user: userData?.username });
    setIsAuthenticated(authenticated);

    if (!authenticated) {
      // Clear data when user logs out
      setRepos([]);
      setSearchResults([]);
      setError(null);
      setRateLimitInfo(null);
    }
    // Don't automatically fetch repos on auth change to prevent rate limit issues
    // User will need to manually refresh or switch tabs
  },[]);


  const fetchMyRepos = useCallback(async () => {
    console.log('📦 Fetching user repositories...');
    setLoading(true);
    setError(null); // Clear previous errors

    try {
      const response = await axios.get('http://localhost:5000/github/repos', {
        withCredentials: true,
        timeout: 10000 // 10 second timeout
      });

      console.log(`✅ Fetched ${response.data.repos?.length || 0} repositories`);
      setRepos(response.data.repos || []);
    } catch (error) {
      console.error('❌ Error fetching repositories:', error);

      if (error.code === 'ECONNABORTED') {
        setError('Request timed out. Please check your connection and try again.');
      } else if (error.response?.status === 401) {
        setError('Your session has expired. Please login again with GitHub to access your repositories.');
        // Trigger re-authentication
        handleAuthChange(false, null);
      } else if (error.response?.status === 429 && error.response?.data?.rateLimitExceeded) {
        const message = error.response.data.message || 'GitHub API rate limit exceeded';
        setError(`⏰ ${message}. Please wait before making more requests.`);
        setRateLimitInfo({
          resetTime: error.response.data.resetTime,
          message: error.response.data.message
        });
      } else if (error.response?.status >= 500) {
        setError('Server error. Please try again in a few moments.');
      } else {
        setError('Failed to fetch repositories. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [handleAuthChange]);

  useEffect(() => {
    // Only fetch repos when user explicitly switches to my-repos tab and is authenticated
    if (activeTab === 'my-repos' && isAuthenticated && repos.length === 0) {
      // Add a small delay to ensure authentication is fully settled
      const timer = setTimeout(() => {
        fetchMyRepos();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [activeTab, isAuthenticated, fetchMyRepos, repos.length]); // Only depend on these stable values

  
  

  const searchRepos = async () => {
    if (!searchQuery.trim()) return;

    console.log(`🔍 Searching repositories for: "${searchQuery}"`);
    setLoading(true);
    setError(null); // Clear previous errors

    try {
      const response = await axios.get(`http://localhost:5000/github/search?q=${encodeURIComponent(searchQuery)}`, {
        withCredentials: true,
        timeout: 10000 // 10 second timeout
      });

      console.log(`✅ Found ${response.data.repos?.length || 0} search results`);
      setSearchResults(response.data.repos || []);
      setActiveTab('search');
    } catch (error) {
      console.error('❌ Error searching repositories:', error);

      if (error.code === 'ECONNABORTED') {
        setError('Search request timed out. Please try again.');
      } else if (error.response?.status === 401) {
        setError('Your session has expired. Please login again with GitHub to search repositories.');
        handleAuthChange(false, null);
      } else if (error.response?.status === 429 && error.response?.data?.rateLimitExceeded) {
        const message = error.response.data.message || 'GitHub API rate limit exceeded';
        setError(`⏰ ${message}. Please wait before making more requests.`);
        setRateLimitInfo({
          resetTime: error.response.data.resetTime,
          message: error.response.data.message
        });
      } else if (error.response?.status >= 500) {
        setError('Server error during search. Please try again in a few moments.');
      } else {
        setError('Failed to search repositories. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const cloneRepo = async (repo) => {
    console.log('🔄 Starting clone process for:', repo.full_name);

    const localPath = prompt(`Enter local path to clone ${repo.full_name}:`,
      `C:\\Users\\Username\\Projects\\${repo.name}`);

    if (!localPath) {
      console.log('❌ Clone cancelled - no path provided');
      return;
    }

    console.log('📁 Clone destination:', localPath);
    setCloneLoading(repo.id);
    setError(null); // Clear any previous errors

    try {
      console.log('🚀 Sending clone request...');
      const response = await axios.post('http://localhost:5000/github/clone', {
        repoUrl: repo.clone_url,
        localPath: localPath
      }, {
        withCredentials: true, // Include session cookies
        timeout: 30000 // 30 second timeout for cloning
      });

      console.log('✅ Clone successful:', response.data);
      alert(`Repository cloned successfully to ${localPath}`);
      onRepoSelect({ ...repo, localPath });
    } catch (error) {
      console.error('❌ Clone error:', error);

      let errorMessage = 'Failed to clone repository';

      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Clone request timed out. Large repositories may take longer.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication required. Please login again.';
        handleAuthChange(false, null);
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError(`Clone failed: ${errorMessage}`);
      alert(`Failed to clone repository: ${errorMessage}`);
    } finally {
      setCloneLoading(null);
    }
  };

  const RepoCard = ({ repo }) => (
    <div 
      className={`repo-card ${selectedRepo?.id === repo.id ? 'selected' : ''}`}
      onClick={() => onRepoSelect(repo)}
    >
      <div className="repo-header">
        <div className="repo-name">
          <FaGithub className="github-icon" />
          <span className="full-name">{repo.full_name}</span>
          {repo.private ? <FaLock className="private-icon" /> : <FaUnlock className="public-icon" />}
        </div>
        <button
          className="clone-btn"
          onClick={(e) => {
            e.stopPropagation();
            console.log('🖱️ Clone button clicked for:', repo.full_name);
            cloneRepo(repo);
          }}
          disabled={cloneLoading === repo.id}
          title={cloneLoading === repo.id ? 'Cloning...' : 'Clone repository'}
        >
          {cloneLoading === repo.id ? (
            <span className="cloning">
              <FaDownload className="spinning" /> Cloning...
            </span>
          ) : (
            <FaDownload />
          )}
        </button>
      </div>
      
      {repo.description && (
        <p className="repo-description">{repo.description}</p>
      )}
      
      <div className="repo-meta">
        {repo.language && <span className="language">{repo.language}</span>}
        {repo.stars !== undefined && (
          <span className="stars">
            <FaStar /> {repo.stars}
          </span>
        )}
        {repo.forks !== undefined && (
          <span className="forks">
            <FaCodeBranch /> {repo.forks}
          </span>
        )}
      </div>
    </div>
  );

  const currentRepos = activeTab === 'my-repos' ? repos : searchResults;

  return (
    <div className="github-repos">
      <div className="repos-header">
        <h3><FaGithub /> GitHub Repositories</h3>
        <GitHubAuth onAuthChange={handleAuthChange} />
      </div>

      {!isAuthenticated ? (
        <div className="auth-required">
          <p>Please login with GitHub to access repositories</p>
        </div>
      ) : (
        <>
          {error && (
            <div className="error-message">
              <p>{error}</p>
              <button onClick={() => {
                setError(null);
                setRateLimitInfo(null);
              }}>Dismiss</button>
            </div>
          )}

          {rateLimitInfo && (
            <div className="rate-limit-info">
              <p>⏰ GitHub API rate limit exceeded</p>
              <p>{rateLimitInfo.message}</p>
              <small>You can make requests again after the reset time.</small>
            </div>
          )}
          <div className="search-bar">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search repositories..."
              onKeyPress={(e) => e.key === 'Enter' && searchRepos()}
            />
            <button onClick={searchRepos} disabled={loading}>
              <FaSearch />
            </button>
          </div>

          <div className="tabs">
            <button
              className={activeTab === 'my-repos' ? 'active' : ''}
              onClick={() => setActiveTab('my-repos')}
            >
              My Repositories
            </button>
            <button
              className={activeTab === 'search' ? 'active' : ''}
              onClick={() => setActiveTab('search')}
            >
              Search Results
            </button>
            {activeTab === 'my-repos' && (
              <button
                className="refresh-btn"
                onClick={fetchMyRepos}
                disabled={loading}
                title="Refresh repositories"
              >
                <FaSync className={loading ? 'spinning' : ''} />
              </button>
            )}
          </div>

          <div className="repos-list">
            {loading ? (
              <div className="loading">Loading repositories...</div>
            ) : currentRepos.length > 0 ? (
              currentRepos.map(repo => (
                <RepoCard key={repo.id} repo={repo} />
              ))
            ) : (
              <div className="no-repos">
                {activeTab === 'my-repos' ? 'No repositories found' : 'No search results'}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default GitHubRepos;
