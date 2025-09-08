export async function GET() {
  return Response.json({ 
    message: "🚀 COMPREHENSIVE ENVIRONMENT VARIABLE CHECK",
    timestamp: new Date().toISOString(),
    env: {
      // Authentication
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'MISSING',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'SET' : 'MISSING',
      
      // Google OAuth & Gmail
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID.substring(0, 20) + '...' : 'MISSING',
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'MISSING',
      
      // Database
      DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'MISSING',
      NEON_DATABASE_URL: process.env.NEON_DATABASE_URL ? 'SET' : 'MISSING',
      
      // Cron Jobs
      CRON_SECRET: process.env.CRON_SECRET ? 'SET' : 'MISSING',
      CRON_SECRET_KEY: process.env.CRON_SECRET_KEY ? 'SET (OLD NAME)' : 'NOT SET',
      
      // App URLs
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || 'MISSING',
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'MISSING',
      NEXT_PUBLIC_TRACKING_DOMAIN: process.env.NEXT_PUBLIC_TRACKING_DOMAIN || 'MISSING',
      
      // Node Environment
      NODE_ENV: process.env.NODE_ENV || 'MISSING',
      VERCEL_ENV: process.env.VERCEL_ENV || 'MISSING'
    },
    criticalIssues: []
  })
}