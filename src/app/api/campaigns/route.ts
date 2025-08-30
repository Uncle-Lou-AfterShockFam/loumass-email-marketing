import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schemas
const createCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required'),
  subject: z.string().min(1, 'Subject is required'),
  content: z.string().min(1, 'Content is required'),
  status: z.enum(['DRAFT', 'SCHEDULED', 'SENDING']).default('DRAFT'),
  trackingEnabled: z.boolean().default(true),
  trackingOptions: z.object({
    opens: z.boolean().default(true),
    clicks: z.boolean().default(true)
  }).optional(),
  recipients: z.array(z.string()).min(0),
  scheduledFor: z.string().nullable().optional(),
  trackingDomainId: z.string().nullable().optional()
})

// GET /api/campaigns - List campaigns for authenticated user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get campaigns with related data
    const campaigns = await prisma.campaign.findMany({
      where: { userId: session.user.id },
      include: {
        recipients: {
          select: {
            id: true,
            status: true,
            sentAt: true,
            openedAt: true,
            clickedAt: true,
            repliedAt: true,
            bouncedAt: true,
            contact: {
              select: {
                email: true,
                firstName: true,
                lastName: true
              }
            }
          }
        },
        _count: {
          select: {
            recipients: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Transform campaigns with computed metrics
    const campaignsWithMetrics = campaigns.map(campaign => {
      const totalRecipients = campaign.recipients.length
      const sentCount = campaign.recipients.filter(r => r.sentAt).length
      const openedCount = campaign.recipients.filter(r => r.openedAt).length
      const clickedCount = campaign.recipients.filter(r => r.clickedAt).length
      const repliedCount = campaign.recipients.filter(r => r.repliedAt).length
      const bouncedCount = campaign.recipients.filter(r => r.bouncedAt).length

      return {
        ...campaign,
        metrics: {
          totalRecipients,
          sentCount,
          openedCount,
          clickedCount,
          repliedCount,
          bouncedCount,
          openRate: totalRecipients > 0 ? Math.round((openedCount / totalRecipients) * 100) : 0,
          clickRate: totalRecipients > 0 ? Math.round((clickedCount / totalRecipients) * 100) : 0,
          replyRate: totalRecipients > 0 ? Math.round((repliedCount / totalRecipients) * 100) : 0
        }
      }
    })

    return NextResponse.json({
      success: true,
      campaigns: campaignsWithMetrics
    })
  } catch (error) {
    console.error('Error fetching campaigns:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch campaigns' 
    }, { status: 500 })
  }
}

// POST /api/campaigns - Create new campaign
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate request data
    const validationResult = createCampaignSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Invalid data', 
        details: validationResult.error.format() 
      }, { status: 400 })
    }

    const data = validationResult.data

    // Create campaign in database transaction
    const campaign = await prisma.$transaction(async (tx) => {
      // Create the campaign
      const newCampaign = await tx.campaign.create({
        data: {
          userId: session.user.id,
          name: data.name,
          subject: data.subject,
          content: data.content,
          status: data.status,
          trackingEnabled: data.trackingEnabled,
          trackingDomainId: data.trackingDomainId,
          scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : null
        }
      })

      // Create recipient records if recipients provided
      if (data.recipients && data.recipients.length > 0) {
        await tx.recipient.createMany({
          data: data.recipients.map(contactId => ({
            campaignId: newCampaign.id,
            contactId,
            status: 'PENDING' as const
          }))
        })
      }

      return newCampaign
    })

    return NextResponse.json({
      success: true,
      campaign,
      message: 'Campaign created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating campaign:', error)
    return NextResponse.json({ 
      error: 'Failed to create campaign' 
    }, { status: 500 })
  }
}