import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { GmailService } from '@/services/gmail-service'

// POST /api/campaigns/[id]/send - Trigger campaign send
export async function POST(
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
      },
      include: {
        recipients: {
          include: {
            contact: {
              select: {
                email: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    })

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Validate campaign can be sent
    if (campaign.status === 'SENT') {
      return NextResponse.json({ 
        error: 'Campaign has already been sent' 
      }, { status: 400 })
    }

    // Remove the SENDING check - we'll update status below

    if (campaign.recipients.length === 0) {
      return NextResponse.json({ 
        error: 'Campaign has no recipients' 
      }, { status: 400 })
    }

    // Check if user has Gmail connected
    console.log('Checking Gmail token for user:', session.user.id)
    const gmailToken = await prisma.gmailToken.findUnique({
      where: { userId: session.user.id }
    })
    console.log('Gmail token found:', !!gmailToken, gmailToken?.email)

    if (!gmailToken) {
      return NextResponse.json({ 
        error: 'Gmail not connected. Please connect your Gmail account first.' 
      }, { status: 400 })
    }

    // Update campaign status to SENDING
    const updatedCampaign = await prisma.campaign.update({
      where: { id: id },
      data: { 
        status: 'SENDING',
        sentAt: new Date()
      }
    })

    console.log('Campaign send initiated:', {
      campaignId: id,
      recipientCount: campaign.recipients.length,
      subject: campaign.subject,
      trackingEnabled: campaign.trackingEnabled,
      sentBy: session.user.email
    })

    // Process email sending in background
    // In production, this should be moved to a proper job queue like Bull/BullMQ
    processEmailSending(id, gmailToken.email, session.user.id).catch(error => {
      console.error(`Campaign ${id} processing failed:`, error)
    })

    return NextResponse.json({
      success: true,
      message: 'Campaign send initiated successfully',
      campaign: {
        id: updatedCampaign.id,
        status: updatedCampaign.status,
        sentAt: updatedCampaign.sentAt,
        recipientCount: campaign.recipients.length
      }
    })

  } catch (error) {
    console.error('Error initiating campaign send:', error)
    return NextResponse.json({ 
      error: 'Failed to initiate campaign send' 
    }, { status: 500 })
  }
}

// Background email processing function
async function processEmailSending(campaignId: string, gmailEmail: string, userId: string) {
  const gmailService = new GmailService()
  
  try {
    // Get campaign with recipients and contacts
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
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
                variables: true
              }
            }
          }
        }
      }
    })

    if (!campaign) {
      throw new Error('Campaign not found')
    }

    // Prepare contact data for bulk sending
    const contacts = campaign.recipients.map(recipient => ({
      id: recipient.contact.id,
      email: recipient.contact.email,
      firstName: recipient.contact.firstName || undefined,
      lastName: recipient.contact.lastName || undefined,
      company: recipient.contact.company || undefined,
      customFields: recipient.contact.variables as any
    }))

    // Send emails via Gmail API
    const results = await gmailService.sendBulkCampaign(
      userId,
      gmailEmail,
      campaignId,
      contacts
    )

    console.log(`Campaign ${campaignId} processing completed:`, {
      total: contacts.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    })

  } catch (error) {
    console.error(`Campaign ${campaignId} processing failed:`, error)
    
    // Update campaign status to FAILED
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { 
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }
    })
  }
}