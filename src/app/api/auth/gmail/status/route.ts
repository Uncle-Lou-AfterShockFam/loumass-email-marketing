import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Get user OAuth configuration and Gmail connection status
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        oauthConfigured: true,
        gmailToken: {
          select: {
            id: true,
            email: true,
            createdAt: true,
            expiresAt: true,
            scope: true
          }
        }
      }
    })

    if (!user?.gmailToken) {
      return NextResponse.json({
        connected: false,
        oauthConfigured: user?.oauthConfigured || false
      })
    }

    // Check if token is still valid (not expired)
    const isTokenValid = user.gmailToken.expiresAt > new Date()

    return NextResponse.json({
      connected: true,
      email: user.gmailToken.email,
      connectedAt: user.gmailToken.createdAt.toISOString(),
      tokenExpiry: user.gmailToken.expiresAt.toISOString(),
      scope: user.gmailToken.scope,
      isTokenValid,
      oauthConfigured: user.oauthConfigured || false
    })
  } catch (error) {
    console.error('Gmail status check error:', error)
    return NextResponse.json(
      { error: 'Failed to check Gmail status' },
      { status: 500 }
    )
  }
}