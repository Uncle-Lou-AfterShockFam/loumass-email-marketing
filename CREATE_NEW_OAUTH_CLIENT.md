# URGENT: Create New OAuth Client in TESTING Mode

## The Problem
Your current OAuth client "LOUSMASS_NEW" is:
- In PRODUCTION mode (published)
- Has hit the 1-user cap for unverified apps
- Using restricted Gmail scopes that require verification
- Blocking all authentication

## IMMEDIATE SOLUTION: Create New OAuth Client

### Step 1: Create New OAuth Consent Screen (TESTING MODE)

1. **Go to Google Cloud Console**
   ```
   https://console.cloud.google.com/
   ```

2. **Create a NEW PROJECT** (important - don't use existing)
   - Click project dropdown at top
   - Click "New Project"
   - Name: `LOUMASS-Testing`
   - Click "Create"

3. **Enable Gmail API**
   - Go to: APIs & Services → Library
   - Search "Gmail API"
   - Click Enable

4. **Configure OAuth Consent Screen**
   - Go to: APIs & Services → OAuth consent screen
   - Choose "External"
   - Click "Create"
   
5. **Fill in App Information:**
   - App name: `LOUMASS Dev`
   - User support email: `ljpiotti@aftershockfam.org`
   - Developer contact: `ljpiotti@aftershockfam.org`
   - Click "SAVE AND CONTINUE"

6. **Add Scopes:**
   - Click "ADD OR REMOVE SCOPES"
   - Search and add these Gmail scopes:
     - `https://www.googleapis.com/auth/gmail.send`
     - `https://www.googleapis.com/auth/gmail.compose`
     - `https://www.googleapis.com/auth/gmail.modify`
     - `https://www.googleapis.com/auth/gmail.readonly`
     - `https://www.googleapis.com/auth/userinfo.email`
   - Click "UPDATE"
   - Click "SAVE AND CONTINUE"

7. **Add Test Users:**
   - Click "ADD USERS"
   - Add: `ljpiotti@aftershockfam.org`
   - Add any other emails that need access
   - Click "ADD"
   - Click "SAVE AND CONTINUE"

8. **IMPORTANT: Keep in TESTING mode**
   - DO NOT PUBLISH
   - Leave as "Testing"

### Step 2: Create OAuth 2.0 Client ID

1. **Go to Credentials**
   - APIs & Services → Credentials
   - Click "+ CREATE CREDENTIALS"
   - Choose "OAuth client ID"

2. **Configure OAuth Client:**
   - Application type: `Web application`
   - Name: `LOUMASS Web Client`
   
3. **Add Authorized JavaScript origins:**
   ```
   http://localhost:3000
   https://loumassbeta.vercel.app
   ```

4. **Add Authorized redirect URIs:**
   ```
   http://localhost:3000/api/auth/callback/google
   http://localhost:3000/api/auth/gmail/callback
   https://loumassbeta.vercel.app/api/auth/callback/google
   https://loumassbeta.vercel.app/api/auth/gmail/callback
   ```

5. **Click "CREATE"**

6. **COPY THE CREDENTIALS:**
   - Client ID: `[COPY THIS]`
   - Client Secret: `[COPY THIS]`

### Step 3: Update Vercel Environment Variables

1. **Go to Vercel Dashboard**
   ```
   https://vercel.com/dashboard
   ```

2. **Select your project**

3. **Go to Settings → Environment Variables**

4. **Update these variables:**
   ```
   GOOGLE_CLIENT_ID = [New Client ID from Step 2]
   GOOGLE_CLIENT_SECRET = [New Client Secret from Step 2]
   ```

5. **Click "Save"**

6. **Vercel will auto-redeploy**

### Step 4: Test Gmail Connection

1. Wait for deployment (1-2 minutes)
2. Go to: https://loumassbeta.vercel.app/dashboard/settings/integrations
3. Click "Connect Gmail Account"
4. IT WILL WORK NOW!

## Why This Works

- **Testing mode**: No verification required
- **Test users**: Can use all restricted scopes
- **No user cap**: In testing mode
- **Immediate access**: No waiting for Google

## Important Notes

- Keep this OAuth client in TESTING mode
- Don't publish it
- You can have up to 100 test users
- This bypasses all verification requirements

---

**This is the fastest solution. Your app was working before because it was likely in testing mode or using different scopes. Creating a new testing OAuth client will restore functionality immediately.**