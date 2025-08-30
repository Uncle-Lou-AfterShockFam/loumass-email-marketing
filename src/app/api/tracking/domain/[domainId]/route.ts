import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ domainId: string }> }
) {
  try {
    const { domainId } = await params
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Verify ownership
    const domain = await prisma.trackingDomain.findFirst({
      where: {
        id: domainId,
        userId: session.user.id
      }
    })

    if (!domain) {
      return NextResponse.json(
        { error: 'Domain not found' },
        { status: 404 }
      )
    }

    // Delete the domain
    await prisma.trackingDomain.delete({
      where: { id: domainId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete tracking domain error:', error)
    return NextResponse.json(
      { error: 'Failed to delete tracking domain' },
      { status: 500 }
    )
  }
}