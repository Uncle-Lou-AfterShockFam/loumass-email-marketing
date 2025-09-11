import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sequenceProcessor } from '@/services/sequenceProcessor'

// This cron job runs every minute to process sequence delays and conditions
export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron job request (from Vercel or local testing)
    const authHeader = request.headers.get('authorization')
    const userAgent = request.headers.get('user-agent')
    
    console.log(`=== CRON JOB AUTH CHECK ===`)
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

    console.log('[Cron] Starting sequence processing with thread history...')
    const startTime = Date.now()

    // Process active sequence enrollments using sequenceProcessor WITH thread history
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
    console.error('Sequence processor cron job error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}