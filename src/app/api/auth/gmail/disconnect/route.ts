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

    // Delete Gmail token
    await prisma.gmailToken.delete({
      where: { userId: session.user.id }
    }).catch(() => {
      // Ignore error if token doesn't exist
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Gmail disconnect error:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect Gmail' },
      { status: 500 }
    )
  }
}