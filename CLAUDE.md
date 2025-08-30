# 🚀 LOUMASS - Email Marketing SaaS Platform

## 🎯 Project Overview
**LOUMASS** is a multi-tenant email marketing platform with Gmail integration, advanced sequence automation, reply tracking, and custom domain support. Built with Next.js 15.5.2, TypeScript, and Prisma.

### Current Status
- ✅ Authentication (Google OAuth) - Working
- ✅ Gmail Integration - Connected
- ✅ Custom Domain Tracking - Verified
- ✅ Contact Management - **COMPLETED** ✨
  - ✅ Contact creation with validation
  - ✅ Contact listing with computed fields (displayName, status, engagementRate)
  - ✅ Database integration with proper data transformation
  - ✅ Error handling and duplicate prevention
- 🚧 Campaign Management - In Development
- ✅ Sequence Builder - **CORE FUNCTIONALITY COMPLETED** ✨
  - ✅ Complete API endpoints (GET, POST, PUT, DELETE)
  - ✅ Comprehensive UI components with visual drag-and-drop
  - ✅ Email, delay, and condition step types
  - ✅ Step editing panels and flow management
  - ✅ Authentication middleware integration
  - ✅ Database integration with enrollment system
  - 🚧 Step scheduling automation system
- 🚧 Analytics Dashboard - In Development
- 🚧 Reply Tracking - In Development

### Key Features
- **Multi-tenant Architecture** - Users have isolated data
- **Gmail API Integration** - Send emails via user's Gmail
- **Custom Tracking Domains** - Better deliverability
- **Conditional Sequences** - Behavior-based automation
- **Thread Management** - Reply in thread or new email
- **Tracking Toggles** - Enable/disable open/click tracking
- **Reply Detection** - Automatic reply tracking

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 15.5.2, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL (Vercel Postgres)
- **Auth**: NextAuth.js with Google OAuth
- **Email**: Gmail API
- **Deployment**: Vercel

### Project Structure
```
/src
├── app/                    # Next.js 15 app directory
│   ├── dashboard/         # Protected dashboard pages
│   │   ├── campaigns/     # Campaign management
│   │   ├── sequences/     # Sequence automation
│   │   ├── contacts/      # Contact management
│   │   ├── analytics/     # Analytics dashboard
│   │   ├── replies/       # Reply tracking
│   │   └── settings/      # User settings
│   ├── api/              # API routes
│   └── auth/             # Authentication pages
├── components/           # React components
├── services/            # Business logic
├── hooks/               # Custom React hooks
├── lib/                 # Utilities and configs
└── prisma/              # Database schema
```

## 📊 Database Schema (Key Models)

### Core Models
- **User** - Multi-tenant user accounts
- **Campaign** - Email campaigns with tracking toggles
- **Sequence** - Automated email sequences with conditions
- **Contact** - Customer contacts with tags and variables
- **Recipient** - Campaign/sequence recipients with status
- **EmailEvent** - Tracking events (open, click, reply)
- **TrackingDomain** - Custom tracking domains

### Key Fields
```typescript
// Campaign
{
  trackingEnabled: boolean // Toggle tracking on/off
  gmailThreadId: string   // For thread management
}

// Sequence Step
{
  replyToThread: boolean  // Reply in thread vs new email
  condition: {           // Conditional logic
    type: 'opened' | 'clicked' | 'replied'
    trueBranch: Step[]
    falseBranch: Step[]
  }
}
```

## 🚀 Quick Start Commands

### Development
```bash
npm run dev              # Start development server (port 3000)
npm run build           # Build for production
npm run type-check      # TypeScript validation
npm run lint           # ESLint check
```

### Database
```bash
npx prisma generate     # Generate Prisma client
npx prisma db push     # Push schema changes
npx prisma studio      # Open database GUI
```

### Testing
```bash
npm test               # Run tests
npm run test:e2e      # E2E tests
```

## 🔧 Environment Variables

