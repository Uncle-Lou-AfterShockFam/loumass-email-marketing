import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { GmailClient } from '@/lib/gmail-client'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.redirect(new URL('/auth/signin', request.url))
    }

    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(
        new URL(`/dashboard/settings?error=${error}`, request.url)
      )
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=no_code', request.url)
      )
    }

    // State should be the user ID
    if (state !== session.user.id) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=invalid_state', request.url)
      )
    }

    const gmailClient = new GmailClient()
    
    // Exchange code for tokens
    const tokens = await gmailClient.getTokensFromCode(code)
    
    // Get user email from Gmail API
    const { google } = await import('googleapis')
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/auth/gmail/callback`
    )
    
    oauth2Client.setCredentials(tokens)
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
    const profile = await gmail.users.getProfile({ userId: 'me' })
    
    // Save tokens
    await gmailClient.saveTokens(
      session.user.id,
      tokens,
      profile.data.emailAddress!
    )

    return NextResponse.redirect(
      new URL('/dashboard/settings?success=gmail_connected', request.url)
    )
  } catch (error) {
    console.error('Gmail OAuth callback error:', error)
    return NextResponse.redirect(
      new URL('/dashboard/settings?error=oauth_failed', request.url)
    )
  }
}