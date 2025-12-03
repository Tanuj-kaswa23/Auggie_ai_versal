# GitHub OAuth Setup Instructions

To enable GitHub authentication in your application, you need to create a GitHub OAuth App and configure the environment variables.

## Step 1: Create a GitHub OAuth App

1. Go to GitHub Settings: https://github.com/settings/applications/new
2. Fill in the application details:
   - **Application name**: `Auggie AI CLI UI` (or any name you prefer)
   - **Homepage URL**: `http://localhost:3000`
   - **Application description**: `AI-powered code assistant with GitHub integration`
   - **Authorization callback URL**: `http://localhost:5000/auth/github/callback`

3. Click "Register application"

## Step 2: Get Your OAuth Credentials

After creating the app, you'll see:
- **Client ID**: Copy this value
- **Client Secret**: Click "Generate a new client secret" and copy the generated secret

## Step 3: Update Environment Variables

Edit the `.env` file in the backend directory and replace the placeholder values:

```env
# GitHub OAuth App Configuration
GITHUB_CLIENT_ID=your_actual_client_id_here
GITHUB_CLIENT_SECRET=your_actual_client_secret_here

# Session configuration (generate a random string)
SESSION_SECRET=your_super_secret_session_key_here
```

## Step 4: Generate a Session Secret

For the SESSION_SECRET, generate a random string. You can use:
- Online generator: https://www.allkeysgenerator.com/Random/Security-Encryption-Key-Generator.aspx
- Or run this in Node.js: `require('crypto').randomBytes(64).toString('hex')`

## Step 5: Start the Application

1. Start the backend:
   ```bash
   cd backend
   npm start
   ```

2. Start the frontend:
   ```bash
   cd frontend
   npm start
   ```

## Testing the Authentication Flow

1. Open http://localhost:3000
2. Click on the "GitHub" tab
3. You should see a "Login with GitHub" button
4. Click it to authenticate with GitHub
5. After successful authentication, you should see your repositories

## Troubleshooting

- Make sure the callback URL in your GitHub OAuth app matches exactly: `http://localhost:5000/auth/github/callback`
- Ensure both frontend and backend are running
- Check browser console and backend logs for any errors
- Verify that your .env file has the correct values and no extra spaces
