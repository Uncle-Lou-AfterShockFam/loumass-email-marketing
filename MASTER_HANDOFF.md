# 🚨 CRITICAL MASTER HANDOFF - LOUMASS EMAIL SEQUENCE BUGS

## 🔴 CRITICAL ISSUES TO FIX IMMEDIATELY

### BUG #1: THREADING BROKEN IN STANDALONE SEQUENCES
**Problem**: Follow-up emails (Email 2, 3, 4) are NOT being sent in the same Gmail thread despite `replyToThread: true`
**Root Cause**: The `In-Reply-To` and `References` headers are NOT being added to follow-up emails
**Test Sequence**: https://loumassbeta.vercel.app/dashboard/sequences/cmfcxnr6g0001k004ok1p668d

### BUG #2: CONDITION EVALUATION TIMING WRONG
**Problem**: System evaluates "REPLIED" condition BEFORE checking if contact actually replied
**Impact**: Sends wrong branch (REPLIED=FALSE when should be TRUE)

### BUG #3: TRACKING NOT WORKING IN FOLLOW-UPS
**Problem**: Tracking pixels and tracked links may not be added to emails after the first one

## 📁 PROJECT LOCATION & STRUCTURE

**Local Project Path**: `/Users/louispiotti/loumass_beta`

### Key Files to Fix:
```
/Users/louispiotti/loumass_beta/
├── src/
│   ├── services/
│   │   ├── sequence-service.ts     # MAIN FILE - Sequence execution engine (1400+ lines)
│   │   ├── gmail-service.ts        # Gmail API integration (sends emails)
│   │   ├── gmail-fetch-service.ts  # Fetches Gmail messages/headers
│   │   └── tracking-service.ts     # Email tracking (pixels/links)
│   ├── app/
│   │   └── api/
│   │       └── cron/
│   │           └── process-sequences/
│   │               └── route.ts     # Cron job endpoint (runs every minute)
│   └── lib/
│       └── prisma.ts               # Prisma client singleton
├── prisma/
│   └── schema.prisma              # Database schema
├── .env                           # Local environment variables
├── .env.production                # Production environment variables
├── package.json                   # Dependencies and scripts
└── next.config.js                 # Next.js configuration
```

## 🗄️ DATABASE - NEON POSTGRESQL

**Connection String**: 
```
postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
```

**Direct Connection (no pooling)**:
```
postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
```

**Database Access**:
- Host: `ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech`
- Database: `neondb`
- User: `neondb_owner`
- Password: `npg_iwH3QAzNrfR5`

**Prisma Commands**:
```bash
# Generate Prisma client
npx prisma generate

# Push schema changes
DATABASE_URL="postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require" npx prisma db push

# Open Prisma Studio
DATABASE_URL="postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require" npx prisma studio
```

**Direct SQL Access**:
```bash
PGPASSWORD=npg_iwH3QAzNrfR5 psql -h ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech -U neondb_owner -d neondb
```

### Key Database Tables:
- `Sequence` - Email sequence definitions (steps stored as JSON)
- `SequenceEnrollment` - Active enrollments (tracks progress)
- `SequenceStepExecution` - Tracks which steps have been executed
- `SequenceEvent` - Email events (OPENED, CLICKED, REPLIED)
- `Contact` - Contact/subscriber records
- `User` - User accounts
- `GmailToken` - Gmail OAuth tokens

## 🚀 VERCEL DEPLOYMENT

**Production URL**: https://loumassbeta.vercel.app
**Project ID**: `prj_NTDa3fPTPvHe9r57YmJ2PKdSHjCC`
**Team ID**: `team_x8fHgKrIrBJX7TJK5Fqymy8Y`

**Deployment Commands**:
```bash
# Deploy to production
git push origin main

# Manual deploy with Vercel CLI
vercel --prod --yes

# Check deployment status
vercel list --yes
```

**Environment Variables in Vercel**:
- All database URLs (NEON_*)
- NextAuth configuration
- Google OAuth credentials
- Cron secret

## ⏰ CRON JOBS

### Process Sequences Cron
- **Endpoint**: `/api/cron/process-sequences`
- **Schedule**: Runs every minute (* * * * *)
- **Secret**: `yRaxumteDNfJ8UDiNI1mpYDrk/Ft+r55MvEh7DKHnZE=`
- **Function**: Processes all active sequence enrollments

**Manual Trigger**:
```bash
curl -X POST https://loumassbeta.vercel.app/api/cron/process-sequences \
  -H "x-cron-secret: yRaxumteDNfJ8UDiNI1mpYDrk/Ft+r55MvEh7DKHnZE="
```

## 🔧 LOCAL DEVELOPMENT

**Start Development Server**:
```bash
cd /Users/louispiotti/loumass_beta
npm run dev
```

**Build for Production**:
```bash
npm run build
```

**Type Check**:
```bash
npm run type-check
```

