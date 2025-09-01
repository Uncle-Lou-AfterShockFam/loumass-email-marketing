# 🔌 LOUMASS API Documentation

## 📋 Overview

LOUMASS provides RESTful API endpoints for managing email sequences, contacts, campaigns, and user data. All endpoints require authentication and enforce multi-tenant data isolation.

---

## 🔐 Authentication

All API routes are protected and require a valid NextAuth session.

**Authentication Method**: Session-based authentication via NextAuth.js
**Session Validation**: Server-side session validation using `getServerSession(authOptions)`

```typescript
// Authentication check pattern used in all API routes
const session = await getServerSession(authOptions)
if (!session?.user?.id) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

---

## 📧 Sequences API

### Base URL
```
/api/sequences
```

### Data Models

#### SequenceStep Interface
```typescript
interface SequenceStep {
  id: string
  type: 'email' | 'delay' | 'condition'
  
  // Email step fields
  subject?: string
  content?: string
  replyToThread?: boolean
  trackingEnabled?: boolean
  
  // Delay step fields
  delay?: {
    days: number
    hours: number
    minutes: number
  }
  
  // Condition step fields
  condition?: {
    type: 'opened' | 'clicked' | 'replied' | 'not_opened' | 'not_clicked'
    referenceStep?: string
    trueBranch?: string[]
    falseBranch?: string[]
  }
  
  // UI positioning
  position: {
    x: number
    y: number
  }
  
  // Flow control
  nextStepId: string | null
}
```

---

### POST /api/sequences

Creates a new email sequence with validation.

#### Request

**Headers:**
```
Content-Type: application/json
Cookie: next-auth.session-token=...
```

**Body:**
```typescript
{
  name: string                    // Required: Sequence name
  description?: string            // Optional: Sequence description
  triggerType: 'MANUAL' | 'ON_SIGNUP' | 'ON_EVENT'  // Default: 'MANUAL'
  trackingEnabled: boolean        // Default: true
  steps: SequenceStep[]          // Required: Array of sequence steps
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED'  // Default: 'DRAFT'
}
```

#### Response

**Success (201):**
```typescript
{
  success: true,
  id: string,
  sequence: {
    id: string,
    name: string,
    description: string | null,
    status: string,
    triggerType: string,
    trackingEnabled: boolean,
    steps: SequenceStep[],
    stepCount: number,
    createdAt: string,
    updatedAt: string
  }
}
```

**Validation Error (400):**
```typescript
{
  error: "Invalid data",
  details: {
    // Zod validation error format
    fieldName: {
      _errors: string[]
    }
  }
}
```

**Business Logic Error (400):**
```typescript
{
  error: "Sequence must contain at least one email step"
}
// OR
{
  error: "Condition references invalid or non-email step: stepId"
}
```

#### Validation Rules

1. **Name**: Required, minimum 1 character
2. **Steps**: Must contain at least one email step
3. **Condition Steps**: 
   - For ACTIVE sequences, must have a valid `referenceStep`
   - `referenceStep` must point to an existing email step
4. **Step IDs**: Must be unique within the sequence
5. **Position**: Required x,y coordinates for UI positioning

#### Example Request

```typescript
const response = await fetch('/api/sequences', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'Welcome Series',
    description: 'Onboarding email sequence for new users',
    triggerType: 'ON_SIGNUP',
    trackingEnabled: true,
    status: 'DRAFT',
    steps: [
      {
        id: 'start-1',
        type: 'email',
        subject: 'Welcome to our platform!',
        content: 'Thank you for signing up...',
        position: { x: 100, y: 100 },
        nextStepId: 'delay-1',
        trackingEnabled: true,
        replyToThread: false
      },
      {
        id: 'delay-1', 
        type: 'delay',
        delay: {
          days: 1,
          hours: 0,
          minutes: 0
        },
        position: { x: 100, y: 200 },
        nextStepId: 'email-2'
      },
      {
        id: 'email-2',
        type: 'email',
        subject: 'Getting started guide',
        content: 'Here are some tips...',
        position: { x: 100, y: 300 },
        nextStepId: null,
        trackingEnabled: true,
        replyToThread: false
      }
    ]
  })
})
```

---

### GET /api/sequences

Retrieves user's sequences with enrollment statistics and pagination.

#### Request

**Query Parameters:**
- `status` (optional): Filter by sequence status ('DRAFT', 'ACTIVE', 'PAUSED')
- `limit` (optional): Number of results per page (default: 50, max: 100)
- `offset` (optional): Pagination offset (default: 0)

#### Response

**Success (200):**
```typescript
{
  success: true,
  sequences: Array<{
    id: string,
    name: string,
    description: string | null,
    status: 'DRAFT' | 'ACTIVE' | 'PAUSED',
    triggerType: string,
    trackingEnabled: boolean,
    steps: SequenceStep[],
    totalEnrollments: number,      // Total enrollments ever
    activeEnrollments: number,     // Currently active enrollments
    stepCount: number,             // Number of steps in sequence
    hasConditions: boolean,        // Whether sequence has condition steps
    createdAt: string,
    updatedAt: string
  }>,
  pagination: {
    limit: number,
    offset: number,
    total: number                  // Total count in this page (not global total)
  }
}
```

#### Example Usage

```typescript
// Get all sequences
const sequences = await fetch('/api/sequences')

