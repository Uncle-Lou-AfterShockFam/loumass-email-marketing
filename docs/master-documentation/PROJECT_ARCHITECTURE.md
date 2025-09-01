# 🏗️ LOUMASS Project Architecture

## 📋 Overview

Complete project structure documentation for LOUMASS email marketing SaaS platform. This document provides detailed file organization, page routing, component hierarchy, and architectural patterns.

---

## 📁 Complete File Structure

### Root Directory
```
/loumass_beta/
├── 📄 package.json              # Dependencies and scripts
├── 📄 package-lock.json         # Dependency lock file
├── 📄 next.config.js            # Next.js configuration
├── 📄 tailwind.config.js        # Tailwind CSS configuration
├── 📄 tsconfig.json             # TypeScript configuration
├── 📄 .env.local                # Local environment variables
├── 📄 .env.example              # Environment template
├── 📄 .gitignore                # Git ignore patterns
├── 📄 README.md                 # Project README
├── 📄 CLAUDE.md                 # Development reference
└── 📁 docs/                     # Documentation
    └── 📁 master-documentation/ # Complete handoff docs ⭐
```

### Source Code Structure
```
/src/
├── 📁 app/                      # Next.js 15 App Router
│   ├── 📄 favicon.ico
│   ├── 📄 globals.css           # Global styles & dark mode
│   ├── 📄 layout.tsx            # Root layout
│   ├── 📄 page.tsx              # Home page (redirects to dashboard)
│   │
│   ├── 📁 auth/                 # Authentication pages
│   │   ├── 📄 layout.tsx        # Auth layout wrapper
│   │   └── 📁 signin/
│   │       └── 📄 page.tsx      # Sign in page
│   │
│   ├── 📁 dashboard/            # Protected dashboard area ⭐
│   │   ├── 📄 layout.tsx        # Dashboard layout with sidebar
│   │   ├── 📄 page.tsx          # Dashboard home
│   │   │
│   │   ├── 📁 sequences/        # Sequence management ⭐ CORE FEATURE
│   │   │   ├── 📄 page.tsx      # Sequence list page
│   │   │   ├── 📄 builder/
│   │   │   │   └── 📄 page.tsx  # New sequence builder
│   │   │   └── 📁 [id]/
│   │   │       ├── 📄 page.tsx  # Sequence details
│   │   │       └── 📁 edit/
│   │   │           └── 📄 page.tsx # Sequence editor ⭐
│   │   │
│   │   ├── 📁 contacts/         # Contact management ✅ COMPLETED
│   │   │   ├── 📄 page.tsx      # Contact list page
│   │   │   └── 📁 [id]/
│   │   │       └── 📄 page.tsx  # Contact details
│   │   │
│   │   ├── 📁 campaigns/        # Campaign management 🚧 IN DEVELOPMENT
│   │   │   ├── 📄 page.tsx      # Campaign list
│   │   │   └── 📁 [id]/
│   │   │       └── 📄 page.tsx  # Campaign details
│   │   │
│   │   ├── 📁 analytics/        # Analytics dashboard 📋 PLANNED
│   │   │   └── 📄 page.tsx      # Analytics overview
│   │   │
│   │   ├── 📁 replies/          # Reply management 📋 PLANNED
│   │   │   └── 📄 page.tsx      # Reply inbox
│   │   │
│   │   └── 📁 settings/         # User settings
│   │       ├── 📄 page.tsx      # Settings overview
│   │       ├── 📁 profile/
│   │       │   └── 📄 page.tsx  # Profile settings
│   │       ├── 📁 gmail/
│   │       │   └── 📄 page.tsx  # Gmail integration
│   │       └── 📁 domains/
│   │           └── 📄 page.tsx  # Tracking domains
│   │
│   └── 📁 api/                  # API Routes ⭐ CORE BACKEND
│       ├── 📁 auth/             # NextAuth configuration
│       │   └── 📁 [...nextauth]/
│       │       └── 📄 route.ts  # OAuth handlers
│       │
│       ├── 📁 sequences/        # Sequence API ⭐ MAIN API
│       │   ├── 📄 route.ts      # GET/POST sequences
│       │   └── 📁 [id]/
│       │       └── 📄 route.ts  # GET/PUT/DELETE sequence
│       │
│       ├── 📁 contacts/         # Contact API ✅ COMPLETED
│       │   ├── 📄 route.ts      # GET/POST contacts
│       │   └── 📁 [id]/
│       │       └── 📄 route.ts  # GET/PUT/DELETE contact
│       │
│       ├── 📁 campaigns/        # Campaign API 🚧 STRUCTURE READY
│       │   ├── 📄 route.ts      # GET/POST campaigns
│       │   └── 📁 [id]/
│       │       ├── 📄 route.ts  # GET/PUT/DELETE campaign
│       │       └── 📁 send/
│       │           └── 📄 route.ts # Send campaign
│       │
│       ├── 📁 gmail/            # Gmail integration API
│       │   ├── 📁 auth/
│       │   │   └── 📄 route.ts  # Gmail OAuth
│       │   ├── 📁 send/
│       │   │   └── 📄 route.ts  # Send email
│       │   └── 📁 webhook/
│       │       └── 📄 route.ts  # Gmail webhooks
│       │
│       └── 📁 tracking/         # Email tracking API
│           ├── 📁 open/
│           │   └── 📁 [trackingId]/
│           │       └── 📄 route.ts # Open pixel
│           ├── 📁 click/
│           │   └── 📁 [trackingId]/
│           │       └── 📄 route.ts # Click redirect
│           └── 📁 reply/
│               └── 📄 route.ts  # Reply webhook
```

