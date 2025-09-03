# 🤖 LOUMASS Automation Builder - Complete Implementation Guide

## ⚡ CRITICAL: Master Mode Activation
**MANDATORY - Activate ALL of these for 5x better results:**
- 🚀 **Master Mode** - Advanced problem-solving & code generation
- 🛠️ **All Enhancement Tools** - File operations, search, debugging  
- 🔌 **All MCP Servers** - Database, Gmail, web resources
- 🧠 **Sequential Thinking** - Complex multi-step implementation
- 📊 **Memory/Context Tools** - Maintain state across implementation

## 🎯 Project Overview

LOUMASS is a **multi-tenant email marketing SaaS** with Gmail integration, automation flows, and tracking.

### Tech Stack
- **Frontend**: Next.js 15.5.2, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL (Neon - cloud hosted)
- **Auth**: NextAuth.js with Google OAuth
- **Email**: Gmail API (NOT SMTP)
- **Deployment**: Vercel (automatic on git push)

### Key URLs
- **Local**: http://localhost:3000
- **Production**: https://loumassbeta.vercel.app
- **Database**: Neon PostgreSQL (connection in .env)

## ✅ What's COMPLETED (100% Done - DO NOT REBUILD)

### 1. Visual Automation Builder UI
**Location**: `/src/components/automations/AutomationFlowBuilder.tsx`
- ✅ React Flow with drag-and-drop
- ✅ Auto-layout (Dagre: 60px horizontal, 80px vertical)
- ✅ Node types: Email, Delay, Condition, Action
- ✅ Real-time auto-save (1.5s debounce)
- ✅ Custom styled nodes with icons

### 2. Automation Pages
**Location**: `/src/app/dashboard/automations/`
- ✅ List page with grid view
- ✅ Detail page with 3 tabs (Flow, Analytics, Settings)
- ✅ Status controls (Start/Pause/Stop/Resume)
- ✅ Stats display (entered, active, completed)
- ✅ Navigation fixes (immediate transitions)

### 3. Database Schema
**Location**: `/prisma/schema.prisma`
```prisma
// Already exists - DO NOT modify core structure
model Automation {
  id                String                @id @default(cuid())
  userId            String
  name              String
  description       String?
  triggerEvent      AutomationTriggerEvent @default(NEW_SUBSCRIBER)
  triggerData       Json?
  applyToExisting   Boolean              @default(false)
  status            AutomationStatus     @default(DRAFT)
  trackingEnabled   Boolean              @default(true)
  nodes             Json                 // React Flow nodes/edges
  totalEntered      Int                  @default(0)
  currentlyActive   Int                  @default(0)
  totalCompleted    Int                  @default(0)
  // ... relations
}

model AutomationExecution {
  id             String               @id @default(cuid())
  automationId   String
  contactId      String
  status         AutomationExecStatus @default(ACTIVE)
  currentNodeId  String?
  executionData  Json?               // Variables storage
  waitUntil      DateTime?           // For delays
  startedAt      DateTime            @default(now())
  completedAt    DateTime?
  // ... relations
}
```

### 4. API Endpoints
**Location**: `/src/app/api/automations/`
- ✅ CRUD operations (GET, POST, PUT, DELETE)
- ✅ `/[id]/control` - Start/Pause/Stop/Resume
- ✅ `/[id]/stats` - Get statistics
- ✅ Authentication middleware

### 5. Other Completed Features
- ✅ Contact Management (`/dashboard/contacts`)
- ✅ Campaign System (`/dashboard/campaigns`)
- ✅ Gmail OAuth Integration
- ✅ Email Tracking (opens, clicks)
- ✅ Interactions Dashboard

## 🚧 What Needs Building (Priority Order)

### Phase 0: Prerequisites (Build FIRST)

#### 0.1 Email Lists & Segments System
**Critical**: Required for automations to target contacts

