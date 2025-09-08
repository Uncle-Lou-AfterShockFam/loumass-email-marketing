import { prisma } from '@/lib/prisma'
import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'

/**
 * 🛡️ BULLETPROOF GMAIL TOKEN REFRESH SYSTEM
 * 
 * Features:
 * - Retry logic with exponential backoff
 * - Proactive refresh before expiration  
 * - Automatic error recovery
 * - Comprehensive monitoring and logging
 * - Graceful degradation on failures
 */

interface TokenRefreshOptions {
  maxRetries?: number
  baseDelayMs?: number
  proactiveRefreshMinutes?: number
}

export class BulletproofTokenRefresh {
  private oauth2Client: OAuth2Client
  private readonly options: Required<TokenRefreshOptions>

  constructor(options: TokenRefreshOptions = {}) {
    this.options = {
      maxRetries: options.maxRetries ?? 3,
      baseDelayMs: options.baseDelayMs ?? 1000, // Start with 1 second
      proactiveRefreshMinutes: options.proactiveRefreshMinutes ?? 10 // Refresh 10 minutes early
    }

    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/auth/gmail/callback`
    )
  }

  /**
   * Main token refresh method with bulletproof error handling
   */
  async refreshUserToken(userId: string, email: string): Promise<boolean> {
    console.log(`🛡️ [BulletproofRefresh] Starting token refresh for user: ${userId}`)
    
    const startTime = Date.now()
    let attempt = 0
    let lastError: Error | null = null

    while (attempt < this.options.maxRetries) {
      attempt++
      console.log(`🔄 [BulletproofRefresh] Attempt ${attempt}/${this.options.maxRetries}`)

      try {
        const success = await this.attemptTokenRefresh(userId, email)
        
        if (success) {
          const duration = Date.now() - startTime
          console.log(`✅ [BulletproofRefresh] Token refresh succeeded on attempt ${attempt} (${duration}ms)`)
          
          // Log success metrics
          await this.logRefreshMetrics(userId, {
            success: true,
            attempts: attempt,
            duration,
            error: null
          })
          
          return true
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        console.log(`❌ [BulletproofRefresh] Attempt ${attempt} failed:`, lastError.message)

        // Check if error is recoverable
        if (!this.isRecoverableError(lastError)) {
          console.log(`🚫 [BulletproofRefresh] Non-recoverable error, stopping retries`)
          break
        }

        // Wait before retry (exponential backoff)
        if (attempt < this.options.maxRetries) {
          const delayMs = this.options.baseDelayMs * Math.pow(2, attempt - 1)
          console.log(`⏳ [BulletproofRefresh] Waiting ${delayMs}ms before retry...`)
          await this.sleep(delayMs)
        }
      }
    }

    // All retries failed
    const duration = Date.now() - startTime
    console.log(`💥 [BulletproofRefresh] All ${this.options.maxRetries} attempts failed (${duration}ms)`)
    
    // Log failure metrics
    await this.logRefreshMetrics(userId, {
      success: false,
      attempts: this.options.maxRetries,
      duration,
      error: lastError?.message || 'Unknown error'
    })

    // Try recovery strategies
    await this.attemptRecovery(userId, email, lastError)
    
    return false
  }

  /**
   * Single token refresh attempt
   */
  private async attemptTokenRefresh(userId: string, email: string): Promise<boolean> {
    // Get current token from database
    const gmailToken = await prisma.gmailToken.findUnique({
      where: { userId },
      select: {
        id: true,
        refreshToken: true,
        accessToken: true,
        expiresAt: true,
        email: true
      }
    })

    if (!gmailToken) {
      throw new Error('Gmail token not found in database')
    }

    if (!gmailToken.refreshToken) {
      throw new Error('No refresh token available - user needs to re-authorize')
    }

    // Set credentials for refresh
    this.oauth2Client.setCredentials({
      refresh_token: gmailToken.refreshToken
    })

    // Call Google OAuth to refresh access token
    const { credentials } = await this.oauth2Client.refreshAccessToken()
    
    if (!credentials.access_token) {
      throw new Error('No access token returned from Google OAuth')
    }

    // Calculate proper expiry time
    let expiresAt: Date
    if (credentials.expiry_date) {
      expiresAt = new Date(credentials.expiry_date)
    } else {
      // Default to 1 hour (standard OAuth2 access token lifetime)
      expiresAt = new Date(Date.now() + 3600 * 1000)
    }

    // Update database with new token
    await prisma.gmailToken.update({
      where: { id: gmailToken.id },
      data: {
        accessToken: credentials.access_token,
        expiresAt,
        // Update refresh token if Google provided a new one
        ...(credentials.refresh_token && { refreshToken: credentials.refresh_token }),
        // Update user variables
        lastRefreshAt: new Date(),
        refreshCount: { increment: 1 }
      }
    })

    // Update user variables to track successful refresh
    await this.updateUserVariables(userId, {
      lastSuccessfulTokenRefresh: new Date().toISOString(),
      tokenRefreshSuccessCount: { increment: 1 },
      lastRefreshError: null // Clear any previous error
    })

    console.log(`✅ [BulletproofRefresh] Token refreshed successfully, expires: ${expiresAt.toISOString()}`)
    return true
  }

  /**
   * Check if user needs proactive token refresh
   */
  async needsProactiveRefresh(userId: string): Promise<boolean> {
    const gmailToken = await prisma.gmailToken.findUnique({
      where: { userId },
      select: { expiresAt: true }
    })

    if (!gmailToken) {
      return false
    }

    const now = new Date()
    const refreshThreshold = new Date(now.getTime() + this.options.proactiveRefreshMinutes * 60 * 1000)
    
    return gmailToken.expiresAt <= refreshThreshold
  }

  /**
   * Proactively refresh tokens that are close to expiring
   */
  async proactiveRefreshAll(): Promise<void> {
    console.log(`🔄 [BulletproofRefresh] Starting proactive refresh check...`)
    
    const now = new Date()
    const refreshThreshold = new Date(now.getTime() + this.options.proactiveRefreshMinutes * 60 * 1000)

    // Find tokens expiring soon
    const tokensToRefresh = await prisma.gmailToken.findMany({
      where: {
        expiresAt: {
          lte: refreshThreshold
        }
      },
      include: {
        user: {
          select: { id: true, email: true }
        }
      }
    })

    console.log(`🔄 [BulletproofRefresh] Found ${tokensToRefresh.length} tokens needing proactive refresh`)

    // Refresh each token
    const results = await Promise.allSettled(
      tokensToRefresh.map(async (token) => {
        const success = await this.refreshUserToken(token.user.id, token.user.email)
        return { userId: token.user.id, success }
      })
    )

    // Log results
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length
    const failed = results.length - successful
    
    console.log(`✅ [BulletproofRefresh] Proactive refresh completed: ${successful} successful, ${failed} failed`)
  }

  /**
   * Check if an error is recoverable (worth retrying)
   */
  private isRecoverableError(error: Error): boolean {
    const message = error.message.toLowerCase()
    
    // Non-recoverable errors (don't retry)
    if (message.includes('invalid_grant')) return false
    if (message.includes('unauthorized')) return false
    if (message.includes('refresh token is invalid')) return false
    if (message.includes('user needs to re-authorize')) return false
    
    // Recoverable errors (network, temporary issues)
    if (message.includes('network')) return true
    if (message.includes('timeout')) return true
    if (message.includes('rate limit')) return true
    if (message.includes('service unavailable')) return true
    if (message.includes('internal server error')) return true
    
    // Default to recoverable for unknown errors
    return true
  }

  /**
   * Attempt recovery strategies when refresh fails
   */
  private async attemptRecovery(userId: string, email: string, lastError: Error | null): Promise<void> {
    console.log(`🚑 [BulletproofRefresh] Attempting recovery for user: ${userId}`)
    
    try {
      // Update user variables with error information
      await this.updateUserVariables(userId, {
        lastRefreshError: lastError?.message || 'Unknown error',
        lastRefreshErrorDate: new Date().toISOString(),
        tokenRefreshFailureCount: { increment: 1 },
        requiresReauthorization: true // Flag that user needs to re-connect
      })

      // Log recovery attempt
      console.log(`📝 [BulletproofRefresh] Updated user variables with error info`)
      
      // In the future, could implement:
      // - Send notification email to user
      // - Automatically create support ticket
      // - Attempt alternative refresh methods
      
    } catch (recoveryError) {
      console.error(`💥 [BulletproofRefresh] Recovery attempt failed:`, recoveryError)
    }
  }

  /**
   * Log refresh metrics for monitoring
   */
  private async logRefreshMetrics(userId: string, metrics: {
    success: boolean
    attempts: number
    duration: number
    error: string | null
  }): Promise<void> {
    try {
      // In a production system, you'd send this to a monitoring service
      // For now, we'll just log and store in database
      
      console.log(`📊 [BulletproofRefresh] Metrics for ${userId}:`, {
        success: metrics.success,
        attempts: metrics.attempts,
        durationMs: metrics.duration,
        error: metrics.error
      })

      // Could store in a TokenRefreshLog table for analytics
      // await prisma.tokenRefreshLog.create({
      //   data: {
      //     userId,
      //     success: metrics.success,
      //     attempts: metrics.attempts,
      //     durationMs: metrics.duration,
      //     error: metrics.error,
      //     timestamp: new Date()
      //   }
      // })
      
    } catch (error) {
      console.error(`💥 [BulletproofRefresh] Failed to log metrics:`, error)
    }
  }

  /**
   * Update user variables with refresh information
   */
  private async updateUserVariables(userId: string, variables: Record<string, any>): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { variables: true }
      })

      const existingVariables = user?.variables || {}
      
      // Handle increment operations
      const updatedVariables = { ...existingVariables }
      for (const [key, value] of Object.entries(variables)) {
        if (typeof value === 'object' && value?.increment) {
          updatedVariables[key] = ((existingVariables[key] as number) || 0) + value.increment
        } else {
          updatedVariables[key] = value
        }
      }

      await prisma.user.update({
        where: { id: userId },
        data: { variables: updatedVariables }
      })
    } catch (error) {
      console.error(`💥 [BulletproofRefresh] Failed to update user variables:`, error)
    }
  }

  /**
   * Utility function to sleep for a given number of milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Export singleton instance
export const bulletproofTokenRefresh = new BulletproofTokenRefresh({
  maxRetries: 3,
  baseDelayMs: 1000,
  proactiveRefreshMinutes: 10
})