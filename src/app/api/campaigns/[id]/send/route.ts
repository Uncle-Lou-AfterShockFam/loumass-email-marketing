import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { GmailService } from '@/services/gmail-service'

// POST /api/campaigns/[id]/send - Trigger campaign send
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
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
                id: true,
                email: true,
                firstName: true,
                lastName: true
              }
            }
          }
        },
        sequence: {
          select: {
            id: true,
            name: true,
            status: true
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
      sequenceId: campaign.sequenceId,
      sequenceName: campaign.sequence?.name,
      sentBy: session.user.email
    })

    // Process first batch of emails immediately (up to 5 to avoid timeout)
    // Then process remaining in background
    const IMMEDIATE_BATCH_SIZE = 5
    const recipientsToProcess = campaign.recipients.slice(0, IMMEDIATE_BATCH_SIZE)
    const remainingRecipients = campaign.recipients.slice(IMMEDIATE_BATCH_SIZE)
    
    // Process immediate batch
    if (recipientsToProcess.length > 0) {
      try {
        const gmailService = new GmailService()
        const contacts = recipientsToProcess.map(recipient => ({
          id: recipient.contact.id,
          email: recipient.contact.email,
          firstName: recipient.contact.firstName || undefined,
          lastName: recipient.contact.lastName || undefined,
        }))
        
        await gmailService.sendBulkCampaign(
          session.user.id,
          gmailToken.email,
          id,
          contacts
        )
      } catch (error) {
        console.error('Immediate batch processing failed:', error)
      }
    }
    
    // Process remaining in background if any
    if (remainingRecipients.length > 0) {
      processRemainingEmails(id, gmailToken.email, session.user.id, IMMEDIATE_BATCH_SIZE).catch(error => {
        console.error(`Campaign ${id} background processing failed:`, error)
      })
    }

    // Enroll contacts in sequence if one is selected
    if (campaign.sequenceId && campaign.sequence?.status === 'ACTIVE') {
      console.log(`Enrolling ${campaign.recipients.length} contacts into sequence: ${campaign.sequence.name}`)
      
      try {
        // Get all contact IDs and recipient IDs from recipients
        const contactIds = campaign.recipients.map(recipient => recipient.contact.id)
        const recipientIds = campaign.recipients.map(recipient => recipient.id)
        
        // Get the base URL from the request
        const protocol = request.headers.get('x-forwarded-proto') || 'http'
        const host = request.headers.get('host') || 'localhost:3000'
        const baseUrl = `${protocol}://${host}`
        
        // Call the sequence enrollment API with campaign context
        const enrollmentResponse = await fetch(`${baseUrl}/api/sequences/${campaign.sequenceId}/enroll`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Pass the session as a custom header for internal API calls
            'x-user-id': session.user.id
          },
          body: JSON.stringify({
            contactIds,
            startImmediately: true,
            // Pass campaign context for conditional triggering
            campaignContext: {
              campaignId: campaign.id,
              recipientIds: recipientIds
            }
          })
        })

        if (enrollmentResponse.ok) {
          const enrollmentResult = await enrollmentResponse.json()
          console.log('Sequence enrollment completed:', enrollmentResult)
        } else {
          const error = await enrollmentResponse.text()
          console.error('Sequence enrollment failed:', error)
        }
      } catch (error) {
        console.error('Error enrolling contacts in sequence:', error)
      }
    }

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

// Process remaining emails after immediate batch
async function processRemainingEmails(campaignId: string, gmailEmail: string, userId: string, skipCount: number) {
  const gmailService = new GmailService()
  
  try {
    // Get campaign with remaining recipients
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        recipients: {
          skip: skipCount,
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

    if (!campaign || campaign.recipients.length === 0) {
      return
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
    await gmailService.sendBulkCampaign(
      userId,
      gmailEmail,
      campaignId,
      contacts
    )
  } catch (error) {
    console.error(`Campaign ${campaignId} background processing failed:`, error)
  }
}

// Original background email processing function (kept for compatibility)
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