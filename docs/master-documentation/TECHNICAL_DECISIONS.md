# LOUMASS - Technical Decisions & Architecture

## 🎯 Core Architecture Decisions

### 1. Multi-Tenant Design
**Decision**: Each user has completely isolated data with user-specific configurations.

**Implementation**:
- All database queries filter by `userId`
- User-specific OAuth credentials
- User-specific tracking domains
- Isolated Gmail tokens per user

**Rationale**: 
- Security and data isolation
- Allows users to bring their own infrastructure
- Scalable for SaaS model

### 2. Gmail API vs SMTP
**Decision**: Use Gmail API exclusively for email sending.

**Implementation**:
```typescript
// Using Gmail API
const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
await gmail.users.messages.send({
  userId: 'me',
  requestBody: { raw: encodedMessage }
})
```

**Rationale**:
- Better deliverability (sends from user's actual Gmail)
- No need for SMTP configuration
- Automatic SPF/DKIM/DMARC compliance
- Thread management support

### 3. Email Threading Architecture
**Decision**: Capture and store Message-ID headers for proper threading.

**Key Components**:
- Store `messageIdHeader` after sending each email
- Use `In-Reply-To` and `References` headers for replies
- Maintain `gmailThreadId` for thread continuity

**Implementation**:
```typescript
// Capture Message-ID after sending
const sentMessage = await gmail.users.messages.get({
  userId: 'me',
  id: response.data.id!,
  format: 'metadata',
  metadataHeaders: ['Message-ID']
})

// Use for threading in follow-ups
headers['In-Reply-To'] = originalMessageId
headers['References'] = originalMessageId
```

### 4. Tracking Domain Strategy
**Decision**: User-specific tracking domains with fallback.

**Implementation**:
```typescript
// Fetch user's tracking domain
const userTrackingDomain = await prisma.trackingDomain.findUnique({
  where: { userId },
  select: { domain: true, verified: true }
})

// Use verified domain or fallback
const baseUrl = userTrackingDomain?.verified 
  ? `https://${userTrackingDomain.domain}`
  : process.env.NEXT_PUBLIC_BASE_URL
```

**Benefits**:
- Better deliverability (no shared domain reputation)
- Prevents spam filtering
- Professional appearance

### 5. Sequence Types Architecture
**Decision**: Two distinct sequence types with different behaviors.

**Types**:
1. **STANDALONE**: Independent sequences with internal conditions
2. **CAMPAIGN_FOLLOWUP**: Triggered by campaigns, conditions check original email

**Key Differences**:
```typescript
// STANDALONE - checks sequence step
if (step.condition?.referenceStep) {
  const referenceEvents = await checkStepEvents(referenceStep)
}

// CAMPAIGN_FOLLOWUP - checks campaign email
if (enrollment.triggerCampaignId) {
  const campaignEvents = await checkCampaignEvents(triggerRecipientId)
}
```

### 6. OAuth Credential Management
**Decision**: Allow users to bring their own Google Cloud credentials.

**Security**:
```typescript
// Modern encryption with IV
const iv = crypto.randomBytes(16)
const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
const encrypted = iv.toString('hex') + ':' + cipher.update(text)
```

**Storage**:
- Client ID: Stored plain text (not sensitive)
- Client Secret: Encrypted with AES-256-CBC
- OAuth tokens: Separate encrypted storage

## 🏗️ Database Design Decisions

### 1. Prisma as ORM
**Decision**: Use Prisma for type-safe database access.

**Benefits**:
- Type safety with TypeScript
- Auto-generated types
- Migration management
- Query optimization

### 2. JSON Fields for Flexibility
**Decision**: Use JSON fields for variable data structures.

**Examples**:
- `Contact.variables`: Custom contact fields
- `Sequence.steps`: Complex step configurations
- `EmailEvent.eventData`: Flexible event metadata

### 3. Enum vs String for Status
**Decision**: Use database enums for status fields.

```prisma
enum CampaignStatus {
  DRAFT
  SCHEDULED
  SENDING
  SENT
  FAILED
  PAUSED
}
```

**Benefits**:
- Type safety
- Database-level validation
- Better performance

## 🔄 State Management Patterns

### 1. Server-Side State
**Decision**: Rely on server state with SWR for client caching.

**Implementation**:
```typescript
const { data, error, mutate } = useSWR(
  `/api/campaigns/${id}`,
  fetcher,
  { refreshInterval: 5000 }
)
```

### 2. Optimistic Updates
**Decision**: Update UI optimistically for better UX.

```typescript
// Update UI immediately
mutate(optimisticData, false)
// Then sync with server
const result = await updateCampaign(data)
mutate(result)
```

## 📊 Performance Optimizations

### 1. Database Indexes
**Strategic Indexes**:
```prisma
@@index([userId, status])  // Campaign queries
@@index([userId, email])    // Contact lookups
@@unique([sequenceId, contactId])  // Enrollment constraints
```

### 2. Pagination Strategy
**Decision**: Cursor-based pagination for large datasets.

```typescript
const contacts = await prisma.contact.findMany({
  take: 20,
  skip: 1,
  cursor: { id: lastId },
  orderBy: { createdAt: 'desc' }
})
```

### 3. Batch Operations
**Decision**: Batch database operations where possible.

```typescript
// Batch create events
await prisma.emailEvent.createMany({
  data: events
})
```

## 🔒 Security Patterns

### 1. Authentication Middleware
**Pattern**: Consistent auth checking across all API routes.

```typescript
const session = await getServerSession(authOptions)
if (!session?.user?.id) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

### 2. Data Validation
**Pattern**: Zod schemas for all API inputs.

```typescript
const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100)
})
const validated = schema.safeParse(body)
```

### 3. SQL Injection Prevention
**Pattern**: Prisma parameterized queries only.

```typescript
// Safe - parameterized
await prisma.$queryRaw`
  SELECT * FROM "User" WHERE email = ${email}
`
```

## 🚀 Deployment Architecture

### 1. Vercel Deployment
**Decision**: Use Vercel for hosting and edge functions.

**Benefits**:
- Automatic SSL
- Global CDN
- Serverless functions
- Easy rollbacks

### 2. Environment Strategy
**Pattern**: Separate configs for dev/staging/production.

```bash
.env.local          # Local development
.env.production     # Production secrets (Vercel)
```

### 3. Database Strategy
**Setup**:
- Development: Local PostgreSQL
- Production: Neon PostgreSQL (serverless)
- Schema sync: Prisma migrations

## 📝 Code Organization Patterns

### 1. Feature-Based Structure
```
/src/app/dashboard/
  /campaigns/       # Campaign features
  /sequences/       # Sequence features
  /contacts/        # Contact features
```

### 2. Service Layer Pattern
```
/src/services/
  gmail-service.ts     # Gmail API logic
  sequence-service.ts  # Sequence business logic
  tracking-service.ts  # Tracking logic
```

### 3. Component Organization
```
/src/components/
  /ui/              # Reusable UI components
  /campaigns/       # Campaign-specific components
  /sequences/       # Sequence-specific components
```

## 🔄 Event-Driven Patterns

### 1. Webhook Processing
**Pattern**: Async webhook handlers with retry logic.

```typescript
// Gmail reply webhook
export async function POST(request: NextRequest) {
  const { message } = await request.json()
  
  // Process async
  await processGmailReply(message)
  
  // Return immediately
  return NextResponse.json({ success: true })
}
```

### 2. Event Tracking
**Pattern**: Centralized event creation.

```typescript
async function trackEvent(type: EventType, data: any) {
  await prisma.emailEvent.create({
    data: {
      eventType: type,
      eventData: data,
      // ... other fields
    }
  })
}
```

## 🎯 Future Architecture Considerations

### 1. Queue System
**Need**: Handle high-volume email sending.
**Solution**: Implement Redis queue with Bull.

### 2. Caching Layer
**Need**: Reduce database load.
**Solution**: Redis caching for frequently accessed data.

### 3. Microservices
**Need**: Scale specific features independently.
**Potential Split**:
- Email sending service
- Analytics service
- Tracking service

### 4. Real-time Updates
**Need**: Live dashboard updates.
**Solution**: WebSocket or Server-Sent Events.

---

*These technical decisions form the foundation of LOUMASS's architecture and guide future development.*