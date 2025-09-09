import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    console.log(`🔌 Disconnecting Gmail for user: ${session.user.id}`)

    // Remove Gmail token from database
    const deletedTokens = await prisma.gmailToken.deleteMany({
      where: {
        userId: session.user.id
      }
    })

    console.log(`🗑️ Deleted ${deletedTokens.count} Gmail tokens`)

    // Get existing user variables to preserve historical data
    const existingUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { variables: true }
    })

    const existingVariables = (existingUser?.variables as Record<string, any>) || {}

    // Update user variables to reflect disconnection
    const disconnectionDate = new Date().toISOString()
    const updatedVariables: Record<string, any> = {
      ...existingVariables,
      // Mark Gmail as disconnected
      gmailConnected: false,
      gmailDisconnectionDate: disconnectionDate,
      lastGmailDisconnectionDate: disconnectionDate,
      
      // Preserve historical data but clear current connection info
      previousGmailEmail: existingVariables.gmailEmail, // Preserve for analytics
      gmailEmail: null, // Clear current email
      
      // Update disconnection tracking
      gmailDisconnectionCount: ((existingVariables.gmailDisconnectionCount as number) || 0) + 1,
      
      // Clear sensitive current connection data
      oauthScopes: null,
      tokenType: null,
      lastTokenRefresh: null
    }

    // Update user with disconnection variables
    await prisma.user.update({
      where: {
        id: session.user.id
      },
      data: {
        variables: updatedVariables
      }
    })

    console.log(`✅ Gmail disconnected and user variables updated for user: ${session.user.id}`)

    return NextResponse.json({
      success: true,
      message: 'Gmail account disconnected successfully',
      timestamp: disconnectionDate
    })
  } catch (error) {
    console.error('Gmail disconnect error:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect Gmail account' },
      { status: 500 }
    )
  }
}