import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schema for bulk operations
const bulkCampaignSchema = z.object({
  action: z.enum(['delete', 'pause', 'resume', 'duplicate', 'archive']),
  campaignIds: z.array(z.string()).min(1, 'At least one campaign ID required'),
  options: z.object({
    newStatus: z.enum(['DRAFT', 'SCHEDULED', 'PAUSED', 'SENT', 'FAILED']).optional(),
    namePrefix: z.string().optional() // For duplicating
  }).optional()
})

// POST /api/campaigns/bulk - Bulk operations on campaigns
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate request data
    const validationResult = bulkCampaignSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Invalid data', 
        details: validationResult.error.format() 
      }, { status: 400 })
    }

    const { action, campaignIds, options } = validationResult.data

    // Verify all campaigns belong to the user
    const campaigns = await prisma.campaign.findMany({
      where: {
        id: { in: campaignIds },
        userId: session.user.id
      }
    })

    if (campaigns.length !== campaignIds.length) {
      return NextResponse.json({ 
        error: 'Some campaigns not found or not owned by user' 
      }, { status: 404 })
    }

    let results = []

    switch (action) {
      case 'delete':
        // Check if any campaigns are sending or sent
        const nonDeletableCampaigns = campaigns.filter(c => 
          c.status === 'SENDING' || c.status === 'SENT'
        )
        
        if (nonDeletableCampaigns.length > 0) {
          return NextResponse.json({
            error: `Cannot delete campaigns that are sent or currently sending: ${nonDeletableCampaigns.map(c => c.name).join(', ')}`
          }, { status: 400 })
        }

        await prisma.campaign.deleteMany({
          where: {
            id: { in: campaignIds },
            userId: session.user.id
          }
        })

        results = campaignIds.map(id => ({
          id,
          action: 'deleted',
          success: true
        }))
        break

      case 'pause':
        await prisma.campaign.updateMany({
          where: {
            id: { in: campaignIds },
            userId: session.user.id,
            status: { in: ['SCHEDULED', 'SENDING'] }
          },
          data: {
            status: 'PAUSED'
          }
        })

        results = campaignIds.map(id => ({
          id,
          action: 'paused',
          success: true
        }))
        break

      case 'resume':
        await prisma.campaign.updateMany({
          where: {
            id: { in: campaignIds },
            userId: session.user.id,
            status: 'PAUSED'
          },
          data: {
            status: options?.newStatus || 'SCHEDULED'
          }
        })

        results = campaignIds.map(id => ({
          id,
          action: 'resumed',
          success: true
        }))
        break

      case 'duplicate':
        results = []
        
        for (const campaign of campaigns) {
          // Get campaign with recipients
          const fullCampaign = await prisma.campaign.findFirst({
            where: { id: campaign.id },
            include: {
              recipients: {
                select: {
                  contactId: true
                }
              }
            }
          })

          if (!fullCampaign) continue

          const newCampaign = await prisma.$transaction(async (tx) => {
            // Create duplicate campaign
            const duplicate = await tx.campaign.create({
              data: {
                userId: session.user.id,
                name: `${options?.namePrefix || 'Copy of'} ${fullCampaign.name}`,
                subject: fullCampaign.subject,
                content: fullCampaign.content,
                status: 'DRAFT',
                trackingEnabled: fullCampaign.trackingEnabled,
                trackingDomainId: fullCampaign.trackingDomainId
              }
            })

            // Duplicate recipients
            if (fullCampaign.recipients.length > 0) {
              await tx.recipient.createMany({
                data: fullCampaign.recipients.map(r => ({
                  campaignId: duplicate.id,
                  contactId: r.contactId,
                  status: 'PENDING' as const
                }))
              })
            }

            return duplicate
          })

          results.push({
            id: campaign.id,
            action: 'duplicated',
            success: true,
            newCampaignId: newCampaign.id,
            newCampaignName: newCampaign.name
          })
        }
        break

      case 'archive':
        // Archive by setting a custom status or flag
        await prisma.campaign.updateMany({
          where: {
            id: { in: campaignIds },
            userId: session.user.id
          },
          data: {
            // You might want to add an 'archived' field to the schema
            // For now, we'll use a different approach
            status: 'SENT' // Mark as sent to effectively archive
          }
        })

        results = campaignIds.map(id => ({
          id,
          action: 'archived',
          success: true
        }))
        break

      default:
        return NextResponse.json({ 
          error: `Unsupported action: ${action}` 
        }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      action,
      results,
      summary: {
        total: campaignIds.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    })

  } catch (error) {
    console.error('Error performing bulk campaign operation:', error)
    return NextResponse.json({ 
      error: 'Failed to perform bulk operation' 
    }, { status: 500 })
  }
}