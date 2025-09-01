# 🔧 LOUMASS Environment Setup Guide

## 📋 Overview

This document provides comprehensive instructions for setting up the LOUMASS environment across different stages (development, staging, production), including all required environment variables, external service configurations, and secrets management.

---

## 🌍 Environment Types

### Development Environment
- **Purpose**: Local development and testing
- **Database**: Local PostgreSQL or remote development DB
- **Domain**: `http://localhost:3000`
- **Email**: Testing/sandbox mode

### Staging Environment  
- **Purpose**: Pre-production testing
- **Database**: Separate staging database
- **Domain**: `https://loumass-staging.vercel.app`
- **Email**: Limited real email sending

### Production Environment
- **Purpose**: Live application
- **Database**: Production PostgreSQL (Vercel Postgres)
- **Domain**: `https://loumassbeta.vercel.app`
- **Email**: Full Gmail API integration

---

## 🔐 Required Environment Variables

### Core Application Variables

#### Database Configuration
```env
# Primary database connection
DATABASE_URL="postgresql://username:password@host:port/database"

# Direct database connection (for Prisma migrations)
DIRECT_DATABASE_URL="postgresql://username:password@host:port/database"

# Example formats:
# Local: postgresql://postgres:password@localhost:5432/loumass_dev
# Vercel: postgresql://user:pass@host.postgres.vercel.app/dbname?sslmode=require
```

#### Authentication Configuration
```env
# NextAuth.js configuration
NEXTAUTH_URL="https://yourdomain.com"  # Production
NEXTAUTH_URL="http://localhost:3000"   # Development

# NextAuth secret (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET="your-super-secret-key-minimum-32-characters"

# Examples:
# Development: http://localhost:3000
# Production: https://loumassbeta.vercel.app
```

#### Application Base URL
```env
# Public base URL for API calls and redirects
NEXT_PUBLIC_BASE_URL="https://yourdomain.com"  # Production
NEXT_PUBLIC_BASE_URL="http://localhost:3000"   # Development
```

### Google Integration Variables

#### OAuth 2.0 Configuration
```env
# Google OAuth client credentials
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-your-client-secret"

# Example values:
# Client ID: 123456789-abcdefghijklmnop.apps.googleusercontent.com
# Client Secret: GOCSPX-AbCdEfGhIjKlMnOpQrStUvWxYz
```

#### Gmail API Configuration
```env
# Gmail API scope and configuration
GMAIL_REDIRECT_URI="https://yourdomain.com/api/auth/callback/google"

# API quotas and limits (optional, for monitoring)
GMAIL_DAILY_QUOTA="1000000000"  # 1 billion quota units per day
GMAIL_RATE_LIMIT="250"          # Requests per user per second
```

---

## 🔧 Environment-Specific Configurations

### Development (.env.local)
```env
# Database - Local PostgreSQL
DATABASE_URL="postgresql://postgres:password@localhost:5432/loumass_dev"
DIRECT_DATABASE_URL="postgresql://postgres:password@localhost:5432/loumass_dev"

# NextAuth - Local development
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="development-secret-key-change-in-production"

# Google OAuth - Development app
GOOGLE_CLIENT_ID="123456789-dev.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-development-client-secret"

# Base URL - Local
NEXT_PUBLIC_BASE_URL="http://localhost:3000"

# Additional development variables
NODE_ENV="development"
NEXT_PUBLIC_ENV="development"
```

### Staging (.env.staging)
```env
# Database - Staging database
DATABASE_URL="postgresql://user:pass@staging-host:5432/loumass_staging"
DIRECT_DATABASE_URL="postgresql://user:pass@staging-host:5432/loumass_staging"

# NextAuth - Staging domain
NEXTAUTH_URL="https://loumass-staging.vercel.app"
NEXTAUTH_SECRET="staging-secret-key-different-from-production"

# Google OAuth - Staging app (can be same as production)
GOOGLE_CLIENT_ID="123456789-prod.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-production-client-secret"

# Base URL - Staging
NEXT_PUBLIC_BASE_URL="https://loumass-staging.vercel.app"

# Environment identifier
NODE_ENV="production"
NEXT_PUBLIC_ENV="staging"
```

