import { prisma } from '@/lib/prisma'

export interface AnalyticsOverview {
  totalEmails: number
  totalDelivered: number
  totalOpened: number
  totalClicked: number
  totalReplied: number
  totalBounced: number
  totalUnsubscribed: number
  deliveryRate: number
  openRate: number
  clickRate: number
  replyRate: number
  bounceRate: number
  unsubscribeRate: number
}

export interface TimeSeriesDataPoint {
  date: string
  sent: number
  delivered: number
  opened: number
  clicked: number
  replied: number
}

export interface EngagementDataPoint {
  date: string
  openRate: number
  clickRate: number
  replyRate: number
}

export interface TopPerformingCampaign {
  id: string
  name: string
  subject: string
  sent: number
  delivered: number
  opened: number
  clicked: number
  replied: number
  deliveryRate: number
  openRate: number
  clickRate: number
  replyRate: number
  sentAt: Date
}

export interface RecentActivity {
  id: string
  type: 'campaign_sent' | 'high_engagement' | 'sequence_completed' | 'bounce_alert' | 'reply_received' | 'contact_imported'
  title: string
  description: string
  timestamp: Date
  metadata: Record<string, any>
}

export interface PerformanceMetrics {
  industryBenchmarks: {
    deliveryRate: number
    openRate: number
    clickRate: number
    replyRate: number
    bounceRate: number
    unsubscribeRate: number
  }
  userPerformance: {
    deliveryRate: number
    openRate: number
    clickRate: number
    replyRate: number
    bounceRate: number
    unsubscribeRate: number
  }
  improvements: Array<{
    metric: string
    userValue: number
    industryValue: number
    improvement: number
    status: 'above' | 'below'
  }>
}

export interface AnalyticsData {
  overview: AnalyticsOverview
  timeSeriesData: {
    emails: TimeSeriesDataPoint[]
    engagement: EngagementDataPoint[]
  }
  topPerformingCampaigns: TopPerformingCampaign[]
  recentActivity: RecentActivity[]
  performanceMetrics: PerformanceMetrics
}

/**
 * Get comprehensive analytics overview for a user
 */
export async function getAnalyticsOverview(userId: string): Promise<AnalyticsOverview> {
  try {
    // Get total emails sent (recipients)
    const totalEmails = await prisma.recipient.count({
      where: {
        campaign: {
          userId: userId
        }
      }
    })

    // Get delivered emails (recipients with sentAt not null)
    const totalDelivered = await prisma.recipient.count({
      where: {
        campaign: {
          userId: userId
        },
        sentAt: {
          not: null
        }
      }
    })

    // Get email events aggregations
    const [opened, clicked, replied, bounced, unsubscribed] = await Promise.all([
      prisma.emailEvent.count({
        where: {
          eventType: 'OPENED',
          campaign: {
            userId: userId
          }
        }
      }),
      prisma.emailEvent.count({
        where: {
          eventType: 'CLICKED',
          campaign: {
            userId: userId
          }
        }
      }),
      prisma.emailEvent.count({
        where: {
          eventType: 'REPLIED',
          campaign: {
            userId: userId
          }
        }
      }),
      prisma.emailEvent.count({
        where: {
          eventType: 'BOUNCED',
          campaign: {
            userId: userId
          }
        }
      }),
      prisma.emailEvent.count({
        where: {
          eventType: 'UNSUBSCRIBED',
          campaign: {
            userId: userId
          }
        }
      })
    ])

    // Calculate rates
    const deliveryRate = totalEmails > 0 ? (totalDelivered / totalEmails) * 100 : 0
    const openRate = totalDelivered > 0 ? (opened / totalDelivered) * 100 : 0
    const clickRate = totalDelivered > 0 ? (clicked / totalDelivered) * 100 : 0
    const replyRate = totalDelivered > 0 ? (replied / totalDelivered) * 100 : 0
    const bounceRate = totalEmails > 0 ? (bounced / totalEmails) * 100 : 0
    const unsubscribeRate = totalDelivered > 0 ? (unsubscribed / totalDelivered) * 100 : 0

    return {
      totalEmails,
      totalDelivered,
      totalOpened: opened,
      totalClicked: clicked,
      totalReplied: replied,
      totalBounced: bounced,
      totalUnsubscribed: unsubscribed,
      deliveryRate: Number(deliveryRate.toFixed(1)),
      openRate: Number(openRate.toFixed(1)),
      clickRate: Number(clickRate.toFixed(1)),
      replyRate: Number(replyRate.toFixed(1)),
      bounceRate: Number(bounceRate.toFixed(1)),
      unsubscribeRate: Number(unsubscribeRate.toFixed(1))
    }
  } catch (error) {
    console.error('Error fetching analytics overview:', error)
    throw new Error('Failed to fetch analytics overview')
  }
}

