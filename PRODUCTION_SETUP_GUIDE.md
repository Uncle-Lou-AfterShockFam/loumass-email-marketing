# 🚀 LOUMASS Production Deployment Guide

## ✅ Environment Variables Status

### Already Configured in Vercel:
- ✅ `NEXTAUTH_SECRET` - Generated and set
- ✅ `CRON_SECRET_KEY` - Generated and set  
- ✅ `NEXT_PUBLIC_APP_NAME` - Set to "LOUMASS"
- ✅ `EMAIL_FROM_NAME` - Set to "LOUMASS"
- ✅ `TRACKING_CNAME_TARGET` - Set to "tracking.loumass.com"

### 🔧 Still Need to Configure:

#### 1. Database Configuration
You need to set up a production PostgreSQL database. Options:

**Option A: Vercel Postgres (Recommended)**
1. Go to: https://vercel.com/louis-piottis-projects/loumass-beta
2. Click "Storage" tab
3. Click "Create Database" 
4. Select "Postgres"
5. Name it "loumass-production"
6. This will automatically add `DATABASE_URL` to your environment variables

**Option B: External Provider**
- Supabase: https://supabase.com (Free tier available)
- PlanetScale: https://planetscale.com (MySQL alternative)
- Railway: https://railway.app
- Render: https://render.com

#### 2. App URLs (Get from Vercel after first deployment)
```bash
NEXTAUTH_URL=https://loumass-beta-XXXX.vercel.app
NEXT_PUBLIC_APP_URL=https://loumass-beta-XXXX.vercel.app
```

#### 3. Google OAuth Setup
1. Go to: https://console.cloud.google.com
2. Create new project or select existing
3. Enable Gmail API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `https://your-vercel-url.vercel.app/api/auth/callback/google`
6. Get these values:
```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

#### 4. Email Configuration
```bash
EMAIL_FROM_ADDRESS=noreply@yourdomain.com
# Optional: Custom tracking domain
NEXT_PUBLIC_TRACKING_DOMAIN=track.yourdomain.com
```

## 🚀 Deployment Steps

### Step 1: Deploy to get Vercel URL
```bash
vercel --prod
```

### Step 2: Configure remaining environment variables
1. Go to: https://vercel.com/louis-piottis-projects/loumass-beta/settings/environment-variables
2. Add the missing variables listed above
3. Set them for "Production" environment

### Step 3: Run database migrations
After setting up DATABASE_URL:
```bash
vercel env pull .env.production
DATABASE_URL=$(grep DATABASE_URL .env.production | cut -d '=' -f2-) npx prisma migrate deploy
```

### Step 4: Test deployment
Visit your deployed app and test:
1. Basic loading
2. Google OAuth sign-in
3. Gmail connection
4. Create test campaign
5. Check cron endpoint: `GET /api/cron/process-campaigns` with Authorization header

## 📝 Quick Commands

```bash
# Deploy to production
vercel --prod

# Add environment variable
vercel env add VARIABLE_NAME production

# Pull production environment variables
vercel env pull .env.production

# Run database migrations on production
npx prisma migrate deploy

# Check deployment status
vercel ls

# View deployment logs
vercel logs
```

## 🔍 Troubleshooting

### Common Issues:
1. **Build fails**: Check TypeScript errors with `npm run build`
2. **Database connection fails**: Verify DATABASE_URL format
3. **OAuth fails**: Check redirect URI matches exactly
4. **Cron jobs fail**: Verify CRON_SECRET_KEY is set

### Environment Variable Format:
```bash
DATABASE_URL="postgresql://username:password@hostname:port/database?sslmode=require"
NEXTAUTH_URL="https://your-exact-vercel-url.vercel.app"
GOOGLE_CLIENT_ID="123456789.apps.googleusercontent.com"
```

## 🎯 Next Steps

1. **Deploy first** to get your Vercel URL
2. **Set up database** (Vercel Postgres recommended)
3. **Configure Google OAuth** with your Vercel URL
4. **Add remaining environment variables**
5. **Run database migrations**
6. **Test production deployment**

Your LOUMASS application is ready for production! 🚀