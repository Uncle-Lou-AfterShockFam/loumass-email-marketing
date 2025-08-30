# 🔐 Google OAuth Setup Guide for LOUMASS

## Step 1: Access Google Cloud Console
1. Go to: https://console.cloud.google.com/
2. Sign in with your Google account (ljpiotti@aftershockfam.org)

## Step 2: Create or Select a Project
1. Click the project dropdown at the top
2. Either:
   - Select an existing project for LOUMASS, OR
   - Click "New Project" and name it "LOUMASS Beta"

## Step 3: Enable Google APIs
1. Go to "APIs & Services" → "Library"
2. Search and enable these APIs:
   - Google+ API (for OAuth)
   - Gmail API (for email functionality)

## Step 4: Create OAuth 2.0 Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted, configure the OAuth consent screen first:
   - User Type: External
   - App name: LOUMASS
   - User support email: ljpiotti@aftershockfam.org
   - Developer contact: ljpiotti@aftershockfam.org
   - Add scopes: email, profile, openid
   - Add test users: ljpiotti@aftershockfam.org, lou@soberafe.com

## Step 5: Create OAuth Client ID
1. Application type: "Web application"
2. Name: "LOUMASS Web Client"
3. Authorized JavaScript origins:
   ```
   http://localhost:3000
   https://loumassbeta.vercel.app
   ```
4. Authorized redirect URIs:
   ```
   http://localhost:3000/api/auth/callback/google
   https://loumassbeta.vercel.app/api/auth/callback/google
   http://localhost:3000/api/auth/gmail/callback
   https://loumassbeta.vercel.app/api/auth/gmail/callback
   ```
5. Click "Create"

## Step 6: Copy Your Credentials
After creation, you'll see:
- **Client ID**: Something like `123456789-abcdefgh.apps.googleusercontent.com`
- **Client Secret**: Something like `GOCSPX-xxxxxxxxxxxxx`

## Step 7: Update Environment Variables

### Local (.env.local)
```bash
GOOGLE_CLIENT_ID="your-new-client-id"
GOOGLE_CLIENT_SECRET="your-new-client-secret"
```

### Production (Vercel)
Run these commands:
```bash
vercel env rm GOOGLE_CLIENT_ID production -y
vercel env add GOOGLE_CLIENT_ID production
# Paste your new Client ID

vercel env rm GOOGLE_CLIENT_SECRET production -y
vercel env add GOOGLE_CLIENT_SECRET production
# Paste your new Client Secret
```

## Step 8: Deploy Changes
```bash
vercel --prod
```

## Important Notes
- The OAuth client must be in the same Google Cloud project
- Test users may need to be added during development
- For production, you'll need to verify your domain and submit for review
- Keep your Client Secret secure and never commit it to git

## Troubleshooting
- Error 401: Client doesn't exist - Create new credentials
- Error 400: Redirect URI mismatch - Check authorized URIs match exactly
- Error 403: Access blocked - Check OAuth consent screen configuration