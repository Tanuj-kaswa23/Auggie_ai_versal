import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaCheckCircle, FaTimesCircle, FaGithub, FaRobot, FaExclamationTriangle, FaUser, FaFolder } from 'react-icons/fa';
import config from '../config';

const StatusBar = ({ currentWorkspace }) => {
  const [status, setStatus] = useState({
    oauthConfigured: false,
    isAuthenticated: false,
    user: null,
    rateLimit: null,
    loading: true
  });

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await axios.get(config.getApiUrl('auth/user'), {
        withCredentials: true
      });
      setStatus({
        oauthConfigured: response.data.oauthConfigured !== false,
        isAuthenticated: response.data.authenticated,
        user: response.data.user,
        rateLimit: response.data.rateLimit,
        loading: false
      });
    } catch (error) {
      console.error('Error fetching auth status:', error);
      setStatus(prev => ({
        ...prev,
        loading: false,
        oauthConfigured: false,
        isAuthenticated: false
      }));
    }
  };

  if (status.loading) {
    return (
      <div className="status-bar loading">
        <span>Loading status...</span>
      </div>
    );
  }

  return (
    <div className="status-bar">
      <div className="status-items">
        {/* GitHub OAuth Status */}
        <div className={`status-item ${
          !status.oauthConfigured ? 'error' :
          status.isAuthenticated ? 'success' : 'warning'
        }`}>
          <FaGithub className="status-icon" />
          <span>
            GitHub OAuth: {
              !status.oauthConfigured ? 'Not configured' :
              status.isAuthenticated ? 'Connected' : 'Not authenticated'
            }
          </span>
          {!status.oauthConfigured ? (
            <FaTimesCircle className="status-indicator error" />
          ) : status.isAuthenticated ? (
            <FaCheckCircle className="status-indicator success" />
          ) : (
            <FaExclamationTriangle className="status-indicator warning" />
          )}
        </div>

        {/* User Info */}
        {status.isAuthenticated && status.user && (
          <div className="status-item success">
            <FaUser className="status-icon" />
            <span>User: @{status.user.username}</span>
            {status.rateLimit && status.rateLimit.user && (
              <span className="rate-limit-badge" title={`Rate limit resets at ${new Date(status.rateLimit.user.reset).toLocaleTimeString()}`}>
                {status.rateLimit.user.remaining}/{status.rateLimit.user.limit}
              </span>
            )}
            <FaCheckCircle className="status-indicator success" />
          </div>
        )}

        {/* Auggie Status */}
        <div className="status-item success">
          <FaRobot className="status-icon" />
          <span>Auggie: Ready</span>
          <FaCheckCircle className="status-indicator success" />
        </div>

        {/* Current Workspace */}
        <div className={`status-item ${currentWorkspace ? 'success' : 'info'}`}>
          {currentWorkspace?.type === 'github' ? (
            <>
              <FaGithub className="status-icon" />
              <span>Workspace: GitHub - {currentWorkspace.full_name}</span>
              <FaCheckCircle className="status-indicator success" />
            </>
          ) : currentWorkspace?.type === 'local' ? (
            <>
              <FaFolder className="status-icon" />
              <span>Workspace: Local - {currentWorkspace.name || currentWorkspace.path?.split('\\').pop()}</span>
              <FaCheckCircle className="status-indicator success" />
            </>
          ) : (
            <>
              <span>Workspace: None selected</span>
              <FaTimesCircle className="status-indicator info" />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatusBar;
