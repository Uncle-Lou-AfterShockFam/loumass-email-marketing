import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { contactIds, customData = {} } = body

    if (!contactIds || !Array.isArray(contactIds)) {
      return NextResponse.json({ error: 'Contact IDs required' }, { status: 400 })
    }

    const resolvedParams = await params
    
    // Verify list ownership
    const list = await prisma.emailList.findFirst({
      where: {
        id: resolvedParams.id,
        userId: session.user.id
      }
    })

    if (!list) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 })
    }

    // Add contacts to list
    const contactListEntries = contactIds.map(contactId => ({
      contactId,
      listId: resolvedParams.id,
      customData,
      status: 'active'
    }))

    await prisma.contactList.createMany({
      data: contactListEntries,
      skipDuplicates: true
    })

    // Update subscriber count
    const count = await prisma.contactList.count({
      where: {
        listId: resolvedParams.id,
        status: 'active'
      }
    })

    await prisma.emailList.update({
      where: { id: resolvedParams.id },
      data: { 
        subscriberCount: count,
        activeCount: count
      }
    })

    return NextResponse.json({ success: true, count })
  } catch (error) {
    console.error('Error adding contacts to list:', error)
    return NextResponse.json({ error: 'Failed to add contacts' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { contactIds } = body

    if (!contactIds || !Array.isArray(contactIds)) {
      return NextResponse.json({ error: 'Contact IDs required' }, { status: 400 })
    }

    const resolvedParams = await params
    
    // Remove contacts from list
    await prisma.contactList.deleteMany({
      where: {
        listId: resolvedParams.id,
        contactId: { in: contactIds }
      }
    })

    // Update subscriber count
    const count = await prisma.contactList.count({
      where: {
        listId: resolvedParams.id,
        status: 'active'
      }
    })

    await prisma.emailList.update({
      where: { id: resolvedParams.id },
      data: { 
        subscriberCount: count,
        activeCount: count
      }
    })

    return NextResponse.json({ success: true, count })
  } catch (error) {
    console.error('Error removing contacts from list:', error)
    return NextResponse.json({ error: 'Failed to remove contacts' }, { status: 500 })
  }
}