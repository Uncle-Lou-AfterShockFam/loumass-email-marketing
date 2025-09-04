import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
    ? results.every((r: boolean) => r) 
    : results.some((r: boolean) => r)
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    
    const list = await prisma.emailList.findFirst({
      where: {
        id: resolvedParams.id,
        userId: session.user.id
      },
      include: {
        contacts: {
          include: {
            contact: true
          }
        },
        segments: true
      }
    })

    if (!list) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 })
    }

    // Calculate segment membership for each contact
    const contactsWithSegments = list.contacts.map(contactEntry => {
      const contact = contactEntry.contact
      const belongsToSegments: string[] = []

      list.segments?.forEach(segment => {
        const conditions = segment.conditions as any
        if (conditions?.rules?.length > 0) {
          const isMatch = evaluateConditions(contact, conditions)
          if (isMatch) {
            belongsToSegments.push(segment.name)
          }
        }
      })

      return {
        ...contactEntry,
        segments: belongsToSegments
      }
    })

    return NextResponse.json({
      ...list,
      contacts: contactsWithSegments
    })
  } catch (error) {
    console.error('Error fetching list:', error)
    return NextResponse.json({ error: 'Failed to fetch list' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name, description, customFields } = body

    const resolvedParams = await params
    
    const list = await prisma.emailList.update({
      where: {
        id: resolvedParams.id,
        userId: session.user.id
      },
      data: {
        name,
        description,
        customFields
      }
    })

    return NextResponse.json(list)
  } catch (error) {
    console.error('Error updating list:', error)
    return NextResponse.json({ error: 'Failed to update list' }, { status: 500 })
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

    const resolvedParams = await params
    
    await prisma.emailList.delete({
      where: {
        id: resolvedParams.id,
        userId: session.user.id
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting list:', error)
    return NextResponse.json({ error: 'Failed to delete list' }, { status: 500 })
  }
}