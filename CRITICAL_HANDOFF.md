# 🚨 CRITICAL HANDOFF: LOUMASS Email Sequence Threading & Tracking Issues

## 📍 Project Location & Access

### Local Development
- **Project Path**: `/Users/louispiotti/loumass_beta`
- **Development URL**: http://localhost:3000
- **Node Version**: Required for Next.js 15.5.2

### GitHub Repository
- **URL**: https://github.com/Uncle-Lou-AfterShockFam/loumass-email-marketing
- **Branch**: main
- **Auto-deploy**: Pushes to main automatically deploy to Vercel

### Vercel Deployment
- **Production URL**: https://loumassbeta.vercel.app
- **Project ID**: `prj_NTDa3fPTPvHe9r57YmJ2PKdSHjCC`
- **Organization ID**: `team_x8fHgKrIrBJX7TJK5Fqymy8Y`
- **Deploy Command**: `vercel --prod` or `git push origin main` (auto-deploys)

### Neon Database (PostgreSQL)
- **Connection URL**: `postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require`
- **Database Name**: neondb
- **User**: neondb_owner
- **Host**: ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech
- **Prisma Studio**: `DATABASE_URL="postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require" npx prisma studio`

## 🔴 URGENT: 3 Critical Bugs - ROOT CAUSES IDENTIFIED!

### Current Status (As of 2025-09-09)
Despite multiple attempts, the following issues persist in the email sequence system:

1. **❌ Threading Broken**: Follow-up emails are NOT appearing as replies in recipient's inbox
   - They appear as separate emails
   - **ROOT CAUSE FOUND**: In-Reply-To and References headers are EMPTY (not missing!)
   - Headers are added but have no value because messageId is undefined/null
   - Message-IDs are stored WITH angle brackets (should be without)
   - Most enrollments have no `triggerRecipientId` to link back to original message

2. **❌ Tracking Missing**: No tracking pixels or click tracking in follow-up emails  
   - Plain links instead of tracked URLs
   - No open tracking pixel
   - **LIKELY CAUSE**: `addTrackingToEmail()` not being called or tracked HTML not replacing original

3. **❌ Condition Logic Broken**: BOTH branches execute instead of one
   - User receives both "REPLIED" and "NOT REPLIED" emails
   - Condition evaluation not stopping incorrect branch
   - **DATABASE ISSUE**: No `SequenceStepExecution` model exists to track which steps ran

## 🏗️ Application Architecture

### Tech Stack
- **Frontend**: Next.js 15.5.2, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (Neon cloud) with Prisma ORM
- **Email**: Gmail API (NOT SMTP) with OAuth
- **Auth**: NextAuth.js with Google OAuth

### Core Services & Their Roles

#### 1. **`/src/services/sequence-service.ts`** (1219 lines)
- **Purpose**: Core sequence execution engine
- **Key Methods**:
  - `processSequenceStep()`: Main executor (lines 36-701)
  - `evaluateCondition()`: Condition branch logic (lines 883-968)
  - `addTrackingToEmail()`: Adds tracking pixels/links (lines 775-881)
- **Threading Logic**:
  - Lines 422-554: Attempts to set up threading
  - Lines 436-471: Fetches Message-ID from campaign recipient
  - Lines 473-521: Sets `messageIdForReply` for threading
  - Line 633: Passes `messageId: messageIdForReply` to gmail service
  - Lines 641-674: Fetches Message-ID after sending
  - Lines 682-698: Stores Message-ID in database

#### 2. **`/src/services/gmail-service.ts`** (673 lines)
- **Purpose**: Gmail API integration for sending emails
- **Key Methods**:
  - `sendEmail()`: Main send function (lines 34-182)
  - `buildMessage()`: MIME message builder (lines 184-305)
  - `addTrackingToEmail()`: Tracking implementation (lines 524-672)
- **Threading Logic**:
  - Lines 205-241: SUPPOSED to add In-Reply-To/References headers
  - Line 213: Validates Message-ID (currently checks for '@')
  - Lines 215-221: Formats Message-ID with angle brackets
  - Lines 223-224: Sets `mailOptions.inReplyTo` and `mailOptions.references`
  - Line 262: `new MailComposer(mailOptions)` - builds MIME message

#### 3. **`/src/services/gmail-fetch-service.ts`**
- **Purpose**: Fetches email data from Gmail
- **Key Method**: `getMessageHeaders()` - retrieves Message-ID headers

### Database Schema (`/prisma/schema.prisma`)

