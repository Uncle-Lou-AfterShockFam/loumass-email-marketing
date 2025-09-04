import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const listId = params.id

    // Verify the list belongs to the user
    const list = await prisma.emailList.findFirst({
      where: {
        id: listId,
        userId: session.user.id
      }
    })

    if (!list) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 })
    }

    // For now, return empty array since Segment model isn't fully implemented
    // TODO: Once Segment model is added to schema, implement:
    // const segments = await prisma.segment.findMany({
    //   where: {
    //     listId: listId,
    //     userId: session.user.id
    //   },
    //   select: {
    //     id: true,
    //     name: true,
    //     description: true,
    //     conditions: true,
    //     contactCount: true,
    //     createdAt: true
    //   }
    // })

    const segments: any[] = []

    return NextResponse.json(segments)
  } catch (error) {
    console.error('Error fetching segments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch segments' },
      { status: 500 }
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const listId = params.id
    const { name, description, conditions } = await req.json()

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Verify the list belongs to the user
    const list = await prisma.emailList.findFirst({
      where: {
        id: listId,
        userId: session.user.id
      }
    })

    if (!list) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 })
    }

    // TODO: Once Segment model is added to schema, implement:
    // const segment = await prisma.segment.create({
    //   data: {
    //     name,
    //     description,
    //     conditions: conditions || {},
    //     contactCount: 0, // Calculate based on conditions
    //     listId,
    //     userId: session.user.id
    //   }
    // })

    // For now, return a mock response
    const mockSegment = {
      id: 'mock-segment-id',
      name,
      description,
      conditions: conditions || {},
      contactCount: 0,
      createdAt: new Date().toISOString()
    }

    return NextResponse.json(mockSegment, { status: 201 })
  } catch (error) {
    console.error('Error creating segment:', error)
    return NextResponse.json(
      { error: 'Failed to create segment' },
      { status: 500 }
    )
  }
}