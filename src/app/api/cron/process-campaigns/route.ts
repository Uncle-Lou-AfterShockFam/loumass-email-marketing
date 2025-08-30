import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { GmailService } from '@/services/gmail-service'

// This endpoint processes scheduled campaigns and sequences
// It should be called periodically (e.g., every minute) via a cron service like Vercel Cron or external service

export async function GET(request: Request) {
  try {
    // Verify the request is authorized (using a secret key)
    const authHeader = request.headers.get('authorization')
    const expectedKey = process.env.CRON_SECRET_KEY
    
    if (!expectedKey || authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const results = {
      scheduledCampaigns: 0,
      sequenceSteps: 0,
      errors: [] as Array<{
        type: string;
        id: string;
        error: string;
      }>
    }

    // Process scheduled campaigns
    const scheduledCampaigns = await prisma.campaign.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledFor: {
          lte: new Date()
        }
      },
      include: {
        user: {
          include: {
            gmailToken: true
          }
        },
        recipients: {
          include: {
            contact: true
          }
        }
      }
    })

    for (const campaign of scheduledCampaigns) {
      try {
        if (!campaign.user.gmailToken) {
          await prisma.campaign.update({
            where: { id: campaign.id },
            data: { 
              status: 'FAILED',
              errorMessage: 'Gmail not connected'
            }
          })
          continue
        }

        // Initialize Gmail service for this user
        const gmailService = new GmailService()
        const gmailToken = campaign.user.gmailToken!

        // Send to each recipient
        let sentCount = 0
        let failedCount = 0

        for (const recipient of campaign.recipients) {
          try {
            // Interpolate variables in subject and content
            const interpolatedSubject = interpolateVariables(
              campaign.subject,
              recipient.variables as Record<string, any>
            )
            const interpolatedContent = interpolateVariables(
              campaign.content,
              recipient.variables as Record<string, any>
            )

            // Generate tracking ID
            const trackingId = `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

            // Add tracking if enabled
            const trackedContent = campaign.trackingEnabled 
              ? await addTrackingToContent(
                  interpolatedContent,
                  campaign.id,
                  recipient.id,
                  campaign.trackingDomainId || undefined
                )
              : interpolatedContent

            // Send via Gmail API
            await gmailService.sendEmail(campaign.user.id, gmailToken.email, {
              to: [recipient.contact.email],
              subject: interpolatedSubject,
              htmlContent: trackedContent,
              trackingId,
              campaignId: campaign.id,
              contactId: recipient.id
            })

            // Update recipient status
            await prisma.recipient.update({
              where: { id: recipient.id },
              data: { 
                sentAt: new Date(),
                status: 'SENT'
              }
            })

            sentCount++
          } catch (error) {
            console.error(`Failed to send to ${recipient.contact.email}:`, error)
            
            await prisma.recipient.update({
              where: { id: recipient.id },
              data: { 
                status: 'FAILED',
                errorMessage: error instanceof Error ? error.message : 'Unknown error'
              }
            })
            
            failedCount++
          }
        }

        // Update campaign status
        await prisma.campaign.update({
          where: { id: campaign.id },
          data: {
            status: sentCount > 0 ? 'SENT' : 'FAILED',
            sentAt: new Date(),
            sentCount,
            failedCount
          }
        })

        results.scheduledCampaigns++
      } catch (error) {
        console.error(`Failed to process campaign ${campaign.id}:`, error)
        results.errors.push({
          type: 'campaign',
          id: campaign.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // TODO: Process sequence steps - needs implementation with proper SequenceEnrollment model
    // This section is commented out because SequenceStep model doesn't exist
    /*
    const pendingSequenceSteps = await prisma.sequenceStep.findMany({
      where: {
        scheduledFor: {
          lte: new Date()
        },
        status: 'PENDING'
      },
      include: {
        sequence: {
          include: {
            user: {
              include: {
                gmailToken: true
              }
            }
          }
        },
        enrollment: {
          include: {
            contact: true
          }
        }
      }
    })

    for (const step of pendingSequenceSteps) {
      try {
        if (!step.sequence.user.gmailToken) {
          await prisma.sequenceStep.update({
            where: { id: step.id },
            data: { 
              status: 'FAILED',
              errorMessage: 'Gmail not connected'
            }
          })
          continue
        }

        // Initialize Gmail service for this user
        const gmailService = new GmailService()
        const gmailToken = step.sequence.user.gmailToken!

        // Interpolate variables
        const interpolatedSubject = interpolateVariables(
          step.subject,
          step.enrollment.contact.variables as Record<string, any>
        )
        const interpolatedContent = interpolateVariables(
          step.content,
          step.enrollment.contact.variables as Record<string, any>
        )

        // Generate tracking ID
        const trackingId = `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

        // Add tracking if enabled
        const trackedContent = step.sequence.trackingEnabled 
          ? await addTrackingToContent(
              interpolatedContent,
              step.sequenceId,
              step.enrollment.contact.id,
              step.sequence.trackingDomainId || undefined
            )
          : interpolatedContent

        // Send via Gmail API
        const sentMessage = await gmailService.sendEmail(step.sequence.user.id, gmailToken.email, {
          to: [step.enrollment.contact.email],
          subject: interpolatedSubject,
          htmlContent: trackedContent,
          trackingId,
          sequenceId: step.sequenceId,
          contactId: step.enrollment.contact.id,
          threadId: (step.stepNumber > 0 && step.threadId) ? step.threadId : undefined
        })

        // Update step status
        await prisma.sequenceStep.update({
          where: { id: step.id },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            messageId: sentMessage.messageId,
            threadId: sentMessage.threadId
          }
        })

        // Schedule next step if exists
        const steps = step.sequence.steps as any[]
        const nextStepConfig = steps?.[step.stepNumber + 1]
        if (nextStepConfig) {
          const nextScheduledTime = new Date()
          nextScheduledTime.setHours(nextScheduledTime.getHours() + nextStepConfig.delayHours)

          await prisma.sequenceStep.create({
            data: {
              sequenceId: step.sequenceId,
              enrollmentId: step.enrollmentId,
              recipientId: step.enrollment.contact.id,
              stepNumber: step.stepNumber + 1,
              subject: nextStepConfig.subject,
              content: nextStepConfig.content,
              scheduledFor: nextScheduledTime,
              threadId: sentMessage.threadId,
              status: 'PENDING'
            }
          })
        }

        results.sequenceSteps++
      } catch (error) {
        console.error(`Failed to process sequence step ${step.id}:`, error)
        
        await prisma.sequenceStep.update({
          where: { id: step.id },
          data: { 
            status: 'FAILED',
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          }
        })
        
        results.errors.push({
          type: 'sequenceStep',
          id: step.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    */

    return NextResponse.json({
      success: true,
      processed: results,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      { 
        error: 'Cron job failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Helper function to interpolate variables
function interpolateVariables(text: string, variables: Record<string, any>): string {
  if (!variables) return text
  
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] || match
  })
}

// Helper function to add tracking to email content
async function addTrackingToContent(
  html: string,
  campaignOrSequenceId: string,
  recipientId: string,
  trackingDomainId?: string
): Promise<string> {
  // Get tracking domain if configured
  let trackingDomain = 'tracking.loumass.com'
  
  if (trackingDomainId) {
    const domain = await prisma.trackingDomain.findUnique({
      where: { id: trackingDomainId }
    })
    if (domain?.verified) {
      trackingDomain = `track.${domain.domain}`
    }
  }

  // Generate tracking ID
  const trackingId = Buffer.from(
    `${campaignOrSequenceId}:${recipientId}:${Date.now()}`
  ).toString('base64url')

  // Add open tracking pixel
  const pixelUrl = `https://${trackingDomain}/pixel/${trackingId}.gif`
  const pixelHtml = `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;" />`
  
  // Add pixel before closing body tag, or at the end if no body tag
  if (html.includes('</body>')) {
    html = html.replace('</body>', `${pixelHtml}</body>`)
  } else {
    html += pixelHtml
  }

  // Replace links with tracking redirects
  const clickDomain = trackingDomainId ? `click.${trackingDomain.replace('track.', '')}` : 'click.loumass.com'
  
  html = html.replace(
    /href="(https?:\/\/[^"]+)"/gi,
    (match, url) => {
      // Don't track unsubscribe links or certain domains
      if (url.includes('unsubscribe') || url.includes('loumass.com')) {
        return match
      }
      
      const encodedUrl = encodeURIComponent(url)
      const clickUrl = `https://${clickDomain}/c/${trackingId}?u=${encodedUrl}`
      return `href="${clickUrl}"`
    }
  )

  return html
}