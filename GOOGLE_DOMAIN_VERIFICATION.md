# Google Search Console Domain Verification Guide

## Steps to Verify loumassbeta.vercel.app

### 1. Access Google Search Console
- Go to: https://search.google.com/search-console
- Sign in with: ljpiotti@aftershockfam.org

### 2. Add Property
- Click "Add property"
- Choose "URL prefix" (not Domain)
- Enter: `https://loumassbeta.vercel.app`
- Click Continue

### 3. Verification Methods (Choose One)

#### Option A: HTML File Upload (Recommended for Vercel)
1. Download the HTML verification file from Google
2. Save it in: `/public/[filename].html` in this project
3. Commit and push to deploy
4. Click "Verify" in Google Search Console

#### Option B: HTML Meta Tag
1. Copy the meta tag from Google
2. Add to `/src/app/layout.tsx` in the `<head>` section
3. Deploy and verify

#### Option C: DNS TXT Record (If you own the domain)
1. Get the TXT record from Google
2. Add to your domain's DNS settings
3. Wait for propagation (up to 48 hours)
4. Click Verify

### 4. After Verification
Once verified:
1. Return to Google Cloud Console
2. Go to OAuth consent screen
3. The domain will now show as verified
4. Resubmit for OAuth verification

## Important Notes
- Verification proves you own/control the domain
- Required for OAuth app approval
- Keep verification file/tag in place permanently
- Can verify multiple methods for redundancy

## For Vercel Deployments
Since this is deployed on Vercel:
1. HTML file method works best
2. File goes in `/public` folder
3. Accessible at: `https://loumassbeta.vercel.app/[filename].html`
4. Deploys automatically when pushed to GitHub