```prisma
model SequenceEnrollment {
  id                 String           @id @default(cuid())
  sequenceId         String
  contactId          String
  status             EnrollmentStatus @default(ACTIVE)
  currentStep        Int              @default(0)
  gmailMessageId     String?   // Gmail's internal ID
  gmailThreadId      String?   // Gmail's thread ID  
  messageIdHeader    String?   // The actual Message-ID header for threading
  triggerCampaignId  String?   // Campaign that triggered sequence
  triggerRecipientId String?   // Campaign recipient ID
  // ... other fields
}

model Recipient {
  id              String          @id @default(cuid())
  campaignId      String
  contactId       String
  gmailMessageId  String?
  gmailThreadId   String?
  messageIdHeader String?   // Message-ID from campaign email
  // ... other fields
}
```

## 🔍 Evidence of Bugs

### User's Email Headers (Actual Data)
1. **First Email** (working):
   ```
   Message-ID: <CAMDusAsdcbDhZWdG1NwAE__+ZorWsHGxaQLi83H_VseegJbQRQ@mail.gmail.com>
   From: LOUMASS <louis@loumass.com>
   Subject: Test sequence for Louis
   ```

2. **Follow-up Email #1** (BROKEN):
   ```
   Message-ID: <CAMDusAs8QpkOxe8QJLcJqXMGCt=S+v-gGhyHQTYsjk0h+sKg4Q@mail.gmail.com>
   From: LOUIS <louis@loumass.com>
   Subject: Re: Test sequence for Louis
   // MISSING: In-Reply-To header
   // MISSING: References header
   // Content: "REPLIED - I got your reply"
   ```

3. **Follow-up Email #2** (BROKEN):
   ```
   Message-ID: <CAMDusAtG9bz5Mq1M+JHHGyRXGdM2Oim7C9Zh4-Xk-m3fCJfqOQ@mail.gmail.com>
   From: LOUIS <louis@loumass.com>
   Subject: Re: Test sequence for Louis
   // MISSING: In-Reply-To header
   // MISSING: References header
   // Content: "NOT REPLIED: Want to follow up"
   // BUG: Both condition branches sent!
   ```

## 🐛 Root Cause Analysis

### Threading Issue Investigation Path:

1. **Message-ID Storage**: 
   ```sql
   -- Check if Message-IDs are being stored
   SELECT id, gmailMessageId, gmailThreadId, messageIdHeader, currentStep
   FROM "SequenceEnrollment" 
   WHERE sequenceId = 'YOUR_SEQUENCE_ID';
   ```

2. **Critical Code Points to Debug**:
   ```typescript
   // sequence-service.ts line 506
   console.log('🚨 CRITICAL - messageIdForReply value:', messageIdForReply)
   
   // gmail-service.ts line 206
   console.log('🚨 CRITICAL - emailData.messageId:', emailData.messageId)
   
   // gmail-service.ts after line 262
   console.log('🚨 CRITICAL - mailOptions:', {
     inReplyTo: mailOptions.inReplyTo,
     references: mailOptions.references
   })
   ```

3. **MailComposer Investigation**:
   - The MIME message built by MailComposer might not include headers
   - Need to decode and check the actual message being sent

### Tracking Issue Path:

1. **Follow-up Email Tracking Lost**:
   - Lines 607-608 in sequence-service.ts should add tracking
   - Tracked HTML might not be passed correctly

### Condition Logic Issue:

1. **Both Branches Execute**:
   - Lines 172-323: Condition evaluation
   - Possible async race condition
   - Or condition result not properly routing

## 🔧 Debugging Commands

```bash
# Start development server with logging
npm run dev

# Open Prisma Studio to inspect database
DATABASE_URL="postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require" npx prisma studio

# Deploy to production
vercel --prod

# Check logs
vercel logs

# Git operations
git add -A
git commit -m "Fix: threading issue"
git push origin main  # Auto-deploys to Vercel
```

## 🎯 CONFIRMED ROOT CAUSES & FIXES

### 🔴 Issue #1: Threading Headers are EMPTY
**TEST RESULTS PROVE**: MailComposer adds `In-Reply-To:` and `References:` headers but they're EMPTY!

```bash
# From test-mime-headers.js output:
In-Reply-To:     # <-- Header present but NO VALUE
References:      # <-- Header present but NO VALUE
```

**THE PROBLEM CHAIN**:
1. Message-IDs are stored WITH angle brackets: `<CAMDusAs...@mail.gmail.com>`
2. Most enrollments have NO `triggerRecipientId` to fetch the original Message-ID
3. Even when messageId is passed, it's undefined/null when reaching MailComposer
4. The validation at line 212 in gmail-service.ts may be rejecting valid IDs

