# Google OAuth Fix Guide for LOUMASS

## Error: "Access blocked: Authorization Error"

### Quick Solution:

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Select your project

2. **Check OAuth Consent Screen Status**
   - Navigate to: APIs & Services → OAuth consent screen
   - If status is "Testing", click **PUBLISH APP**
   - Or add your email to test users

3. **Update OAuth Client**
   - Navigate to: APIs & Services → Credentials
   - Click on your OAuth 2.0 Client ID
   - Add ALL these Authorized redirect URIs:
   ```
   https://loumassbeta.vercel.app/api/auth/callback/google
   https://loumassbeta.vercel.app/auth/callback
   http://localhost:3000/api/auth/callback/google
   http://localhost:3000/auth/callback
   ```

4. **Enable Required APIs**
   - Navigate to: APIs & Services → Library
   - Enable:
     - Gmail API
     - Google Identity Toolkit API

5. **Update Production Environment Variables**
   In Vercel Dashboard (https://vercel.com/dashboard):
   - Go to your project settings
   - Environment Variables
   - Update:
     - `GOOGLE_CLIENT_ID` (if changed)
     - `GOOGLE_CLIENT_SECRET` (if changed)
     - `NEXTAUTH_URL`: https://loumassbeta.vercel.app

## Alternative: Create New OAuth Credentials

If the above doesn't work, create fresh credentials:

1. In Google Cloud Console → Credentials
2. Click "+ CREATE CREDENTIALS" → "OAuth client ID"
3. Configure:
   - Application type: Web application
   - Name: LOUMASS Web Client
   - Add all redirect URIs from step 3 above
4. Copy the new Client ID and Secret
5. Update in Vercel environment variables

## Testing the Fix

After making changes:
1. Clear browser cookies for Google
2. Try signing in again at: https://loumassbeta.vercel.app/dashboard/settings/integrations
3. Click "Connect Gmail"

## Common Issues:

- **"Testing" mode**: App must be published or user must be in test users list
- **Missing redirect URI**: The exact URL must match, including trailing slashes
- **Wrong project**: Ensure you're in the correct Google Cloud project
- **API not enabled**: Gmail API must be enabled in the project