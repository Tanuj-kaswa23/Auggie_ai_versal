# Augment CLI UI Backend with GitHub Integration

This backend provides a REST API interface for the Augment CLI with integrated GitHub repository access.

## Features

- **Augment CLI Integration**: Execute Augment commands through REST API
- **GitHub Repository Access**: Browse, search, and clone both private and public repositories
- **Local Folder Management**: Work with local directories and cloned repositories
- **Authentication**: Secure GitHub API access with personal access tokens

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure GitHub Access
1. Create a GitHub Personal Access Token:
   - Go to https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Select scopes:
     - `repo` (for private repository access)
     - `public_repo` (for public repository access)
   - Copy the generated token

2. Update the `.env` file:
   ```env
   GITHUB_TOKEN=your_github_personal_access_token_here
   GITHUB_USERNAME=your_github_username
   PORT=5000
   ```

### 3. Start the Server
```bash
npm start
```

## API Endpoints

### GitHub Integration
- `GET /github/repos` - List user's repositories
- `GET /github/search?q=query` - Search repositories
- `GET /github/repo-info?owner=owner&repo=repo` - Get repository details
- `POST /github/clone` - Clone a repository locally
- `GET /github/status` - Get current repository and configuration status

### Augment CLI
- `POST /upload-folder` - Set working directory
- `POST /query` - Execute Augment CLI commands

### Example Usage

#### Clone a Repository
```bash
curl -X POST http://localhost:5000/github/clone \
  -H "Content-Type: application/json" \
  -d '{
    "repoUrl": "https://github.com/username/repo.git",
    "localPath": "C:\\Users\\Username\\Projects\\my-repo"
  }'
```

#### Search Repositories
```bash
curl "http://localhost:5000/github/search?q=javascript+react"
```

#### Execute Augment Query
```bash
curl -X POST http://localhost:5000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "analyze this codebase and suggest improvements"}'
```

## Security Notes

- Keep your GitHub token secure and never commit it to version control
- The `.env` file is gitignored by default
- Use environment variables in production deployments
