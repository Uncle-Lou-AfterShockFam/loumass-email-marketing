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
    console.log('Getting Gmail service for user:', userId, 'email:', email)
    
    const gmailToken = await prisma.gmailToken.findUnique({
      where: {
        userId
      }
    })

    if (!gmailToken) {
      console.error('No Gmail token found for user:', userId)
      throw new Error('No Gmail token found')
    }

    console.log('Gmail token found, expires at:', gmailToken.expiresAt)

    // Check if token needs refresh
    const now = new Date()
    if (gmailToken.expiresAt <= now) {
      console.log('Token expired, refreshing...')
      await this.refreshToken(userId, email)
      return this.getGmailService(userId, email)
    }

    console.log('Setting OAuth2 credentials...')
    this.oauth2Client.setCredentials({
      access_token: gmailToken.accessToken,
      refresh_token: gmailToken.refreshToken,
      expiry_date: gmailToken.expiresAt.getTime()
    })

    console.log('Creating Gmail service instance...')
    const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client })

    console.log('Gmail service created successfully')
    return gmail
  }

  private async refreshToken(userId: string, email: string) {
    const gmailToken = await prisma.gmailToken.findUnique({
      where: {
        userId
      }
    })

    if (!gmailToken || !gmailToken.refreshToken) {
      throw new Error('No refresh token available')
    }

    this.oauth2Client.setCredentials({
      refresh_token: gmailToken.refreshToken
    })

    const { credentials } = await this.oauth2Client.refreshAccessToken()
    
    // Calculate proper expiry time for refreshed token
    let expiresAt: Date
    if (credentials.expiry_date) {
      expiresAt = new Date(credentials.expiry_date)
    } else {
      // Default to 1 hour from now (OAuth2 access tokens typically expire in 1 hour)
      expiresAt = new Date(Date.now() + 3600 * 1000)
    }
    
    await prisma.gmailToken.update({
      where: { id: gmailToken.id },
      data: {
        accessToken: credentials.access_token!,
        expiresAt
      }
    })
  }
}