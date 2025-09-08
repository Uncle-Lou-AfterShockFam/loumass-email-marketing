import { NextRequest } from 'next/server'
import { bulletproofTokenRefresh } from '@/lib/bulletproof-token-refresh'

/**
 * 🛡️ PROACTIVE TOKEN REFRESH CRON JOB
 * 
 * Runs every 30 minutes to proactively refresh Gmail tokens
 * that are close to expiring (within 10 minutes by default)
 * 
 * This ensures users never experience token failures
 */

export async function POST(request: NextRequest) {
  console.log('🛡️ [TokenRefreshCron] Starting proactive token refresh job...')
  
  try {
    // Verify cron secret
    const cronSecret = request.headers.get('Authorization')?.replace('Bearer ', '')
    
    if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
      console.log('❌ [TokenRefreshCron] Unauthorized: Invalid or missing cron secret')
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    console.log('✅ [TokenRefreshCron] Cron secret verified')
    
    // Run proactive refresh for all tokens needing refresh
    await bulletproofTokenRefresh.proactiveRefreshAll()
    
    console.log('✅ [TokenRefreshCron] Proactive token refresh job completed successfully')
    
    return Response.json({
      success: true,
      message: 'Proactive token refresh completed',
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('💥 [TokenRefreshCron] Proactive token refresh job failed:', error)
    
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}