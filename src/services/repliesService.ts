import { prisma } from '@/lib/prisma'

export interface Reply {
  id: string
  contact: {
    id: string
    name: string
    email: string
    avatar: string | null
  }
  campaign: {
    id: string
    name: string
    subject: string
  } | null
  sequence: {
    id: string
    name: string
    step: number
  } | null
  subject: string
  preview: string
  fullContent: string
  sentiment: 'positive' | 'negative' | 'neutral'
  priority: 'high' | 'medium' | 'low'
  isRead: boolean
  isStarred: boolean
  receivedAt: Date
  threadId: string
  tags: string[]
  assignedTo: {
    id: string
    name: string
    email: string
  } | null
  metadata: {
    gmailMessageId: string
    originalCampaignId?: string
    originalSequenceId?: string
    trackingId: string
  }
}

export interface RepliesStats {
  totalReplies: number
  unreadReplies: number
  positiveReplies: number
  negativeReplies: number
  neutralReplies: number
  avgResponseTime: number
  responseRate: number
  sentimentScore: number
}

export interface RepliesFilters {
  search?: string
  status?: 'all' | 'unread' | 'starred' | 'assigned'
  sentiment?: 'all' | 'positive' | 'negative' | 'neutral'
  priority?: 'all' | 'high' | 'medium' | 'low'
  dateRange?: string
  sortBy?: 'newest' | 'oldest' | 'priority' | 'sentiment' | 'unread'
}

/**
 * Get replies statistics for a user
 */
export async function getRepliesStats(userId: string): Promise<RepliesStats> {
  try {
    // Get total replies count
    const totalReplies = await prisma.emailEvent.count({
      where: {
        eventType: 'REPLIED',
        campaign: {
          userId: userId
        }
      }
    })

    // Get unread replies count - Note: EmailEvent doesn't have isRead field
    // This would need to be tracked separately or in a different model
    const unreadReplies = 0 // TODO: Implement unread tracking

    // Get sentiment breakdown - Note: EmailEvent doesn't have sentiment field
    // This would need to be analyzed separately or stored in eventData
    const sentimentBreakdown: { sentiment: string; _count: { sentiment: number } }[] = []
    // TODO: Implement sentiment analysis

    const positiveReplies = sentimentBreakdown.find(s => s.sentiment === 'POSITIVE')?._count.sentiment || 0
    const negativeReplies = sentimentBreakdown.find(s => s.sentiment === 'NEGATIVE')?._count.sentiment || 0
    const neutralReplies = sentimentBreakdown.find(s => s.sentiment === 'NEUTRAL')?._count.sentiment || 0

    // Calculate average response time (in hours) using proper schema
    const avgResponseTimeResult = await prisma.$queryRaw<[{ avg_response_time: number }]>`
      SELECT AVG(EXTRACT(EPOCH FROM (ee."createdAt" - r."sentAt")) / 3600) as avg_response_time
      FROM "EmailEvent" ee
      INNER JOIN "Recipient" r ON ee."recipientId" = r.id
      INNER JOIN "Campaign" c ON r."campaignId" = c.id
      WHERE ee."eventType" = 'REPLIED' 
        AND c."userId" = ${userId}
        AND r."sentAt" IS NOT NULL
    `

    const avgResponseTime = avgResponseTimeResult[0]?.avg_response_time || 0

    // Calculate response rate (replies/sent emails * 100)
    const totalSentEmails = await prisma.recipient.count({
      where: {
        campaign: {
          userId: userId
        },
        sentAt: {
          not: null
        }
      }
    })

    const responseRate = totalSentEmails > 0 ? (totalReplies / totalSentEmails) * 100 : 0

    // Calculate sentiment score (positive ratio)
    const sentimentScore = totalReplies > 0 ? positiveReplies / totalReplies : 0

    return {
      totalReplies,
      unreadReplies,
      positiveReplies,
      negativeReplies,
      neutralReplies,
      avgResponseTime: Number(avgResponseTime),
      responseRate,
      sentimentScore
    }
  } catch (error) {
    console.error('Error fetching replies stats:', error)
    throw new Error('Failed to fetch replies statistics')
  }
}

/**
 * Get replies for a user with optional filtering
 */
