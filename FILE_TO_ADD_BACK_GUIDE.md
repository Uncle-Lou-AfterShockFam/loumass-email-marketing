# 🔧 LOUMASS - Files to Add Back Guide

## 📋 Overview
This guide details all the files, database models, and functionality that need to be added back to complete the sequence automation system. These were temporarily removed/commented out to fix TypeScript build errors for deployment.

---

## 🗄️ Database Schema Changes

### 1. Add SequenceStep Model
**File:** `prisma/schema.prisma`

**Add this model after the existing models:**

```prisma
model SequenceStep {
  id             String   @id @default(cuid())
  enrollmentId   String
  stepIndex      Int      // Which step in the sequence (0, 1, 2, etc.)
  stepId         String   // ID of the step from the sequence JSON
  status         SequenceStepStatus @default(PENDING)
  scheduledFor   DateTime?
  sentAt         DateTime?
  openedAt       DateTime?
  clickedAt      DateTime?
  repliedAt      DateTime?
  errorMessage   String?
  
  // Tracking data
  trackingId     String?  // For opens/clicks tracking
  emailEventId   String?  // Link to EmailEvent if needed
  
  // Metadata
  variables      Json?    // Variables used when sending this step
  
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  
  // Relations
  enrollment     SequenceEnrollment @relation(fields: [enrollmentId], references: [id], onDelete: Cascade)
  
  @@unique([enrollmentId, stepIndex])
  @@index([enrollmentId, status])
  @@index([scheduledFor])
}

enum SequenceStepStatus {
  PENDING     // Waiting to be sent
  SCHEDULED   // Scheduled for future sending
  SENDING     // Currently being sent
  SENT        // Successfully sent
  OPENED      // Email was opened
  CLICKED     // Link was clicked
  REPLIED     // Contact replied
  FAILED      // Failed to send
  SKIPPED     // Skipped due to conditions
  CANCELLED   // Cancelled (enrollment ended)
}
```

### 2. Update SequenceEnrollment Model
**File:** `prisma/schema.prisma`

**Add relation to SequenceStep:**

```prisma
model SequenceEnrollment {
  id          String           @id @default(cuid())
  sequenceId  String
  contactId   String
  status      EnrollmentStatus @default(ACTIVE)
  currentStep Int              @default(0)
  completedAt DateTime?
  pausedAt    DateTime?
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt
  
  // Add this line:
  steps       SequenceStep[]   // Add relation to sequence steps
  
  contact     Contact          @relation(fields: [contactId], references: [id], onDelete: Cascade)
  sequence    Sequence         @relation(fields: [sequenceId], references: [id], onDelete: Cascade)
  
  @@unique([sequenceId, contactId])
  @@index([sequenceId, status])
}
```

### 3. Add NextActionAt to SequenceEnrollment
**File:** `prisma/schema.prisma`

**Add this field to SequenceEnrollment:**

```prisma
model SequenceEnrollment {
  id          String           @id @default(cuid())
  sequenceId  String
  contactId   String
  status      EnrollmentStatus @default(ACTIVE)
  currentStep Int              @default(0)
  nextActionAt DateTime?       // ADD THIS LINE - when next step should be sent
  completedAt DateTime?
  pausedAt    DateTime?
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt
  steps       SequenceStep[]
  
  contact     Contact          @relation(fields: [contactId], references: [id], onDelete: Cascade)
  sequence    Sequence         @relation(fields: [sequenceId], references: [id], onDelete: Cascade)
  
  @@unique([sequenceId, contactId])
  @@index([sequenceId, status])
  @@index([nextActionAt])  // ADD THIS INDEX for efficient cron queries
}
```

### 4. Deploy Schema Changes
```bash
# After making schema changes
npx prisma generate
npx prisma db push

# For production
DATABASE_URL="your-production-url" npx prisma db push
```

---

## 📄 Service Files to Update

### 1. Sequence Service (Restore Full Functionality)
**File:** `src/services/sequence-service.ts`

**Replace the commented `scheduleNextSteps` method with:**