// Get active sequences only
const activeSequences = await fetch('/api/sequences?status=ACTIVE')

// Get paginated results
const page2 = await fetch('/api/sequences?limit=10&offset=10')
```

---

### GET /api/sequences/[id]

Retrieves detailed information about a specific sequence.

#### Request

**URL Parameters:**
- `id`: Sequence ID (cuid format)

#### Response

**Success (200):**
```typescript
{
  success: true,
  sequence: {
    id: string,
    name: string,
    description: string | null,
    status: 'DRAFT' | 'ACTIVE' | 'PAUSED',
    triggerType: string,
    trackingEnabled: boolean,
    steps: SequenceStep[],
    enrollments: Array<{
      id: string,
      status: string,
      enrolledAt: string,
      currentStep: string | null,
      contact?: {
        email: string,
        firstName?: string,
        lastName?: string
      }
    }>,
    createdAt: string,
    updatedAt: string
  }
}
```

**Not Found (404):**
```typescript
{
  error: "Sequence not found"
}
```

---

### PUT /api/sequences/[id]

Updates an existing sequence.

#### Request

**URL Parameters:**
- `id`: Sequence ID

**Body:** Same as POST request body (all fields optional for partial updates)

#### Response

Same as POST response format.

#### Notes
- Updating an ACTIVE sequence will show warnings about affecting ongoing enrollments
- Step validation rules apply the same as creation
- Only the sequence owner can update their sequences

---

### DELETE /api/sequences/[id]

Permanently deletes a sequence and all related data.

#### Request

**URL Parameters:**
- `id`: Sequence ID

#### Response

**Success (200):**
```typescript
{
  success: true,
  message: "Sequence deleted successfully"
}
```

**Not Found (404):**
```typescript
{
  error: "Sequence not found"
}
```

#### Warning
This operation:
- Permanently deletes the sequence
- Removes all enrollments
- Cannot be undone
- Requires confirmation in the UI for sequences with active enrollments

---

## 👥 Contacts API

### Base URL
```
/api/contacts
```

### POST /api/contacts

Creates a new contact with validation and duplicate prevention.

#### Request

**Body:**
```typescript
{
  email: string,              // Required: Valid email address
  firstName?: string,         // Optional: First name
  lastName?: string,          // Optional: Last name
  tags?: string[],           // Optional: Array of tag strings
  variables?: {              // Optional: Custom key-value pairs
    [key: string]: any
  }
}
```

#### Response

**Success (201):**
```typescript
{
  success: true,
  contact: {
    id: string,
    email: string,
    firstName: string | null,
    lastName: string | null,
    displayName: string,        // Computed: firstName + lastName or email
    tags: string[] | null,
    variables: object | null,
    status: string,
    engagementRate: number,     // Computed: 0.0 for new contacts
    createdAt: string,
    updatedAt: string
  }
}
```

**Duplicate Error (400):**
```typescript
{
  error: "Contact with this email already exists"
}
```

---

### GET /api/contacts

Retrieves user's contacts with computed fields and pagination.

#### Query Parameters
- `search` (optional): Search in email, firstName, lastName
- `limit` (optional): Results per page (default: 50)
- `offset` (optional): Pagination offset

#### Response

**Success (200):**
```typescript
{
  success: true,
  contacts: Array<{
    id: string,
    email: string,
    firstName: string | null,
    lastName: string | null,
    displayName: string,        // Computed field
    tags: string[] | null,
    variables: object | null,
    status: string,
    engagementRate: number,     // Computed from email events
    createdAt: string,
    updatedAt: string
  }>,
  pagination: {
    limit: number,
    offset: number,
    total: number
  }
}
```

---

## 🚀 Campaign API (Structure Ready)

### Base URL
```
/api/campaigns
```

### Planned Endpoints
- `GET /api/campaigns` - List campaigns
- `POST /api/campaigns` - Create campaign
- `PUT /api/campaigns/[id]` - Update campaign
- `DELETE /api/campaigns/[id]` - Delete campaign
- `POST /api/campaigns/[id]/send` - Send campaign
- `GET /api/campaigns/[id]/analytics` - Campaign analytics

*Note: Campaign endpoints are structurally ready but need UI implementation.*

---

## 📊 Analytics API (Future)

### Planned Endpoints
- `GET /api/analytics/dashboard` - Dashboard metrics
- `GET /api/analytics/sequences/[id]` - Sequence performance
- `GET /api/analytics/contacts/engagement` - Contact engagement data
- `GET /api/tracking/events` - Tracking events

---

## 🔍 Error Handling Patterns

### Standard Error Responses

#### Authentication Error (401)
```typescript
{
  error: "Unauthorized"
}
```

#### Validation Error (400)
```typescript
{
  error: "Invalid data",
  details: ValidationErrorObject
}
```

#### Not Found Error (404)
```typescript
{
  error: "Resource not found"
}
```

#### Server Error (500)
```typescript
{
  error: "Internal server error"
}
```

### Error Handling Best Practices

```typescript
// API Route Pattern
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate with Zod
    const validationResult = schema.safeParse(body)
    if (!validationResult.success) {
      console.error('Validation failed:', validationResult.error.format())
      return NextResponse.json({ 
        error: 'Invalid data', 
        details: validationResult.error.format() 
      }, { status: 400 })
    }

    // Business logic...
    const result = await someOperation()
    
    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
