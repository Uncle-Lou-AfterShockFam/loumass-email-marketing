# 🚀 DEPLOYMENT CHECKLIST

## ALWAYS follow these steps when making changes:

### 1. Database Schema Changes (if any)
```bash
# Push to Neon production database
DATABASE_URL="postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require" npx prisma db push

# Generate Prisma client
npx prisma generate
```

### 2. Test Locally
```bash
# Run development server
npm run dev

# Test the changes at http://localhost:3000
```

### 3. Deploy to Production
```bash
# Add all changes
git add -A

# Commit with descriptive message
git commit -m "Description of changes"

# Push to GitHub (triggers Vercel auto-deploy)
git push origin main
```

### 4. Verify Deployment
- Check Vercel dashboard or run: `vercel list --yes`
- Test on production: https://loumassbeta.vercel.app

## ⚠️ IMPORTANT REMINDERS
- **ALWAYS** push database schema changes to Neon BEFORE testing in production
- **ALWAYS** commit and push to GitHub to trigger Vercel deployment
- **NEVER** test on production without completing all steps above

## Environment Variables
- Local dev uses: `.env.local` (local PostgreSQL)
- Production uses: Neon database (configured in Vercel)

## Quick Commands
```bash
# Full deployment (schema + code)
DATABASE_URL="postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require" npx prisma db push && git add -A && git commit -m "Update" && git push origin main
```