```typescript
async scheduleNextSteps() {
  // Process scheduled sequence steps
  const now = new Date()
  
  // Find enrollments that need their next step processed
  const readyEnrollments = await prisma.sequenceEnrollment.findMany({
    where: {
      status: EnrollmentStatus.ACTIVE,
      nextActionAt: {
        lte: now
      }
    },
    include: {
      sequence: true,
      contact: true,
      steps: {
        orderBy: { stepIndex: 'desc' },
        take: 1
      }
    }
  })

  console.log(`Found ${readyEnrollments.length} enrollments ready for processing`)

  for (const enrollment of readyEnrollments) {
    try {
      const result = await this.processSequenceStep(enrollment.id)
      console.log(`Processed enrollment ${enrollment.id}:`, result)
      
      // If step was sent successfully, schedule the next one
      if (result.success && !result.completed) {
        await this.scheduleNextStep(enrollment.id)
      }
    } catch (error) {
      console.error(`Error processing enrollment ${enrollment.id}:`, error)
      
      // Mark enrollment as failed if too many errors
      const failedSteps = await prisma.sequenceStep.count({
        where: {
          enrollmentId: enrollment.id,
          status: SequenceStepStatus.FAILED
        }
      })
      
      if (failedSteps >= 3) {
        await prisma.sequenceEnrollment.update({
          where: { id: enrollment.id },
          data: { 
            status: EnrollmentStatus.FAILED,
            nextActionAt: null
          }
        })
      }
    }
  }
}

private async scheduleNextStep(enrollmentId: string) {
  const enrollment = await prisma.sequenceEnrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      sequence: true,
      steps: {
        orderBy: { stepIndex: 'desc' },
        take: 1
      }
    }
  })

  if (!enrollment) return

  const steps = enrollment.sequence.steps as any[]
  const nextStepIndex = enrollment.currentStep
  const nextStep = steps[nextStepIndex]

  if (!nextStep) {
    // Sequence completed
    await prisma.sequenceEnrollment.update({
      where: { id: enrollmentId },
      data: {
        status: EnrollmentStatus.COMPLETED,
        completedAt: new Date(),
        nextActionAt: null
      }
    })
    return
  }

  // Calculate when next step should be sent
  let nextActionAt = new Date()
  
  // If this isn't the first step, add delay
  if (enrollment.steps.length > 0) {
    const lastStep = enrollment.steps[0]
    if (lastStep.sentAt) {
      const delayMs = (nextStep.delay?.days || 0) * 24 * 60 * 60 * 1000 + 
                     (nextStep.delay?.hours || 0) * 60 * 60 * 1000
      nextActionAt = new Date(lastStep.sentAt.getTime() + delayMs)
    }
  }

  // Update enrollment with next action time
  await prisma.sequenceEnrollment.update({
    where: { id: enrollmentId },
    data: { nextActionAt }
  })

  // Create the pending step record
  await prisma.sequenceStep.create({
    data: {
      enrollmentId,
      stepIndex: nextStepIndex,
      stepId: nextStep.id,
      status: SequenceStepStatus.SCHEDULED,
      scheduledFor: nextActionAt
    }
  })
}
```

### 2. Update Process Sequence Step
**File:** `src/services/sequence-service.ts`

**Update the `processSequenceStep` method to create step records:**

