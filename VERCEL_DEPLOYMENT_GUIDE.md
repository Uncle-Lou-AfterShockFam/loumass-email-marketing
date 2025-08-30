# 🚀 LOUMASS Vercel Deployment Guide

## 📋 Overview
This guide covers deploying LOUMASS to Vercel with complete setup including database configuration, DNS setup for tracking domains, and testing real campaign tracking (opens/clicks).

---

## 🔧 Prerequisites

### Required Accounts
- ✅ Vercel account with team access
- ✅ Google Cloud Console project with OAuth2 configured
- ✅ Neon Database (already configured)
- ✅ Domain name for tracking (e.g., `yourdomain.com`)

### Required Environment Variables
The following environment variables are already configured in your Vercel project:

```bash
# Authentication
NEXTAUTH_URL=https://loumassbeta-1vm1ghcu4-louis-piottis-projects.vercel.app
NEXTAUTH_SECRET=your-nextauth-secret

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Gmail API (same as Google OAuth in most cases)
GMAIL_CLIENT_ID=your-google-client-id
GMAIL_CLIENT_SECRET=your-google-client-secret
GMAIL_REDIRECT_URI=https://loumassbeta-1vm1ghcu4-louis-piottis-projects.vercel.app/api/auth/gmail/callback

# Database (Neon)
DATABASE_URL=postgresql://neondb_owner:password@host/neondb?sslmode=require
DIRECT_DATABASE_URL=postgresql://neondb_owner:password@host/neondb?sslmode=require

# App Configuration
NEXT_PUBLIC_BASE_URL=https://loumassbeta-1vm1ghcu4-louis-piottis-projects.vercel.app
NEXT_PUBLIC_APP_URL=https://loumassbeta-1vm1ghcu4-louis-piottis-projects.vercel.app
NEXT_PUBLIC_APP_NAME="LOUMASS"
BASE_URL=https://loumassbeta-1vm1ghcu4-louis-piottis-projects.vercel.app

# Email Configuration
EMAIL_FROM_NAME="Your Name"
EMAIL_FROM_ADDRESS=your-email@gmail.com

# Tracking Domain
TRACKING_CNAME_TARGET=loumassbeta-1vm1ghcu4-louis-piottis-projects.vercel.app

# Security
CRON_SECRET_KEY=your-cron-secret-key
```

---

## 🚀 Deployment Steps

### 1. Initial Deployment
```bash
# Build and deploy to production
npm run build
vercel --prod
```

### 2. Database Setup
Your Neon database is already configured and the schema has been pushed. To verify:

```bash
# Pull production environment variables
vercel env pull .env.production

# Check database connection
DATABASE_URL="$(grep NEON_POSTGRES_URL .env.production | cut -d'=' -f2 | tr -d '\"')" npx prisma studio
```

### 3. Verify Deployment
Visit your deployment URL and ensure:
- ✅ Authentication works (Google OAuth)
- ✅ Dashboard loads without errors
- ✅ Database connectivity is working

---

## 🌐 DNS Configuration for Tracking Domains

### Why You Need Custom Tracking Domains
- **Better Deliverability**: ISPs trust your domain more than generic tracking links
- **Professional Appearance**: Links look like `click.yourdomain.com` instead of `vercel.app`
- **Accurate Analytics**: Avoid link blockers that filter generic tracking domains
- **Brand Consistency**: All links match your brand domain

### Step-by-Step DNS Setup

#### 1. Choose Your Tracking Subdomain
Pick a subdomain for tracking (common options):
- `click.yourdomain.com` (recommended)
- `track.yourdomain.com`
- `links.yourdomain.com`
- `go.yourdomain.com`

#### 2. Add CNAME Record to Your DNS Provider

**For Cloudflare:**
1. Log into Cloudflare Dashboard
2. Select your domain
3. Go to **DNS** > **Records**
4. Click **Add record**
5. Configure:
   ```
   Type: CNAME
   Name: click (or your chosen subdomain)
   Target: loumassbeta-1vm1ghcu4-louis-piottis-projects.vercel.app
   Proxy status: DNS only (gray cloud)
   TTL: Auto
   ```

