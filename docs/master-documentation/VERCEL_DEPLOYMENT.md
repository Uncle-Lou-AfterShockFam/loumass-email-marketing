# ☁️ LOUMASS Vercel Deployment Guide

## 📋 Overview

This document covers the complete Vercel deployment configuration for LOUMASS, including project setup, environment variables, database integration, custom domains, monitoring, and production optimization. Essential for maintaining and scaling the production deployment.

---

## 🏗️ Vercel Project Configuration

### Project Details
- **Project Name**: `loumass-beta`
- **Framework**: Next.js 15.5.2
- **Node.js Version**: 18.x (LTS)
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`
- **Development Command**: `npm run dev`

### Repository Connection
- **Git Provider**: GitHub
- **Repository**: `louispiotti/loumass_beta`
- **Production Branch**: `main`
- **Deploy Hooks**: Enabled for automatic deployment

### Current Deployment
- **Production URL**: https://loumassbeta.vercel.app
- **Preview URLs**: Auto-generated for each PR
- **Custom Domain**: Ready for configuration

---

## ⚙️ Build Configuration

### Next.js Configuration

#### next.config.js
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Experimental features
  experimental: {
    // Enable Server Components
    serverComponentsExternalPackages: ['@prisma/client'],
  },
  
  // Image optimization
  images: {
    domains: [
      'lh3.googleusercontent.com', // Google OAuth profile images
      'avatars.githubusercontent.com', // GitHub avatars (if used)
    ],
    formats: ['image/webp', 'image/avif'],
  },
  
  // Headers for security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },
  
  // Redirects for SEO
  async redirects() {
    return [
      {
        source: '/login',
        destination: '/auth/signin',
        permanent: true,
      },
      {
        source: '/signup',
        destination: '/auth/signin',
        permanent: true,
      },
    ]
  },
  
  // Environment variable validation
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // Bundle analyzer (for development)
  ...(process.env.ANALYZE === 'true' && {
    webpack: (config) => {
      config.plugins.push(
        new (require('@next/bundle-analyzer'))({
          enabled: true,
        })
      )
      return config
    },
  }),
}

module.exports = nextConfig
```

### Build Optimization

#### package.json Scripts
```json
{
  "scripts": {
    "build": "next build",
    "build:analyze": "ANALYZE=true next build",
    "start": "next start",
    "dev": "next dev",
    "lint": "next lint --fix",
    "type-check": "tsc --noEmit",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "postinstall": "prisma generate"
  }
}
```

#### Build Performance
- **Build Time**: ~2-3 minutes
- **Bundle Size**: ~500KB (gzipped)
- **Pages**: Static + Dynamic
- **API Routes**: Serverless functions

---

## 🔐 Environment Variables Configuration

### Production Environment Variables

#### Required Variables
```env
# Database - Vercel Postgres
DATABASE_URL="postgresql://default:abc123@ep-example.us-east-1.postgres.vercel.app/verceldb?sslmode=require"
DIRECT_DATABASE_URL="postgresql://default:abc123@ep-example.us-east-1.postgres.vercel.app/verceldb?sslmode=require"

# NextAuth Configuration
NEXTAUTH_URL="https://loumassbeta.vercel.app"
NEXTAUTH_SECRET="production-super-secure-secret-key-64-characters-minimum"

# Google OAuth
GOOGLE_CLIENT_ID="123456789-prod.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-production-client-secret"

# Application
NEXT_PUBLIC_BASE_URL="https://loumassbeta.vercel.app"
NODE_ENV="production"
```

#### Optional Variables
```env
# Analytics and Monitoring
VERCEL_ANALYTICS_ID="analytics-id"
SENTRY_DSN="https://sentry-dsn"
POSTHOG_KEY="posthog-key"

# Feature Flags
ENABLE_ANALYTICS="true"
ENABLE_ERROR_TRACKING="true"
MAINTENANCE_MODE="false"

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS="100"
RATE_LIMIT_WINDOW="60000"
```

### Environment Variable Management

#### Vercel Dashboard Setup
1. **Access**: Project → Settings → Environment Variables
2. **Environments**: Production, Preview, Development
3. **Security**: Encrypted at rest
4. **Access Control**: Team permissions

#### Environment Variable Validation
```typescript
// lib/env-validation.ts
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  NEXT_PUBLIC_BASE_URL: z.string().url(),
})

export const env = envSchema.parse(process.env)
```

---

## 🗄️ Database Integration

### Vercel Postgres Setup

