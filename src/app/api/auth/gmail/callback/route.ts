import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { GmailClient } from '@/lib/gmail-client'
import { prisma } from '@/lib/prisma'

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
      console.error(`🚫 Gmail OAuth error: ${error}`)
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
    
    // Get user profile and Gmail info from Google APIs
    const { google } = await import('googleapis')
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/auth/gmail/callback`
    )
    
    oauth2Client.setCredentials(tokens)
    
    // Get Gmail profile
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
    const profile = await gmail.users.getProfile({ userId: 'me' })
    
    // Get Google+ profile for additional user information
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
    const userInfo = await oauth2.userinfo.get()
    
    console.log(`🔑 Gmail OAuth successful for user: ${session.user.id}, email: ${profile.data.emailAddress}`)
    
    // Save Gmail tokens
    await gmailClient.saveTokens(
      session.user.id,
      tokens,
      profile.data.emailAddress!
    )

    // 🚀 SAVE USER VARIABLES during OAuth authorization
    const connectionDate = new Date().toISOString()
    const userVariables = {
      // Gmail connection info
      gmailConnected: true,
      gmailEmail: profile.data.emailAddress,
      gmailConnectionDate: connectionDate,
      
      // Google profile information
      googleId: userInfo.data.id,
      googleName: userInfo.data.name,
      googleGivenName: userInfo.data.given_name,
      googleFamilyName: userInfo.data.family_name,
      googlePicture: userInfo.data.picture,
      googleVerifiedEmail: userInfo.data.verified_email,
      googleLocale: userInfo.data.locale,
      
      // OAuth token metadata
      oauthScopes: tokens.scope,
      tokenType: tokens.token_type,
      lastTokenRefresh: connectionDate,
      
      // System tracking
      lastGmailAuthorizationDate: connectionDate,
      gmailAuthorizationCount: 1, // Will be incremented on re-authorization
      userAgent: request.headers.get('user-agent'),
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      
      // Platform info
      platform: 'loumass_beta',
      oauthVersion: '2.0',
      apiVersion: 'gmail_v1'
    }

    // Get existing user variables and merge with new ones
    const existingUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { variables: true }
    })

    const existingVariables = (existingUser?.variables as Record<string, any>) || {}
    
    // Increment authorization count if user has connected before
    if (existingVariables.gmailAuthorizationCount && typeof existingVariables.gmailAuthorizationCount === 'number') {
      userVariables.gmailAuthorizationCount = existingVariables.gmailAuthorizationCount + 1
    }

    // Update user with new variables
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        variables: {
          ...existingVariables,
          ...userVariables
        }
      }
    })

    console.log(`✅ User variables saved successfully for user: ${session.user.id}`)
    console.log(`📊 Variables saved:`, Object.keys(userVariables).join(', '))

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