/**
 * Get time series data for analytics charts
 */
export async function getTimeSeriesData(
  userId: string,
  days: number = 30
): Promise<{ emails: TimeSeriesDataPoint[]; engagement: EngagementDataPoint[] }> {
  try {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get daily email metrics using raw SQL for better performance
    const timeSeriesResult = await prisma.$queryRaw<Array<{
      date: string
      sent: bigint
      delivered: bigint
      opened: bigint
      clicked: bigint
      replied: bigint
    }>>`
      SELECT 
        DATE(r."createdAt") as date,
        COUNT(r.id) as sent,
        COUNT(CASE WHEN r."sentAt" IS NOT NULL THEN 1 END) as delivered,
        COUNT(CASE WHEN ee."eventType" = 'OPENED' THEN 1 END) as opened,
        COUNT(CASE WHEN ee."eventType" = 'CLICKED' THEN 1 END) as clicked,
        COUNT(CASE WHEN ee."eventType" = 'REPLIED' THEN 1 END) as replied
      FROM "Recipient" r
      INNER JOIN "Campaign" c ON r."campaignId" = c.id
      LEFT JOIN "EmailEvent" ee ON r.id = ee."recipientId"
      WHERE c."userId" = ${userId}
        AND r."createdAt" >= ${startDate}
      GROUP BY DATE(r."createdAt")
      ORDER BY DATE(r."createdAt") ASC
    `

    const emails: TimeSeriesDataPoint[] = timeSeriesResult.map(row => ({
      date: row.date,
      sent: Number(row.sent),
      delivered: Number(row.delivered),
      opened: Number(row.opened),
      clicked: Number(row.clicked),
      replied: Number(row.replied)
    }))

    const engagement: EngagementDataPoint[] = emails.map(row => ({
      date: row.date,
      openRate: row.delivered > 0 ? Number(((row.opened / row.delivered) * 100).toFixed(1)) : 0,
      clickRate: row.delivered > 0 ? Number(((row.clicked / row.delivered) * 100).toFixed(1)) : 0,
      replyRate: row.delivered > 0 ? Number(((row.replied / row.delivered) * 100).toFixed(1)) : 0
    }))

    return { emails, engagement }
  } catch (error) {
    console.error('Error fetching time series data:', error)
    throw new Error('Failed to fetch time series data')
  }
}

/**
 * Get top performing campaigns
 */
