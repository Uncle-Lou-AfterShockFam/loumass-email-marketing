# Vercel Environment Variables Setup

This document lists all environment variables required for deploying LOUMASS to Vercel.

## Required Environment Variables

### 1. Database Connection
```
DATABASE_URL=postgresql://username:password@host:port/database_name
```
- Use your production PostgreSQL database connection string
- Example: `postgresql://user:pass@hostname.com:5432/loumass_production`

### 2. NextAuth Configuration
```
NEXTAUTH_URL=https://your-app-domain.vercel.app
NEXTAUTH_SECRET=your-secret-key-here
```
- `NEXTAUTH_URL`: Your production Vercel app URL
- `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`

### 3. Google OAuth (Gmail API)
```
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
```
- Get these from Google Cloud Console
- Make sure to add your Vercel domain to authorized redirect URIs

### 4. App Configuration
```
NEXT_PUBLIC_APP_URL=https://your-app-domain.vercel.app
NEXT_PUBLIC_APP_NAME=LOUMASS
```
- `NEXT_PUBLIC_APP_URL`: Same as NEXTAUTH_URL
- `NEXT_PUBLIC_APP_NAME`: Display name for your app

### 5. Email/Tracking Configuration
```
EMAIL_FROM_NAME=LOUMASS
EMAIL_FROM_ADDRESS=noreply@yourdomain.com
TRACKING_CNAME_TARGET=tracking.loumass.com
NEXT_PUBLIC_TRACKING_DOMAIN=
```
- `EMAIL_FROM_NAME`: Default sender name for emails
- `EMAIL_FROM_ADDRESS`: Default sender email address
- `TRACKING_CNAME_TARGET`: Target for tracking domain CNAMEs
- `NEXT_PUBLIC_TRACKING_DOMAIN`: Optional custom tracking domain

### 6. Cron Security
```
CRON_SECRET_KEY=your-secure-random-string-here
```
- Used to authenticate cron job requests
- Generate a secure random string (e.g., `openssl rand -base64 32`)

## Setting Up in Vercel

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add each variable above with appropriate values
4. Make sure to set them for all environments (Production, Preview, Development)

## Google OAuth Setup

1. Go to Google Cloud Console
2. Enable Gmail API
3. Create OAuth 2.0 credentials
4. Add authorized redirect URI: `https://your-app.vercel.app/api/auth/gmail/callback`
5. Copy Client ID and Client Secret to environment variables

## Cron Job Setup

After deployment, you'll need to set up a cron job to call:
```
GET https://your-app.vercel.app/api/cron/process-campaigns
Authorization: Bearer your-cron-secret-key
```

This can be done with:
- Vercel Cron (if available in your plan)
- External cron services like cron-job.org
- GitHub Actions with scheduled workflows

## Database Migration

Make sure to run Prisma migrations on your production database:
```bash
npx prisma migrate deploy
```

## Testing

After setting up all environment variables, test the deployment by:
1. Accessing the app URL
2. Signing in with Google
3. Connecting Gmail account
4. Creating a test campaign
5. Verifying the cron endpoint works