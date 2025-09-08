import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import { prisma } from '@/lib/prisma'

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
      console.log('🔄 Token expired or expiring soon, refreshing...')
      try {
        await this.refreshToken(userId, email)
        // Get the updated token after refresh
        const refreshedToken = await prisma.gmailToken.findUnique({
          where: { userId }
        })
        
        if (!refreshedToken) {
          throw new Error('Failed to retrieve refreshed token')
        }
        
        console.log('✅ Token refreshed successfully, new expiry:', refreshedToken.expiresAt)
        
        // Set credentials with refreshed token
        this.oauth2Client.setCredentials({
          access_token: refreshedToken.accessToken,
          refresh_token: refreshedToken.refreshToken,
          expiry_date: refreshedToken.expiresAt.getTime()
        })
        
      } catch (refreshError) {
        console.error('❌ Failed to refresh Gmail token:', refreshError)
        throw new Error('Gmail token expired and could not be refreshed. Please reconnect your Gmail account in Settings.')
      }
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

  private async refreshToken(userId: string, email: string) {
    console.log('🔄 Refreshing Gmail token for user:', userId)
    
    const gmailToken = await prisma.gmailToken.findUnique({
      where: {
        userId
      }
    })

    if (!gmailToken) {
      console.error('❌ No Gmail token found during refresh for user:', userId)
      throw new Error('Gmail token not found')
    }

    if (!gmailToken.refreshToken) {
      console.error('❌ No refresh token available for user:', userId)
      throw new Error('No refresh token available. Please reconnect your Gmail account.')
    }

    try {
      console.log('🔑 Setting refresh token credentials...')
      this.oauth2Client.setCredentials({
        refresh_token: gmailToken.refreshToken
      })

      console.log('🌐 Calling Google OAuth to refresh access token...')
      const { credentials } = await this.oauth2Client.refreshAccessToken()
      
      if (!credentials.access_token) {
        throw new Error('No access token returned from refresh')
      }
      
      // Calculate proper expiry time for refreshed token
      let expiresAt: Date
      if (credentials.expiry_date) {
        expiresAt = new Date(credentials.expiry_date)
        console.log('✅ Got expiry from Google:', expiresAt)
      } else {
        // Default to 1 hour from now (OAuth2 access tokens typically expire in 1 hour)
        expiresAt = new Date(Date.now() + 3600 * 1000)
        console.log('⚠️ No expiry from Google, defaulting to 1 hour:', expiresAt)
      }
      
      console.log('💾 Updating database with new token...')
      await prisma.gmailToken.update({
        where: { id: gmailToken.id },
        data: {
          accessToken: credentials.access_token,
          expiresAt,
          // Update refresh token if Google provided a new one
          ...(credentials.refresh_token && { refreshToken: credentials.refresh_token })
        }
      })
      
      console.log('✅ Gmail token refreshed successfully! New expiry:', expiresAt)
      
    } catch (error) {
      console.error('❌ Failed to refresh Gmail token:', error)
      
      // Check if it's a Google OAuth error
      if (error instanceof Error) {
        if (error.message.includes('invalid_grant')) {
          throw new Error('Gmail refresh token is invalid or expired. Please reconnect your Gmail account in Settings.')
        } else if (error.message.includes('unauthorized')) {
          throw new Error('Gmail access has been revoked. Please reconnect your Gmail account in Settings.')
        }
      }
      
      // Generic error for other cases
      throw new Error('Failed to refresh Gmail token. Please try again or reconnect your Gmail account in Settings.')
    }
  }
}