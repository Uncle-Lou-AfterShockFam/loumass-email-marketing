import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

    // Fetch email events (interactions)
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
      },
      take: 100
    })

    // Calculate stats - create a clean where clause
    const statsWhere: any = {
      userId: user.id
    }
    
    // Only add valid filters for stats
    if (contactId) {
      statsWhere.contactId = contactId
    }
    if (campaignId) {
      statsWhere.campaignId = campaignId
    }
    if (sequenceId) {
      statsWhere.sequenceId = sequenceId
    }
    if (interactionType && interactionType !== 'all') {
      statsWhere.type = interactionType.toUpperCase()
    }
    if (dateFrom || dateTo) {
      statsWhere.timestamp = {}
      if (dateFrom) {
        statsWhere.timestamp.gte = new Date(dateFrom)
      }
      if (dateTo) {
        const endDate = new Date(dateTo)
        endDate.setHours(23, 59, 59, 999)
        statsWhere.timestamp.lte = endDate
      }
    }
    
    // Get stats using raw aggregation to handle both type and eventType columns
    const stats = await prisma.emailEvent.groupBy({
      by: ['type', 'eventType'],
      where: statsWhere,
      _count: true
    })

    const statsMap = {
      totalSent: 0,
      totalOpened: 0,
      totalClicked: 0,
      totalReplied: 0,
      totalBounced: 0,
      totalComplained: 0
    }

    stats.forEach(stat => {
      // Use either type or eventType field (handle migration case)
      const eventType = stat.type || stat.eventType
      
      switch (eventType) {
        case 'SENT':
          statsMap.totalSent += stat._count
          break
        case 'OPENED':
          statsMap.totalOpened += stat._count
          break
        case 'CLICKED':
          statsMap.totalClicked += stat._count
          break
        case 'REPLIED':
          statsMap.totalReplied += stat._count
          break
        case 'BOUNCED':
          statsMap.totalBounced += stat._count
          break
        case 'COMPLAINED':
          statsMap.totalComplained += stat._count
          break
      }
    })

    // Transform data for frontend
    const interactions = emailEvents.map(event => {
      // Use either type or eventType field (handle migration case)
      const eventType = event.type || event.eventType || 'SENT'
      const typeString = eventType.toLowerCase()
      
      return {
        id: event.id,
        type: typeString,
        contactEmail: event.contact?.email || '',
        contactName: event.contact?.firstName && event.contact?.lastName 
          ? `${event.contact.firstName} ${event.contact.lastName}`
          : event.contact?.firstName || event.contact?.lastName || undefined,
        campaignName: event.campaign?.name,
        sequenceName: event.sequence?.name,
        subject: event.subject || '',
        timestamp: event.timestamp,
        details: event.details,
        clickedUrl: eventType === 'CLICKED' ? event.details : undefined,
        replyContent: eventType === 'REPLIED' ? event.details : undefined,
        bounceReason: eventType === 'BOUNCED' ? event.details : undefined
      }
    })

    return NextResponse.json({
      interactions,
      stats: statsMap
    })
  } catch (error) {
    console.error('Error fetching interactions:', error)
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json(
      { error: 'Failed to fetch interactions', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}