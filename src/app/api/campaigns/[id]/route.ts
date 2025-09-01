import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schema for updating campaigns
const updateCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').optional(),
  subject: z.string().min(1, 'Subject is required').optional(),
  content: z.string().min(1, 'Content is required').optional(),
  status: z.enum(['DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'PAUSED', 'FAILED']).optional(),
  trackingEnabled: z.boolean().optional(),
  trackingOptions: z.object({
    opens: z.boolean().default(true),
    clicks: z.boolean().default(true)
  }).optional(),
  recipients: z.array(z.string()).optional(),
  scheduledFor: z.string().nullable().optional(),
  trackingDomainId: z.string().nullable().optional(),
  sequenceId: z.string().nullable().optional()
})

// GET /api/campaigns/[id] - Get single campaign
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

    const campaign = await prisma.campaign.findFirst({
      where: { 
        id: id,
        userId: session.user.id // Ensure user owns this campaign
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
                company: true
              }
            }
          }
        },
        emailEvents: {
          orderBy: { createdAt: 'desc' },
          take: 100
        }
      }
    })

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Calculate metrics
    const totalRecipients = campaign.recipients.length
    const sentCount = campaign.recipients.filter(r => r.sentAt).length
    const openedCount = campaign.recipients.filter(r => r.openedAt).length
    const clickedCount = campaign.recipients.filter(r => r.clickedAt).length
    const repliedCount = campaign.recipients.filter(r => r.repliedAt).length
    const bouncedCount = campaign.recipients.filter(r => r.bouncedAt).length

    const campaignWithMetrics = {
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

    return NextResponse.json({
      success: true,
      campaign: campaignWithMetrics
    })

  } catch (error) {
    console.error('Error fetching campaign:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch campaign' 
    }, { status: 500 })
  }
}

// PUT /api/campaigns/[id] - Update campaign
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate request data
    const validationResult = updateCampaignSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Invalid data', 
        details: validationResult.error.format() 
      }, { status: 400 })
    }

    const data = validationResult.data

    // Check if campaign exists and user owns it
    const existingCampaign = await prisma.campaign.findFirst({
      where: { 
        id: id,
        userId: session.user.id 
      }
    })

    if (!existingCampaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Don't allow editing sent campaigns unless changing status
    if (existingCampaign.status === 'SENT' && data.status !== 'SENT') {
      return NextResponse.json({ 
        error: 'Cannot edit sent campaigns except to change status' 
      }, { status: 400 })
    }

    // Update campaign in database transaction
    const updatedCampaign = await prisma.$transaction(async (tx) => {
      // Update campaign fields
      const campaignData: any = {}
      if (data.name !== undefined) campaignData.name = data.name
      if (data.subject !== undefined) campaignData.subject = data.subject
      if (data.content !== undefined) campaignData.content = data.content
      if (data.status !== undefined) campaignData.status = data.status
      if (data.trackingEnabled !== undefined) campaignData.trackingEnabled = data.trackingEnabled
      if (data.trackingDomainId !== undefined) campaignData.trackingDomainId = data.trackingDomainId
      if (data.sequenceId !== undefined) campaignData.sequenceId = data.sequenceId
      if (data.scheduledFor !== undefined) {
        campaignData.scheduledFor = data.scheduledFor ? new Date(data.scheduledFor) : null
      }

      const updatedCampaign = await tx.campaign.update({
        where: { id: id },
        data: campaignData
      })

      // Update recipients if provided
      if (data.recipients) {
        // Remove existing recipients
        await tx.recipient.deleteMany({
          where: { campaignId: id }
        })

        // Add new recipients if any
        if (data.recipients.length > 0) {
          await tx.recipient.createMany({
            data: data.recipients.map(contactId => ({
              campaignId: id,
              contactId,
              status: 'PENDING' as const
            }))
          })
        }
      }

      return updatedCampaign
    })

    return NextResponse.json({
      success: true,
      campaign: updatedCampaign,
      message: 'Campaign updated successfully'
    })

  } catch (error) {
    console.error('Error updating campaign:', error)
    return NextResponse.json({ 
      error: 'Failed to update campaign' 
    }, { status: 500 })
  }
}

// DELETE /api/campaigns/[id] - Delete campaign
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if campaign exists and user owns it
    const campaign = await prisma.campaign.findFirst({
      where: { 
        id: id,
        userId: session.user.id 
      }
    })

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Don't allow deleting campaigns that are sending or sent (unless draft)
    if (campaign.status === 'SENDING' || campaign.status === 'SENT') {
      return NextResponse.json({ 
        error: 'Cannot delete campaigns that are sent or currently sending' 
      }, { status: 400 })
    }

    // Delete campaign (cascading deletes will handle recipients and events)
    await prisma.campaign.delete({
      where: { id: id }
    })

    return NextResponse.json({
      success: true,
      message: 'Campaign deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting campaign:', error)
    return NextResponse.json({ 
      error: 'Failed to delete campaign' 
    }, { status: 500 })
  }
}