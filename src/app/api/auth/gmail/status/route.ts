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

    // Get Gmail connection status from database
    const gmailToken = await prisma.gmailToken.findUnique({
      where: {
        userId: session.user.id
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
        expiresAt: true,
        scope: true
      }
    })

    if (!gmailToken) {
      return NextResponse.json({
        connected: false
      })
    }

    // Check if token is still valid (not expired)
    const isTokenValid = gmailToken.expiresAt > new Date()

    return NextResponse.json({
      connected: true,
      email: gmailToken.email,
      connectedAt: gmailToken.createdAt.toISOString(),
      tokenExpiry: gmailToken.expiresAt.toISOString(),
      scope: gmailToken.scope,
      isTokenValid
    })
  } catch (error) {
    console.error('Gmail status check error:', error)
    return NextResponse.json(
      { error: 'Failed to check Gmail status' },
      { status: 500 }
    )
  }
}