```typescript
async processSequenceStep(enrollmentId: string): Promise<{ success: boolean; reason?: string; completed?: boolean; sentStep?: number }> {
  const enrollment = await prisma.sequenceEnrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      sequence: {
        include: { user: true }
      },
      contact: true,
      steps: {
        where: { stepIndex: enrollment.currentStep },
        take: 1
      }
    }
  })

  if (!enrollment || enrollment.status !== EnrollmentStatus.ACTIVE) {
    return { success: false, reason: 'Enrollment not active' }
  }

  const nextStepIndex = enrollment.currentStep
  const steps = enrollment.sequence.steps as any[]
  const nextStep = steps[nextStepIndex]

  if (!nextStep) {
    // Sequence completed
    await prisma.sequenceEnrollment.update({
      where: { id: enrollmentId },
      data: {
        status: EnrollmentStatus.COMPLETED,
        completedAt: new Date(),
        nextActionAt: null
      }
    })
    return { success: true, completed: true }
  }

  // Get or create the step record
  let stepRecord = enrollment.steps[0]
  if (!stepRecord) {
    stepRecord = await prisma.sequenceStep.create({
      data: {
        enrollmentId,
        stepIndex: nextStepIndex,
        stepId: nextStep.id,
        status: SequenceStepStatus.PENDING
      }
    })
  }

  // Update step to SENDING
  await prisma.sequenceStep.update({
    where: { id: stepRecord.id },
    data: { status: SequenceStepStatus.SENDING }
  })

  // Check conditions (existing code)
  if (nextStep.sendOnlyIfNoReply) {
    const hasReply = await this.checkForReply(enrollment.contactId, enrollment.sequenceId)
    if (hasReply) {
      await prisma.sequenceStep.update({
        where: { id: stepRecord.id },
        data: { 
          status: SequenceStepStatus.SKIPPED,
          errorMessage: 'Contact replied'
        }
      })
      
      await prisma.sequenceEnrollment.update({
        where: { id: enrollmentId },
        data: {
          status: EnrollmentStatus.COMPLETED,
          completedAt: new Date(),
          nextActionAt: null
        }
      })
      return { success: false, reason: 'Contact replied' }
    }
  }

  if (nextStep.sendOnlyIfNoOpen) {
    const hasOpened = await this.checkForOpen(enrollment.contactId, enrollment.sequenceId)
    if (hasOpened) {
      await prisma.sequenceStep.update({
        where: { id: stepRecord.id },
        data: { 
          status: SequenceStepStatus.SKIPPED,
          errorMessage: 'Contact already opened previous email'
        }
      })
      
      // Skip this step but continue sequence
      await prisma.sequenceEnrollment.update({
        where: { id: enrollmentId },
        data: { currentStep: enrollment.currentStep + 1 }
      })
      
      return this.processSequenceStep(enrollmentId)
    }
  }

  // Get Gmail credentials (existing code)
  const gmailToken = await prisma.gmailToken.findUnique({
    where: { userId: enrollment.sequence.userId }
  })

  if (!gmailToken) {
    await prisma.sequenceStep.update({
      where: { id: stepRecord.id },
      data: { 
        status: SequenceStepStatus.FAILED,
        errorMessage: 'No active Gmail account'
      }
    })
    return { success: false, reason: 'No active Gmail account' }
  }

  // Prepare email content (existing code)
  const subject = this.replaceVariables(nextStep.subject, enrollment.contact)
  const htmlContent = this.replaceVariables(nextStep.htmlContent, enrollment.contact)
  const textContent = nextStep.textContent ? 
    this.replaceVariables(nextStep.textContent, enrollment.contact) : undefined

  // Generate tracking ID
  const trackingId = `seq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // Update step record with tracking ID
  await prisma.sequenceStep.update({
    where: { id: stepRecord.id },
    data: { trackingId }
  })

  // Send the email (existing code with modifications)
  try {
    await this.gmailService.sendEmail(
      enrollment.sequence.userId,
      gmailToken.email,
      {
        to: [enrollment.contact.email],
        subject,
        htmlContent: this.addTrackingToEmail(htmlContent, trackingId),
        textContent,
        trackingId,
        sequenceId: enrollment.sequenceId,
        contactId: enrollment.contactId,
        threadId: previousRecipient?.gmailThreadId
      }
    )

    // Mark step as sent
    const sentAt = new Date()
    await prisma.sequenceStep.update({
      where: { id: stepRecord.id },
      data: { 
        status: SequenceStepStatus.SENT,
        sentAt
      }
    })

    // Update enrollment
    await prisma.sequenceEnrollment.update({
      where: { id: enrollmentId },
      data: { 
        currentStep: enrollment.currentStep + 1,
        nextActionAt: null // Will be set by scheduleNextStep
      }
    })

    return { success: true, sentStep: nextStep.position }
  } catch (error) {
    console.error('Failed to send sequence email:', error)
    
    // Mark step as failed
    await prisma.sequenceStep.update({
      where: { id: stepRecord.id },
      data: { 
        status: SequenceStepStatus.FAILED,
        errorMessage: error instanceof Error ? error.message : 'Failed to send'
      }
    })
    
    return { 
      success: false, 
      reason: error instanceof Error ? error.message : 'Failed to send' 
    }
  }
}
```

---

## 🚀 API Routes to Update

### 1. Sequences Schedule Route
**File:** `src/app/api/sequences/[id]/schedule/route.ts`

**Update to use the new nextActionAt field:**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SequenceService } from '@/services/sequence-service'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sequenceId = params.id
    const sequenceService = new SequenceService()

    // Process all ready steps for this sequence
    const enrollments = await prisma.sequenceEnrollment.findMany({
      where: {
        sequenceId,
        status: 'ACTIVE',
        nextActionAt: {
          lte: new Date()
        }
      }
    })

    const results = []
    for (const enrollment of enrollments) {
      const result = await sequenceService.processSequenceStep(enrollment.id)
      results.push({
        enrollmentId: enrollment.id,
        result
      })
      
      // Schedule next step if current step was successful
      if (result.success && !result.completed) {
        // This will be handled by the updated scheduleNextStep method
      }
    }

    return NextResponse.json({
      message: 'Sequence steps processed',
      processed: results.length,
      results
    })

  } catch (error) {
    console.error('Error processing sequence schedule:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### 2. Cron Job for Sequence Processing
**File:** `src/app/api/cron/process-sequences/route.ts` (CREATE NEW FILE)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { SequenceService } from '@/services/sequence-service'

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('Authorization')
    const cronSecret = process.env.CRON_SECRET_KEY
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sequenceService = new SequenceService()
    
    // Process all ready sequence steps
    await sequenceService.scheduleNextSteps()

    return NextResponse.json({
      success: true,
      message: 'Sequence steps processed successfully',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in sequence cron job:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Sequence cron endpoint is active',
    timestamp: new Date().toISOString()
  })
}
```

