import { NextRequest, NextResponse } from 'next/server'
import { sequenceProcessor } from '@/services/sequenceProcessor'

export const maxDuration = 60 // Maximum function duration: 60 seconds

export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron job request (from Vercel or local testing)
    const authHeader = request.headers.get('authorization')
    const userAgent = request.headers.get('user-agent')
    
    console.log(`=== SEQUENCES CRON JOB AUTH CHECK ===`)
    console.log(`Auth Header: ${authHeader || 'Missing'}`)
    console.log(`User Agent: ${userAgent || 'Missing'}`)
    console.log(`Expected: Bearer ${process.env.CRON_SECRET}`)
    console.log(`NODE_ENV: ${process.env.NODE_ENV}`)
    
    // In production, check if it's from Vercel cron or has correct auth
    if (process.env.NODE_ENV === 'production') {
      const isVercelCron = userAgent?.includes('vercel-cron') || userAgent?.includes('Vercel-Cron')
      const hasValidAuth = authHeader === `Bearer ${process.env.CRON_SECRET}`
      
      if (!isVercelCron && !hasValidAuth) {
        console.error('Unauthorized cron job request - Not from Vercel cron and invalid auth')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      
      console.log(`✅ Authorized: Vercel Cron: ${isVercelCron}, Valid Auth: ${hasValidAuth}`)
    }

    console.log('[Cron] Starting sequence processing...')
    const startTime = Date.now()

    // Process active sequence enrollments
    const result = await sequenceProcessor.processActiveEnrollments()

    const duration = Date.now() - startTime
    console.log(`[Cron] Sequence processing completed in ${duration}ms`)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration,
      result
    })
  } catch (error) {
    console.error('[Cron] Error in sequence cron job:', error)
    
    // Return success even on error to prevent Vercel from retrying
    // Log the error for monitoring
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    })
  }
}

// Manual trigger endpoint for testing
export async function POST(request: NextRequest) {
  try {
    console.log('[Cron] Manual trigger of sequence processing...')
    
    // Process active sequence enrollments
    const result = await sequenceProcessor.processActiveEnrollments()

    return NextResponse.json({
      success: true,
      message: 'Sequence processing triggered manually',
      result
    })
  } catch (error) {
    console.error('[Cron] Error in manual sequence trigger:', error)
    return NextResponse.json({
      error: 'Failed to process sequences',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}