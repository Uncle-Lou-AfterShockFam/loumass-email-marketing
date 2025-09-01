# Google OAuth Fix Guide - Complete Solution

## The Error
"Access blocked: Authorization Error" - Your app doesn't comply with Google's OAuth 2.0 policy

## Root Cause
Your OAuth app "LOUSMASS_NEW" is likely in "Testing" mode and your email isn't in the test users list, OR the app needs to be published.

## SOLUTION 1: Quick Fix (Add Test User)

1. **Go to Google Cloud Console**
   - https://console.cloud.google.com/
   - Select your project

2. **Navigate to OAuth Consent Screen**
   - APIs & Services → OAuth consent screen
   - Check the "Publishing status" at the top

3. **If Status is "Testing":**
   - Scroll down to "Test users" section
   - Click "+ ADD USERS"
   - Add: `ljpiotti@aftershockfam.org`
   - Click "SAVE"

4. **Try connecting again immediately** (no need to wait)

## SOLUTION 2: Publish the App (Permanent Fix)

1. **In OAuth Consent Screen:**
   - If status shows "Testing"
   - Click "PUBLISH APP" button
   - Confirm publication

2. **Note:** Publishing makes it available to all users, not just test users

## SOLUTION 3: Create New OAuth Credentials (If Above Fails)

1. **Go to Credentials**
   - APIs & Services → Credentials

2. **Create New OAuth 2.0 Client ID**
   - Click "+ CREATE CREDENTIALS" → "OAuth client ID"
   - Application type: Web application
   - Name: LOUMASS Production

3. **Add ALL Authorized Redirect URIs:**
   ```
   https://loumassbeta.vercel.app/api/auth/callback/google
   https://loumassbeta.vercel.app/api/auth/gmail/callback
   http://localhost:3000/api/auth/callback/google
   http://localhost:3000/api/auth/gmail/callback
   ```

4. **Copy the new credentials:**
   - Client ID
   - Client Secret

5. **Update in Vercel:**
   - Go to: https://vercel.com/dashboard
   - Select your project
   - Settings → Environment Variables
   - Update:
     - `GOOGLE_CLIENT_ID` = [new client id]
     - `GOOGLE_CLIENT_SECRET` = [new client secret]
   - Click "Save"

6. **Redeploy** (Vercel will auto-redeploy after env changes)

## Verification Checklist

✓ OAuth consent screen is either:
  - In "Testing" with your email in test users, OR
  - Published for production use

✓ All redirect URIs are added exactly as shown (no trailing slashes)

✓ Gmail API is enabled (APIs & Services → Library → Search "Gmail API" → Enable)

✓ Environment variables in Vercel match Google Cloud credentials

## Quick Debug Steps

1. **Clear browser data:**
   - Clear cookies for accounts.google.com
   - Clear cache
   - Try incognito/private window

2. **Check the exact error:**
   - Look for "error details" link in the error page
   - Common issues:
     - `redirect_uri_mismatch` = URI not in list
     - `access_blocked` = App in testing without user in list
     - `invalid_client` = Wrong client ID/secret

## Working Configuration Example

Your OAuth client should have:
- **Authorized JavaScript origins:**
  - https://loumassbeta.vercel.app
  - http://localhost:3000

- **Authorized redirect URIs:**
  - https://loumassbeta.vercel.app/api/auth/callback/google
  - https://loumassbeta.vercel.app/api/auth/gmail/callback
  - http://localhost:3000/api/auth/callback/google
  - http://localhost:3000/api/auth/gmail/callback

## Still Not Working?

The most common issue is the OAuth consent screen being in "Testing" mode without the user being in the test users list.

**Immediate Action:**
1. Add `ljpiotti@aftershockfam.org` to test users
2. OR publish the app
3. Clear browser cookies
4. Try again

---
*Last Updated: 2025-09-01*