```

---

## 🛡️ Security Considerations

### Multi-Tenant Data Isolation
All API endpoints enforce user data isolation:

```typescript
// Always include userId in database queries
const sequences = await prisma.sequence.findMany({
  where: {
    userId: session.user.id,  // Critical for security
    // ...other filters
  }
})
```

### Input Validation
- All inputs validated with Zod schemas
- SQL injection prevention via Prisma ORM
- XSS prevention via proper JSON handling
- CSRF protection via NextAuth

### Rate Limiting
*Planned for future implementation*

---

## 📝 API Testing Guide

### Local Testing
```bash
# Start development server
npm run dev

# Test endpoints with curl
curl -X POST http://localhost:3000/api/sequences \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION" \
  -d '{"name":"Test Sequence","steps":[]}'
```

### Production Testing
- Base URL: `https://loumassbeta.vercel.app`
- Requires valid authentication session
- Test with browser dev tools Network tab

### Database Inspection
```bash
npx prisma studio
```

---

## 🔄 API Versioning Strategy

Current: **v1** (implicit)
- All endpoints are currently v1
- No versioning in URL paths
- Future versions will use `/api/v2/` pattern

---

**Last Updated**: January 2025  
**API Status**: Core endpoints implemented and tested  
**Next Implementation**: Campaign sending and analytics endpoints