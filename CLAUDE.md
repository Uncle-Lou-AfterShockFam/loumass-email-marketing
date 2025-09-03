# 🚀 LOUMASS - Email Marketing SaaS Platform

## 🎯 Project Overview
**LOUMASS** is a multi-tenant email marketing SaaS with Gmail integration, visual automation builder, and advanced tracking. Think Mailchimp but using Gmail API for better deliverability.

### Current Development Status

#### ✅ COMPLETED Features (100% Done)
- **Authentication** - Google OAuth working perfectly
- **Gmail Integration** - Full OAuth flow, token refresh, sending
- **Contact Management** - CRUD, import/export, tagging
- **Campaign System** - Create, send, track opens/clicks
- **Interactions Dashboard** - Unified email events view
- **Automation Builder UI** - Visual flow builder with React Flow
  - Drag-and-drop nodes
  - Auto-layout (Dagre algorithm)
  - Real-time auto-save
  - Navigation issues FIXED

#### 🚧 IN PROGRESS (Needs Implementation)
- **Automation Execution Engine** - Backend to run the flows
- **Email Lists & Segments** - Contact grouping system
- **Email Templates** - Reusable templates with conditions
- **API Request Nodes** - HTTP calls in automations
- **Analytics Dashboard** - Detailed metrics
- **Reply Tracking** - Thread management

### Tech Stack
- **Frontend**: Next.js 15.5.2, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL (Neon cloud)
- **Auth**: NextAuth.js + Google OAuth
- **Email**: Gmail API (NOT SMTP)
- **Deployment**: Vercel (auto-deploy on push)

## 🏗️ Project Structure

```
/src
├── app/                    # Next.js 15 app directory
│   ├── dashboard/         # Protected pages
│   │   ├── automations/   # ✅ Visual automation builder
│   │   ├── campaigns/     # ✅ Campaign management
│   │   ├── contacts/      # ✅ Contact CRM
│   │   ├── interactions/  # ✅ Email events
│   │   ├── sequences/     # ✅ Email sequences UI
│   │   ├── lists/         # 🚧 TO BUILD
│   │   ├── templates/     # 🚧 TO BUILD
│   │   └── analytics/     # 🚧 TO BUILD
│   └── api/              # API routes
├── components/           # React components
├── services/            # Business logic
│   ├── gmail.ts         # ✅ Gmail API service
│   ├── automation-executor.ts  # 🚧 TO BUILD
│   └── template-processor.ts   # 🚧 TO BUILD
└── prisma/              # Database schema
```

## 📊 Database Schema (Key Models)

### Automation Models (Already Created)
```prisma
model Automation {
  id                String                 @id @default(cuid())
  userId            String
  name              String
  triggerEvent      AutomationTriggerEvent // NEW_SUBSCRIBER, etc.
  triggerData       Json?                  // Trigger configuration
  nodes             Json                   // React Flow nodes/edges
  status            AutomationStatus       // DRAFT, ACTIVE, PAUSED
  totalEntered      Int                    // Statistics
  currentlyActive   Int
  totalCompleted    Int
}

model AutomationExecution {
  id             String               @id @default(cuid())
  automationId   String
  contactId      String
  status         AutomationExecStatus // ACTIVE, COMPLETED, FAILED
  currentNodeId  String?              // Current position
  executionData  Json?                // Variables storage
  waitUntil      DateTime?            // For delays
}
```

### Models to Add (Lists & Templates)
```prisma
model EmailList {
  id              String    @id @default(cuid())
  userId          String
  name            String
  customFields    Json      // Custom subscriber fields
  subscriberCount Int
}

model EmailTemplate {
  id       String    @id @default(cuid())
  userId   String
  name     String
  subject  String
  content  String    // Plain text with {{variables}}
  category String
}
```

## 🚀 Quick Start Commands

```bash
# Development
npm run dev              # Start on localhost:3000
npm run type-check      # TypeScript validation
npm run lint           # ESLint check

# Database
npx prisma generate     # Generate client
npx prisma db push     # Push schema changes
npx prisma studio      # Database GUI

# Deployment
git push origin main   # Auto-deploys to Vercel
```

## 🔧 Environment Variables

```env
# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://...
DIRECT_DATABASE_URL=postgresql://...

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret

# Google OAuth (same for Gmail)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Base URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## 📝 Current Development Priority

### Phase 1: Prerequisites (Build First)
1. **Email Lists & Segments** - Contact grouping
2. **Email Templates** - Reusable with conditions

### Phase 2: Execution Engine
1. **Automation Executor** - Process active flows
2. **Node Processors** - Email, Delay, Condition, Action, API
3. **Trigger System** - Enrollment logic
4. **Cron Job** - Run every 5 minutes

### Phase 3: Advanced
1. **Analytics Dashboard** - Metrics and reports
2. **Reply Tracking** - Thread management
3. **Webhook System** - External integrations

## 🎯 Key API Endpoints

### Automations (Already Built)
- `GET /api/automations` - List all
- `POST /api/automations` - Create
- `PUT /api/automations/[id]` - Update
- `DELETE /api/automations/[id]` - Delete
- `POST /api/automations/[id]/control` - Start/Stop
- `GET /api/automations/[id]/stats` - Statistics

### To Build
- `POST /api/automations/execute` - Cron job endpoint
- `POST /api/automations/[id]/enroll` - Manual enrollment
- `GET /api/lists` - Email lists
- `GET /api/templates` - Email templates

## 🔒 Security Considerations

### Authentication
- All routes protected with NextAuth
- User data isolation (multi-tenant)
- Gmail tokens encrypted

### Email Security
- SPF/DKIM via Gmail
- Rate limiting
- Bounce handling
- Unsubscribe compliance

## 🐛 Common Issues & Solutions

### "Event handlers cannot be passed to Client Component"
Add `'use client'` directive to components with events

### OAuth "invalid_client" error
Check Google Cloud Console redirect URIs

### Navigation slow from automation page
Fixed with immediate router.push() and cleanup

## 💡 Development Tips

### Gmail Integration
```typescript
// Always refresh expired tokens
if (gmailToken.expiresAt < new Date()) {
  await refreshGmailToken(gmailToken.refreshToken)
}
```

### Template Processing
```typescript
// Process conditions server-side before Gmail
const processed = await templateProcessor.process(
  template,
  contact,
  variables
)
// Send via Gmail API
await sendEmail(processed.content)
```

### Automation Variables
```typescript
// Store API responses for later use
execution.executionData = {
  variables: {
    apiData: responseData,
    customFields: mappedFields
  }
}
```

## 📚 Documentation References

### Internal Docs
- `AUTOMATION_HANDOFF.md` - Detailed implementation guide
- `OAUTH_SETUP_GUIDE.md` - OAuth configuration

### External Resources
- [Next.js 15 Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [Gmail API](https://developers.google.com/gmail/api)
- [React Flow](https://reactflow.dev/)

## 🚨 IMPORTANT Rules

### Always
- ✅ Check user authentication
- ✅ Validate resource ownership
- ✅ Use TypeScript strict mode
- ✅ Test in development first

### Never
- ❌ Store sensitive data in plain text
- ❌ Send emails without consent
- ❌ Mix user data between accounts
- ❌ Modify existing automation UI (it's complete!)

---

*Last Updated: Current Session*
*For implementation details, see `AUTOMATION_HANDOFF.md`*