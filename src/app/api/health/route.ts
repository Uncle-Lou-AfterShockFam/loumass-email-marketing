import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    return NextResponse.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      message: 'LOUMASS API is working',
      version: 'v1.6-CRITICAL-AUTOMATION-EXECUTION-FIXES',
      deploymentTime: new Date().toISOString(),
      fixesIncluded: ['currentNodeId setting', 'auto-generation', 'recovery logic']
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}