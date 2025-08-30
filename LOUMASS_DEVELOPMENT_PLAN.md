# 🚀 LOUMASS Platform Development Plan
## Multi-Tenant Email Marketing SaaS with Advanced Automation

### 📋 Executive Summary
Building a production-ready email marketing platform with Gmail integration, advanced sequence automation, reply tracking, and multi-tenant architecture.

## 🏗️ Architecture Overview

### Tech Stack
- **Frontend**: Next.js 15.5.2, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL (Vercel Postgres)
- **Authentication**: NextAuth.js with Google OAuth
- **Email**: Gmail API integration
- **Tracking**: Custom pixel tracking with domain verification
- **Deployment**: Vercel with edge functions

### Data Models (Already Implemented)
- ✅ User (multi-tenant support)
- ✅ Campaign (with trackingEnabled toggle)
- ✅ Sequence (with conditional steps in JSON)
- ✅ Contact (with tags and variables)
- ✅ EmailEvent (comprehensive tracking)
- ✅ Recipient (thread tracking via gmailThreadId)
- ✅ TrackingDomain (custom domain support)

## 📊 Development Phases

### Phase 1: Core Pages Implementation (Week 1)
Build the missing pages with full CRUD operations.

#### 1.1 Campaigns Page `/dashboard/campaigns`
- **List View** (`/dashboard/campaigns/page.tsx`)
  - DataTable with sorting/filtering
  - Status indicators (Draft, Sending, Sent)
  - Quick stats (sent, opens, clicks, replies)
  - Bulk actions (delete, duplicate, archive)
  
- **Create/Edit Campaign** (`/dashboard/campaigns/new/page.tsx`)
  - Rich text editor for email content
  - Variable insertion ({{firstName}}, {{company}})
  - Preview mode (desktop/mobile)
  - Test email functionality
  - Tracking toggle (open/click tracking on/off)
  - Schedule or send immediately
  - Contact selection with segments
  
- **Campaign Analytics** (`/dashboard/campaigns/[id]/page.tsx`)
  - Real-time metrics dashboard
  - Open/click heatmap
  - Reply tracking
  - Recipient-level details
  - Export to CSV

#### 1.2 Sequences Page `/dashboard/sequences`
- **List View** (`/dashboard/sequences/page.tsx`)
  - Active/paused status
  - Enrollment counts
  - Performance metrics
  - Quick actions (pause, resume, duplicate)
  
- **Sequence Builder** (`/dashboard/sequences/new/page.tsx`)
  ```typescript
  interface SequenceStep {
    id: string
    type: 'email' | 'delay' | 'condition'
    subject?: string
    content?: string
    delay?: { days: number; hours: number }
    condition?: {
      type: 'opened' | 'clicked' | 'replied' | 'not_opened' | 'not_clicked'
      referenceStep: string
      trueBranch: string[]
      falseBranch: string[]
    }
    replyToThread: boolean // Reply in thread vs new email
    trackingEnabled: boolean
  }
  ```
  - Visual flow builder with drag-and-drop
  - Conditional branching UI
  - A/B testing support
  - Preview each step
  - Test sequence flow
  
- **Sequence Analytics** (`/dashboard/sequences/[id]/page.tsx`)
  - Funnel visualization
  - Drop-off rates
  - Average time between steps
  - Contact journey view

#### 1.3 Contacts Page `/dashboard/contacts`
- **List View** (`/dashboard/contacts/page.tsx`)
  - Advanced filtering (tags, segments, activity)
  - Bulk operations (tag, delete, export)
  - Quick search
  - Activity timeline
  
- **Import/Export** (`/dashboard/contacts/import/page.tsx`)
  - CSV upload with mapping
  - Duplicate handling
  - Validation errors display
  - Progress tracking
  - Export with filters
  
- **Contact Profile** (`/dashboard/contacts/[id]/page.tsx`)
  - Complete activity history
  - Email engagement timeline
  - Sequence enrollments
  - Custom fields editing
  - Manual email sending

#### 1.4 Analytics Dashboard `/dashboard/analytics`
- **Overview** (`/dashboard/analytics/page.tsx`)
  - Key metrics cards
  - Trend charts (7/30/90 days)
  - Top performing campaigns
  - Engagement heatmap
  
- **Detailed Reports** (`/dashboard/analytics/reports/page.tsx`)
  - Campaign comparison
  - Sequence performance
  - Contact engagement scoring
  - Domain reputation monitoring
  - Export capabilities