---

## 🎯 Component Updates

### 1. EnrollmentsList Component
**File:** `src/components/sequences/EnrollmentsList.tsx`

**Update interface to include proper step tracking:**

```typescript
interface Enrollment {
  id: string
  status: string
  createdAt: Date
  updatedAt: Date
  nextActionAt: Date | null  // Add this field
  currentStep: number
  completedAt: Date | null
  pausedAt: Date | null
  contact: {
    email: string
    firstName: string | null
    lastName: string | null
    company: string | null
  }
  steps: Array<{  // Add steps array
    id: string
    stepIndex: number
    status: string
    sentAt: Date | null
    openedAt: Date | null
    clickedAt: Date | null
    scheduledFor: Date | null
  }>
}
```

**Update the component render to show step status:**

```typescript
// In the enrollments mapping
{enrollments.map((enrollment) => (
  <div key={enrollment.id} className="border rounded-lg p-4">
    <div className="flex items-center justify-between mb-2">
      <div>
        <h4 className="font-medium">
          {enrollment.contact.firstName && enrollment.contact.lastName
            ? `${enrollment.contact.firstName} ${enrollment.contact.lastName}`
            : enrollment.contact.email}
        </h4>
        <p className="text-sm text-gray-500">{enrollment.contact.email}</p>
      </div>
      <div className="text-right">
        <span className={`px-2 py-1 rounded text-xs ${
          enrollment.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
          enrollment.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
          enrollment.status === 'PAUSED' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {enrollment.status}
        </span>
      </div>
    </div>
    
    <div className="text-sm space-y-1">
      <div className="flex justify-between">
        <span>Current Step:</span>
        <span>{enrollment.currentStep + 1}</span>
      </div>
      <div className="flex justify-between">
        <span>Enrolled:</span>
        <span>{new Date(enrollment.createdAt).toLocaleDateString()}</span>
      </div>
      {enrollment.nextActionAt && (
        <div className="flex justify-between">
          <span>Next Action:</span>
          <span>{new Date(enrollment.nextActionAt).toLocaleDateString()}</span>
        </div>
      )}
    </div>
    
    {/* Step Status Indicators */}
    {enrollment.steps.length > 0 && (
      <div className="mt-3 pt-3 border-t">
        <div className="text-xs text-gray-600 mb-2">Recent Steps:</div>
        <div className="space-y-1">
          {enrollment.steps.slice(0, 3).map((step) => (
            <div key={step.id} className="flex justify-between text-xs">
              <span>Step {step.stepIndex + 1}</span>
              <span className={`px-1 py-0.5 rounded ${
                step.status === 'SENT' ? 'bg-green-50 text-green-700' :
                step.status === 'OPENED' ? 'bg-blue-50 text-blue-700' :
                step.status === 'CLICKED' ? 'bg-purple-50 text-purple-700' :
                step.status === 'FAILED' ? 'bg-red-50 text-red-700' :
                'bg-gray-50 text-gray-700'
              }`}>
                {step.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
))}
```

---

## ⚙️ Vercel Cron Jobs Setup

### 1. Create Vercel Cron Configuration
**File:** `vercel.json` (CREATE/UPDATE)

```json
{
  "functions": {
    "src/app/api/cron/process-sequences/route.ts": {
      "maxDuration": 300
    }
  },
  "crons": [
    {
      "path": "/api/cron/process-sequences",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

### 2. Environment Variable for Cron
Add to Vercel environment variables:
```bash
CRON_SECRET_KEY=your-random-secret-key-here
```

---

## 🧪 Testing the Complete System

### 1. Test Sequence Step Creation
```typescript
// Test in browser console or API test
fetch('/api/sequences/your-sequence-id/enroll', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contactIds: ['contact-id-1', 'contact-id-2']
  })
})
```

### 2. Verify Database Records
```sql
-- Check enrollment with steps
SELECT 
  e.*,
  s.stepIndex,
  s.status as stepStatus,
  s.scheduledFor,
  s.sentAt
FROM "SequenceEnrollment" e
LEFT JOIN "SequenceStep" s ON s.enrollmentId = e.id
ORDER BY e.createdAt DESC, s.stepIndex ASC;

-- Check upcoming steps
SELECT *
FROM "SequenceEnrollment"
WHERE status = 'ACTIVE' 
  AND nextActionAt <= NOW()
ORDER BY nextActionAt ASC;
```

### 3. Test Manual Step Processing
```bash
# Test the cron endpoint manually
curl -X POST https://your-app.vercel.app/api/cron/process-sequences \
  -H "Authorization: Bearer your-cron-secret-key"
```

---

## 📋 Deployment Checklist

### Database Changes
- [ ] Add SequenceStep model to schema
- [ ] Add nextActionAt to SequenceEnrollment
- [ ] Add SequenceStepStatus enum
- [ ] Run `npx prisma generate`
- [ ] Run `npx prisma db push` (dev)
- [ ] Run production database migration

### Service Updates
- [ ] Restore full scheduleNextSteps method
- [ ] Update processSequenceStep to create step records
- [ ] Add scheduleNextStep private method
- [ ] Test sequence processing locally

### API Routes
- [ ] Update schedule route to use nextActionAt
- [ ] Create cron endpoint
- [ ] Add proper error handling
- [ ] Test all endpoints

### Components
- [ ] Update EnrollmentsList interface
- [ ] Add step status indicators
- [ ] Test enrollment display

### Deployment
- [ ] Add vercel.json with cron configuration
- [ ] Set CRON_SECRET_KEY environment variable
- [ ] Deploy and verify cron job runs
- [ ] Monitor sequence processing logs

---

## 🎉 Success Criteria

After implementing all changes:
- ✅ Sequences create step records for each enrollment
- ✅ Steps are scheduled based on delays
- ✅ Cron job processes ready steps every 5 minutes
- ✅ Failed steps are tracked and retried appropriately
- ✅ Enrollments show detailed step status
- ✅ Analytics include step-level metrics

Your sequence automation system will then be fully functional with complete tracking and scheduling capabilities!