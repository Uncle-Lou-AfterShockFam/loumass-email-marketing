# 🚀 LOUMASS Deployment & Testing Guide

## 📋 Overview

This guide provides comprehensive instructions for deploying, testing, and maintaining the LOUMASS email marketing platform. Covers local development, production deployment, and testing strategies.

---

## 🏗️ Environment Setup

### Prerequisites
- **Node.js**: v18.17+ (LTS recommended)
- **npm**: v9.0+ or yarn
- **PostgreSQL**: v14+ (for local development)
- **Git**: Latest version
- **Google Cloud Console**: Access for OAuth setup

### System Requirements
- **Development**: 8GB RAM, SSD storage
- **Production**: Vercel deployment (serverless)
- **Database**: Vercel Postgres (production) / PostgreSQL (local)

---

## 🔧 Local Development Setup

### 1. Repository Setup
```bash
# Clone the repository
git clone https://github.com/yourusername/loumass-beta.git
cd loumass-beta

# Install dependencies
npm install

# Verify installation
npm run type-check
```

### 2. Environment Variables
Create `.env.local` file in the project root:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/loumass_dev"
DIRECT_DATABASE_URL="postgresql://username:password@localhost:5432/loumass_dev"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-key-here"

# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID="your-google-client-id.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Base URL
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```

### 3. Database Setup
```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Optional: Seed with test data
npx prisma db seed

# Open database browser (optional)
npx prisma studio
```

### 4. Start Development Server
```bash
# Standard development
npm run dev

# With custom port
PORT=3005 npm run dev

# With database URL override
DATABASE_URL="postgresql://..." npm run dev
```

### 5. Verify Setup
1. Navigate to http://localhost:3000
2. Test Google OAuth login
3. Access dashboard at http://localhost:3000/dashboard
4. Create a test sequence to verify functionality

---

## 🌐 Production Deployment

### Vercel Deployment (Recommended)

#### 1. Vercel Account Setup
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Link project
vercel link
```

#### 2. Environment Variables Setup
In Vercel Dashboard, add the following environment variables:

**Required Variables:**
```env
DATABASE_URL=postgresql://...  # Vercel Postgres connection string
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=your-production-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
NEXT_PUBLIC_BASE_URL=https://your-domain.vercel.app
```

#### 3. Deploy
```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Auto-deploy via Git integration (recommended)
# Push to main branch triggers automatic deployment
git push origin main
```

#### 4. Database Migration
```bash
# Run database migrations in production
npx prisma db push --accept-data-loss  # Caution: Only for initial setup
```

### Alternative Deployment Options

#### Docker Deployment
```dockerfile
# Dockerfile
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM base AS build
COPY . .
RUN npm run build

FROM base AS runtime
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["npm", "start"]
```

#### Railway/Render Deployment
1. Connect GitHub repository
2. Set environment variables
3. Configure build command: `npm run build`
4. Configure start command: `npm start`

---

## 🧪 Testing Strategy

### 1. Local Testing

#### Unit Testing
```bash
# Run unit tests
npm test

# Watch mode for development
npm run test:watch

# Coverage report
npm run test:coverage
```

#### Integration Testing
```bash
# API endpoint tests
npm run test:api

# Database integration tests
npm run test:db
```

#### E2E Testing
```bash
# Playwright end-to-end tests
npm run test:e2e

# Specific test suite
npm run test:e2e -- --grep "sequence builder"
```

### 2. Production Testing

#### Manual Testing Checklist

**Authentication Flow:**
- [ ] Google OAuth login works
- [ ] Session persistence across page refreshes
- [ ] Logout functionality
- [ ] Protected route access control

**Sequence Builder:**
- [ ] Create new sequence
- [ ] Add email, delay, and condition nodes
- [ ] Edit node properties (subject, content, delays)
- [ ] Connect nodes with edges
- [ ] Save sequence successfully
- [ ] Load existing sequence for editing

**Contact Management:**
- [ ] Add individual contacts
- [ ] Bulk import contacts (CSV)
- [ ] Search and filter contacts
- [ ] Edit contact information
- [ ] Delete contacts

**Database Operations:**
- [ ] Data persistence across sessions
- [ ] Multi-tenant data isolation
- [ ] Proper error handling for invalid data

### 3. API Testing