#### 1.5 Replies Tracking `/dashboard/replies`
- **Inbox View** (`/dashboard/replies/page.tsx`)
  - Unified reply inbox
  - Campaign/sequence attribution
  - Quick reply functionality
  - Mark as handled/pending
  - Sentiment analysis (future)
  
- **Reply Analytics** (`/dashboard/replies/analytics/page.tsx`)
  - Response rates by campaign
  - Time to reply metrics
  - Reply sentiment distribution
  - Top reply triggers

### Phase 2: Advanced Features (Week 2)

#### 2.1 Email Thread Management
```typescript
// API: /api/email/send
interface EmailSendOptions {
  replyToMessageId?: string // Gmail Message ID to reply to
  threadId?: string // Gmail Thread ID to continue
  createNewThread: boolean // Force new thread
  trackingEnabled: {
    opens: boolean
    clicks: boolean
  }
}
```

#### 2.2 Conditional Sequence Engine
```typescript
// Service: /src/services/sequence-engine.ts
class SequenceEngine {
  async evaluateCondition(
    condition: SequenceCondition,
    enrollment: SequenceEnrollment
  ): Promise<'true_branch' | 'false_branch'> {
    // Check email events for condition
    // Route to appropriate branch
  }
  
  async processEnrollment(enrollment: SequenceEnrollment) {
    // Get current step
    // Evaluate conditions
    // Send email or wait
    // Update enrollment
  }
}
```

#### 2.3 Tracking System Enhancement
```typescript
// Service: /src/services/tracking.ts
interface TrackingOptions {
  openTracking: boolean
  clickTracking: boolean
  customDomain?: string
  pixelVariants: string[] // Multiple tracking methods
}

// Implement toggle in email builder
function insertTrackingPixel(
  content: string,
  options: TrackingOptions
): string {
  if (!options.openTracking) return content
  // Insert pixel with custom domain
}
```

#### 2.4 Reply Detection System
```typescript
// Background job: /src/jobs/reply-monitor.ts
async function monitorReplies() {
  // Poll Gmail API for new messages
  // Match to sent emails via threadId
  // Update recipient status
  // Trigger sequence conditions
  // Send webhook notifications
}
```

### Phase 3: Multi-Tenancy & Scaling (Week 3)

#### 3.1 Account Management
- Team members and permissions
- Billing and usage tracking
- API keys for integrations
- White-label options

#### 3.2 Performance Optimization
- Email sending queue with rate limiting
- Batch processing for large campaigns
- Caching layer for analytics
- CDN for tracking pixels

#### 3.3 Security & Compliance
- Data encryption at rest
- GDPR compliance tools
- Bounce/complaint handling
- Spam score checking

## 🎯 Implementation Priority

### Immediate (Today)
1. ✅ Create this development plan
2. Build Campaigns list page
3. Build Campaigns create/edit page
4. Implement tracking toggle functionality

### Tomorrow
1. Build Sequences list page
2. Build Sequence builder with conditional logic
3. Implement thread vs new email logic

### This Week
1. Complete Contacts management
2. Build Analytics dashboard
3. Implement Replies tracking
4. Add reply detection job

### Next Week
1. Enhance tracking system
2. Add A/B testing
3. Implement webhooks
4. Performance optimization

## 📁 File Structure

```
/src
├── app/
│   ├── dashboard/
│   │   ├── campaigns/
│   │   │   ├── page.tsx                 # List view
│   │   │   ├── new/page.tsx            # Create campaign
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx            # Analytics
│   │   │   │   └── edit/page.tsx       # Edit campaign
│   │   ├── sequences/
│   │   │   ├── page.tsx                # List view
│   │   │   ├── new/page.tsx            # Builder
│   │   │   └── [id]/page.tsx           # Analytics
│   │   ├── contacts/
│   │   │   ├── page.tsx                # List view
│   │   │   ├── import/page.tsx         # Import
│   │   │   └── [id]/page.tsx           # Profile
│   │   ├── analytics/
│   │   │   ├── page.tsx                # Overview
│   │   │   └── reports/page.tsx        # Detailed
│   │   └── replies/
│   │       ├── page.tsx                # Inbox
│   │       └── analytics/page.tsx      # Analytics
│   └── api/
│       ├── campaigns/                   # CRUD APIs
│       ├── sequences/                   # Sequence APIs
│       ├── contacts/                    # Contact APIs
│       ├── analytics/                   # Analytics APIs
│       ├── replies/                     # Reply APIs
│       └── tracking/                    # Tracking endpoints
├── components/
│   ├── campaigns/                       # Campaign components
│   ├── sequences/                       # Sequence builder
│   ├── contacts/                        # Contact components
│   ├── analytics/                       # Charts & metrics
│   └── replies/                         # Reply components
├── services/
│   ├── email.service.ts                # Gmail integration
│   ├── sequence.engine.ts              # Sequence processor
│   ├── tracking.service.ts             # Tracking logic
│   ├── analytics.service.ts            # Metrics calculation
│   └── reply.detector.ts               # Reply monitoring
├── hooks/
│   ├── useCampaigns.ts
│   ├── useSequences.ts
│   ├── useContacts.ts
│   ├── useAnalytics.ts
│   └── useReplies.ts
└── lib/
    ├── gmail.ts                         # Gmail API wrapper
    ├── prisma.ts                        # Database client
    └── tracking.ts                      # Tracking utilities
```

