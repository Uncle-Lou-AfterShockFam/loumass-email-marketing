# LOUMASS - Claude Handoff Prompt

## 🎯 Project Context
You are working on **LOUMASS**, a production email marketing SaaS platform. The core infrastructure is complete and working in production. Your task is to build out additional features and improve the UI/UX.

## ✅ What's Already Working
- **Authentication**: Google OAuth with NextAuth.js
- **Gmail Integration**: Full sending, threading, and reply tracking
- **Campaigns**: Creation, sending, and analytics
- **Sequences**: Automation with conditional branching
- **Tracking**: Opens, clicks, replies with user-specific domains
- **Contacts**: Full CRUD with tags and variables
- **OAuth Management**: Users can bring their own Google credentials

## 🏗️ Technical Stack
- **Frontend**: Next.js 15.5.2, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL (Neon production, local dev)
- **Auth**: NextAuth.js
- **Email**: Gmail API
- **Deployment**: Vercel

## 📁 Key Files to Review First
1. `/prisma/schema.prisma` - Database schema
2. `/src/services/gmail-service.ts` - Email sending logic
3. `/src/services/sequence-service.ts` - Sequence automation
4. `/src/app/dashboard/layout.tsx` - Dashboard structure
5. `/docs/master-documentation/CURRENT_STATE.md` - Detailed current state
6. `/docs/master-documentation/TECHNICAL_DECISIONS.md` - Architecture decisions

## 🚀 Priority Features to Build

### 1. Dashboard Analytics Page
**Location**: `/src/app/dashboard/analytics/page.tsx`
**Requirements**:
- Aggregate metrics across all campaigns
- Charts for open/click rates over time
- Top performing campaigns table
- Contact engagement scores
- Export functionality

### 2. Email Template System
**Location**: `/src/app/dashboard/templates/`
**Requirements**:
- Template library with categories
- Rich text editor (consider Lexical or TipTap)
- Variable replacement system `{{firstName}}`, `{{company}}`
- Preview functionality
- Template sharing between campaigns/sequences

### 3. Contact Import System
**Location**: `/src/app/dashboard/contacts/import/`
**Requirements**:
- CSV upload with field mapping
- Duplicate handling options
- Tag assignment during import
- Progress indicator for large imports
- Error reporting and rollback

### 4. Advanced Sequence Features
**Location**: `/src/services/sequence-service.ts`
**Requirements**:
- Time-based delays (wait until specific time/day)
- Business hours enforcement
- A/B testing branches
- Goal completion tracking
- Sequence templates

### 5. Settings Pages
**Location**: `/src/app/dashboard/settings/`
**Requirements**:
- Email signature management
- Sending limits configuration
- Team member invites (multi-user)
- Webhook configuration UI
- API token generation

## 🎨 UI/UX Improvements Needed

### Navigation
- Add breadcrumbs to all pages
- Implement command palette (Cmd+K)
- Add quick actions menu
- Improve mobile responsiveness

### Data Tables
- Add sorting to all columns
- Implement advanced filtering
- Add bulk actions toolbar
- Export to CSV functionality

### Forms
- Add field validation feedback
- Implement autosave for drafts
- Add keyboard shortcuts
- Improve error messaging

### Visual Feedback
- Add loading skeletons
- Implement progress indicators
- Add success/error toasts consistently
- Improve empty states

## ⚠️ Critical Implementation Notes

### Email Threading
```typescript
// Always maintain threading by using:
// 1. In-Reply-To: previousMessageId
// 2. References: originalMessageId
// 3. gmailThreadId consistency
```

### User Isolation
```typescript
// ALWAYS filter by userId in queries:
await prisma.campaign.findMany({
  where: { userId: session.user.id }
})
```

### Tracking Domains
```typescript
// Always check for user's custom domain first:
const trackingDomain = await prisma.trackingDomain.findUnique({
  where: { userId }
})
const baseUrl = trackingDomain?.verified 
  ? `https://${trackingDomain.domain}`
  : process.env.NEXT_PUBLIC_BASE_URL
```

### Sequence Types
```typescript
// Remember two types with different behaviors:
// STANDALONE - internal condition checking
// CAMPAIGN_FOLLOWUP - checks original campaign
```

## 🔧 Development Workflow

### Local Setup
```bash
# Install dependencies
npm install

# Set up database
npx prisma generate
npx prisma db push

# Start development
npm run dev
```

### Testing Accounts
- Primary: ljpiotti@aftershockfam.org
- Secondary: lou@soberafe.com
- Both have Gmail connected and tracking domains configured

### Deployment
```bash
# Build and check
npm run build
npm run type-check

# Deploy to production
vercel --prod
```

## 📊 Database Queries Reference

### Get Campaign with Full Analytics
```typescript
const campaign = await prisma.campaign.findUnique({
  where: { id, userId },
  include: {
    recipients: {
      include: {
        contact: true,
        emailEvents: true
      }
    },
    _count: {
      select: {
        recipients: true,
        emailEvents: true
      }
    }
  }
})
```

### Get Sequence with Enrollments
```typescript
const sequence = await prisma.sequence.findUnique({
  where: { id, userId },
  include: {
    enrollments: {
      include: {
        contact: true,
        sequenceEvents: true
      }
    }
  }
})
```

## 🚨 Common Pitfalls to Avoid

1. **Don't forget user isolation** - Always filter by userId
2. **Don't skip Message-ID capture** - Needed for threading
3. **Don't hardcode tracking domains** - Use user's domain
4. **Don't mix sequence types** - They behave differently
5. **Don't forget to encrypt** - OAuth secrets must be encrypted

## 📝 Component Patterns

### API Route Pattern
```typescript
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Your logic here
  
  return NextResponse.json({ data })
}
```

### Client Component Pattern
```typescript
'use client'

import useSWR from 'swr'

export function MyComponent() {
  const { data, error, mutate } = useSWR('/api/resource', fetcher)
  
  if (error) return <ErrorState />
  if (!data) return <LoadingState />
  
  return <YourUI data={data} />
}
```

## 🎯 Success Criteria

Your implementation should:
1. Maintain existing functionality
2. Follow established patterns
3. Include proper error handling
4. Be fully typed with TypeScript
5. Include loading and error states
6. Be responsive on mobile
7. Follow the existing UI design system

## 📚 Additional Resources

- **Docs**: `/docs/master-documentation/`
- **Components**: `/src/components/ui/`
- **Services**: `/src/services/`
- **Schemas**: `/src/lib/schemas/`
- **Types**: `/src/types/`

---

**Ready to start?** Pick a feature from the priority list and begin implementation. The codebase is well-structured and all core functionality is working. Focus on building great user experiences on top of the solid foundation.

Good luck! 🚀