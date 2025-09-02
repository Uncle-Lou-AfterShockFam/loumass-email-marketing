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

    const steps = enrollment.sequence.steps as any[] // JSON array of steps
    
    // The currentStep field represents the index of the step to execute NOW
    // (not the last step executed)
    let stepToExecute: any
    let stepToExecuteIndex: number = enrollment.currentStep
    
    // Get the step to execute based on current index
    stepToExecute = steps[stepToExecuteIndex]
    
    // If we have a step with an ID and it has a nextStepId, use that for flow control
    if (stepToExecute?.id && stepToExecute?.nextStepId) {
      // This step has explicit flow control to another step
      const nextStepIndex = steps.findIndex((s: any) => s.id === stepToExecute.nextStepId)
      if (nextStepIndex >= 0) {
        // We'll update currentStep to this after processing
        // But for now, we execute the current step
      }
    }

    if (!stepToExecute) {
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

    // Handle different step types
    if (stepToExecute.type === 'delay') {
      // Schedule next action after delay
      const delayHours = (stepToExecute.delay?.days || 0) * 24 + (stepToExecute.delay?.hours || 0)
      const nextActionAt = new Date(Date.now() + delayHours * 60 * 60 * 1000)
      
      await prisma.sequenceEnrollment.update({
        where: { id: enrollmentId },
        data: {
          currentStep: stepToExecuteIndex + 1,
          // nextActionAt field doesn't exist in schema yet
          updatedAt: nextActionAt
        }
      })
      
      return { success: true, reason: `Delayed for ${delayHours} hours` }
    }
    
    if (stepToExecute.type === 'condition') {
      // Evaluate condition and choose branch
      const conditionMet = await this.evaluateCondition(
        stepToExecute.condition,
        enrollment.contactId,
        enrollment.sequenceId
      )
      
      // Determine next step based on condition result
      let branchStepId: string | undefined
      if (conditionMet && stepToExecute.condition?.trueBranch?.[0]) {
        branchStepId = stepToExecute.condition.trueBranch[0]
      } else if (!conditionMet && stepToExecute.condition?.falseBranch?.[0]) {
        branchStepId = stepToExecute.condition.falseBranch[0]
      } else {
        // No branch defined, continue to next step
        branchStepId = stepToExecute.nextStepId || steps[stepToExecuteIndex + 1]?.id
      }
      
      // Check if the branch indicates ending the sequence
      if (branchStepId === 'END') {
        await prisma.sequenceEnrollment.update({
          where: { id: enrollmentId },
          data: {
            status: EnrollmentStatus.COMPLETED,
            completedAt: new Date()
          }
        })
        return { success: true, completed: true, reason: 'Sequence ended by condition branch' }
      }
      
      if (branchStepId) {
        const branchStepIndex = steps.findIndex((s: any) => s.id === branchStepId)
        await prisma.sequenceEnrollment.update({
          where: { id: enrollmentId },
          data: {
            currentStep: branchStepIndex >= 0 ? branchStepIndex : stepToExecuteIndex + 1
          }
        })
        
        // Process the branch step immediately
        return this.processSequenceStep(enrollmentId)
      }
      
      // No valid branch, complete sequence
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
    if (stepToExecute.sendOnlyIfNoReply) {
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

    if (stepToExecute.sendOnlyIfNoOpen) {
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

    // Only process email steps (skip delays and conditions that were already handled)
    if (stepToExecute.type !== 'email') {
      // Move to next step
      await prisma.sequenceEnrollment.update({
        where: { id: enrollmentId },
        data: { currentStep: stepToExecuteIndex + 1 }
      })
      return this.processSequenceStep(enrollmentId)
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
    // Handle both 'content' and 'htmlContent' fields for backward compatibility
    const subject = this.replaceVariables(stepToExecute.subject || '', enrollment.contact)
    const htmlContent = this.replaceVariables(
      stepToExecute.htmlContent || stepToExecute.content || '', 
      enrollment.contact
    )
    const textContent = stepToExecute.textContent ? 
      this.replaceVariables(stepToExecute.textContent, enrollment.contact) : undefined

    // Validate we have required content
    if (!subject || !htmlContent) {
      console.error('Sequence step missing required fields:', {
        enrollmentId,
        stepIndex: stepToExecuteIndex,
        hasSubject: !!subject,
        hasHtmlContent: !!htmlContent,
        stepData: stepToExecute
      })
      // Skip to next step if content is missing
      await prisma.sequenceEnrollment.update({
        where: { id: enrollmentId },
        data: { currentStep: enrollment.currentStep + 1 }
      })
      return this.processSequenceStep(enrollmentId)
    }

    // Generate tracking ID for sequences
    // Format: seq:enrollmentId:stepIndex:timestamp
    const trackingData = `seq:${enrollmentId}:${enrollment.currentStep}:${Date.now()}`
    const trackingId = Buffer.from(trackingData).toString('base64url')

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
      const result = await this.gmailService.sendEmail(
        enrollment.sequence.userId,
        gmailToken.email,
        {
          to: [enrollment.contact.email],
          subject,
          htmlContent: enrollment.sequence.trackingEnabled ? 
            this.addTrackingToEmail(htmlContent, trackingId) : htmlContent,
          textContent,
          trackingId,
          sequenceId: enrollment.sequenceId,
          contactId: enrollment.contactId,
          threadId
        }
      )

      // Update enrollment with Gmail thread ID for reply tracking
      await prisma.sequenceEnrollment.update({
        where: { id: enrollmentId },
        data: { 
          currentStep: enrollment.currentStep + 1,
          lastEmailSentAt: new Date(),
          gmailMessageId: result.messageId,
          gmailThreadId: result.threadId
        }
      })

      return { success: true, sentStep: stepToExecuteIndex + 1 }
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
    
    const pixelUrl = `${baseUrl}/api/track/open/${trackingId}`
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
      
      const trackedUrl = `${baseUrl}/api/track/click/${trackingId}?url=${encodeURIComponent(url)}`
      return match.replace(url, trackedUrl)
    })
    
    return trackedHtml
  }

  private async evaluateCondition(
    condition: any,
    contactId: string,
    sequenceId: string
  ): Promise<boolean> {
    if (!condition || !condition.type) {
      return false
    }

    // Get enrollment for checking events
    const enrollment = await prisma.sequenceEnrollment.findFirst({
      where: {
        sequenceId,
        contactId
      }
    })

    if (!enrollment) return false

    // Check for email events based on condition type
    switch (condition.type) {
      case 'opened':
        return await this.hasContactOpened(enrollment.id, condition.referenceStep)
      
      case 'clicked':
        return await this.hasContactClicked(enrollment.id, condition.referenceStep)
      
      case 'replied':
        return await this.hasContactReplied(enrollment.id, condition.referenceStep)
      
      case 'not_opened':
        return !(await this.hasContactOpened(enrollment.id, condition.referenceStep))
      
      case 'not_clicked':
        return !(await this.hasContactClicked(enrollment.id, condition.referenceStep))
      
      case 'not_replied':
        return !(await this.hasContactReplied(enrollment.id, condition.referenceStep))
      
      case 'opened_no_reply':
        const opened = await this.hasContactOpened(enrollment.id, condition.referenceStep)
        const replied = await this.hasContactReplied(enrollment.id, condition.referenceStep)
        return opened && !replied
      
      case 'opened_no_click':
        const openedNoClick = await this.hasContactOpened(enrollment.id, condition.referenceStep)
        const clicked = await this.hasContactClicked(enrollment.id, condition.referenceStep)
        return openedNoClick && !clicked
      
      case 'clicked_no_reply':
        const clickedNoReply = await this.hasContactClicked(enrollment.id, condition.referenceStep)
        const repliedAfterClick = await this.hasContactReplied(enrollment.id, condition.referenceStep)
        return clickedNoReply && !repliedAfterClick
      
      case 'time_elapsed':
        return this.evaluateTimeCondition(condition, contactId)
      
      case 'custom_field':
        return await this.evaluateCustomFieldCondition(condition, contactId)
      
      default:
        console.warn(`Unknown condition type: ${condition.type}`)
        return false
    }
  }

  private async hasContactOpened(enrollmentId: string, referenceStep?: string): Promise<boolean> {
    // Find the step index from the reference step ID
    const enrollment = await prisma.sequenceEnrollment.findUnique({
      where: { id: enrollmentId },
      include: { sequence: true }
    })
    
    if (!enrollment) return false
    
    const steps = enrollment.sequence.steps as any[]
    const stepIndex = referenceStep ? steps.findIndex((s: any) => s.id === referenceStep) : enrollment.currentStep - 1
    
    if (stepIndex < 0) return false
    
    const openEvent = await prisma.sequenceEvent.findFirst({
      where: {
        enrollmentId,
        stepIndex,
        eventType: 'OPENED'
      }
    })
    
    return !!openEvent
  }

  private async hasContactClicked(enrollmentId: string, referenceStep?: string): Promise<boolean> {
    // Find the step index from the reference step ID
    const enrollment = await prisma.sequenceEnrollment.findUnique({
      where: { id: enrollmentId },
      include: { sequence: true }
    })
    
    if (!enrollment) return false
    
    const steps = enrollment.sequence.steps as any[]
    const stepIndex = referenceStep ? steps.findIndex((s: any) => s.id === referenceStep) : enrollment.currentStep - 1
    
    if (stepIndex < 0) return false
    
    const clickEvent = await prisma.sequenceEvent.findFirst({
      where: {
        enrollmentId,
        stepIndex,
        eventType: 'CLICKED'
      }
    })
    
    return !!clickEvent
  }

  private async hasContactReplied(enrollmentId: string, referenceStep?: string): Promise<boolean> {
    // Find the step index from the reference step ID
    const enrollment = await prisma.sequenceEnrollment.findUnique({
      where: { id: enrollmentId },
      include: { sequence: true }
    })
    
    if (!enrollment) return false
    
    const steps = enrollment.sequence.steps as any[]
    const stepIndex = referenceStep ? steps.findIndex((s: any) => s.id === referenceStep) : enrollment.currentStep - 1
    
    if (stepIndex < 0) return false
    
    const replyEvent = await prisma.sequenceEvent.findFirst({
      where: {
        enrollmentId,
        stepIndex,
        eventType: 'REPLIED'
      }
    })
    
    return !!replyEvent
  }

  private evaluateTimeCondition(condition: any, contactId: string): boolean {
    // Check if specified time has elapsed since enrollment or last step
    const timeValue = condition.timeValue || 0
    const timeUnit = condition.timeUnit || 'hours' // hours, days, weeks
    
    // This would need enrollment start time or last step time
    // For now, return true (condition met) as placeholder
    return true
  }

  private async evaluateCustomFieldCondition(condition: any, contactId: string): Promise<boolean> {
    const contact = await prisma.contact.findUnique({
      where: { id: contactId }
    })
    
    if (!contact || !contact.variables) {
      return false
    }
    
    const fieldValue = (contact.variables as any)[condition.fieldName]
    const expectedValue = condition.fieldValue
    const operator = condition.operator || 'equals'
    
    switch (operator) {
      case 'equals':
        return fieldValue === expectedValue
      case 'not_equals':
        return fieldValue !== expectedValue
      case 'contains':
        return String(fieldValue).includes(String(expectedValue))
      case 'greater_than':
        return Number(fieldValue) > Number(expectedValue)
      case 'less_than':
        return Number(fieldValue) < Number(expectedValue)
      default:
        return false
    }
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