### Components Directory
```
/src/components/
├── 📁 sequences/                # Sequence components ⭐ PRIMARY FEATURE
│   ├── 📄 SequenceBuilderFlow.tsx    # Main visual builder ⭐ CORE COMPONENT
│   ├── 📄 SequenceList.tsx           # Sequence listing
│   ├── 📄 SequenceCard.tsx           # Individual sequence card
│   ├── 📄 nodes/                     # React Flow node components
│   │   ├── 📄 StartNode.tsx          # Sequence start node
│   │   ├── 📄 EmailNode.tsx          # Email step node
│   │   ├── 📄 DelayNode.tsx          # Delay step node
│   │   └── 📄 ConditionNode.tsx      # Condition step node
│   └── 📄 StepEditingPanel.tsx       # Step editing sidebar
│
├── 📁 contacts/                 # Contact components ✅ COMPLETED
│   ├── 📄 ContactList.tsx       # Contact listing
│   ├── 📄 ContactCard.tsx       # Individual contact card
│   ├── 📄 ContactForm.tsx       # Add/edit contact form
│   └── 📄 ContactImport.tsx     # CSV import component
│
├── 📁 campaigns/                # Campaign components 🚧 IN DEVELOPMENT
│   ├── 📄 CampaignList.tsx      # Campaign listing
│   ├── 📄 CampaignForm.tsx      # Campaign creation form
│   └── 📄 CampaignEditor.tsx    # Campaign email editor
│
├── 📁 ui/                       # Reusable UI components
│   ├── 📄 Button.tsx            # Button variants
│   ├── 📄 Input.tsx             # Form input components
│   ├── 📄 Modal.tsx             # Modal dialog
│   ├── 📄 LoadingSpinner.tsx    # Loading indicators
│   ├── 📄 Toast.tsx             # Notification toast
│   └── 📄 Sidebar.tsx           # Dashboard sidebar
│
└── 📁 layout/                   # Layout components
    ├── 📄 DashboardLayout.tsx   # Main dashboard wrapper
    ├── 📄 AuthLayout.tsx        # Authentication layout
    └── 📄 Navigation.tsx        # Navigation components
```

### Configuration & Services
```
/src/
├── 📁 lib/                      # Core utilities and configuration
│   ├── 📄 auth.ts               # NextAuth configuration ⭐
│   ├── 📄 prisma.ts             # Database client ⭐
│   ├── 📄 gmail.ts              # Gmail API client ⭐
│   ├── 📄 utils.ts              # Utility functions
│   ├── 📄 validations.ts        # Zod schemas
│   └── 📄 constants.ts          # App constants
│
├── 📁 services/                 # Business logic services
│   ├── 📄 emailService.ts       # Email sending logic
│   ├── 📄 trackingService.ts    # Tracking pixel/click logic
│   ├── 📄 sequenceService.ts    # Sequence automation logic
│   └── 📄 webhookService.ts     # Webhook handling
│
├── 📁 hooks/                    # Custom React hooks
│   ├── 📄 useSequences.ts       # Sequence data fetching
│   ├── 📄 useContacts.ts        # Contact data fetching
│   ├── 📄 useAuth.ts            # Authentication state
│   └── 📄 useLocalStorage.ts    # Local storage utility
│
└── 📁 types/                    # TypeScript type definitions
    ├── 📄 sequence.ts           # Sequence-related types
    ├── 📄 contact.ts            # Contact-related types
    ├── 📄 campaign.ts           # Campaign-related types
    └── 📄 api.ts                # API response types
```

### Database & Configuration
```
/prisma/
├── 📄 schema.prisma             # Database schema ⭐ CORE DATA MODEL
├── 📁 migrations/               # Database migration files
│   ├── 📄 20240101000000_init/
│   ├── 📄 20240115000000_add_sequences/
│   └── 📄 20240120000000_add_tracking/
└── 📄 seed.ts                   # Database seeding script
```