export async function getTopPerformingCampaigns(
  userId: string,
  limit: number = 5
): Promise<TopPerformingCampaign[]> {
  try {
    const campaigns = await prisma.campaign.findMany({
      where: {
        userId: userId,
        status: 'SENT'
      },
      include: {
        recipients: {
          include: {
            emailEvents: true
          }
        }
      },
      orderBy: {
        sentAt: 'desc'
      },
      take: limit * 2 // Get more to filter by performance
    })

    const performingCampaigns = campaigns.map(campaign => {
      const totalEmails = campaign.recipients.length
      const delivered = campaign.recipients.filter(r => r.sentAt !== null).length
      const opened = campaign.recipients.filter(r => r.emailEvents.some(ev => ev.eventType === 'OPENED')).length
      const clicked = campaign.recipients.filter(r => r.emailEvents.some(ev => ev.eventType === 'CLICKED')).length
      const replied = campaign.recipients.filter(r => r.emailEvents.some(ev => ev.eventType === 'REPLIED')).length

      const deliveryRate = totalEmails > 0 ? (delivered / totalEmails) * 100 : 0
      const openRate = delivered > 0 ? (opened / delivered) * 100 : 0
      const clickRate = delivered > 0 ? (clicked / delivered) * 100 : 0
      const replyRate = delivered > 0 ? (replied / delivered) * 100 : 0

      return {
        id: campaign.id,
        name: campaign.name,
        subject: campaign.subject,
        sent: totalEmails,
        delivered,
        opened,
        clicked,
        replied,
        deliveryRate: Number(deliveryRate.toFixed(1)),
        openRate: Number(openRate.toFixed(1)),
        clickRate: Number(clickRate.toFixed(1)),
        replyRate: Number(replyRate.toFixed(1)),
        sentAt: campaign.sentAt || campaign.createdAt
      }
    })

    // Sort by performance score (weighted combination of open and click rates)
    return performingCampaigns
      .sort((a, b) => {
        const scoreA = (a.openRate * 0.6) + (a.clickRate * 0.4)
        const scoreB = (b.openRate * 0.6) + (b.clickRate * 0.4)
        return scoreB - scoreA
      })
      .slice(0, limit)
  } catch (error) {
    console.error('Error fetching top campaigns:', error)
    throw new Error('Failed to fetch top performing campaigns')
  }
}

/**
 * Get recent activity feed
 */
export async function getRecentActivity(
  userId: string,
  limit: number = 10
): Promise<RecentActivity[]> {
  try {
    const activities: RecentActivity[] = []

    // Get recent campaigns
    const recentCampaigns = await prisma.campaign.findMany({
      where: {
        userId: userId,
        sentAt: {
          not: null
        }
      },
      include: {
        recipients: true
      },
      orderBy: {
        sentAt: 'desc'
      },
      take: 3
    })

    recentCampaigns.forEach(campaign => {
      const delivered = campaign.recipients.filter(r => r.sentAt !== null).length
      const deliveryRate = campaign.recipients.length > 0 ? (delivered / campaign.recipients.length) * 100 : 0

      activities.push({
        id: `campaign-${campaign.id}`,
        type: 'campaign_sent',
        title: `Campaign "${campaign.name}" sent`,
        description: `Delivered to ${campaign.recipients.length.toLocaleString()} contacts with ${deliveryRate.toFixed(1)}% delivery rate`,
        timestamp: campaign.sentAt!,
        metadata: {
          campaignId: campaign.id,
          recipientCount: campaign.recipients.length,
          deliveryRate: Number(deliveryRate.toFixed(1))
        }
      })
    })

    // Get recent high engagement campaigns
    const highEngagementCampaigns = await prisma.campaign.findMany({
      where: {
        userId: userId,
        status: 'SENT'
      },
      include: {
        recipients: {
          include: {
            emailEvents: {
              where: {
                eventType: 'OPENED'
              }
            }
          }
        }
      },
      orderBy: {
        sentAt: 'desc'
      },
      take: 5
    })

    highEngagementCampaigns.forEach(campaign => {
      const delivered = campaign.recipients.filter(r => r.sentAt !== null).length
      const opened = campaign.recipients.filter(r => r.emailEvents.length > 0).length
      const openRate = delivered > 0 ? (opened / delivered) * 100 : 0

      if (openRate > 45) { // High engagement threshold
        activities.push({
          id: `engagement-${campaign.id}`,
          type: 'high_engagement',
          title: 'High engagement detected',
          description: `${campaign.name} achieved ${openRate.toFixed(1)}% open rate`,
          timestamp: campaign.sentAt || campaign.createdAt,
          metadata: {
            campaignId: campaign.id,
            openRate: Number(openRate.toFixed(1)),
            threshold: 45.0
          }
        })
      }
    })

    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
  } catch (error) {
    console.error('Error fetching recent activity:', error)
    throw new Error('Failed to fetch recent activity')
  }
}

/**
 * Get performance metrics compared to industry benchmarks
 */
