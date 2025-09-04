import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
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

    // Get the segment to check conditions
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

    // Get all contacts in the list
    const contacts = await prisma.contact.findMany({
      where: {
        listId: listId,
        userId: session.user.id
      }
    })

    // Filter contacts based on segment conditions
    let filteredContacts = contacts
    if (segment.conditions && typeof segment.conditions === 'object' && 'rules' in segment.conditions) {
      const conditions = segment.conditions as any
      if (conditions.rules && conditions.rules.length > 0) {
        filteredContacts = contacts.filter(contact => {
          return evaluateConditions(contact, conditions)
        })
      }
    }

    return NextResponse.json(filteredContacts)
  } catch (error) {
    console.error('Error fetching segment contacts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch segment contacts' },
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