### Production (.env.production)
```env
# Database - Vercel Postgres
DATABASE_URL="postgresql://default:abc123@ep-example.us-east-1.postgres.vercel.app/verceldb?sslmode=require"
DIRECT_DATABASE_URL="postgresql://default:abc123@ep-example.us-east-1.postgres.vercel.app/verceldb?sslmode=require"

# NextAuth - Production domain
NEXTAUTH_URL="https://loumassbeta.vercel.app"
NEXTAUTH_SECRET="production-super-secure-secret-key-64-characters-minimum"

# Google OAuth - Production app
GOOGLE_CLIENT_ID="123456789-prod.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-production-client-secret"

# Base URL - Production
NEXT_PUBLIC_BASE_URL="https://loumassbeta.vercel.app"

# Environment identifier
NODE_ENV="production"
NEXT_PUBLIC_ENV="production"
```

---

## 🌐 External Service Configuration

### Google Cloud Console Setup

#### OAuth 2.0 Client Configuration
1. **Project Setup**:
   - Project Name: `LOUMASS Email Marketing`
   - Project ID: `loumass-email-marketing`

2. **OAuth Consent Screen**:
   ```
   Application Name: LOUMASS
   User Support Email: your-email@domain.com
   Application Logo: [Upload logo]
   
   Scopes:
   - email
   - profile
   - https://www.googleapis.com/auth/gmail.send
   - https://www.googleapis.com/auth/gmail.readonly
   - https://www.googleapis.com/auth/gmail.modify
   ```

3. **Authorized Redirect URIs**:
   ```
   Development: http://localhost:3000/api/auth/callback/google
   Staging: https://loumass-staging.vercel.app/api/auth/callback/google
   Production: https://loumassbeta.vercel.app/api/auth/callback/google
   ```

#### Gmail API Quotas
- **Daily Quota**: 1,000,000,000 quota units
- **Per-user Rate Limit**: 250 quota units per user per second
- **Batch Request Limit**: 100 requests per batch

#### API Keys (if needed)
```env
# Google API Key for server-side calls (if required)
GOOGLE_API_KEY="AIzaSyExample1234567890"
```

### Vercel Database Configuration

#### Postgres Database
```env
# Vercel Postgres connection details
POSTGRES_URL="postgres://default:abc@ep-example.us-east-1.postgres.vercel.app:5432/verceldb"
POSTGRES_PRISMA_URL="postgres://default:abc@ep-example.us-east-1.postgres.vercel.app:5432/verceldb?pgbouncer=true&connect_timeout=15"
POSTGRES_URL_NON_POOLING="postgres://default:abc@ep-example.us-east-1.postgres.vercel.app:5432/verceldb"
POSTGRES_USER="default"
POSTGRES_HOST="ep-example-123.us-east-1.postgres.vercel.app"
POSTGRES_PASSWORD="abc123example"
POSTGRES_DATABASE="verceldb"
```

---

## 🔐 Secrets Management

### Local Development
- **File**: `.env.local`
- **Security**: File excluded from Git via `.gitignore`
- **Sharing**: Use 1Password or similar for team sharing

### Vercel Deployment
- **Location**: Vercel Dashboard → Project → Settings → Environment Variables
- **Environment Targeting**: Specify per environment (development, preview, production)
- **Auto-deployment**: Variables sync automatically on deployment

### Security Best Practices

#### Secret Generation
```bash
# Generate secure NextAuth secret
openssl rand -base64 32

# Generate random password
openssl rand -base64 16

# Generate UUID
uuidgen
```

#### Secret Rotation
1. **Monthly**: Rotate NEXTAUTH_SECRET
2. **Quarterly**: Review and rotate Google OAuth secrets
3. **As needed**: Database passwords, API keys

#### Access Control
- **Production secrets**: Access limited to deployment system and senior developers
- **Staging secrets**: Access for QA team and developers
- **Development secrets**: Safe to share with development team

---

## 🛠️ Environment Validation

