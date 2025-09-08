import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    return NextResponse.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      message: 'LOUMASS API is working',
      version: 'v1.7-AUTOMATION-EXECUTION-FIXED-DEPLOYED',
      deploymentTime: new Date().toISOString(),
      commitId: '3808ac4',
      automationFixStatus: 'DEPLOYED_AND_READY',
      fixesIncluded: ['currentNodeId setting', 'auto-generation', 'recovery logic', 'direct database repair completed']
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}