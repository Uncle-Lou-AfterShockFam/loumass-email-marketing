import { prisma } from '@/lib/prisma'
import { GmailService } from './gmail-service'
import { EnrollmentStatus } from '@prisma/client'

export class SequenceService {
  private gmailService = new GmailService()

  async enrollContact(sequenceId: string, contactId: string) {
    // Check if already enrolled
    const existingEnrollment = await prisma.sequenceEnrollment.findUnique({
      where: {
        sequenceId_contactId: {
          sequenceId,
          contactId
        }
      }
    })

    if (existingEnrollment) {
      return existingEnrollment
    }

    // Create enrollment
    return await prisma.sequenceEnrollment.create({
      data: {
        sequenceId,
        contactId,
        status: EnrollmentStatus.ACTIVE,
        currentStep: 0
      }
    })
  }

  async processSequenceStep(enrollmentId: string): Promise<{ success: boolean; reason?: string; completed?: boolean; sentStep?: number }> {
    const enrollment = await prisma.sequenceEnrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        sequence: {
          include: {
            user: true
          }
        },
        contact: true
      }
    })

    if (!enrollment || enrollment.status !== EnrollmentStatus.ACTIVE) {
      return { success: false, reason: 'Enrollment not active' }
    }

    const nextStepIndex = enrollment.currentStep
    const steps = enrollment.sequence.steps as any[] // JSON array of steps
    const nextStep = steps[nextStepIndex]

    if (!nextStep) {
      // Sequence completed
      await prisma.sequenceEnrollment.update({
        where: { id: enrollmentId },
        data: {
          status: EnrollmentStatus.COMPLETED,
          completedAt: new Date()
        }
      })
      return { success: true, completed: true }
    }

    // Check conditions
    if (nextStep.sendOnlyIfNoReply) {
      const hasReply = await this.checkForReply(enrollment.contactId, enrollment.sequenceId)
      if (hasReply) {
        await prisma.sequenceEnrollment.update({
          where: { id: enrollmentId },
          data: {
            status: EnrollmentStatus.COMPLETED,
            completedAt: new Date()
          }
        })
        return { success: false, reason: 'Contact replied' }
      }
    }

    if (nextStep.sendOnlyIfNoOpen) {
      const hasOpened = await this.checkForOpen(enrollment.contactId, enrollment.sequenceId)
      if (hasOpened) {
        // Skip this step but continue sequence
        await prisma.sequenceEnrollment.update({
          where: { id: enrollmentId },
          data: { currentStep: enrollment.currentStep + 1 }
        })
        return this.processSequenceStep(enrollmentId)
      }
    }

    // Get Gmail credentials
    const gmailToken = await prisma.gmailToken.findUnique({
      where: {
        userId: enrollment.sequence.userId
      }
    })

    if (!gmailToken) {
      return { success: false, reason: 'No active Gmail account' }
    }

    // Replace variables in content
    const subject = this.replaceVariables(nextStep.subject, enrollment.contact)
    const htmlContent = this.replaceVariables(nextStep.htmlContent, enrollment.contact)
    const textContent = nextStep.textContent ? 
      this.replaceVariables(nextStep.textContent, enrollment.contact) : undefined

    // Generate tracking ID
    const trackingId = `seq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Get thread ID for replies (default: same thread for sequences)
    let threadId: string | undefined
    const previousRecipient = await prisma.recipient.findFirst({
      where: {
        contactId: enrollment.contactId
      },
      orderBy: { createdAt: 'desc' }
    })
    threadId = previousRecipient?.gmailThreadId || undefined

    // Send the email
    try {
      await this.gmailService.sendEmail(
        enrollment.sequence.userId,
        gmailToken.email,
        {
          to: [enrollment.contact.email],
          subject,
          htmlContent: this.addTrackingToEmail(htmlContent, trackingId),
          textContent,
          trackingId,
          sequenceId: enrollment.sequenceId,
          contactId: enrollment.contactId,
          threadId
        }
      )

      // Update enrollment
      await prisma.sequenceEnrollment.update({
        where: { id: enrollmentId },
        data: { currentStep: enrollment.currentStep + 1 }
      })

      return { success: true, sentStep: nextStep.position }
    } catch (error) {
      console.error('Failed to send sequence email:', error)
      return { 
        success: false, 
        reason: error instanceof Error ? error.message : 'Failed to send' 
      }
    }
  }

  async pauseEnrollment(enrollmentId: string) {
    return await prisma.sequenceEnrollment.update({
      where: { id: enrollmentId },
      data: {
        status: EnrollmentStatus.PAUSED,
        pausedAt: new Date()
      }
    })
  }

  async resumeEnrollment(enrollmentId: string) {
    return await prisma.sequenceEnrollment.update({
      where: { id: enrollmentId },
      data: {
        status: EnrollmentStatus.ACTIVE,
        pausedAt: null
      }
    })
  }

  private async checkForReply(contactId: string, sequenceId: string): Promise<boolean> {
    const recipient = await prisma.recipient.findFirst({
      where: {
        contactId,
        repliedAt: { not: null }
      }
    })
    return !!recipient
  }

  private async checkForOpen(contactId: string, sequenceId: string): Promise<boolean> {
    const recipient = await prisma.recipient.findFirst({
      where: {
        contactId,
        openedAt: { not: null }
      }
    })
    return !!recipient
  }

  private replaceVariables(text: string, contact: any): string {
    let result = text
    
    result = result.replace(/\{\{firstName\}\}/g, contact.firstName || '')
    result = result.replace(/\{\{lastName\}\}/g, contact.lastName || '')
    result = result.replace(/\{\{email\}\}/g, contact.email || '')
    result = result.replace(/\{\{company\}\}/g, contact.company || '')

    // Use 'variables' field from Prisma schema instead of 'customFields'
    if (contact.variables) {
      Object.entries(contact.variables as Record<string, any>).forEach(([key, value]) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
        result = result.replace(regex, String(value))
      })
    }

    return result
  }

  private addTrackingToEmail(html: string, trackingId: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_TRACKING_DOMAIN || 
                   process.env.NEXT_PUBLIC_APP_URL || 
                   'http://localhost:3000'
    
    const pixelUrl = `${baseUrl}/api/tracking/open/${trackingId}`
    const pixelHtml = `<img src="${pixelUrl}" width="1" height="1" style="display:none;" alt="" />`
    
    let trackedHtml = html
    if (html.includes('</body>')) {
      trackedHtml = html.replace('</body>', `${pixelHtml}</body>`)
    } else {
      trackedHtml = html + pixelHtml
    }
    
    const linkRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1/gi
    trackedHtml = trackedHtml.replace(linkRegex, (match, quote, url) => {
      if (url.includes('unsubscribe') || url.includes('mailto:')) {
        return match
      }
      
      const trackedUrl = `${baseUrl}/api/tracking/click/${trackingId}?url=${encodeURIComponent(url)}`
      return match.replace(url, trackedUrl)
    })
    
    return trackedHtml
  }

  async scheduleNextSteps() {
    // TODO: Temporarily commented out until sequenceStep model is added back
    // This would be called by a cron job to process scheduled sequence steps
    console.log('Schedule next steps functionality not yet implemented - requires sequenceStep model')
    
    // const now = new Date()
    
    // const activeEnrollments = await prisma.sequenceEnrollment.findMany({
    //   where: {
    //     status: EnrollmentStatus.ACTIVE
    //   },
    //   include: {
    //     sequence: true
    //   }
    // })

    // for (const enrollment of activeEnrollments) {
    //   const steps = enrollment.sequence.steps as any[] // JSON array of steps
    //   const currentStep = steps[enrollment.currentStep]
      
    //   if (!currentStep) continue

    //   // Calculate when this step should be sent
    //   const lastSequenceStep = await prisma.sequenceStep.findFirst({
    //     where: {
    //       enrollmentId: enrollment.id
    //     },
    //     orderBy: { createdAt: 'desc' }
    //   })

    //   if (lastSequenceStep && lastSequenceStep.sentAt) {
    //     const delayMs = (currentStep.delayDays || 0) * 24 * 60 * 60 * 1000 + (currentStep.delayHours || 0) * 60 * 60 * 1000
    //     const shouldSendAt = new Date(lastSequenceStep.sentAt.getTime() + delayMs)

    //     if (now >= shouldSendAt) {
    //       await this.processSequenceStep(enrollment.id)
    //     }
    //   } else {
    //     // First email in sequence, send immediately
    //     await this.processSequenceStep(enrollment.id)
    //   }
    // }
  }
}