export async function getReplies(
  userId: string,
  filters: RepliesFilters = {},
  page: number = 1,
  limit: number = 20
): Promise<Reply[]> {
  try {
    const skip = (page - 1) * limit

    // Build where clause based on filters
    let whereClause: any = {
      eventType: 'REPLIED',
      campaign: {
        userId: userId
      }
    }

    // Apply filters - Note: EmailEvent doesn't have these fields
    // These would need to be implemented in a separate Reply model or stored in eventData
    if (filters.status) {
      // TODO: Implement status filtering when Reply model is added
    }

    if (filters.sentiment && filters.sentiment !== 'all') {
      // TODO: Implement sentiment filtering when analysis is added
    }

    if (filters.priority && filters.priority !== 'all') {
      // TODO: Implement priority filtering when Reply model is added
    }

    if (filters.search) {
      // Search in contact information through recipient relation
      whereClause.OR = [
        { recipient: { contact: { firstName: { contains: filters.search, mode: 'insensitive' } } } },
        { recipient: { contact: { lastName: { contains: filters.search, mode: 'insensitive' } } } },
        { recipient: { contact: { email: { contains: filters.search, mode: 'insensitive' } } } },
        { recipient: { contact: { company: { contains: filters.search, mode: 'insensitive' } } } }
      ]
    }

    // Build order by clause - simplified since fields don't exist in EmailEvent
    let orderBy: any = { createdAt: 'desc' } // Default to newest first

    if (filters.sortBy) {
      switch (filters.sortBy) {
        case 'oldest':
          orderBy = { createdAt: 'asc' }
          break
        case 'priority':
        case 'sentiment':
        case 'unread':
          // TODO: Implement these sorts when Reply model with these fields is added
          orderBy = { createdAt: 'desc' }
          break
      }
    }

    const replies = await prisma.emailEvent.findMany({
      where: whereClause,
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
            subject: true
          }
        },
        recipient: {
          include: {
            contact: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                company: true
              }
            }
          }
        }
      },
      orderBy,
      skip,
      take: limit
    })

    // Transform database results to Reply interface
    return replies.map(reply => {
      const contact = reply.recipient?.contact
      const campaign = reply.campaign
      const displayName = contact ? 
        `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || contact.email :
        'Unknown Contact'
      
      // Extract reply content from eventData if available
      const eventData = reply.eventData as any
      const replyContent = eventData?.content || eventData?.text || ''
      
      return {
        id: reply.id,
        contact: {
          id: contact?.id || '',
          name: displayName,
          email: contact?.email || '',
          avatar: null // Not available in Contact schema
        },
        campaign: campaign ? {
          id: campaign.id,
          name: campaign.name,
          subject: campaign.subject
        } : null,
        sequence: null, // TODO: Add sequence support when implemented
        subject: `Re: ${campaign?.subject || 'Email'}`,
        preview: replyContent ? replyContent.substring(0, 150) + '...' : '',
        fullContent: replyContent,
        sentiment: 'neutral' as const, // TODO: Implement sentiment analysis
        priority: 'medium' as const, // TODO: Implement priority logic
        isRead: false, // TODO: Implement read tracking
        isStarred: false, // TODO: Implement star tracking
        receivedAt: reply.createdAt,
        threadId: `thread-${reply.id}`, // TODO: Get from eventData or recipient
        tags: [], // TODO: Implement tags
        assignedTo: null, // TODO: Implement assignment
        metadata: {
          gmailMessageId: eventData?.gmailMessageId || `msg-${reply.id}`,
          originalCampaignId: campaign?.id,
          trackingId: eventData?.trackingId || `track-${reply.id}`
        }
      }
    })
  } catch (error) {
    console.error('Error fetching replies:', error)
    throw new Error('Failed to fetch replies')
  }
}

/**
 * Mark reply as read
 */
export async function markReplyAsRead(replyId: string, userId: string): Promise<void> {
  try {
    // TODO: Implement read tracking in a separate model or eventData
    // EmailEvent doesn't have isRead field
    console.log(`TODO: Mark reply ${replyId} as read for user ${userId}`)
    throw new Error('Mark as read not implemented - requires Reply model or eventData tracking')
  } catch (error) {
    console.error('Error marking reply as read:', error)
    throw new Error('Failed to mark reply as read')
  }
}

/**
 * Toggle reply star status
 */
export async function toggleReplyStar(replyId: string, userId: string): Promise<void> {
  try {
    // TODO: Implement star tracking in a separate model or eventData
    // EmailEvent doesn't have isStarred field
    console.log(`TODO: Toggle star for reply ${replyId} for user ${userId}`)
    throw new Error('Toggle star not implemented - requires Reply model or eventData tracking')
  } catch (error) {
    console.error('Error toggling reply star:', error)
    throw new Error('Failed to toggle reply star')
  }
}

/**
 * Assign reply to user
 */
export async function assignReply(replyId: string, assigneeId: string, userId: string): Promise<void> {
  try {
    // TODO: Implement assignment tracking in a separate model or eventData
    // EmailEvent doesn't have assignedTo field
    console.log(`TODO: Assign reply ${replyId} to ${assigneeId} for user ${userId}`)
    throw new Error('Assign reply not implemented - requires Reply model or eventData tracking')
  } catch (error) {
    console.error('Error assigning reply:', error)
    throw new Error('Failed to assign reply')
  }
}