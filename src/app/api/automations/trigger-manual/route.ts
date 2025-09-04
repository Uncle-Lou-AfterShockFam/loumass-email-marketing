import { NextRequest, NextResponse } from 'next/server'
import { AutomationExecutor } from '@/services/automation-executor'

export async function POST(req: NextRequest) {
  try {
    console.log('Manual automation trigger endpoint called...')
    
    const executor = new AutomationExecutor()
    await executor.executeAutomations()

    return NextResponse.json({ 
      success: true, 
      timestamp: new Date().toISOString(),
      message: 'Manual automation execution completed successfully'
    })

  } catch (error) {
    console.error('Error in manual automation trigger:', error)
    
    return NextResponse.json({ 
      error: 'Execution failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}