#### Database Configuration
- **Provider**: Vercel Postgres
- **Version**: PostgreSQL 14+
- **Connection Pooling**: Enabled
- **SSL Mode**: Required
- **Max Connections**: 100

#### Connection Details
```env
# Auto-generated by Vercel
POSTGRES_URL="postgres://default:pass@host.postgres.vercel.app:5432/verceldb"
POSTGRES_PRISMA_URL="postgres://default:pass@host.postgres.vercel.app:5432/verceldb?pgbouncer=true&connect_timeout=15"
POSTGRES_URL_NON_POOLING="postgres://default:pass@host.postgres.vercel.app:5432/verceldb"
POSTGRES_USER="default"
POSTGRES_HOST="ep-example.us-east-1.postgres.vercel.app"
POSTGRES_PASSWORD="password"
POSTGRES_DATABASE="verceldb"
```

#### Prisma Configuration
```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

#### Database Migrations
```bash
# Deploy schema changes
npx prisma db push

# Generate Prisma client (runs automatically in postinstall)
npx prisma generate

# View database in browser
npx prisma studio
```

---

## 🚀 Deployment Pipeline

### Automatic Deployment

#### Git Integration
- **Trigger**: Push to `main` branch
- **Build Command**: Automatically detected
- **Environment**: Production
- **Status Checks**: Required before merge

#### Deployment Process
1. **Code Push** → GitHub repository
2. **Webhook** → Triggers Vercel build
3. **Build** → Runs `npm run build`
4. **Deploy** → Deploys to global edge network
5. **DNS Update** → Updates routing
6. **Success** → Deployment complete

#### Preview Deployments
- **Trigger**: Pull request creation
- **URL**: Auto-generated preview URL
- **Environment**: Preview environment variables
- **Testing**: Safe testing environment

### Manual Deployment

#### Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Link project (one-time setup)
vercel link

# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Check deployment status
vercel ls
```

#### GitHub Actions (Optional)
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
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run type check
        run: npm run type-check
      
      - name: Run linting
        run: npm run lint
      
      - name: Run tests
        run: npm test
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
        if: github.ref == 'refs/heads/main'
