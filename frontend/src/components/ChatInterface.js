import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { FaUser, FaRobot, FaPaperPlane, FaFolder, FaGithub } from 'react-icons/fa';

const ChatInterface = ({ currentWorkspace }) => {
  const [chat, setChat] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat]);

  const handleSend = async () => {
    if (!query.trim()) return;
    if (!currentWorkspace) {
      alert('Please select a folder or repository first');
      return;
    }

    const userMessage = { sender: 'user', text: query, timestamp: new Date() };
    setChat(prev => [...prev, userMessage]);
    setQuery('');
    setLoading(true);

    try {
      const response = await axios.post('http://localhost:5000/query', { query });
      
      const aiMessage = {
        sender: 'ai',
        text: response.data.result,
        timestamp: new Date(),
        code: response.data.code,
        signal: response.data.signal
      };
      
      setChat(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending query:', error);
      const errorMessage = {
        sender: 'ai',
        text: `Error: ${error.response?.data?.error || error.message}`,
        timestamp: new Date(),
        isError: true
      };
      setChat(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatMessage = (text) => {
    // Simple formatting for code blocks and line breaks
    return text.split('\n').map((line, index) => (
      <div key={index}>
        {line.startsWith('```') ? (
          <code className="code-block">{line.replace(/```/g, '')}</code>
        ) : (
          line
        )}
      </div>
    ));
  };

  const clearChat = () => {
    setChat([]);
  };

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <div className="workspace-info">
          <div className="workspace-name">
            {currentWorkspace?.type === 'github' ? (
              <>
                <FaGithub className="workspace-icon" />
                <span>{currentWorkspace.full_name}</span>
                <span className="oauth-badge">OAuth</span>
              </>
            ) : currentWorkspace?.type === 'local' ? (
              <>
                <FaFolder className="workspace-icon" />
                <span>{currentWorkspace.name || currentWorkspace.path?.split('\\').pop()}</span>
              </>
            ) : (
              <>
                <FaFolder className="workspace-icon" />
                <span>No workspace selected</span>
              </>
            )}
          </div>
          {currentWorkspace && (
            <div className="workspace-details">
              {currentWorkspace.type === 'github' && (
                <>
                  {currentWorkspace.description && (
                    <small>{currentWorkspace.description}</small>
                  )}
                  <small>🔐 GitHub OAuth • {currentWorkspace.private ? 'Private' : 'Public'} Repository</small>
                </>
              )}
              {currentWorkspace.type === 'local' && currentWorkspace.path && (
                <small>Local Path: {currentWorkspace.path}</small>
              )}
            </div>
          )}
        </div>
        <button onClick={clearChat} className="clear-btn">Clear Chat</button>
      </div>

      <div className="chat-messages">
        {chat.length === 0 ? (
          <div className="welcome-message">
            <FaRobot className="welcome-icon" />
            <h3>Welcome to Auggie AI!</h3>
            <p>
              {currentWorkspace
                ? currentWorkspace.type === 'github'
                  ? `Ask me anything about your GitHub repository (OAuth authenticated).`
                  : `Ask me anything about your local project.`
                : 'Login with GitHub OAuth or select a local folder to get started.'
              }
            </p>
            {currentWorkspace && (
              <div className="suggested-queries">
                <p>Try asking:</p>
                <ul>
                  <li>"Analyze the code structure"</li>
                  <li>"What does this project do?"</li>
                  <li>"Find potential bugs or improvements"</li>
                  <li>"Explain the main components"</li>
                </ul>
              </div>
            )}
          </div>
        ) : (
          chat.map((message, index) => (
            <div key={index} className={`message ${message.sender} ${message.isError ? 'error' : ''}`}>
              <div className="message-header">
                <div className="sender">
                  {message.sender === 'user' ? <FaUser /> : <FaRobot />}
                  <span>{message.sender === 'user' ? 'You' : 'Auggie'}</span>
                </div>
                <div className="timestamp">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
              <div className="message-content">
                {formatMessage(message.text)}
              </div>
              {message.code !== undefined && (
                <div className="message-meta">
                  Exit code: {message.code}
                </div>
              )}
            </div>
          ))
        )}
        {loading && (
          <div className="message ai loading">
            <div className="message-header">
              <div className="sender">
                <FaRobot />
                <span>Auggie</span>
              </div>
            </div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
              Thinking...
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="chat-input">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={currentWorkspace ? "Ask Auggie about your code..." : "Select a workspace first..."}
          disabled={!currentWorkspace || loading}
          rows="3"
        />
        <button 
          onClick={handleSend} 
          disabled={!query.trim() || !currentWorkspace || loading}
          className="send-btn"
        >
          <FaPaperPlane />
        </button>
      </div>
    </div>
  );
};

export default ChatInterface;