---

## 🎯 Page Routing Architecture

### Next.js 15 App Router Structure

#### Public Routes (Unauthenticated)
```
/                                # Home page → redirects to /dashboard
/auth/signin                     # Google OAuth login page
```

#### Protected Routes (Authenticated)
```
/dashboard                       # Dashboard overview
├── /sequences                   # Sequence management ⭐
│   ├── /builder                 # Create new sequence
│   ├── /[id]                    # View sequence details
│   └── /[id]/edit               # Edit sequence ⭐ PRIMARY UI
├── /contacts                    # Contact management ✅
│   └── /[id]                    # View contact details
├── /campaigns                   # Campaign management 🚧
│   └── /[id]                    # View campaign details
├── /analytics                   # Analytics dashboard 📋
├── /replies                     # Reply management 📋
└── /settings                    # User settings
    ├── /profile                 # Profile settings
    ├── /gmail                   # Gmail integration
    └── /domains                 # Tracking domains
```

#### API Routes
```
/api/auth/[...nextauth]          # NextAuth OAuth handlers
/api/sequences                   # Sequence CRUD operations ⭐
├── /[id]                        # Individual sequence operations
└── /[id]/enroll                 # Contact enrollment
/api/contacts                    # Contact CRUD operations ✅
└── /[id]                        # Individual contact operations
/api/campaigns                   # Campaign operations 🚧
├── /[id]                        # Individual campaign operations
└── /[id]/send                   # Send campaign
/api/gmail                       # Gmail integration
├── /auth                        # Gmail OAuth
├── /send                        # Send email
└── /webhook                     # Gmail webhooks
/api/tracking                    # Email tracking
├── /open/[trackingId]           # Open pixel
├── /click/[trackingId]          # Click redirect
└── /reply                       # Reply webhook
```

---

## 🧩 Component Architecture

### Primary Components Hierarchy

#### SequenceBuilderFlow (Core Component) ⭐
```
SequenceBuilderFlow
├── ReactFlowProvider
│   └── ReactFlow
│       ├── StartNode
│       ├── EmailNode
│       │   ├── NodeHeader
│       │   ├── NodeContent
│       │   └── NodeHandles
│       ├── DelayNode
│       │   ├── DelayDisplay
│       │   └── NodeHandles
│       └── ConditionNode
│           ├── ConditionLogic
│           └── BranchHandles
├── StepsSidebar
│   ├── EmailStepButton
│   ├── DelayStepButton
│   └── ConditionStepButton
├── EditingPanel (Modal)
│   ├── EmailStepEditor
│   │   ├── SubjectInput
│   │   ├── ContentTextarea
│   │   ├── ReplyToThreadToggle
│   │   └── TrackingToggle
│   ├── DelayStepEditor
│   │   ├── DaysInput
│   │   ├── HoursInput
│   │   └── MinutesInput
│   └── ConditionStepEditor
│       ├── ConditionTypeSelect
│       ├── ReferenceStepSelect
│       ├── TrueBranchConfig
│       └── FalseBranchConfig
└── SequenceMetadataPanel
    ├── NameInput
    ├── DescriptionInput
    └── TrackingToggle
```

#### Dashboard Layout Structure
```
DashboardLayout
├── Sidebar
│   ├── Logo
│   ├── NavigationMenu
│   │   ├── DashboardLink
│   │   ├── SequencesLink ⭐
│   │   ├── ContactsLink ✅
│   │   ├── CampaignsLink 🚧
│   │   ├── AnalyticsLink 📋
│   │   ├── RepliesLink 📋
│   │   └── SettingsLink
│   └── UserProfile
│       ├── UserAvatar
│       ├── UserName
│       └── SignOutButton
└── MainContent
    ├── PageHeader
    │   ├── Breadcrumbs
    │   ├── PageTitle
    │   └── ActionButtons
    └── PageContent
```

---

## 🔄 Data Flow Architecture

### State Management Patterns

#### 1. Server State (API Data)
```typescript
// Using SWR pattern for API data
const { data: sequences, error, isLoading, mutate } = useSWR(
  '/api/sequences',
  fetcher
)

// Optimistic updates for better UX
const updateSequence = async (id: string, data: any) => {
  mutate(optimisticData, false) // Update UI immediately
  await fetch(`/api/sequences/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  mutate() // Revalidate from server
}
```

#### 2. Component State (UI State)
```typescript
// Local component state with useState
const [selectedNode, setSelectedNode] = useState<Node | null>(null)
const [isEditing, setIsEditing] = useState(false)

// Complex state with useReducer
const [flowState, dispatch] = useReducer(flowReducer, initialState)
```

#### 3. Form State Management
```typescript
// React Hook Form for complex forms
const { register, handleSubmit, formState: { errors } } = useForm<SequenceData>({
  resolver: zodResolver(sequenceSchema)
})
```

### API Data Flow
```
Frontend Component
    ↓ (API Call)
