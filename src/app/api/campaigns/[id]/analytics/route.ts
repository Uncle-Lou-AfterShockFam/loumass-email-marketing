import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { format, startOfHour, endOfHour, eachHourOfInterval } from 'date-fns'

// GET /api/campaigns/[id]/analytics - Get detailed campaign analytics
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get campaign with full recipient and event data
    const campaign = await prisma.campaign.findFirst({
      where: { 
        id: id,
        userId: session.user.id 
      },
      include: {
        recipients: {
          include: {
            contact: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                company: true,
                tags: true
              }
            }
          }
        },
        emailEvents: {
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Calculate basic metrics
    const totalRecipients = campaign.recipients.length
    const sentCount = campaign.recipients.filter(r => r.sentAt).length
    const openedCount = campaign.recipients.filter(r => r.openedAt).length
    const clickedCount = campaign.recipients.filter(r => r.clickedAt).length
    const repliedCount = campaign.recipients.filter(r => r.repliedAt).length
    const bouncedCount = campaign.recipients.filter(r => r.bouncedAt).length
    // Note: unsubscribed tracking not implemented in current schema

    // Calculate time-based analytics (hourly opens/clicks for first 48 hours)
    const timeAnalytics = []
    if (campaign.sentAt) {
      const startTime = campaign.sentAt
      const endTime = new Date(Math.min(
        Date.now(),
        startTime.getTime() + (48 * 60 * 60 * 1000) // 48 hours
      ))
      
      const hourlyIntervals = eachHourOfInterval({ start: startTime, end: endTime })
      
      timeAnalytics.push(...hourlyIntervals.map(hour => {
        const hourStart = startOfHour(hour)
        const hourEnd = endOfHour(hour)
        
        const hourlyOpens = campaign.emailEvents.filter(event => 
          event.eventType === 'OPENED' && 
          event.createdAt >= hourStart && 
          event.createdAt <= hourEnd
        ).length
        
        const hourlyClicks = campaign.emailEvents.filter(event => 
          event.eventType === 'CLICKED' && 
          event.createdAt >= hourStart && 
          event.createdAt <= hourEnd
        ).length
        
        return {
          hour: format(hourStart, 'yyyy-MM-dd HH:00'),
          opens: hourlyOpens,
          clicks: hourlyClicks
        }
      }))
    }

    // Engagement by contact attributes
    const engagementByCompany = new Map()
    const engagementByTag = new Map()
    
    campaign.recipients.forEach(recipient => {
      const { contact } = recipient
      const opened = !!recipient.openedAt
      const clicked = !!recipient.clickedAt
      const replied = !!recipient.repliedAt
      
      // Company analysis
      if (contact.company) {
        if (!engagementByCompany.has(contact.company)) {
          engagementByCompany.set(contact.company, {
            company: contact.company,
            total: 0,
            opened: 0,
            clicked: 0,
            replied: 0
          })
        }
        
        const companyData = engagementByCompany.get(contact.company)
        companyData.total++
        if (opened) companyData.opened++
        if (clicked) companyData.clicked++
        if (replied) companyData.replied++
      }
      
      // Tag analysis
      if (Array.isArray(contact.tags)) {
        contact.tags.forEach(tag => {
          if (!engagementByTag.has(tag)) {
            engagementByTag.set(tag, {
              tag,
              total: 0,
              opened: 0,
              clicked: 0,
              replied: 0
            })
          }
          
          const tagData = engagementByTag.get(tag)
          tagData.total++
          if (opened) tagData.opened++
          if (clicked) tagData.clicked++
          if (replied) tagData.replied++
        })
      }
    })

    // Convert to arrays and calculate rates
    const companyAnalytics = Array.from(engagementByCompany.values()).map(data => ({
      ...data,
      openRate: data.total > 0 ? Math.round((data.opened / data.total) * 100) : 0,
      clickRate: data.total > 0 ? Math.round((data.clicked / data.total) * 100) : 0,
      replyRate: data.total > 0 ? Math.round((data.replied / data.total) * 100) : 0
    })).sort((a, b) => b.openRate - a.openRate)

    const tagAnalytics = Array.from(engagementByTag.values()).map(data => ({
      ...data,
      openRate: data.total > 0 ? Math.round((data.opened / data.total) * 100) : 0,
      clickRate: data.total > 0 ? Math.round((data.clicked / data.total) * 100) : 0,
      replyRate: data.total > 0 ? Math.round((data.replied / data.total) * 100) : 0
    })).sort((a, b) => b.openRate - a.openRate)

    // Link click analysis
    const linkClicks = new Map()
    campaign.emailEvents
      .filter(event => event.eventType === 'CLICKED')
      .forEach(event => {
        const eventData = event.eventData as { url?: string } | null
        const url = eventData?.url || 'Unknown URL'
        linkClicks.set(url, (linkClicks.get(url) || 0) + 1)
      })
    
    const linkAnalytics = Array.from(linkClicks.entries()).map(([url, clicks]) => ({
      url,
      clicks,
      percentage: clickedCount > 0 ? Math.round((clicks / clickedCount) * 100) : 0
    })).sort((a, b) => b.clicks - a.clicks)

    // Recent activity (last 100 events)
    const recentActivity = campaign.emailEvents
      .slice(-100)
      .map(event => {
        const recipient = campaign.recipients.find(r => r.id === event.recipientId)
        return {
          id: event.id,
          type: event.eventType,
          timestamp: event.createdAt,
          contact: recipient ? {
            email: recipient.contact.email,
            name: recipient.contact.firstName && recipient.contact.lastName 
              ? `${recipient.contact.firstName} ${recipient.contact.lastName}`
              : recipient.contact.email
          } : null,
          data: event.eventData
        }
      })
      .reverse()

    return NextResponse.json({
      success: true,
      analytics: {
        campaign: {
          id: campaign.id,
          name: campaign.name,
          subject: campaign.subject,
          status: campaign.status,
          sentAt: campaign.sentAt,
          trackingEnabled: campaign.trackingEnabled
        },
        metrics: {
          totalRecipients,
          sentCount,
          openedCount,
          clickedCount,
          repliedCount,
          bouncedCount,
          unsubscribedCount,
          deliveredCount: sentCount - bouncedCount,
          openRate: sentCount > 0 ? Math.round((openedCount / sentCount) * 100) : 0,
          clickRate: sentCount > 0 ? Math.round((clickedCount / sentCount) * 100) : 0,
          replyRate: sentCount > 0 ? Math.round((repliedCount / sentCount) * 100) : 0,
          bounceRate: sentCount > 0 ? Math.round((bouncedCount / sentCount) * 100) : 0,
          unsubscribeRate: sentCount > 0 ? Math.round((unsubscribedCount / sentCount) * 100) : 0,
          deliveryRate: sentCount > 0 ? Math.round(((sentCount - bouncedCount) / sentCount) * 100) : 0
        },
        timeAnalytics,
        segmentAnalytics: {
          companies: companyAnalytics.slice(0, 20),
          tags: tagAnalytics.slice(0, 20)
        },
        linkAnalytics,
        recentActivity
      }
    })

  } catch (error) {
    console.error('Error fetching campaign analytics:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch campaign analytics' 
    }, { status: 500 })
  }
}