```

---

## 🌐 Domain & DNS Configuration

### Custom Domain Setup

#### Domain Configuration
```
Primary Domain: loumass.com (future)
Current Domain: loumassbeta.vercel.app
Redirect: www.loumass.com → loumass.com
SSL: Automatic (Let's Encrypt)
```

#### DNS Records
```
# A Record
Type: A
Name: @
Value: 76.76.19.61 (Vercel IP)

# CNAME Record  
Type: CNAME
Name: www
Value: cname.vercel-dns.com

# MX Records (for email)
Type: MX
Name: @
Value: mail.loumass.com
Priority: 10
```

#### Vercel Domain Settings
```javascript
// vercel.json
{
  "domains": [
    "loumass.com",
    "www.loumass.com"
  ],
  "redirects": [
    {
      "source": "www.loumass.com",
      "destination": "https://loumass.com"
    }
  ]
}
```

---

## 📊 Performance & Monitoring

### Vercel Analytics

#### Built-in Analytics
- **Page Views**: Real-time traffic monitoring
- **Core Web Vitals**: Performance metrics
- **Top Pages**: Most visited pages
- **Referrers**: Traffic sources
- **Devices**: Desktop vs Mobile usage

#### Configuration
```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

### Speed Insights

#### Core Web Vitals Tracking
```typescript
// app/layout.tsx
import { SpeedInsights } from '@vercel/speed-insights/next'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  )
}
```

#### Performance Targets
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1
- **First Input Delay**: < 100ms

### Function Monitoring

#### Serverless Function Metrics
- **Invocations**: Function call count
- **Duration**: Execution time
- **Errors**: Error rate and details
- **Cold Starts**: Initial execution delay

#### Function Configuration
```typescript
// API route optimization
export const config = {
  runtime: 'nodejs18.x',
  maxDuration: 10, // 10 seconds max
}

// Edge function (when applicable)
export const config = {
  runtime: 'edge',
}
```

---

## 🔧 Advanced Configuration

### Edge Functions

#### Middleware Configuration
```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Add security headers
  const response = NextResponse.next()
  
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  
  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
```

#### Geographic Routing
```typescript
// middleware.ts - Geographic routing
import { NextResponse } from 'next/server'

export function middleware(request) {
  const country = request.geo?.country
  
  if (country === 'US') {
    return NextResponse.rewrite(new URL('/us' + request.nextUrl.pathname, request.url))
  }
  
  return NextResponse.next()
}
```

### Caching Strategy

#### Static Asset Caching
```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
}
```

#### API Response Caching
```typescript
// API route with caching
export async function GET() {
  const data = await fetchData()
  
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=60'
    }
  })
}
```

### Error Handling

#### Global Error Boundary
```typescript
// app/global-error.tsx
'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <h2>Something went wrong!</h2>
        <button onClick={() => reset()}>Try again</button>
      </body>
    </html>
  )
}
```

#### Error Tracking Integration
```typescript
// lib/error-tracking.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.VERCEL_ENV || 'development',
  tracesSampleRate: 0.1,
})

export { Sentry }
```

---

## 🚨 Troubleshooting

### Common Deployment Issues

#### Build Failures
**Issue**: TypeScript compilation errors
**Solution**:
```bash
# Fix locally first
npm run type-check
npm run lint

# Then deploy
git add .
git commit -m "Fix TypeScript errors"
git push origin main
```

#### Environment Variable Issues
**Issue**: Variables not loading in production
**Solution**:
1. Check Vercel dashboard environment variables
2. Ensure variables are set for "Production" environment
3. Redeploy to pick up changes

#### Database Connection Issues
**Issue**: Prisma client connection failures
**Solution**:
```bash
# Regenerate Prisma client
npx prisma generate

# Push schema changes
npx prisma db push

# Check connection string format
echo $DATABASE_URL
```

### Performance Issues

#### Slow Build Times
**Optimization**:
```javascript
// next.config.js
module.exports = {
  experimental: {
    // Faster builds
    swcMinify: true,
    // Reduce bundle size
    modularizeImports: {
      'lucide-react': {
        transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
      },
    },
  },
}
```

#### Large Bundle Size
**Analysis**:
```bash
# Analyze bundle
npm run build:analyze

# Check for large dependencies
npx depcheck
```

### Function Timeout Issues

#### Increase Timeout Limits
```typescript
// API route configuration
export const config = {
  maxDuration: 30, // 30 seconds (Pro plan)
}
```

#### Optimize Long-Running Operations
```typescript
// Break into smaller chunks
export async function POST(request) {
  const { items } = await request.json()
  
  // Process in batches
  const batchSize = 10
  const results = []
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchResults = await processBatch(batch)
    results.push(...batchResults)
  }
  
  return NextResponse.json(results)
}
```

---

## 📈 Scaling Considerations

### Traffic Scaling
- **Auto-scaling**: Automatic function scaling
- **Edge Network**: Global CDN distribution
- **Cold Start Optimization**: Function warming strategies

### Database Scaling
```sql
-- Monitor connection count
SELECT count(*) FROM pg_stat_activity;

-- Set up connection pooling
-- Already configured with Vercel Postgres
```

### Cost Optimization
- **Function Execution Time**: Optimize for shorter execution
- **Bandwidth**: Optimize image and asset sizes
- **Database Queries**: Minimize database calls

---

## 🔄 Backup & Recovery

### Deployment Rollback
```bash
# View deployment history
vercel ls

# Rollback to previous deployment
vercel rollback [deployment-url]

# Or via dashboard: Deployments → Promote
```

### Database Backup
```bash
# Export database (manual backup)
pg_dump $DATABASE_URL > backup.sql

# Restore from backup
psql $DATABASE_URL < backup.sql
```

### Environment Recovery
1. **Document all environment variables**
2. **Store encrypted backups of sensitive data**
3. **Test recovery procedures regularly**

---

## 📚 Additional Resources

### Vercel Documentation
- [Next.js Deployment](https://vercel.com/docs/concepts/next.js/overview)
- [Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Custom Domains](https://vercel.com/docs/concepts/projects/domains)
- [Analytics](https://vercel.com/docs/concepts/analytics)

### Best Practices
- [Performance Optimization](https://nextjs.org/docs/advanced-features/measuring-performance)
- [Security Headers](https://nextjs.org/docs/advanced-features/security-headers)
- [Error Handling](https://nextjs.org/docs/advanced-features/error-handling)

### Monitoring Tools
- **Vercel Analytics**: Built-in traffic analytics
- **Speed Insights**: Core Web Vitals monitoring
- **Sentry**: Error tracking and performance monitoring
- **LogDNA/Datadog**: Advanced logging solutions

---

**Last Updated**: January 2025  
**Deployment Status**: Production ready  
**Vercel Plan**: Pro (recommended for production)  
**Next Review**: February 2025