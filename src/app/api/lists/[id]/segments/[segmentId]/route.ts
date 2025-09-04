import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; segmentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const listId = resolvedParams.id
    const segmentId = resolvedParams.segmentId

    // Verify the segment belongs to the user
    const segment = await prisma.segment.findFirst({
      where: {
        id: segmentId,
        listId: listId,
        userId: session.user.id
      }
    })

    if (!segment) {
      return NextResponse.json({ error: 'Segment not found' }, { status: 404 })
    }

    // Delete the segment
    await prisma.segment.delete({
      where: { id: segmentId }
    })

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
  { params }: { params: Promise<{ id: string; segmentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const listId = resolvedParams.id
    const segmentId = resolvedParams.segmentId
    const { name, description, conditions } = await req.json()

    // Verify the segment belongs to the user
    const segment = await prisma.segment.findFirst({
      where: {
        id: segmentId,
        listId: listId,
        userId: session.user.id
      }
    })

    if (!segment) {
      return NextResponse.json({ error: 'Segment not found' }, { status: 404 })
    }

    // Calculate new contact count if conditions changed
    let contactCount = segment.contactCount
    if (conditions && JSON.stringify(conditions) !== JSON.stringify(segment.conditions)) {
      if (conditions?.rules?.length > 0) {
        // Get all contacts for this list through ContactList relation
        const contactListEntries = await prisma.contactList.findMany({
          where: {
            listId: listId,
            list: {
              userId: session.user.id
            }
          },
          include: {
            contact: true
          }
        })
        
        const contacts = contactListEntries.map(entry => entry.contact)

        contactCount = contacts.filter(contact => {
          return evaluateConditions(contact, conditions)
        }).length
      } else {
        contactCount = 0
      }
    }

    // Update the segment
    const updatedSegment = await prisma.segment.update({
      where: { id: segmentId },
      data: {
        name: name || segment.name,
        description: description !== undefined ? description : segment.description,
        conditions: conditions || segment.conditions,
        contactCount
      }
    })

    return NextResponse.json(updatedSegment)
  } catch (error) {
    console.error('Error updating segment:', error)
    return NextResponse.json(
      { error: 'Failed to update segment' },
      { status: 500 }
    )
  }
}

// Helper function to evaluate segment conditions
function evaluateConditions(contact: any, conditions: any): boolean {
  if (!conditions?.rules || conditions.rules.length === 0) {
    return false
  }

  const results = conditions.rules.map((rule: any) => {
    const contactValue = contact[rule.field]?.toString().toLowerCase() || ''
    const ruleValue = rule.value?.toString().toLowerCase() || ''

    switch (rule.operator) {
      case 'equals':
        return contactValue === ruleValue
      case 'notEquals':
        return contactValue !== ruleValue
      case 'contains':
        return contactValue.includes(ruleValue)
      case 'notContains':
        return !contactValue.includes(ruleValue)
      case 'startsWith':
        return contactValue.startsWith(ruleValue)
      case 'endsWith':
        return contactValue.endsWith(ruleValue)
      case 'greaterThan':
        return parseFloat(contactValue) > parseFloat(ruleValue)
      case 'lessThan':
        return parseFloat(contactValue) < parseFloat(ruleValue)
      case 'isEmpty':
        return !contactValue
      case 'isNotEmpty':
        return !!contactValue
      default:
        return false
    }
  })

  return conditions.match === 'all' 
    ? results.every(r => r) 
    : results.some(r => r)
}