```env
# Database
DATABASE_URL=postgresql://...
DIRECT_DATABASE_URL=postgresql://...

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# Base URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## 📝 Current Development Focus

### Phase 1: Core Pages (In Progress)
1. **Campaigns** - List, create, edit, send
2. **Sequences** - Builder with conditional logic
3. **Contacts** - Import, export, manage
4. **Analytics** - Metrics and reports
5. **Replies** - Unified inbox

### Phase 2: Advanced Features
1. Thread management (reply vs new)
2. Conditional sequence engine
3. A/B testing
4. Webhook integrations
5. Team collaboration

### Phase 3: Scale & Optimize
1. Email queue with rate limiting
2. Batch processing
3. Caching layer
4. Performance monitoring

## 🎯 Key API Endpoints

### Campaigns
- `GET/POST /api/campaigns` - List/Create
- `PUT/DELETE /api/campaigns/[id]` - Update/Delete
- `POST /api/campaigns/[id]/send` - Send campaign
- `GET /api/campaigns/[id]/analytics` - Get metrics

### Sequences
- `GET/POST /api/sequences` - List/Create
- `POST /api/sequences/[id]/enroll` - Enroll contacts
- `PUT /api/sequences/[id]/pause` - Pause/Resume

### Tracking
- `GET /api/tracking/open/[trackingId]` - Open pixel
- `GET /api/tracking/click/[trackingId]` - Click redirect
- `POST /api/tracking/reply` - Reply webhook

## 🔒 Security Considerations

### Authentication
- Google OAuth 2.0 only
- Session-based auth with NextAuth
- Protected API routes

### Data Protection
- User data isolation (multi-tenant)
- Encrypted tokens
- CSRF protection
- Rate limiting

### Email Security
- SPF/DKIM via Gmail
- Custom domain verification
- Bounce handling

## 🐛 Known Issues & Solutions

### Issue: "Event handlers cannot be passed to Client Component props"
**Solution**: Add `'use client'` directive to components with event handlers

### Issue: Domain verification failing
**Solution**: Auto-verify in development mode, actual DNS check in production

### Issue: OAuth "invalid_client" error
**Solution**: Ensure OAuth client exists in Google Cloud Console with correct redirect URIs

## 📚 Documentation

### Key Files
- `LOUMASS_DEVELOPMENT_PLAN.md` - Complete development roadmap
- `OAUTH_SETUP_GUIDE.md` - OAuth configuration guide
- `CLAUDE_HANDOFF.md` - Context for new sessions

### External Docs
- [Next.js 15 Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [Gmail API](https://developers.google.com/gmail/api)
- [NextAuth.js](https://next-auth.js.org)

## 🚨 Critical Rules

### Always
- ✅ Check authentication before data access
- ✅ Validate user ownership of resources
- ✅ Use TypeScript strict mode
- ✅ Test email sending in development
- ✅ Handle Gmail API rate limits

### Never
- ❌ Store Gmail tokens in plain text
- ❌ Send emails without user consent
- ❌ Mix user data (multi-tenant isolation)
- ❌ Skip tracking consent checks

## 💡 Development Tips

### Gmail Integration
```typescript
// Always check token expiry
if (gmailToken.expiresAt < new Date()) {
  await refreshGmailToken(gmailToken.refreshToken)
}

// Handle thread replies
const message = {
  threadId: existingThreadId, // Continue thread
  // OR omit for new thread
}
```

### Tracking Implementation
```typescript
// Respect tracking preferences
if (campaign.trackingEnabled) {
  content = insertTrackingPixel(content, trackingId)
  links = wrapLinksWithTracking(links, trackingId)
}
```

### Sequence Conditions
```typescript
// Evaluate conditions before sending
const hasOpened = await checkEmailEvent(
  recipientId,
  'OPENED',
  referenceStepId
)
if (condition.type === 'opened' && hasOpened) {
  // Send true branch
} else {
  // Send false branch
}
```

## 🎉 Success Metrics

### Technical
- Page load < 1s
- API response < 200ms
- Email delivery > 95%
- Zero downtime

### Business
- User activation > 60%
- Campaign creation < 5 min
- Support tickets < 5%

---

*Last Updated: [Auto-updates on save]*
*For detailed development plan, see `LOUMASS_DEVELOPMENT_PLAN.md`*