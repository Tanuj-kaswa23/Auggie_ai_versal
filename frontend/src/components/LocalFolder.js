import React, { useState } from 'react';
import axios from 'axios';
import { FaFolder, FaFolderOpen, FaCheck, FaTimes } from 'react-icons/fa';

const LocalFolder = ({ onFolderSelect, selectedFolder }) => {
  const [folderPath, setFolderPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [folderInfo, setFolderInfo] = useState(null);
  const [error, setError] = useState('');

  const handlePathChange = (e) => {
    setFolderPath(e.target.value);
    setError('');
  };

  const validateAndSetFolder = async () => {
    if (!folderPath.trim()) {
      setError('Please enter a folder path');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post('http://localhost:5000/upload-folder', {
        folder: folderPath.trim()
      });

      const folderData = {
        type: 'local',
        path: response.data.folderPath,
        files: response.data.files,
        name: folderPath.split('\\').pop() || folderPath.split('/').pop() || 'Root'
      };

      setFolderInfo(folderData);
      onFolderSelect(folderData);
    } catch (error) {
      console.error('Error setting folder:', error);
      setError(error.response?.data?.error || 'Failed to access folder');
      setFolderInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      validateAndSetFolder();
    }
  };

  const clearFolder = () => {
    setFolderPath('');
    setFolderInfo(null);
    setError('');
    onFolderSelect(null);
  };

  return (
    <div className="local-folder">
      <div className="folder-header">
        <h3><FaFolder /> Local Folder</h3>
      </div>

      <div className="folder-input-section">
        <div className="input-group">
          <input
            type="text"
            value={folderPath}
            onChange={handlePathChange}
            onKeyPress={handleKeyPress}
            placeholder="Enter folder path (e.g., C:\Users\Username\Projects\my-project)"
            className={error ? 'error' : ''}
          />
          <button 
            onClick={validateAndSetFolder}
            disabled={loading || !folderPath.trim()}
            className="set-folder-btn"
          >
            {loading ? '...' : <FaCheck />}
          </button>
          {folderInfo && (
            <button onClick={clearFolder} className="clear-folder-btn">
              <FaTimes />
            </button>
          )}
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* <div className="quick-paths">
          <label>Quick paths:</label>
          <div className="path-buttons">
            {commonPaths.map((path, index) => (
              <button
                key={index}
                onClick={() => setFolderPath(path)}
                className="path-btn"
              >
                {path.split('\\').pop()}
              </button>
            ))}
          </div>
        </div> */}
      </div>

      {folderInfo && (
        <div className="folder-info">
          <div className="folder-details">
            <div className="folder-name">
              <FaFolderOpen className="folder-icon" />
              <span>{folderInfo.name}</span>
            </div>
            <div className="folder-path">{folderInfo.path}</div>
            <div className="file-count">
              {folderInfo.files.length} items
            </div>
          </div>

          {folderInfo.files.length > 0 && (
            <div className="file-preview">
              <h4>Contents:</h4>
              <div className="file-list">
                {folderInfo.files.slice(0, 10).map((file, index) => (
                  <div key={index} className="file-item">
                    {file}
                  </div>
                ))}
                {folderInfo.files.length > 10 && (
                  <div className="file-item more">
                    ... and {folderInfo.files.length - 10} more items
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="folder-tips">
        <h4>Tips:</h4>
        <ul>
          <li>Use absolute paths for best results</li>
          <li>Make sure the folder exists and is accessible</li>
          <li>Works with any local directory containing code</li>
        </ul>
      </div>
    </div>
  );
};

export default LocalFolder;
