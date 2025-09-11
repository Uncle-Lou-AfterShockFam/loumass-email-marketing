import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    return NextResponse.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      message: 'LOUMASS API is working',
      version: 'v1.10-SIMPLER-FIX',
      deploymentTime: new Date().toISOString(),
      commitId: '3cb245c',
      automationFixStatus: 'SIMPLIFIED_TRACKING_FIX_DEPLOYED',
      fixesIncluded: [
        'currentNodeId setting', 
        'auto-generation', 
        'recovery logic', 
        'direct database repair completed',
        'automatic Gmail token refresh',
        'enhanced error handling',
        'retry logic for expired tokens',
        'SIMPLIFIED tracking prevention using indexOf',
        'Fixed regex splitting issue',
        'Only tracks links BEFORE gmail_quote section'
      ]
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}