export async function getPerformanceMetrics(userId: string): Promise<PerformanceMetrics> {
  try {
    const overview = await getAnalyticsOverview(userId)

    // Industry benchmarks (typical values)
    const industryBenchmarks = {
      deliveryRate: 95.0,
      openRate: 35.0,
      clickRate: 8.5,
      replyRate: 2.0,
      bounceRate: 5.0,
      unsubscribeRate: 1.0
    }

    const userPerformance = {
      deliveryRate: overview.deliveryRate,
      openRate: overview.openRate,
      clickRate: overview.clickRate,
      replyRate: overview.replyRate,
      bounceRate: overview.bounceRate,
      unsubscribeRate: overview.unsubscribeRate
    }

    const improvements = [
      {
        metric: 'Open Rate',
        userValue: userPerformance.openRate,
        industryValue: industryBenchmarks.openRate,
        improvement: userPerformance.openRate > 0 ? 
          ((userPerformance.openRate - industryBenchmarks.openRate) / industryBenchmarks.openRate) * 100 : 0,
        status: userPerformance.openRate >= industryBenchmarks.openRate ? 'above' : 'below' as 'above' | 'below'
      },
      {
        metric: 'Click Rate',
        userValue: userPerformance.clickRate,
        industryValue: industryBenchmarks.clickRate,
        improvement: userPerformance.clickRate > 0 ? 
          ((userPerformance.clickRate - industryBenchmarks.clickRate) / industryBenchmarks.clickRate) * 100 : 0,
        status: userPerformance.clickRate >= industryBenchmarks.clickRate ? 'above' : 'below' as 'above' | 'below'
      },
      {
        metric: 'Delivery Rate',
        userValue: userPerformance.deliveryRate,
        industryValue: industryBenchmarks.deliveryRate,
        improvement: userPerformance.deliveryRate > 0 ? 
          ((userPerformance.deliveryRate - industryBenchmarks.deliveryRate) / industryBenchmarks.deliveryRate) * 100 : 0,
        status: userPerformance.deliveryRate >= industryBenchmarks.deliveryRate ? 'above' : 'below' as 'above' | 'below'
      },
      {
        metric: 'Bounce Rate',
        userValue: userPerformance.bounceRate,
        industryValue: industryBenchmarks.bounceRate,
        improvement: userPerformance.bounceRate < industryBenchmarks.bounceRate ? 
          ((industryBenchmarks.bounceRate - userPerformance.bounceRate) / industryBenchmarks.bounceRate) * 100 : 0,
        status: userPerformance.bounceRate <= industryBenchmarks.bounceRate ? 'below' : 'above' as 'above' | 'below'
      },
      {
        metric: 'Unsubscribe Rate',
        userValue: userPerformance.unsubscribeRate,
        industryValue: industryBenchmarks.unsubscribeRate,
        improvement: userPerformance.unsubscribeRate < industryBenchmarks.unsubscribeRate ? 
          ((industryBenchmarks.unsubscribeRate - userPerformance.unsubscribeRate) / industryBenchmarks.unsubscribeRate) * 100 : 0,
        status: userPerformance.unsubscribeRate <= industryBenchmarks.unsubscribeRate ? 'below' : 'above' as 'above' | 'below'
      }
    ]

    return {
      industryBenchmarks,
      userPerformance,
      improvements
    }
  } catch (error) {
    console.error('Error fetching performance metrics:', error)
    throw new Error('Failed to fetch performance metrics')
  }
}

/**
 * Get complete analytics data for the dashboard
 */
export async function getAnalytics(
  userId: string,
  dateRange: { start?: Date; end?: Date } = {}
): Promise<AnalyticsData> {
  try {
    const [overview, timeSeriesData, topCampaigns, recentActivity, performanceMetrics] = await Promise.all([
      getAnalyticsOverview(userId),
      getTimeSeriesData(userId, 30), // Last 30 days
      getTopPerformingCampaigns(userId, 5),
      getRecentActivity(userId, 10),
      getPerformanceMetrics(userId)
    ])

    return {
      overview,
      timeSeriesData,
      topPerformingCampaigns: topCampaigns,
      recentActivity,
      performanceMetrics
    }
  } catch (error) {
    console.error('Error fetching analytics:', error)
    throw new Error('Failed to fetch analytics data')
  }
}