**For Other DNS Providers (GoDaddy, Namecheap, etc.):**
1. Log into your DNS provider
2. Find DNS/Domain Management section
3. Add new CNAME record:
   ```
   Host/Name: click
   Points to: loumassbeta-1vm1ghcu4-louis-piottis-projects.vercel.app
   TTL: 300 (or default)
   ```

#### 3. Add Custom Domain to Vercel
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your LOUMASS project
3. Go to **Settings** > **Domains**
4. Click **Add Domain**
5. Enter: `click.yourdomain.com`
6. Click **Add**
7. Wait for verification (usually 1-2 minutes)

#### 4. Configure Tracking Domain in LOUMASS
1. Log into your deployed LOUMASS application
2. Go to **Dashboard** > **Settings**
3. Find **Tracking Domain** section
4. Enter your tracking domain: `click.yourdomain.com`
5. Click **Save & Verify**
6. Wait for verification ✅

---

## 🧪 Testing Campaign Tracking

### Step 1: Create Test Campaign

1. **Go to Campaigns**
   ```
   Dashboard → Campaigns → New Campaign
   ```

2. **Campaign Details**
   ```
   Name: "Test Tracking Campaign"
   Subject: "Testing Open & Click Tracking"
   ```

3. **Email Content** (with trackable link)
   ```html
   <h2>Hello {{firstName}}!</h2>
   
   <p>This is a test email to verify our tracking is working.</p>
   
   <p>Please click this link to test click tracking:</p>
   <a href="https://google.com" style="background: blue; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
     Click Here to Test
   </a>
   
   <p>Best regards,<br>Your Team</p>
   
   <!-- This tracking pixel will be automatically added -->
   ```

4. **Recipients**
   - Add your own email addresses (use different providers like Gmail, Outlook)
   - Add at least 2-3 test contacts

### Step 2: Send Test Campaign

1. **Preview & Test**
   - Click **Preview** to see how tracking links are inserted
   - Verify tracking pixel is added (invisible 1x1 image at bottom)

2. **Send Campaign**
   - Click **Send Now**
   - Confirm sending

### Step 3: Test Open Tracking

1. **Check Different Email Clients**
   - Gmail (loads images by default)
   - Outlook (may require enabling images)
   - Apple Mail
   - Mobile email apps

2. **Open the Test Emails**
   - Open each email in different clients
   - Wait 10-15 seconds for tracking to register

3. **Verify in Dashboard**
   ```
   Dashboard → Campaigns → Test Campaign → Analytics
   ```
   - Should show opens within 1-2 minutes
   - Each email client may show separately

### Step 4: Test Click Tracking

1. **Click the Test Link**
   - Click the blue "Click Here to Test" button
   - Should redirect through your tracking domain
   - Final destination should be Google

2. **Verify Redirect Flow**
   ```
   Original Link: https://google.com
   ↓
   Tracking Link: https://click.yourdomain.com/track/click/abc123...
   ↓
   Final Destination: https://google.com
   ```

3. **Check Analytics**
   - Go back to campaign analytics
   - Should show click events within 1-2 minutes
   - Can see which specific links were clicked

### Step 5: Advanced Testing

#### Test with Different Devices
- ✅ Desktop (Chrome, Firefox, Safari)
- ✅ Mobile (iOS Safari, Android Chrome)
- ✅ Different email apps

#### Test Privacy Settings
- ✅ Gmail with images disabled
- ✅ Outlook with protected view
- ✅ Apple Mail with Mail Privacy Protection

#### Verify Tracking URLs
1. **Inspect Email Source**
   ```bash
   # Look for tracking pixel
   <img src="https://click.yourdomain.com/track/open/abc123..." width="1" height="1">
   
   # Look for wrapped links
   <a href="https://click.yourdomain.com/track/click/def456...">Original Link</a>
   ```

2. **Test Tracking Endpoints**
   ```bash
   # Test open tracking (should return 1x1 transparent GIF)
   curl -I https://click.yourdomain.com/track/open/test123
   
   # Test click tracking (should return 302 redirect)
   curl -I https://click.yourdomain.com/track/click/test456
   ```

---

## 🔍 Troubleshooting

### Campaign Issues

**Problem: No open tracking**
```bash
# Check if tracking pixel is inserted
View email source → Look for:
<img src="https://click.yourdomain.com/track/open/..." width="1" height="1">

# Solutions:
✅ Enable images in email client
✅ Check tracking domain DNS
✅ Verify LOUMASS tracking domain settings
```

