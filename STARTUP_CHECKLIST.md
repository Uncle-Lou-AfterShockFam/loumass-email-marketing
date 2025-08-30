# 🚀 LOUMASS Startup Verification Checklist

## ⚡ Quick Start (< 2 minutes)

### 1. Prerequisites Verification
```bash
# Check Node.js version (requires 18+)
node --version

# Check npm/yarn
npm --version

# Check PostgreSQL connection
psql --version
```

### 2. Environment Setup
```bash
# Navigate to project directory
cd /Users/louispiotti/loumass_beta

# Install dependencies if needed
npm install

# Verify environment variables
cat .env.local
```

**Required Environment Variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `DIRECT_DATABASE_URL` - Direct PostgreSQL connection (if using pooling)
- `NEXTAUTH_SECRET` - Authentication secret
- `NEXTAUTH_URL` - Application URL (http://localhost:3000)
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `NEXT_PUBLIC_BASE_URL` - Public base URL

### 3. Database Verification
```bash
# Check database connection
npx prisma db push

# Generate Prisma client
npx prisma generate

# Optional: Open database GUI
npx prisma studio
```

### 4. Application Startup
```bash
# Start development server on port 3000
PORT=3000 npm run dev

# Alternative if PORT variable doesn't work
npm run dev
```

**Expected Output:**
```
▲ Next.js 15.5.2 (turbo)
- Local:        http://localhost:3000
- Environments: .env.local

✓ Starting...
✓ Ready in 2.1s
```

### 5. Feature Verification Checklist

#### ✅ Authentication (Priority 1)
- [ ] Visit http://localhost:3000
- [ ] Click "Sign In" - should redirect to Google OAuth
- [ ] Complete Google authentication
- [ ] Should redirect to http://localhost:3000/dashboard
- [ ] Verify session persistence on page refresh

#### ✅ Contacts Management (Priority 1)
- [ ] Navigate to http://localhost:3000/dashboard/contacts
- [ ] Page loads without errors (no displayName.split() TypeError)
- [ ] Click "Add Contact" button
- [ ] Fill form with test email (test@example.com)
- [ ] Submit form - contact should appear in list immediately
- [ ] Verify contact shows proper displayName (email if no name provided)

#### ✅ API Endpoints (Priority 1)
```bash
# Test contacts API (after authentication)
curl -H "Cookie: $(cat /tmp/cookies)" http://localhost:3000/api/contacts

# Expected: JSON response with contacts array and stats
```

#### ✅ Database Integration (Priority 1)
- [ ] Contacts are persisted in database
- [ ] User data isolation working (multi-tenant)
- [ ] No foreign key constraint errors

#### 🚧 Campaigns Management (Priority 2)
- [ ] Navigate to http://localhost:3000/dashboard/campaigns
- [ ] Page loads (may show placeholder/empty state)
- [ ] Basic UI elements render without errors

#### 🚧 Sequences Builder (Priority 2)
- [ ] Navigate to http://localhost:3000/dashboard/sequences
- [ ] Page loads (may show placeholder/empty state)
- [ ] Basic UI elements render without errors

#### 🚧 Analytics Dashboard (Priority 2)
- [ ] Navigate to http://localhost:3000/dashboard/analytics
- [ ] Page loads (may show placeholder/empty state)
- [ ] Basic UI elements render without errors

#### 🚧 Replies Tracking (Priority 2)
- [ ] Navigate to http://localhost:3000/dashboard/replies
- [ ] Page loads (may show placeholder/empty state)
- [ ] Basic UI elements render without errors

## 🔧 Troubleshooting Guide

### Common Issues & Fixes

#### 1. "Cannot read properties of undefined (reading 'split')" Error
**Location:** ContactsList component
**Cause:** API returning raw Contact objects instead of ContactWithStats
**Fix:** Verify `/api/contacts` endpoint uses `createContactWithStats()` helper

```typescript
// CORRECT implementation in API route:
const rawContacts = await prisma.contact.findMany({...})
const contacts = rawContacts.map(contact => 
  createContactWithStats(contact, {
    totalCampaigns: 0,
    totalOpened: 0,
    totalClicked: 0,
    totalReplied: 0,
    lastEngagement: null
  })
)
```

#### 2. Authentication Redirect Loop
**Cause:** NEXTAUTH_URL mismatch or missing NEXTAUTH_SECRET
**Fix:** Verify environment variables and restart server

#### 3. Database Connection Issues
**Cause:** PostgreSQL not running or connection string incorrect
**Fix:** 
```bash
# Check PostgreSQL status
brew services list | grep postgresql

# Start if needed
brew services start postgresql

# Test connection
psql -d your_database_name -c "SELECT NOW();"
```

#### 4. Port 3000 Already in Use
**Fix:**
```bash
# Kill process on port 3000
pkill -f "next-server"

# Or use different port
PORT=3001 npm run dev
```

#### 5. Module Resolution Errors
**Fix:**
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Restart development server
npm run dev
```

## 🎯 Development Priorities

### Phase 1: Core Functionality (ACTIVE)
- [x] Authentication system
- [x] Contact management with proper data transformation
- [x] Database integration with Prisma
- [ ] Campaign creation and management
- [ ] Email sending via Gmail API

### Phase 2: Advanced Features
- [ ] Sequence automation builder
- [ ] Reply tracking and unified inbox
- [ ] Analytics and reporting
- [ ] Custom tracking domains

### Phase 3: Production Features
- [ ] Team collaboration
- [ ] API rate limiting
- [ ] Advanced security features
- [ ] Performance optimization

## ⚠️ Critical Warnings

### DO NOT:
- **Modify ContactsList component** without ensuring API returns ContactWithStats objects
- **Skip authentication** checks in API routes
- **Mix user data** (ensure userId filtering in all queries)
- **Commit sensitive data** (API keys, tokens, etc.)
- **Deploy without testing** all core features locally

### ALWAYS:
- **Use createContactWithStats()** helper when returning contacts from API
- **Verify session authentication** before accessing user data
- **Test contact creation** after any API changes
- **Check displayName field exists** before using .split() operations
- **Run type checking** before commits: `npm run type-check`

## 📊 Success Metrics

### Application Health
- [ ] Server starts in < 5 seconds
- [ ] Dashboard loads in < 2 seconds
- [ ] Contact creation completes in < 1 second
- [ ] No runtime TypeScript errors
- [ ] No missing environment variables

### Feature Completeness
- [ ] Authentication: 100% working
- [ ] Contact Management: 100% working
- [ ] Campaigns: Basic UI (work in progress)
- [ ] Sequences: Basic UI (work in progress)
- [ ] Analytics: Basic UI (work in progress)
- [ ] Replies: Basic UI (work in progress)

## 🆘 Emergency Recovery

If the application is completely broken:

1. **Reset to known working state:**
```bash
git status
git stash  # Save current changes
git checkout main  # Or last known working branch
npm install
npm run dev
```

2. **Database reset (if needed):**
```bash
npx prisma db push --force-reset
npx prisma generate
```

3. **Nuclear option - fresh install:**
```bash
rm -rf node_modules .next package-lock.json
npm install
npm run dev
```

---

**Last Updated:** Generated for new Claude Code session
**Next Session Priority:** Continue with Campaign Management implementation after verifying all checklist items pass.