#### Using cURL
```bash
# Test sequence creation
curl -X POST https://yourdomain.vercel.app/api/sequences \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION" \
  -d '{
    "name": "Test Sequence",
    "description": "Testing API",
    "steps": [],
    "status": "DRAFT"
  }'

# Test sequence retrieval
curl https://yourdomain.vercel.app/api/sequences \
  -H "Cookie: next-auth.session-token=YOUR_SESSION"
```

#### Using Postman/Thunder Client
1. Import API collection from `/docs/api-collection.json`
2. Set environment variables (base URL, session token)
3. Run test suite

### 4. Performance Testing

#### Lighthouse Testing
```bash
# Install Lighthouse CLI
npm install -g lighthouse

# Run performance audit
lighthouse https://yourdomain.vercel.app --output html --output-path ./lighthouse-report.html

# Run on specific pages
lighthouse https://yourdomain.vercel.app/dashboard/sequences
```

#### Load Testing
```bash
# Install k6 for load testing
brew install k6  # macOS
# or download from k6.io

# Run load test
k6 run load-test.js
```

Example load test script:
```javascript
// load-test.js
import http from 'k6/http';

export let options = {
  vus: 10,        // 10 virtual users
  duration: '30s', // for 30 seconds
};

export default function() {
  let response = http.get('https://yourdomain.vercel.app/api/sequences');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
```

---

## 🔍 Monitoring & Debugging

### 1. Application Monitoring

#### Vercel Analytics
- **Performance Metrics**: Core Web Vitals tracking
- **Function Logs**: API route execution logs
- **Build Logs**: Deployment status and errors

#### Error Tracking (Recommended: Sentry)
```bash
# Install Sentry
npm install @sentry/nextjs

# Configure in next.config.js
const { withSentryConfig } = require('@sentry/nextjs');

module.exports = withSentryConfig({
  // Your Next.js config
}, {
  // Sentry webpack plugin options
});
```

### 2. Database Monitoring

#### Prisma Logging
```typescript
// lib/prisma.ts
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})
```

#### Database Performance
```sql
-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Check connection count
SELECT count(*) FROM pg_stat_activity;
```

### 3. Frontend Debugging

#### React Developer Tools
1. Install React DevTools browser extension
2. Use Components tab to inspect React tree
3. Use Profiler tab for performance analysis

#### React Flow DevTools
```typescript
// Add to SequenceBuilderFlow for debugging
import { ReactFlowProvider } from '@xyflow/react';

<ReactFlowProvider>
  <ReactFlow
    // ... other props
    onInit={(reactFlowInstance) => {
      console.log('React Flow initialized:', reactFlowInstance);
    }}
  />
</ReactFlowProvider>
```

### 4. API Debugging

#### Next.js API Route Logging
```typescript
// Add to API routes for debugging
export async function POST(request: NextRequest) {
  console.log('API Route called:', request.url);
  console.log('Request body:', await request.json());
  
  try {
    // ... API logic
  } catch (error) {
    console.error('API Error:', error);
    // ... error handling
  }
}
```

---

## 🔐 Security Testing

### 1. Authentication Testing
- [ ] Test unauthorized access to protected routes
- [ ] Verify session timeout behavior
- [ ] Test OAuth flow with invalid credentials
- [ ] Check CSRF protection on forms

### 2. Data Security Testing
- [ ] Verify multi-tenant data isolation
- [ ] Test SQL injection prevention
- [ ] Check XSS protection in user inputs
- [ ] Verify sensitive data encryption

### 3. Security Headers
```javascript
// next.config.js
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  }
];
```

---

## 📊 Performance Optimization

### 1. Build Optimization

#### Bundle Analysis
```bash
# Analyze bundle size
npm run build
npx @next/bundle-analyzer

# Check for large dependencies
npm ls --depth=0 --long
```

#### Code Splitting
```typescript
// Lazy load heavy components
const SequenceBuilder = lazy(() => import('@/components/sequences/SequenceBuilderFlow'));

// Use Suspense boundary
<Suspense fallback={<SkeletonLoader />}>
  <SequenceBuilder />
</Suspense>
```

### 2. Database Optimization

#### Query Optimization
```typescript
// Use select to limit returned fields
const sequences = await prisma.sequence.findMany({
  select: {
    id: true,
    name: true,
    status: true,
    _count: {
      select: {
        enrollments: true
      }
    }
  },
  where: { userId: session.user.id }
});
```

#### Indexing Strategy
```prisma
// Add indexes for frequently queried fields
model Sequence {
  @@index([userId, status])
  @@index([createdAt])
}

model Contact {
  @@index([userId, email])
  @@index([status])
}
```

