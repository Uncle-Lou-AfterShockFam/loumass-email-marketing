import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const contactId = searchParams.get('contactId')
    const campaignId = searchParams.get('campaignId')
    const sequenceId = searchParams.get('sequenceId')
    const interactionType = searchParams.get('interactionType')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const search = searchParams.get('search')

    // Build where clause for filtering
    const where: any = {
      userId: user.id
    }

    if (contactId) {
      where.contactId = contactId
    }

    if (campaignId) {
      where.campaignId = campaignId
    }

    if (sequenceId) {
      where.sequenceId = sequenceId
    }

    if (interactionType && interactionType !== 'all') {
      where.type = interactionType.toUpperCase()
    }

    if (dateFrom || dateTo) {
      where.timestamp = {}
      if (dateFrom) {
        where.timestamp.gte = new Date(dateFrom)
      }
      if (dateTo) {
        const endDate = new Date(dateTo)
        endDate.setHours(23, 59, 59, 999)
        where.timestamp.lte = endDate
      }
    }

    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { details: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Fetch all email events for export
    const emailEvents = await prisma.emailEvent.findMany({
      where,
      include: {
        contact: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        },
        campaign: {
          select: {
            id: true,
            name: true
          }
        },
        sequence: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      }
    })

    // Create CSV content
    const csvHeaders = [
      'Date',
      'Time',
      'Type',
      'Contact Name',
      'Contact Email',
      'Campaign',
      'Sequence',
      'Subject',
      'Details'
    ]

    const csvRows = emailEvents.map(event => {
      const date = new Date(event.timestamp)
      const contactName = event.contact?.firstName && event.contact?.lastName 
        ? `${event.contact.firstName} ${event.contact.lastName}`
        : event.contact?.firstName || event.contact?.lastName || ''
      
      return [
        date.toLocaleDateString(),
        date.toLocaleTimeString(),
        event.type,
        contactName,
        event.contact?.email || '',
        event.campaign?.name || '',
        event.sequence?.name || '',
        event.subject || '',
        event.details || ''
      ]
    })

    // Build CSV string
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => 
        row.map(cell => {
          // Escape quotes and wrap in quotes if contains comma or newline
          const escaped = String(cell).replace(/"/g, '""')
          return escaped.includes(',') || escaped.includes('\n') 
            ? `"${escaped}"` 
            : escaped
        }).join(',')
      )
    ].join('\n')

    // Return CSV response
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="interactions-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })
  } catch (error) {
    console.error('Error exporting interactions:', error)
    return NextResponse.json(
      { error: 'Failed to export interactions' },
      { status: 500 }
    )
  }
}