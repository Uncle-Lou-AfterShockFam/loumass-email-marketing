import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import { prisma } from '@/lib/prisma'

export class GmailClient {
  private oauth2Client: OAuth2Client
  
  constructor() {
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
    const expiresAt = new Date(Date.now() + (tokens.expiry_date || tokens.expires_in * 1000))
    
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
    const gmailToken = await prisma.gmailToken.findUnique({
      where: {
        userId
      }
    })

    if (!gmailToken) {
      throw new Error('No Gmail token found')
    }

    // Check if token needs refresh
    const now = new Date()
    if (gmailToken.expiresAt <= now) {
      await this.refreshToken(userId, email)
      return this.getGmailService(userId, email)
    }

    this.oauth2Client.setCredentials({
      access_token: gmailToken.accessToken,
      refresh_token: gmailToken.refreshToken,
      expiry_date: gmailToken.expiresAt.getTime()
    })

    const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client })

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
    
    await prisma.gmailToken.update({
      where: { id: gmailToken.id },
      data: {
        accessToken: credentials.access_token!,
        expiresAt: new Date(credentials.expiry_date!)
      }
    })
  }
}