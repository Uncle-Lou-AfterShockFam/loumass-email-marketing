import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { startOfDay, endOfDay, subDays, format } from 'date-fns'

// GET /api/analytics - Get comprehensive analytics dashboard data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30' // days
    const periodDays = parseInt(period)
    const startDate = startOfDay(subDays(new Date(), periodDays))
    const endDate = endOfDay(new Date())

    // Get basic counts
    const [
      totalCampaigns,
      totalSequences,
      totalContacts,
      totalRecipients
    ] = await Promise.all([
      prisma.campaign.count({
        where: { userId: session.user.id }
      }),
      prisma.sequence.count({
        where: { userId: session.user.id }
      }),
      prisma.contact.count({
        where: { userId: session.user.id }
      }),
      prisma.recipient.count({
        where: {
          campaign: { userId: session.user.id }
        }
      })
    ])

    // Get email metrics for the period
    const recipients = await prisma.recipient.findMany({
      where: {
        campaign: { userId: session.user.id },
        sentAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        campaign: {
          select: {
            name: true,
            createdAt: true
          }
        }
      }
    })

    // Calculate email metrics
    const emailsSent = recipients.length
    const emailsOpened = recipients.filter(r => r.openedAt).length
    const emailsClicked = recipients.filter(r => r.clickedAt).length
    const emailsReplied = recipients.filter(r => r.repliedAt).length
    const emailsBounced = recipients.filter(r => r.bouncedAt).length

    // Get daily email stats for chart
    const dailyStats = []
    for (let i = periodDays - 1; i >= 0; i--) {
      const date = subDays(new Date(), i)
      const dayStart = startOfDay(date)
      const dayEnd = endOfDay(date)
      
      const dayRecipients = recipients.filter(r => 
        r.sentAt && r.sentAt >= dayStart && r.sentAt <= dayEnd
      )
      
      dailyStats.push({
        date: format(date, 'yyyy-MM-dd'),
        sent: dayRecipients.length,
        opened: dayRecipients.filter(r => r.openedAt).length,
        clicked: dayRecipients.filter(r => r.clickedAt).length,
        replied: dayRecipients.filter(r => r.repliedAt).length
      })
    }

    // Get top performing campaigns
    const campaigns = await prisma.campaign.findMany({
      where: { 
        userId: session.user.id,
        sentAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        recipients: {
          where: {
            sentAt: {
              gte: startDate,
              lte: endDate
            }
          }
        }
      },
      orderBy: {
        sentAt: 'desc'
      },
      take: 10
    })

    const topCampaigns = campaigns.map(campaign => {
      const recipients = campaign.recipients
      const sent = recipients.length
      const opened = recipients.filter(r => r.openedAt).length
      const clicked = recipients.filter(r => r.clickedAt).length
      const replied = recipients.filter(r => r.repliedAt).length

      return {
        id: campaign.id,
        name: campaign.name,
        subject: campaign.subject,
        sent,
        opened,
        clicked,
        replied,
        openRate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
        clickRate: sent > 0 ? Math.round((clicked / sent) * 100) : 0,
        replyRate: sent > 0 ? Math.round((replied / sent) * 100) : 0,
        sentAt: campaign.sentAt
      }
    }).sort((a, b) => b.openRate - a.openRate)

    // Get sequence performance
    const sequences = await prisma.sequence.findMany({
      where: { userId: session.user.id },
      include: {
        enrollments: {
          include: {
            emails: {
              where: {
                sentAt: {
                  gte: startDate,
                  lte: endDate
                }
              }
            }
          }
        }
      },
      take: 10
    })

    const topSequences = sequences.map(sequence => {
      const allEmails = sequence.enrollments.flatMap(e => e.emails)
      const sent = allEmails.filter(e => e.status === 'SENT').length
      const opened = allEmails.filter(e => e.openedAt).length
      const clicked = allEmails.filter(e => e.clickedAt).length
      const replied = allEmails.filter(e => e.repliedAt).length

      return {
        id: sequence.id,
        name: sequence.name,
        status: sequence.status,
        enrollments: sequence.enrollments.length,
        activeEnrollments: sequence.enrollments.filter(e => e.status === 'ACTIVE').length,
        emailsSent: sent,
        opened,
        clicked,
        replied,
        openRate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
        clickRate: sent > 0 ? Math.round((clicked / sent) * 100) : 0,
        replyRate: sent > 0 ? Math.round((replied / sent) * 100) : 0
      }
    }).sort((a, b) => b.openRate - a.openRate)

    // Get recent activity
    const recentActivity = await prisma.emailEvent.findMany({
      where: {
        userId: session.user.id,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        recipient: {
          include: {
            contact: {
              select: {
                email: true,
                firstName: true,
                lastName: true
              }
            },
            campaign: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    })

    const formattedActivity = recentActivity.map(event => ({
      id: event.id,
      type: event.eventType,
      timestamp: event.createdAt,
      contact: {
        email: event.recipient?.contact?.email,
        name: event.recipient?.contact?.firstName && event.recipient?.contact?.lastName 
          ? `${event.recipient.contact.firstName} ${event.recipient.contact.lastName}`
          : event.recipient?.contact?.email
      },
      campaign: event.recipient?.campaign?.name,
      data: event.eventData
    }))

    return NextResponse.json({
      success: true,
      analytics: {
        overview: {
          totalCampaigns,
          totalSequences,
          totalContacts,
          emailsSent,
          emailsOpened,
          emailsClicked,
          emailsReplied,
          emailsBounced,
          openRate: emailsSent > 0 ? Math.round((emailsOpened / emailsSent) * 100) : 0,
          clickRate: emailsSent > 0 ? Math.round((emailsClicked / emailsSent) * 100) : 0,
          replyRate: emailsSent > 0 ? Math.round((emailsReplied / emailsSent) * 100) : 0,
          bounceRate: emailsSent > 0 ? Math.round((emailsBounced / emailsSent) * 100) : 0
        },
        dailyStats,
        topCampaigns,
        topSequences,
        recentActivity: formattedActivity,
        period: {
          days: periodDays,
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(endDate, 'yyyy-MM-dd')
        }
      }
    })

  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch analytics' 
    }, { status: 500 })
  }
}