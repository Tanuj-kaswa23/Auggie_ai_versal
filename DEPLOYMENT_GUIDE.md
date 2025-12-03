# 🚀 Deployment Guide - Augment CLI UI Git

## 📋 Prerequisites

1. **GitHub Account** - For hosting the repository
2. **Vercel Account** - For hosting the application (free tier available)
3. **GitHub OAuth App** - For authentication

## 🌐 Deployment Steps

### Step 1: Push to GitHub

1. Create a new repository on GitHub
2. Push your code:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

### Step 2: Deploy to Vercel

1. **Sign up/Login to Vercel**: https://vercel.com
2. **Import Project**: Click "New Project" → Import from GitHub
3. **Select Repository**: Choose your GitHub repository
4. **Configure Build Settings**:
   - Framework Preset: Other
   - Root Directory: ./
   - Build Command: `cd frontend && npm run build`
   - Output Directory: `frontend/build`

### Step 3: Set Environment Variables in Vercel

Go to your Vercel project → Settings → Environment Variables and add:

```
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
SESSION_SECRET=your_super_secure_random_string
APP_URL=https://your-app-name.vercel.app
FRONTEND_URL=https://your-app-name.vercel.app
NODE_ENV=production
```

### Step 4: Update GitHub OAuth App

1. Go to GitHub → Settings → Developer settings → OAuth Apps
2. Edit your OAuth App
3. Update URLs:
   - Homepage URL: `https://your-app-name.vercel.app`
   - Authorization callback URL: `https://your-app-name.vercel.app/auth/github/callback`

### Step 5: Deploy

1. Vercel will automatically deploy when you push to main branch
2. Your app will be available at: `https://your-app-name.vercel.app`

## 🔧 Configuration Files Created

- `vercel.json` - Vercel deployment configuration
- `frontend/.env.production` - Production environment variables
- `frontend/src/config.js` - API configuration helper
- Updated components to use dynamic API URLs

## 🎯 Features Ready for Production

✅ **OAuth Authentication** - GitHub OAuth with session management
✅ **Isomorphic-git Integration** - No Git installation required
✅ **Dynamic API URLs** - Works in development and production
✅ **CORS Configuration** - Proper cross-origin setup
✅ **Environment Variables** - Secure configuration management
✅ **Error Handling** - Comprehensive error management
✅ **Rate Limiting** - GitHub API rate limit handling

## 🚨 Important Notes

1. **Session Storage**: Currently using memory store. For production scale, consider Redis
2. **File Storage**: Clone operations create files on server filesystem
3. **Security**: All OAuth secrets are properly configured for production
4. **Performance**: Isomorphic-git provides fast, shallow cloning

## 🔍 Testing Deployment

After deployment, test:
1. OAuth login/logout
2. Repository listing
3. Repository cloning
4. Search functionality
5. All UI components

Your application will be fully functional with no Git installation required for users!