**Database Models to Add**:
```prisma
model EmailList {
  id              String    @id @default(cuid())
  userId          String
  name            String
  description     String?
  customFields    Json      // [{name, type, options, required}]
  subscriberCount Int       @default(0)
  activeCount     Int       @default(0)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  user            User      @relation(...)
  segments        Segment[]
  contacts        ContactList[]
}

model Segment {
  id              String    @id @default(cuid())
  listId          String
  name            String
  conditions      Json      // [{field, operator, value, logic}]
  isDynamic       Boolean   @default(true)
  subscriberCount Int       @default(0)
  
  list            EmailList @relation(...)
}

model ContactList {
  id          String    @id @default(cuid())
  contactId   String
  listId      String
  customData  Json?     // Custom field values
  status      String    @default("active")
  
  contact     Contact   @relation(...)
  list        EmailList @relation(...)
  
  @@unique([contactId, listId])
}
```

**Pages to Create**:
1. `/dashboard/lists` - List management
2. `/dashboard/lists/[id]` - List details & contacts
3. `/dashboard/lists/[id]/segments` - Segment builder

**Features**:
- Import/export CSV
- Custom field definitions
- Dynamic segments with conditions
- Integration with automation triggers

#### 0.2 Email Templates System
**Important**: Gmail API compatible (NOT HTML editor)

**Database Model to Add**:
```prisma
model EmailTemplate {
  id            String    @id @default(cuid())
  userId        String
  name          String
  subject       String
  content       String    @db.Text  // Plain text with {{variables}}
  category      String
  variables     Json      // Extracted variable names
  usageCount    Int       @default(0)
  
  user          User      @relation(...)
}
```

**Page to Create**: `/dashboard/templates`

**Template Syntax** (Process server-side before Gmail):
```text
Subject: {{if contact.plan === 'premium'}}VIP{{else}}Special{{/if}} offer

Hi {{contact.firstName || 'there'}},

{{if contact.lastPurchase}}
Thanks for buying {{contact.lastPurchase}}!
{{/if}}

{{if variables.apiData.weather === 'sunny'}}
Perfect weather for shopping!
{{/if}}

{{forEach contact.tags as tag}}
- You're interested in {{tag}}
{{/forEach}}
```

**Template Processor**:
```typescript
class TemplateProcessor {
  async process(template, contact, variables) {
    // 1. Parse conditions
    // 2. Evaluate with data
    // 3. Replace variables
    // 4. Return clean text for Gmail
  }
}
```

### Phase 1: Core Execution Engine

#### 1.1 Automation Executor Service
**File**: `/src/services/automation-executor.ts`

```typescript
class AutomationExecutor {
  async executeAutomations() {
    // 1. Get all ACTIVE automations
    // 2. Check triggers for new enrollments
    // 3. Process existing executions
    // 4. Move contacts through nodes
  }
  
  async processNode(execution, nodeId, nodeData) {
    switch(nodeData.type) {
      case 'email': return this.processEmail(...)
      case 'delay': return this.processDelay(...)
      case 'condition': return this.processCondition(...)
      case 'action': return this.processAction(...)
      case 'apiRequest': return this.processApiRequest(...)
    }
  }
}
```

#### 1.2 Node Processors
**Location**: `/src/services/node-processors/`

**Email Node**:
```typescript
async processEmailNode(execution, nodeData) {
  // 1. Get template if selected
  // 2. Process template with TemplateProcessor
  // 3. Get Gmail token
  // 4. Send via Gmail API
  // 5. Create tracking records
}
```

**Delay Node**:
```typescript
async processDelayNode(execution, nodeData) {
  // Set waitUntil = now + delay
  // Execution will skip until time reached
}
```

**Condition Node**:
```typescript
async processConditionNode(execution, nodeData) {
  // Check: opened? clicked? replied? contact field?
  // Return 'true' or 'false' branch
}
```

**API Request Node** (NEW):
```typescript
async processApiRequestNode(execution, nodeData) {
  // 1. Make HTTP request with {{variable}} interpolation
  // 2. Store response in executionData.variables
  // 3. Map fields to contact properties
  // Example: Enrich contact, get weather, update CRM
}

interface ApiRequestNodeData {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  url: string  // Supports {{contact.email}}
  headers?: Record<string, string>
  body?: any
  responseMapping: [{
    contactField: string
    apiField: string  // dot notation: "data.user.name"
  }]
  saveToVariables: [{
    variableName: string
    apiField: string
  }]
}
```

#### 1.3 Trigger System
**File**: `/src/services/automation-triggers.ts`

