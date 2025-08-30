#!/bin/bash
echo "Updating Vercel production environment variables..."

# Remove old variables
vercel env rm GOOGLE_CLIENT_ID production --yes 2>/dev/null
vercel env rm GOOGLE_CLIENT_SECRET production --yes 2>/dev/null

# Add new variables
echo "988882414599-oc33nemts3iu0p2d1pnng7vhbm44l3u4.apps.googleusercontent.com" | vercel env add GOOGLE_CLIENT_ID production
echo "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" | vercel env add GOOGLE_CLIENT_SECRET production

echo "Environment variables updated! Run 'vercel --prod' to deploy."