Next.js API Route
    ↓ (Authentication Check)
NextAuth Session Validation
    ↓ (Database Query)
Prisma Client
    ↓ (SQL Query)
PostgreSQL Database
    ↑ (Results)
Prisma Client
    ↑ (Typed Data)
API Route Response
    ↑ (JSON)
Frontend Component Update
```

---

## 🎨 Styling Architecture

### Tailwind CSS Configuration
```javascript
// tailwind.config.js
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6', 
          600: '#2563eb',
          700: '#1d4ed8',
        },
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          // ... extended gray palette
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
```

### Global Styles (with Dark Mode Issue)
```css
/* src/app/globals.css */
@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #171717;
}

/* ISSUE: This causes white text on white backgrounds */
@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed; /* Light text for dark backgrounds */
  }
}

/* SOLUTION: Explicit component-level overrides */
.form-input {
  @apply bg-white text-gray-900; /* Explicit colors */
}
```

### Component Styling Patterns
```typescript
// Utility class approach
const inputClassName = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"

// Conditional styling
const buttonVariants = {
  primary: "bg-blue-600 text-white hover:bg-blue-700",
  secondary: "border border-gray-300 text-gray-700 hover:bg-gray-50",
  danger: "bg-red-600 text-white hover:bg-red-700"
}
```

---

## 🔐 Authentication Architecture

### NextAuth.js Configuration
```typescript
// src/lib/auth.ts
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly'
        }
      }
    })
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account, user }) {
      // Store OAuth tokens and user info
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.googleId = user.id
      }
      return token
    },
    async session({ session, token }) {
      // Pass tokens to session for API access
      session.accessToken = token.accessToken
      session.refreshToken = token.refreshToken
      session.user.id = token.sub
      return session
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error'
  }
}
```

### Route Protection Middleware
```typescript
// middleware.ts (Next.js 15)
export { default } from "next-auth/middleware"

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/sequences/:path*',
    '/api/contacts/:path*',
    '/api/campaigns/:path*'
  ]
}
```

---

## 🗄️ Database Architecture

### Prisma Schema Structure
```prisma
// Multi-tenant architecture with user isolation
model User {
  id String @id @default(cuid())
  email String @unique
  sequences Sequence[]
  contacts Contact[]
  // All user data cascades on delete
}

model Sequence {
  id String @id @default(cuid())
  userId String // Always filter by this for security
  steps Json // Flexible step storage
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId, status]) // Performance optimization
}
```

### Database Connection Pattern
```typescript
// src/lib/prisma.ts
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

---

## 📦 Build & Deployment Architecture

### Next.js Configuration
```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client']
  },
  images: {
    domains: ['lh3.googleusercontent.com'] // Google profile images
  },
  env: {
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  }
}

module.exports = nextConfig
```

### Package.json Scripts
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build", 
    "start": "next start",
    "type-check": "tsc --noEmit",
    "lint": "next lint",
    "db:push": "prisma db push",
    "db:studio": "prisma studio",
    "db:generate": "prisma generate"
  }
}
```

---

## 🎯 Feature Implementation Status

### ✅ Completed Features
- **Authentication System** - Google OAuth with NextAuth
- **Database Schema** - Complete multi-tenant Prisma setup
- **Contact Management** - Full CRUD with UI
- **Sequence Builder** - Visual React Flow builder ⭐
- **API Endpoints** - Sequences and contacts APIs
- **Dashboard Layout** - Responsive sidebar navigation

### 🚧 In Development  
- **Campaign Management** - API structure ready, needs UI
- **Email Sending** - Gmail API integrated, needs testing
- **Tracking System** - Database ready, needs implementation

### 📋 Planned Features
- **Analytics Dashboard** - Database schema ready
- **Reply Management** - Unified inbox system
- **Webhook Integrations** - External service connections

---

## 🔄 Development Workflow

### Local Development
```bash
# Start development environment
npm run dev                    # Next.js dev server (port 3000)
npx prisma studio             # Database GUI (port 5555)
npm run type-check            # TypeScript validation
npm run lint                  # Code quality check
```

### Database Workflow
```bash
# Schema changes
npx prisma db push            # Apply schema to database
npx prisma generate           # Update TypeScript types
npx prisma migrate dev        # Create migration file
```

### Deployment Workflow
```bash
# Commit changes
git add .
git commit -m "Feature description"
git push origin main

# Vercel auto-deploys from main branch
# Check deployment status at vercel.com
```

---

**Last Updated**: January 2025  
**Architecture Status**: Core structure complete, ready for feature expansion  
**Next Focus**: Complete email sending implementation and analytics dashboard