### 🔴 Issue #2: No Execution Tracking
**DATABASE MISSING**: No `SequenceStepExecution` model exists
- Cannot track which condition branch was taken
- Cannot prevent both branches from executing
- No way to know which steps have run

### 🔴 Issue #3: Debug Scripts Created
**NEW TOOLS AVAILABLE**:
```bash
# Comprehensive debugging
node debug-sequence-issues.js

# Test MIME header generation
node test-mime-headers.js

# Verify fixes
node verify-fixes.js
```

## 📝 Previous Fix Attempts

1. **2025-09-09 Morning**: Fixed FROM name to use user settings
2. **2025-09-09 Afternoon**: Attempted threading fix by:
   - Changing Message-ID validation to accept any ID with '@'
   - Adding angle bracket formatting
   - Adding comprehensive logging
   - Stripping/adding angle brackets for storage

## ⚠️ Critical Questions to Answer

1. **Is `enrollment.messageIdHeader` actually populated?**
   - Check database directly
   - Add logging at storage point

2. **What's the exact value of `messageIdForReply`?**
   - Log at line 506 and 633

3. **Is MailComposer including headers?**
   - Decode and inspect actual MIME message

4. **Why are both condition branches executing?**
   - Check if condition returns properly
   - Look for async issues

5. **Why is tracking missing?**
   - Verify `addTrackingToEmail()` is called
   - Check if tracked HTML is used

## 🔑 EXACT FIXES NEEDED

### Fix #1: Message-ID Storage & Retrieval
```typescript
// sequence-service.ts line ~687 - Remove angle brackets when storing
let cleanMessageId = messageIdHeader
if (cleanMessageId && cleanMessageId.startsWith('<') && cleanMessageId.endsWith('>')) {
  cleanMessageId = cleanMessageId.slice(1, -1)
}
// Store WITHOUT angle brackets
```

```typescript
// gmail-service.ts line ~212 - Fix validation and add brackets
if (emailData.messageId && emailData.messageId.includes('@')) {
  // Add angle brackets if not present
  let formattedMessageId = emailData.messageId.trim()
  if (!formattedMessageId.startsWith('<')) {
    formattedMessageId = '<' + formattedMessageId
  }
  if (!formattedMessageId.endsWith('>')) {
    formattedMessageId = formattedMessageId + '>'
  }
  
  console.log('🚨 SETTING THREADING HEADERS:', formattedMessageId)
  mailOptions.inReplyTo = formattedMessageId
  mailOptions.references = formattedMessageId
} else {
  console.error('🚨 NO VALID MESSAGE-ID - Headers will be EMPTY!')
}
```

### Fix #2: Add Execution Tracking Model
```prisma
model SequenceStepExecution {
  id           String   @id @default(cuid())
  enrollmentId String
  enrollment   SequenceEnrollment @relation(fields: [enrollmentId], references: [id])
  stepId       String
  executedAt   DateTime @default(now())
  status       String   // 'completed', 'skipped', 'failed'
  
  @@unique([enrollmentId, stepId]) // Prevent duplicate execution
}
```

### Fix #3: Ensure triggerRecipientId is Set
When enrolling from a campaign, MUST set triggerRecipientId to link back to the original email's Message-ID.

## 🚀 Quick Test Process

1. Create test sequence with 3 steps:
   - Step 1: Initial email
   - Step 2: Delay 1 minute
   - Step 3: Condition (if replied/not replied)
   - Step 4a: "Thanks for replying" email
   - Step 4b: "Haven't heard back" email

2. Enable "Reply to thread" for follow-up emails

3. Send to test contact

4. Check:
   - Do follow-ups thread in recipient inbox?
   - Is only one condition branch sent?
   - Are tracking pixels/links present?

## 📞 Contact & Support

- **Project Owner**: Louis Piotti
- **Email**: louis@loumass.com
- **Environment**: macOS Darwin 24.5.0

## 🆘 URGENT NOTE

The user has been extremely patient but is frustrated after multiple failed attempts to fix these issues. These bugs are CRITICAL and blocking production use of the sequence feature. The threading issue is the highest priority as it affects email deliverability and professional appearance.

**Last Updated**: 2025-09-09 (Date format from environment)
**Status**: 3 CRITICAL BUGS UNFIXED - NEEDS IMMEDIATE ATTENTION