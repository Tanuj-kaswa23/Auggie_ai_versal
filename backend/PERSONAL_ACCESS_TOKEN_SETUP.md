# 🔑 Personal Access Token Setup Guide

## 🚨 Why You Need This

Your GitHub user ID (224994117) has hit the rate limit for OAuth authentication. A Personal Access Token bypasses this limitation and provides **5,000 requests/hour** instead of the limited OAuth rate.

## 📋 Step-by-Step Setup

### 1. Create Personal Access Token

1. **Go to GitHub Settings**:
   - Visit: https://github.com/settings/tokens
   - Or: GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)

2. **Generate New Token**:
   - Click "Generate new token (classic)"
   - Give it a name: `Augment CLI UI Development`
   - Set expiration: `90 days` (or longer)

3. **Select Required Scopes**:
   ```
   ✅ repo (Full control of private repositories)
   ✅ user:email (Access user email addresses)
   ✅ read:user (Read user profile data)
   ```

4. **Generate and Copy Token**:
   - Click "Generate token"
   - **IMPORTANT**: Copy the token immediately (you won't see it again)
   - It looks like: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### 2. Add Token to Environment

1. **Open your .env file**:
   ```bash
   notepad .env
   ```

2. **Add the token**:
   ```env
   # Add this line with your actual token
   GITHUB_TOKEN=ghp_your_actual_token_here
   ```

3. **Save the file**

### 3. Restart Your Server

```bash
# Stop current server (Ctrl+C)
# Then restart:
node index.js
```

## 🔧 Alternative: Quick Setup Script

I'll create a script to test your token:

```bash
node test-personal-token.js
```

## ✅ Verification

After setup, you should see:
- Higher rate limits (5000/hour instead of 60/hour)
- No more OAuth rate limit errors
- Successful authentication

## 🛡️ Security Notes

- **Never commit** your Personal Access Token to git
- **Keep it secure** - treat it like a password
- **Regenerate** if compromised
- **Use minimal scopes** required for your app

## 🚨 If You Still Get Errors

1. **Check token scopes** - ensure `repo` and `user:email` are selected
2. **Verify token format** - should start with `ghp_`
3. **Check expiration** - tokens can expire
4. **Try different GitHub account** if the current one is heavily rate-limited

## 📞 Need Help?

Run these diagnostic commands:
```bash
node diagnose-rate-limit.js
node test-personal-token.js
```

This solution should resolve your rate limit issues permanently for development!
