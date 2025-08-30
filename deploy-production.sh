#!/bin/bash

echo "🚀 LOUMASS Production Deployment"
echo "================================"
echo ""

# Set production environment variables
echo "Setting production environment variables..."

# Database URL (you'll need to update this with your production database)
vercel env add DATABASE_URL production --yes 2>/dev/null || \
  (vercel env rm DATABASE_URL production --yes 2>/dev/null && \
   echo "postgresql://YOUR_PRODUCTION_DB_URL_HERE" | vercel env add DATABASE_URL production)

# NextAuth
vercel env add NEXTAUTH_URL production --yes 2>/dev/null || \
  (vercel env rm NEXTAUTH_URL production --yes 2>/dev/null && \
   echo "https://loumass.com" | vercel env add NEXTAUTH_URL production)

vercel env add NEXTAUTH_SECRET production --yes 2>/dev/null || \
  (vercel env rm NEXTAUTH_SECRET production --yes 2>/dev/null && \
   echo "your-production-secret-generate-with-openssl-rand-base64-32" | vercel env add NEXTAUTH_SECRET production)

# Google OAuth
vercel env add GOOGLE_CLIENT_ID production --yes 2>/dev/null || \
  (vercel env rm GOOGLE_CLIENT_ID production --yes 2>/dev/null && \
   echo "988882414599-oc33nemts3iu0p2d1pnng7vhbm44l3u4.apps.googleusercontent.com" | vercel env add GOOGLE_CLIENT_ID production)

vercel env add GOOGLE_CLIENT_SECRET production --yes 2>/dev/null || \
  (vercel env rm GOOGLE_CLIENT_SECRET production --yes 2>/dev/null && \
   echo "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" | vercel env add GOOGLE_CLIENT_SECRET production)

# App Configuration
vercel env add NEXT_PUBLIC_APP_URL production --yes 2>/dev/null || \
  (vercel env rm NEXT_PUBLIC_APP_URL production --yes 2>/dev/null && \
   echo "https://loumass.com" | vercel env add NEXT_PUBLIC_APP_URL production)

vercel env add NEXT_PUBLIC_APP_NAME production --yes 2>/dev/null || \
  (vercel env rm NEXT_PUBLIC_APP_NAME production --yes 2>/dev/null && \
   echo "LOUMASS" | vercel env add NEXT_PUBLIC_APP_NAME production)

# Tracking Domain
vercel env add NEXT_PUBLIC_TRACKING_DOMAIN production --yes 2>/dev/null || \
  (vercel env rm NEXT_PUBLIC_TRACKING_DOMAIN production --yes 2>/dev/null && \
   echo "https://click.aftershockfam.org" | vercel env add NEXT_PUBLIC_TRACKING_DOMAIN production)

echo ""
echo "✅ Environment variables set!"
echo ""
echo "📌 IMPORTANT MANUAL STEPS:"
echo ""
echo "1. Go to: https://vercel.com/louis-piottis-projects/loumass_beta/settings/domains"
echo "2. Add these domains:"
echo "   - loumass.com (or your main domain)"
echo "   - click.aftershockfam.org"
echo ""
echo "3. In Namecheap, set these DNS records:"
echo "   - For loumass.com: CNAME to cname.vercel-dns.com"
echo "   - For click.aftershockfam.org: Already set ✅"
echo ""
echo "4. Update Google OAuth redirect URIs to include:"
echo "   - https://loumass.com/api/auth/callback/google"
echo "   - https://loumass.com/api/auth/gmail/callback"
echo ""
echo "5. Set up production database (Vercel Postgres or Supabase)"
echo ""
echo "Ready to deploy? (y/n)"
read -p "> " confirm

if [ "$confirm" = "y" ]; then
    echo ""
    echo "🚀 Deploying to production..."
    vercel --prod
else
    echo "Deployment cancelled."
fi