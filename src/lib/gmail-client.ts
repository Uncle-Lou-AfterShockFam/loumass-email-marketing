import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import { prisma } from '@/lib/prisma'
import { bulletproofTokenRefresh } from '@/lib/bulletproof-token-refresh'

export class GmailClient {
  private oauth2Client: OAuth2Client
  
  constructor() {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.error('Missing Google OAuth credentials in environment variables')
      throw new Error('Google OAuth credentials not configured')
    }
    
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/auth/gmail/callback`
    )
  }

  getAuthUrl(userId: string) {
    const scopes = [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.compose',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/userinfo.email'
    ]

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: userId,
      prompt: 'consent'
    })
  }

  async getTokensFromCode(code: string) {
    const { tokens } = await this.oauth2Client.getToken(code)
    return tokens
  }

  async saveTokens(userId: string, tokens: any, email: string) {
    // Calculate proper expiry time
    let expiresAt: Date
    if (tokens.expiry_date) {
      // If expiry_date is provided, it's a timestamp in milliseconds
      expiresAt = new Date(tokens.expiry_date)
    } else if (tokens.expires_in) {
      // If expires_in is provided, it's duration in seconds
      expiresAt = new Date(Date.now() + tokens.expires_in * 1000)
    } else {
      // Default to 1 hour from now
      expiresAt = new Date(Date.now() + 3600 * 1000)
    }
    
    return await prisma.gmailToken.upsert({
      where: {
        userId
      },
      update: {
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token!,
        expiresAt,
        scope: tokens.scope!
      },
      create: {
        userId,
        email,
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token!,
        expiresAt,
        scope: tokens.scope!
      }
    })
  }

  async getGmailService(userId: string, email: string): Promise<any> {
    console.log('🔑 Getting Gmail service for user:', userId, 'email:', email)
    
    const gmailToken = await prisma.gmailToken.findUnique({
      where: {
        userId
      }
    })

    if (!gmailToken) {
      console.error('❌ No Gmail token found for user:', userId)
      throw new Error('Gmail account not connected. Please reconnect your Gmail account in Settings.')
    }

    console.log('✅ Gmail token found, expires at:', gmailToken.expiresAt)

    // Check if token needs refresh (refresh 5 minutes early to prevent edge cases)
    const now = new Date()
    const refreshBuffer = new Date(now.getTime() + 5 * 60 * 1000) // 5 minutes buffer
    
    if (gmailToken.expiresAt <= refreshBuffer) {
      console.log('🔄 Token expired or expiring soon, using bulletproof refresh...')
      
      const refreshSuccess = await bulletproofTokenRefresh.refreshUserToken(userId, email)
      
      if (!refreshSuccess) {
        console.error('❌ Bulletproof token refresh failed')
        throw new Error('Gmail token expired and could not be refreshed with bulletproof system. Please reconnect your Gmail account in Settings.')
      }
      
      // Get the updated token after bulletproof refresh
      const refreshedToken = await prisma.gmailToken.findUnique({
        where: { userId }
      })
      
      if (!refreshedToken) {
        throw new Error('Failed to retrieve refreshed token after bulletproof refresh')
      }
      
      console.log('✅ Bulletproof token refresh successful, new expiry:', refreshedToken.expiresAt)
      
      // Set credentials with refreshed token
      this.oauth2Client.setCredentials({
        access_token: refreshedToken.accessToken,
        refresh_token: refreshedToken.refreshToken,
        expiry_date: refreshedToken.expiresAt.getTime()
      })
    } else {
      console.log('✅ Token is valid, setting credentials...')
      this.oauth2Client.setCredentials({
        access_token: gmailToken.accessToken,
        refresh_token: gmailToken.refreshToken,
        expiry_date: gmailToken.expiresAt.getTime()
      })
    }

    console.log('📧 Creating Gmail service instance...')
    const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client })

    console.log('✅ Gmail service created successfully')
    return gmail
  }

  // 🛡️ Token refresh is now handled by BulletproofTokenRefresh class
  // Old refreshToken method removed - bulletproof system handles all refreshing
}