**Problem: No click tracking**
```bash
# Check if links are wrapped
View email source → Look for:
<a href="https://click.yourdomain.com/track/click/...">

# Solutions:
✅ Ensure campaign has trackingEnabled: true
✅ Verify tracking domain configuration
✅ Check link format in email template
```

**Problem: Tracking domain not working**
```bash
# Test DNS resolution
nslookup click.yourdomain.com
# Should resolve to your Vercel deployment

# Test HTTP response
curl -I https://click.yourdomain.com
# Should return 200 OK or proper redirect

# Solutions:
✅ Wait for DNS propagation (up to 24 hours)
✅ Check CNAME record is correct
✅ Verify Vercel domain is added and verified
✅ Ensure DNS is not proxied through Cloudflare
```

### Database Issues

**Problem: Database connection errors**
```bash
# Test database connection
DATABASE_URL="your-neon-url" npx prisma studio

# Solutions:
✅ Check Neon database is running
✅ Verify environment variables in Vercel
✅ Ensure DATABASE_URL includes sslmode=require
```

### Authentication Issues

**Problem: Google OAuth not working**
```bash
# Check OAuth configuration
Google Cloud Console → APIs & Services → Credentials

# Ensure authorized redirect URIs include:
https://loumassbeta-1vm1ghcu4-louis-piottis-projects.vercel.app/api/auth/callback/google
https://loumassbeta-1vm1ghcu4-louis-piottis-projects.vercel.app/api/auth/gmail/callback

# Solutions:
✅ Update OAuth redirect URIs
✅ Check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
✅ Verify NEXTAUTH_URL matches deployment URL
```

---

## 📊 Analytics & Monitoring

### Key Metrics to Monitor
```bash
# Campaign Performance
- Open Rate: Should be 15-25% for good deliverability
- Click Rate: Should be 2-8% depending on content
- Bounce Rate: Should be < 2% for healthy lists

# Tracking Health
- Tracking Domain Response Time: < 200ms
- Failed Tracking Events: < 1%
- Database Connection Errors: 0
```

### Real-time Monitoring
```bash
# Vercel Function Logs
vercel logs --follow

# Database Query Performance
# Use Neon dashboard to monitor query performance

# Email Delivery Status
# Check campaign analytics for delivery failures
```

---

## 🚨 Security Considerations

### Environment Variables
- ✅ All secrets stored in Vercel environment variables (encrypted)
- ✅ No sensitive data in code repository
- ✅ Separate staging and production environments

### Email Security
- ✅ OAuth2 for Gmail (no stored passwords)
- ✅ Refresh tokens automatically managed
- ✅ Rate limiting on email sending

### Tracking Security
- ✅ Tracking IDs are cryptographically random
- ✅ No personally identifiable information in URLs
- ✅ HTTPS enforced for all tracking domains

---

## 📝 Production Checklist

### Pre-Launch
- [ ] Domain verified and working
- [ ] Test campaigns sent and tracked successfully
- [ ] All environment variables configured
- [ ] Database schema deployed
- [ ] OAuth credentials working
- [ ] Tracking domain DNS configured

### Post-Launch Monitoring
- [ ] Monitor Vercel function execution times
- [ ] Track database connection health
- [ ] Monitor email delivery rates
- [ ] Check tracking domain uptime
- [ ] Review security logs

---

## 📚 Additional Resources

### Documentation Links
- [Vercel Deployment](https://vercel.com/docs)
- [Neon Database](https://neon.tech/docs)
- [Google OAuth Setup](https://developers.google.com/identity/protocols/oauth2)
- [Gmail API](https://developers.google.com/gmail/api)

### Support
- Vercel Support: [support@vercel.com](mailto:support@vercel.com)
- Neon Support: [support@neon.tech](mailto:support@neon.tech)
- LOUMASS Issues: Check project documentation

---

## 🎉 Success!

If you've followed this guide successfully, you now have:
- ✅ LOUMASS deployed to Vercel
- ✅ Custom tracking domain configured
- ✅ Real open and click tracking working
- ✅ Production database connected
- ✅ Secure authentication setup

Your email marketing platform is now ready for production use with professional tracking capabilities!