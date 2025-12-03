# GitHub API Rate Limit Troubleshooting Guide

## 🚫 Current Issue: Rate Limit Exceeded

You're experiencing a GitHub API rate limit error during OAuth authentication:
```
API rate limit exceeded for user ID 224994117
```

## 📊 Understanding GitHub Rate Limits

GitHub has different rate limits:
- **Unauthenticated requests**: 60 per hour per IP
- **OAuth app requests**: 5,000 per hour per user
- **Personal access token**: 5,000 per hour per user

## 🔧 Immediate Solutions

### 1. **Wait for Rate Limit Reset** ⏰
- Rate limits reset every hour
- Based on your error (2025-12-02 10:24:00 UTC), wait until 11:24:00 UTC
- Use our monitoring script: `node wait-for-rate-limit.js`

### 2. **Check Current Status** 📊
Run the rate limit checker:
```bash
cd backend
node check-rate-limit.js
```

### 3. **Use Personal Access Token** 🔑 (Recommended)
Create a Personal Access Token for higher limits:

1. Go to: https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scopes: `repo`, `user:email`
4. Copy the token
5. Add to `.env` file:
   ```env
   GITHUB_TOKEN=your_personal_access_token_here
   ```

### 4. **Restart with Improved Rate Limiting** 🚀
Your server now has improved rate limit handling:
```bash
node index.js
```

## 🛠️ Available Tools

### Rate Limit Checker
```bash
node check-rate-limit.js
```
Shows current rate limit status and recommendations.

### Rate Limit Monitor
```bash
node wait-for-rate-limit.js
```
Monitors rate limit and notifies when it's safe to retry.

## 🔍 Debugging Steps

1. **Check if OAuth credentials are correct**:
   - Verify `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in `.env`
   - Ensure callback URL matches: `http://localhost:5000/auth/github/callback`

2. **Monitor server logs**:
   - Look for rate limit warnings
   - Check for authentication errors

3. **Test with rate limit endpoint**:
   ```bash
   curl http://localhost:5000/auth/rate-limit
   ```

## 🚨 Prevention Tips

1. **Use Personal Access Tokens** for development
2. **Implement request caching** to reduce API calls
3. **Monitor rate limit headers** in responses
4. **Use webhooks** instead of polling when possible
5. **Batch API requests** when feasible

## 📞 If Problems Persist

1. Check GitHub Status: https://www.githubstatus.com/
2. Review GitHub API documentation: https://docs.github.com/en/rest/rate-limit
3. Consider using GitHub Apps for higher limits
4. Contact GitHub Support if you believe the rate limiting is incorrect

## 🔄 Next Steps

1. Wait for rate limit reset OR add Personal Access Token
2. Restart your server: `node index.js`
3. Test OAuth authentication in your frontend
4. Monitor rate limit status with provided tools

Your server now has improved rate limit handling and will provide better error messages for future rate limit issues.
