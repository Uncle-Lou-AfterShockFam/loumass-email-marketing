import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    return NextResponse.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      message: 'LOUMASS API is working',
      version: 'v1.8-AUTO-REFRESH-GMAIL-TOKENS',
      deploymentTime: new Date().toISOString(),
      commitId: '69c51f4',
      automationFixStatus: 'DEPLOYED_WITH_AUTO_TOKEN_REFRESH',
      fixesIncluded: [
        'currentNodeId setting', 
        'auto-generation', 
        'recovery logic', 
        'direct database repair completed',
        'automatic Gmail token refresh',
        'enhanced error handling',
        'retry logic for expired tokens'
      ]
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}