## 🔧 API Endpoints

### Campaigns
- `GET /api/campaigns` - List with pagination
- `POST /api/campaigns` - Create new
- `GET /api/campaigns/[id]` - Get details
- `PUT /api/campaigns/[id]` - Update
- `DELETE /api/campaigns/[id]` - Delete
- `POST /api/campaigns/[id]/send` - Send campaign
- `POST /api/campaigns/[id]/test` - Send test
- `GET /api/campaigns/[id]/analytics` - Get metrics

### Sequences
- `GET /api/sequences` - List sequences
- `POST /api/sequences` - Create new
- `PUT /api/sequences/[id]` - Update
- `POST /api/sequences/[id]/enroll` - Enroll contacts
- `POST /api/sequences/[id]/pause` - Pause sequence
- `GET /api/sequences/[id]/analytics` - Get metrics

### Contacts
- `GET /api/contacts` - List with filters
- `POST /api/contacts` - Create new
- `POST /api/contacts/import` - Bulk import
- `GET /api/contacts/export` - Export CSV
- `PUT /api/contacts/[id]` - Update contact
- `DELETE /api/contacts/[id]` - Delete contact
- `GET /api/contacts/[id]/activity` - Get history

### Analytics
- `GET /api/analytics/overview` - Dashboard metrics
- `GET /api/analytics/campaigns` - Campaign stats
- `GET /api/analytics/sequences` - Sequence stats
- `GET /api/analytics/engagement` - Engagement metrics

### Replies
- `GET /api/replies` - List replies
- `POST /api/replies/sync` - Sync from Gmail
- `PUT /api/replies/[id]/status` - Update status
- `POST /api/replies/[id]/respond` - Quick reply

## 🚀 Deployment Strategy

### Environment Variables
```env
# Database
DATABASE_URL=
DIRECT_DATABASE_URL=

# Auth
NEXTAUTH_URL=
NEXTAUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Gmail API
GMAIL_API_KEY=

# Tracking
TRACKING_DOMAIN=
TRACKING_PIXEL_URL=

# Redis (for queues)
REDIS_URL=

# Analytics
ANALYTICS_API_KEY=
```

### CI/CD Pipeline
1. Run tests on PR
2. Build and type check
3. Deploy to staging
4. Run E2E tests
5. Deploy to production
6. Monitor metrics

## 📈 Success Metrics

### Technical KPIs
- Page load time < 1s
- API response time < 200ms
- Email delivery rate > 95%
- Tracking accuracy > 99%
- Zero downtime deployments

### Business KPIs
- User activation rate > 60%
- Campaign creation time < 5 min
- Sequence setup time < 10 min
- Support ticket rate < 5%
- User retention > 80%

## 🔐 Security Considerations

### Data Protection
- Encrypt sensitive data
- Use parameterized queries
- Implement rate limiting
- Add CSRF protection
- Enable audit logging

### Gmail API Security
- Refresh tokens regularly
- Scope minimization
- IP whitelisting
- Webhook verification

## 📝 Documentation Requirements

### User Documentation
- Getting started guide
- Campaign creation tutorial
- Sequence builder guide
- API documentation
- Video tutorials

### Developer Documentation
- Architecture overview
- API reference
- Database schema
- Deployment guide
- Contributing guidelines

## 🎯 Next Steps

1. **Immediate Action**: Start building Campaigns page
2. **Documentation**: Update CLAUDE.md with architecture
3. **Testing**: Set up E2E tests for critical paths
4. **Monitoring**: Implement error tracking with Sentry
5. **Analytics**: Add PostHog for user behavior tracking

---

*This plan serves as the single source of truth for LOUMASS platform development. Update as features are completed.*