### Validation Script
Create `/scripts/validate-env.js`:
```javascript
#!/usr/bin/env node

const requiredVars = [
  'DATABASE_URL',
  'NEXTAUTH_URL', 
  'NEXTAUTH_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'NEXT_PUBLIC_BASE_URL'
];

const optionalVars = [
  'DIRECT_DATABASE_URL',
  'GMAIL_REDIRECT_URI',
  'GOOGLE_API_KEY'
];

console.log('🔍 Validating environment variables...\n');

let hasErrors = false;

// Check required variables
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.error(`❌ Missing required variable: ${varName}`);
    hasErrors = true;
  } else {
    console.log(`✅ ${varName}: ${value.substring(0, 20)}...`);
  }
});

// Check optional variables
optionalVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`🟡 ${varName}: ${value.substring(0, 20)}...`);
  } else {
    console.log(`⚪ ${varName}: not set (optional)`);
  }
});

// Validate URL formats
const validateUrl = (varName, url) => {
  if (url && !url.match(/^https?:\/\/.+/)) {
    console.error(`❌ Invalid URL format for ${varName}: ${url}`);
    hasErrors = true;
  }
};

validateUrl('NEXTAUTH_URL', process.env.NEXTAUTH_URL);
validateUrl('NEXT_PUBLIC_BASE_URL', process.env.NEXT_PUBLIC_BASE_URL);

// Validate database connection format
const dbUrl = process.env.DATABASE_URL;
if (dbUrl && !dbUrl.match(/^postgresql:\/\/.+/)) {
  console.error(`❌ Invalid PostgreSQL URL format: ${dbUrl}`);
  hasErrors = true;
}

console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.error('❌ Environment validation failed!');
  process.exit(1);
} else {
  console.log('✅ All environment variables are valid!');
}
```

### Run Validation
```bash
# Add to package.json scripts
"validate-env": "node scripts/validate-env.js"

# Run validation
npm run validate-env
```

---

## 🔄 Environment Migration

### From Development to Staging
1. **Database Migration**:
   ```bash
   # Export development schema
   pg_dump loumass_dev > schema.sql
   
   # Import to staging
   psql -d loumass_staging -f schema.sql
   ```

2. **Environment Variables**:
   - Update domain URLs
   - Use staging database credentials
   - Keep same Google OAuth client (or create staging client)

3. **Verification**:
   ```bash
   # Test staging deployment
   curl https://loumass-staging.vercel.app/api/health
   ```

### From Staging to Production
1. **Database Setup**:
   - Use Vercel Postgres for production
   - Run migrations: `npx prisma db push`

2. **Environment Variables**:
   - Update all domain references
   - Use production database
   - Ensure secure secret generation

3. **DNS Configuration** (if custom domain):
   ```
   CNAME: yourdomain.com → cname.vercel-dns.com
   ```

---

## 🚨 Troubleshooting

### Common Issues

#### "Invalid client" OAuth Error
**Problem**: Google OAuth setup incorrect
**Solution**:
1. Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
2. Check authorized redirect URIs in Google Console
3. Ensure `NEXTAUTH_URL` matches the domain

#### Database Connection Failed
**Problem**: Database URL incorrect or server unreachable
**Solution**:
1. Verify `DATABASE_URL` format
2. Check database server status
3. Test connection: `psql $DATABASE_URL`

#### NextAuth Configuration Error
**Problem**: NextAuth setup issues
**Solution**:
1. Verify `NEXTAUTH_URL` matches current domain
2. Ensure `NEXTAUTH_SECRET` is properly set
3. Check callback URL configuration

### Debug Commands
```bash
# Test database connection
npx prisma db pull

# Validate environment
npm run validate-env

# Check NextAuth configuration
curl http://localhost:3000/api/auth/providers

# Test Google OAuth
curl http://localhost:3000/api/auth/signin/google
```

---

## 📊 Environment Monitoring

### Health Checks
```typescript
// pages/api/health.ts
export default async function handler(req, res) {
  const checks = {
    database: false,
    auth: false,
    google: false
  };

  try {
    // Database check
    await prisma.user.findFirst();
    checks.database = true;

    // Auth check
    if (process.env.NEXTAUTH_SECRET) {
      checks.auth = true;
    }

    // Google OAuth check
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      checks.google = true;
    }

    const allHealthy = Object.values(checks).every(Boolean);
    
    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'healthy' : 'unhealthy',
      checks,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      checks,
      timestamp: new Date().toISOString()
    });
  }
}
```

### Monitoring Alerts
Set up alerts for:
- Environment variable changes
- Database connection failures
- OAuth authentication issues
- API quota exceeded

---

## 📚 Additional Resources

### Documentation Links
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [NextAuth.js Configuration](https://next-auth.js.org/configuration/options)
- [Google OAuth Setup](https://developers.google.com/identity/protocols/oauth2)
- [Prisma Environment Variables](https://www.prisma.io/docs/guides/development-environment/environment-variables)

### Configuration Examples
```bash
# Complete .env.local template
cp .env.example .env.local
# Edit with your values

# Validate configuration
npm run validate-env

# Start development
npm run dev
```

---

**Last Updated**: January 2025  
**Environment Version**: v1.0 - Production ready  
**Next Review**: February 2025