# 🚀 SEQUENCE AUTOMATION - Next Development Phase

## 📋 Current State Summary
The LOUMASS platform has completed the following components:
- ✅ **Sequence Builder UI** - Fully functional drag-and-drop interface
- ✅ **Database Schema** - Complete with Sequence, SequenceEnrollment, and SequenceEvent models
- ✅ **API Endpoints** - CRUD operations for sequences and enrollments
- ✅ **Email Tracking** - Open, click, and reply tracking working
- ✅ **Interactions Dashboard** - Complete with filtering and data relationships

## 🎯 NEXT PRIORITY: Automated Sequence Execution Engine

### 1. Background Job System
**Goal**: Implement a system to automatically process sequence steps

#### Option A: Vercel Cron Jobs (Recommended for Vercel)
```typescript
// app/api/cron/sequences/route.ts
export async function GET(request: Request) {
  // Run every 5 minutes
  // Process pending sequence steps
  // Send emails for due steps
  // Update enrollment statuses
}
```

#### Option B: QStash by Upstash (Alternative)
- Serverless message queue
- Reliable delivery with retries
- Good for Vercel deployments

### 2. Core Components to Build

#### A. Sequence Processor (`/src/services/sequenceProcessor.ts`)
```typescript
class SequenceProcessor {
  // Process all active enrollments
  async processActiveEnrollments() {
    // 1. Get all ACTIVE enrollments
    // 2. Check if next step is due
    // 3. Evaluate conditions if applicable
    // 4. Send email or execute action
    // 5. Update enrollment progress
  }

  // Process a single enrollment
  async processEnrollment(enrollmentId: string) {
    // Get enrollment with sequence steps
    // Determine current step
    // Check delays
    // Execute step
  }

  // Evaluate step conditions
  async evaluateCondition(
    enrollment: SequenceEnrollment,
    condition: StepCondition
  ): Promise<boolean> {
    // Check EmailEvents for condition type
    // Return true/false for branch selection
  }
}
```

#### B. Delay Calculator (`/src/services/delayCalculator.ts`)
```typescript
class DelayCalculator {
  // Calculate when next step should execute
  calculateNextStepTime(
    lastStepTime: Date,
    delay: DelayStep
  ): Date {
    // Handle different delay units
    // Consider business hours if configured
    // Return execution timestamp
  }

  // Check if step is due
  isStepDue(
    enrollment: SequenceEnrollment,
    step: SequenceStep
  ): boolean {
    // Compare current time with calculated time
    // Account for timezone if needed
  }
}
```

#### C. Condition Evaluator (`/src/services/conditionEvaluator.ts`)
```typescript
class ConditionEvaluator {
  // Evaluate email opened condition
  async hasOpened(
    contactId: string,
    referenceStepId: string,
    timeWindow?: number
  ): Promise<boolean> {
    // Query EmailEvents for OPENED type
  }

  // Evaluate email clicked condition
  async hasClicked(
    contactId: string,
    referenceStepId: string,
    linkUrl?: string
  ): Promise<boolean> {
    // Query EmailEvents for CLICKED type
    // Optional: Check specific link
  }

  // Evaluate email replied condition
  async hasReplied(
    contactId: string,
    referenceStepId: string
  ): Promise<boolean> {
    // Query EmailEvents for REPLIED type
  }
}
```

### 3. Database Updates Needed

#### A. Add to SequenceEnrollment model:
```prisma
model SequenceEnrollment {
  // ... existing fields ...
  nextStepScheduledAt DateTime?  // When next step should run
  currentStepStartedAt DateTime? // When current step started
  stepHistory Json?              // Array of executed steps with timestamps
}
```

#### B. Add to Sequence model:
```prisma
model Sequence {
  // ... existing fields ...
  timezone String @default("UTC") // For scheduling
  businessHoursOnly Boolean @default(false)
  businessHoursStart String? // "09:00"
  businessHoursEnd String?   // "17:00"
}
```

### 4. API Endpoints to Create

#### A. Manual trigger endpoint
```typescript
// POST /api/sequences/[id]/process
// Manually trigger processing for testing
```

#### B. Enrollment control endpoints
```typescript
// POST /api/sequences/enrollments/[id]/pause
// POST /api/sequences/enrollments/[id]/resume
// POST /api/sequences/enrollments/[id]/skip-step
```

### 5. Implementation Steps

1. **Phase 1: Basic Execution**
   - [ ] Create sequence processor service
   - [ ] Implement delay calculation
   - [ ] Add cron job for processing
   - [ ] Test with simple email sequences

2. **Phase 2: Conditions**
   - [ ] Implement condition evaluator
   - [ ] Add branching logic
   - [ ] Test opened/clicked/replied conditions
   - [ ] Handle true/false branches

3. **Phase 3: Advanced Features**
   - [ ] Business hours support
   - [ ] Timezone handling
   - [ ] Skip weekends option
   - [ ] A/B testing support

4. **Phase 4: Monitoring**
   - [ ] Add logging for each step execution
   - [ ] Create sequence analytics
   - [ ] Error handling and retries
   - [ ] Webhook notifications

### 6. Testing Strategy

#### Unit Tests
- Delay calculation accuracy
- Condition evaluation logic
- Step ordering

#### Integration Tests
- Full sequence execution
- Condition branching
- Email sending integration

#### E2E Tests
- Enroll contact → Process steps → Verify emails sent
- Condition triggers → Correct branch taken

### 7. Key Considerations

#### Performance
- Batch process enrollments to avoid timeouts
- Use database transactions for consistency
- Implement rate limiting for email sending

#### Reliability
- Handle Gmail API rate limits
- Retry failed email sends
- Log all actions for debugging

#### User Experience
- Real-time updates via websockets (optional)
- Progress indicators in UI
- Clear error messages

### 8. Example Sequence Flow
```
1. Contact enrolled
2. Send welcome email (immediate)
3. Wait 1 day
4. Check if opened
   - If opened: Send content email
   - If not opened: Send reminder
5. Wait 3 days
6. Send follow-up
7. Mark enrollment as COMPLETED
```

### 9. Environment Variables Needed
```env
# Cron secret for Vercel
CRON_SECRET=your-secret-here

# Optional: QStash if using Upstash
QSTASH_URL=https://qstash.upstash.io
QSTASH_TOKEN=your-token
```

### 10. Files to Reference
- `/src/app/api/sequences/route.ts` - Existing sequence API
- `/src/app/api/campaigns/[id]/send/route.ts` - Email sending logic
- `/src/lib/gmail.ts` - Gmail integration
- `/prisma/schema.prisma` - Database models
- `/src/app/dashboard/sequences/[id]/page.tsx` - Sequence builder UI

## 🚨 Critical Implementation Notes

1. **Thread Management**: Sequences can specify whether to reply in thread or start new thread
2. **Rate Limiting**: Gmail API has quotas - implement proper rate limiting
3. **Idempotency**: Ensure emails aren't sent twice if processing fails/retries
4. **Tracking**: All emails should include tracking pixels/links if enabled
5. **Unsubscribe**: Honor unsubscribe status before sending

## 📊 Success Metrics
- Sequences process within 5 minutes of scheduled time
- 99% delivery success rate
- Condition evaluation accuracy > 99%
- No duplicate emails sent

## 🔄 Next Session Starting Point
Begin with implementing the basic SequenceProcessor class and a simple cron job to process active enrollments. Focus on getting email steps working first, then add delays, then conditions.

---
*Last Updated: December 2024*
*Platform Status: Sequence UI Complete, Automation Engine Next Priority*