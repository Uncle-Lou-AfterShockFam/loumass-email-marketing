import { NextRequest, NextResponse } from 'next/server'
import { AutomationExecutor } from '@/services/automation-executor'

export async function POST(req: NextRequest) {
  try {
    // Verify cron job authorization
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (!cronSecret) {
      console.error('CRON_SECRET not configured')
      return NextResponse.json({ error: 'Cron secret not configured' }, { status: 500 })
    }

    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      console.warn('Unauthorized cron job execution attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Starting automated execution cycle...')
    
    const executor = new AutomationExecutor()
    await executor.executeAutomations()

    return NextResponse.json({ 
      success: true, 
      timestamp: new Date().toISOString(),
      message: 'Automation execution cycle completed',
      deployment: 'v1.7-AUTOMATION-EXECUTION-FIXED-DEPLOYED',
      fixesApplied: ['currentNodeId enrollment fix', 'recovery logic', 'direct database repair']
    })

  } catch (error) {
    console.error('Error in automated execution:', error)
    
    return NextResponse.json({ 
      error: 'Execution failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// For manual testing - remove in production or add proper auth
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  try {
    console.log('Manual execution cycle triggered...')
    
    const executor = new AutomationExecutor()
    await executor.executeAutomations()

    return NextResponse.json({ 
      success: true, 
      timestamp: new Date().toISOString(),
      message: 'Manual automation execution completed'
    })

  } catch (error) {
    console.error('Error in manual execution:', error)
    
    return NextResponse.json({ 
      error: 'Execution failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}