import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const userAgent = request.headers.get('user-agent')
  const cronSecret = process.env.CRON_SECRET
  
  return NextResponse.json({
    authHeader: authHeader || 'Missing',
    userAgent: userAgent || 'Missing', 
    hasCronSecret: !!cronSecret,
    cronSecretLength: cronSecret?.length || 0,
    nodeEnv: process.env.NODE_ENV,
    expectedAuth: cronSecret ? `Bearer ${cronSecret}` : 'CRON_SECRET not set',
    authMatch: authHeader === `Bearer ${cronSecret}`,
    isVercelCron: userAgent?.includes('vercel-cron') || userAgent?.includes('Vercel-Cron')
  })
}