### 3. Caching Strategy

#### API Route Caching
```typescript
// Add caching headers to API responses
return NextResponse.json(data, {
  headers: {
    'Cache-Control': 'public, max-age=300, stale-while-revalidate=60'
  }
});
```

#### Static Asset Optimization
```javascript
// next.config.js
module.exports = {
  images: {
    domains: ['your-cdn-domain.com'],
    formats: ['image/webp', 'image/avif'],
  },
  // Enable compression
  compress: true,
  // Optimize fonts
  optimizeFonts: true,
};
```

---

## 🚨 Troubleshooting Guide

### Common Issues & Solutions

#### Issue 1: "Invalid client" OAuth Error
**Symptoms**: Google OAuth login fails with invalid_client error
**Cause**: Incorrect OAuth configuration
**Solution**:
1. Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
2. Check authorized redirect URIs in Google Cloud Console
3. Ensure `NEXTAUTH_URL` matches the domain

#### Issue 2: White Text on White Background
**Symptoms**: Input fields appear empty or unreadable
**Cause**: Dark mode CSS conflicts
**Solution**:
```typescript
// Add explicit styling to inputs
className="bg-white text-gray-900"
```

#### Issue 3: Database Connection Errors
**Symptoms**: Prisma client initialization fails
**Cause**: Incorrect `DATABASE_URL` or network issues
**Solution**:
1. Verify connection string format
2. Check network connectivity
3. Ensure database is running
4. Regenerate Prisma client: `npx prisma generate`

#### Issue 4: Build Failures on Vercel
**Symptoms**: Deployment fails during build process
**Cause**: TypeScript errors or missing dependencies
**Solution**:
1. Run `npm run type-check` locally
2. Fix TypeScript errors
3. Verify all dependencies in `package.json`
4. Check Vercel build logs for specific errors

### Debugging Commands

#### Local Development
```bash
# Clear Next.js cache
rm -rf .next

# Reset node_modules
rm -rf node_modules package-lock.json
npm install

# Reset database schema
npx prisma db push --force-reset

# Check environment variables
env | grep -E "(DATABASE_URL|NEXTAUTH|GOOGLE)"
```

#### Production Issues
```bash
# Check Vercel deployment logs
vercel logs --app=your-app-name

# Check function execution logs
vercel logs --app=your-app-name --function=api/sequences

# Test production build locally
npm run build
npm start
```

---

## 📋 Maintenance Checklist

### Daily (Automated)
- [ ] Monitor application uptime (Vercel)
- [ ] Check error rates (Sentry/logs)
- [ ] Database backup verification
- [ ] Security scan (Dependabot)

### Weekly
- [ ] Review performance metrics
- [ ] Update dependencies (security patches)
- [ ] Check disk usage (database)
- [ ] Review user feedback/support tickets

### Monthly
- [ ] Full security audit
- [ ] Database maintenance (vacuum, reindex)
- [ ] Performance optimization review
- [ ] Backup and disaster recovery testing
- [ ] Update documentation

### Quarterly
- [ ] Major dependency updates
- [ ] Infrastructure cost review
- [ ] Scalability planning
- [ ] Security penetration testing
- [ ] Business continuity plan review

---

## 📈 Scaling Considerations

### Database Scaling
```sql
-- Monitor database size
SELECT pg_database.datname, pg_size_pretty(pg_database_size(pg_database.datname)) AS size 
FROM pg_database;

-- Set up read replicas for heavy read workloads
-- Implement connection pooling (PgBouncer)
```

### Application Scaling
- **Vercel Functions**: Automatic scaling up to concurrency limits
- **Edge Caching**: Implement CDN for static assets
- **Database Connection Pooling**: Use connection pooling for high traffic

### Performance Monitoring
```typescript
// Add performance monitoring
export function reportWebVitals(metric) {
  console.log(metric);
  // Send to analytics service
}
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run type-check
      - run: npm run lint
      - run: npm run test
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

### Pre-deployment Checklist
- [ ] All tests passing
- [ ] TypeScript compilation successful
- [ ] Linting rules satisfied
- [ ] Database migrations prepared
- [ ] Environment variables updated
- [ ] Security headers configured

---

**Last Updated**: January 2025  
**Deployment Status**: Production ready on Vercel  
**Current Version**: v1.0 - Core features implemented