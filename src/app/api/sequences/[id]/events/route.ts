import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify user owns this sequence
    const sequence = await prisma.sequence.findUnique({
      where: {
        id: id,
        userId: session.user.id
      }
    })

    if (!sequence) {
      return NextResponse.json({ error: 'Sequence not found' }, { status: 404 })
    }

    // Get all sequence events for this sequence
    const events = await prisma.sequenceEvent.findMany({
      where: {
        enrollment: {
          sequenceId: id
        }
      },
      include: {
        enrollment: {
          include: {
            contact: {
              select: {
                email: true,
                firstName: true,
                lastName: true
              }
            },
            sequence: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ events })

  } catch (error) {
    console.error('Failed to fetch sequence events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sequence events' },
      { status: 500 }
    )
  }
}