## 📝 TEST SCRIPTS

Located in project root:
- `test-process-replied-enrollment.js` - Tests reply processing
- `test-sequence-processing.js` - Tests sequence execution
- `test-direct-process.js` - Direct processing test

**Run Test Scripts**:
```bash
DATABASE_URL="postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require" node test-process-replied-enrollment.js
```

## 🐛 CRITICAL CODE SECTIONS TO FIX

### 1. THREADING FIX NEEDED
**File**: `/src/services/sequence-service.ts`
**Lines**: 531-537, 628-634
**Problem**: `messageIdForReply` not being set correctly for standalone sequences

### 2. GMAIL SERVICE THREADING
**File**: `/src/services/gmail-service.ts`
**Lines**: 206-238
**Problem**: Headers might not be properly formatted

### 3. CONDITION EVALUATION
**File**: `/src/services/sequence-service.ts`
**Lines**: 1066-1145
**Function**: `evaluateCondition()`
**Problem**: Evaluates immediately instead of waiting for reply detection

## 🔑 AUTHENTICATION & SECRETS

### Google OAuth (for Gmail)
- **Client ID**: `988882414599-oc33nemts3iu0p2d1pnng7vhbm44l3u4.apps.googleusercontent.com`
- **Client Secret**: `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`

### NextAuth
- **Secret**: `your-local-secret-key-for-development-loumass-beta`
- **URL**: `http://localhost:3000` (local) / `https://loumassbeta.vercel.app` (production)

## 📊 TEST DATA

### Active Test Sequences
1. **STAND ALONE (Copy)**: `cmfcxnr6g0001k004ok1p668d`
2. **Original Test**: `cmfcw24ta0001jr04eavo9p3n`

### Test Contacts (ONLY USE THESE)
- `ljpiotti@gmail.com` - Primary test email
- `lou@soberafe.com` - Secondary test

### Latest Test Enrollment
- **Enrollment ID**: `cmfcxo2ap0003k004q8ssiw7a`
- **Contact**: `ljpiotti@gmail.com`
- **Current Step**: 4
- **Status**: ACTIVE

## 🚨 CRITICAL RULES

1. **NEVER** email anyone except `ljpiotti@gmail.com` for testing
2. **ALWAYS** deploy to Vercel manually with `git push origin main`
3. **ALWAYS** check Vercel logs for errors after deployment
4. **NEVER** modify production data without testing locally first
5. **ALWAYS** use the Neon database connection string with `?sslmode=require`

## 📋 IMMEDIATE ACTION ITEMS

1. **FIX THREADING**:
   - Ensure `messageIdHeader` is stored after first email
   - Always add `In-Reply-To` and `References` headers for follow-ups
   - Test with new enrollment to verify threading works

2. **FIX CONDITION TIMING**:
   - Add delay before evaluating "REPLIED" conditions
   - Check for reply events BEFORE sending next email
   - Consider implementing a "wait for reply" mechanism

3. **VERIFY TRACKING**:
   - Ensure tracking pixels/links are added to ALL emails
   - Check that tracking service is called for follow-ups

## 🔍 DEBUGGING COMMANDS

**Check Sequence Steps**:
```sql
SELECT steps::jsonb FROM "Sequence" WHERE id = 'cmfcxnr6g0001k004ok1p668d';
```

**Check Enrollment Status**:
```sql
SELECT * FROM "SequenceEnrollment" WHERE "sequenceId" = 'cmfcxnr6g0001k004ok1p668d' ORDER BY "createdAt" DESC;
```

**Check Reply Events**:
```sql
SELECT * FROM "SequenceEvent" WHERE "enrollmentId" = 'cmfcxo2ap0003k004q8ssiw7a' AND "eventType" = 'REPLIED';
```

## 📱 MONITORING

**Vercel Logs**: https://vercel.com/louis-piottis-projects/loumass_beta
**Check Deployment**: `vercel list --yes`
**Database GUI**: Run `npx prisma studio` with DATABASE_URL

## ⚠️ KNOWN ISSUES

1. Threading completely broken for standalone sequences
2. Condition evaluation happens too early
3. Reply detection may be delayed
4. Tracking might not work on follow-up emails
5. PostgreSQL uses camelCase for column names (not snake_case)

## 🆘 EMERGENCY CONTACTS

- **GitHub Repo**: https://github.com/Uncle-Lou-AfterShockFam/loumass-email-marketing
- **Vercel Dashboard**: https://vercel.com/louis-piottis-projects
- **Neon Dashboard**: https://console.neon.tech

---

**LAST KNOWN STATE**: 
- Threading fix attempted but NOT WORKING
- Deployment completed at 3:16 PM
- Test enrollment active but follow-up not threading
- User extremely frustrated with repeated failures

**CRITICAL**: The threading issue MUST be fixed. Emails are sending but NOT in the same thread. The `In-Reply-To` header is NOT being added despite multiple fix attempts.