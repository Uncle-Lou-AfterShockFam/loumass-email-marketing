import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/services/database'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; segmentId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const listId = params.id
    const segmentId = params.segmentId

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
    // const segment = await prisma.segment.findFirst({
    //   where: {
    //     id: segmentId,
    //     listId: listId,
    //     userId: session.user.id
    //   }
    // })

    // if (!segment) {
    //   return NextResponse.json({ error: 'Segment not found' }, { status: 404 })
    // }

    // await prisma.segment.delete({
    //   where: { id: segmentId }
    // })

    // For now, return success response
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting segment:', error)
    return NextResponse.json(
      { error: 'Failed to delete segment' },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; segmentId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const listId = params.id
    const segmentId = params.segmentId
    const { name, description, conditions } = await req.json()

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
    // const segment = await prisma.segment.findFirst({
    //   where: {
    //     id: segmentId,
    //     listId: listId,
    //     userId: session.user.id
    //   }
    // })

    // if (!segment) {
    //   return NextResponse.json({ error: 'Segment not found' }, { status: 404 })
    // }

    // const updatedSegment = await prisma.segment.update({
    //   where: { id: segmentId },
    //   data: {
    //     name: name || segment.name,
    //     description: description !== undefined ? description : segment.description,
    //     conditions: conditions || segment.conditions,
    //     // Recalculate contactCount based on new conditions
    //   }
    // })

    // For now, return mock response
    const mockSegment = {
      id: segmentId,
      name: name || 'Updated Segment',
      description: description || null,
      conditions: conditions || {},
      contactCount: 0,
      createdAt: new Date().toISOString()
    }

    return NextResponse.json(mockSegment)
  } catch (error) {
    console.error('Error updating segment:', error)
    return NextResponse.json(
      { error: 'Failed to update segment' },
      { status: 500 }
    )
  }
}