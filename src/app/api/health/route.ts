import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    return NextResponse.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      message: 'LOUMASS API is working',
      version: 'v1.9-TRACKING-FIX',
      deploymentTime: new Date().toISOString(),
      commitId: '8c1f52d',
      automationFixStatus: 'TRACKING_IN_QUOTES_FIXED',
      fixesIncluded: [
        'currentNodeId setting', 
        'auto-generation', 
        'recovery logic', 
        'direct database repair completed',
        'automatic Gmail token refresh',
        'enhanced error handling',
        'retry logic for expired tokens',
        'NO tracking in quoted email sections',
        'Prevent nested tracking URLs'
      ]
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}