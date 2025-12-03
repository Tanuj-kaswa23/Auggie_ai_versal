import React, { useState, useCallback } from 'react';
import './App.css';
import GitHubRepos from './components/GitHubRepos';
import LocalFolder from './components/LocalFolder';
import ChatInterface from './components/ChatInterface';
import StatusBar from './components/StatusBar';
import { FaGithub, FaFolder, FaRobot } from 'react-icons/fa';

function App() {
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [activeTab, setActiveTab] = useState('github');

  const handleRepoSelect = useCallback((repo) => {
    setCurrentWorkspace({
      ...repo,
      type: 'github'
    });
  }, []);

  const handleFolderSelect = useCallback((folder) => {
    setCurrentWorkspace(folder);
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <FaRobot className="logo-icon" />
            <h1>Auggie AI</h1>
            <span className="subtitle">Code Assistant with GitHub Integration</span>
          </div>
          <StatusBar currentWorkspace={currentWorkspace} />
        </div>
      </header>

      <main className="app-main">
        <div className="sidebar">
          <div className="workspace-selector">
            <div className="tabs">
              <button
                className={activeTab === 'github' ? 'active' : ''}
                onClick={() => setActiveTab('github')}
              >
                <FaGithub /> GitHub
              </button>
              <button
                className={activeTab === 'local' ? 'active' : ''}
                onClick={() => setActiveTab('local')}
              >
                <FaFolder /> Local
              </button>
            </div>

            <div className="tab-content">
              {activeTab === 'github' ? (
                <GitHubRepos
                  onRepoSelect={handleRepoSelect}
                  selectedRepo={currentWorkspace?.type === 'github' ? currentWorkspace : null}
                />
              ) : (
                <LocalFolder
                  onFolderSelect={handleFolderSelect}
                  selectedFolder={currentWorkspace?.type === 'local' ? currentWorkspace : null}
                />
              )}
            </div>
          </div>
        </div>

        <div className="main-content">
          <ChatInterface currentWorkspace={currentWorkspace} />
        </div>
      </main>
    </div>
  );
}

export default App;