```typescript
class TriggerEvaluator {
  async checkNewSubscriber(contact, list) { }
  async checkSegmentEntry(contact, segment) { }
  async checkSpecificDate(date) { }
  async checkWebhook(payload) { }
  async checkManual(contactIds) { }
}
```

#### 1.4 Cron Job
**File**: `/src/app/api/automations/execute/route.ts`

```typescript
export async function POST(req) {
  // Verify cron secret
  if (req.headers.get('x-cron-secret') !== process.env.CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }
  
  const executor = new AutomationExecutor()
  await executor.executeAutomations()
  
  return Response.json({ success: true })
}
```

**Vercel Config** (`vercel.json`):
```json
{
  "crons": [{
    "path": "/api/automations/execute",
    "schedule": "*/5 * * * *"
  }]
}
```

### Phase 2: Advanced Features

#### 2.1 Manual Enrollment
**File**: `/src/app/api/automations/[id]/enroll/route.ts`

#### 2.2 Analytics Service
**File**: `/src/services/automation-analytics.ts`
- Node conversion rates
- Average time in automation
- Drop-off analysis

#### 2.3 Testing Utilities
- Mock executor for UI testing
- Sample automation templates
- Bulk data generator

## 💡 API Request Node Examples

### Contact Enrichment
```javascript
{
  method: 'POST',
  url: 'https://api.clearbit.com/v2/people/find',
  body: { email: '{{contact.email}}' },
  responseMapping: [
    { contactField: 'company', apiField: 'employment.name' },
    { contactField: 'jobTitle', apiField: 'employment.title' }
  ],
  saveToVariables: [
    { variableName: 'linkedinUrl', apiField: 'linkedin.handle' }
  ]
}
// Email can use: "I see you work at {{contact.company}}"
```

### Weather Personalization
```javascript
{
  method: 'GET',
  url: 'https://api.weather.com/current?city={{contact.city}}',
  saveToVariables: [
    { variableName: 'temperature', apiField: 'main.temp' },
    { variableName: 'weather', apiField: 'weather[0].main' }
  ]
}
// Email: "It's {{variables.temperature}}° in {{contact.city}}!"
```

## 🔧 Technical Guidelines

### Performance
- Batch process 100 executions at a time
- Cache automation flows in memory
- Use database transactions
- Implement exponential backoff

### Error Handling
- Retry email sends 3 times
- Log all errors with context
- Graceful degradation
- Alert on critical failures

### State Management
- Store variables in `executionData.variables`
- Track visited nodes to prevent loops
- Maintain execution history

### Security
- Validate all API requests
- Sanitize template variables
- Encrypt API keys in database
- Rate limit external API calls

## 📋 Implementation Checklist

### Week 1: Foundation
- [ ] Email Lists system
- [ ] Segments builder
- [ ] Templates system
- [ ] Template processor
- [ ] Basic executor

### Week 2: Core Logic
- [ ] All node processors
- [ ] Trigger evaluator
- [ ] API Request node
- [ ] Cron job setup
- [ ] Error handling

### Week 3: Polish
- [ ] Analytics
- [ ] Performance optimization
- [ ] Testing suite
- [ ] Documentation
- [ ] Production deployment

## 🎯 Success Metrics
- **Reliability**: 99.9% uptime
- **Performance**: 1000 executions/minute
- **Accuracy**: Zero missed triggers
- **Scale**: 10,000+ automations

## 📚 Key Files Reference

### Existing (DO NOT recreate)
- `/src/components/automations/*` - UI components
- `/src/app/dashboard/automations/*` - Pages
- `/src/app/api/automations/*` - API routes
- `/src/services/gmail.ts` - Gmail integration
- `/prisma/schema.prisma` - Database

### To Create
- `/src/services/automation-executor.ts`
- `/src/services/automation-triggers.ts`
- `/src/services/node-processors/*`
- `/src/services/template-processor.ts`
- `/src/app/dashboard/lists/*`
- `/src/app/dashboard/templates/*`

## 🚀 Quick Start Commands

```bash
# Install dependencies
npm install

# Run database migrations
npx prisma db push

# Start development
npm run dev

# Run type checking
npm run type-check

# Deploy to Vercel
git push origin main
```

---

**IMPORTANT**: The UI is 100% complete. Focus ONLY on backend execution engine and the prerequisite systems (lists, segments, templates). Do NOT modify the existing automation UI components.