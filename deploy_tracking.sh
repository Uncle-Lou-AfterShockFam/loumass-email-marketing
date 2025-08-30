#!/bin/bash
echo "Updating tracking domain in Vercel..."

# Add tracking domain
echo "https://click.aftershockfam.org" | vercel env add NEXT_PUBLIC_TRACKING_DOMAIN production --yes 2>/dev/null || \
  (vercel env rm NEXT_PUBLIC_TRACKING_DOMAIN production --yes 2>/dev/null && \
   echo "https://click.aftershockfam.org" | vercel env add NEXT_PUBLIC_TRACKING_DOMAIN production)

echo "Deploy with: vercel --prod"
