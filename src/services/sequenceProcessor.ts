import { prisma } from '@/lib/prisma'
import { GmailService } from '@/services/gmail-service'
import { EventType, EnrollmentStatus } from '@prisma/client'

interface SequenceStep {
  id: string
  type: 'email' | 'delay' | 'condition'
  content?: string
  subject?: string
  replyToThread?: boolean
  trackingEnabled?: boolean
  delay?: {
    value: number
    unit: 'minutes' | 'hours' | 'days'
  }
  condition?: {
    type: 'opened' | 'clicked' | 'replied'
    referenceStepId?: string
    trueBranch?: SequenceStep[]
    falseBranch?: SequenceStep[]
  }
}

export class SequenceProcessor {
  /**
   * Process all active sequence enrollments
   */
  async processActiveEnrollments() {
    console.log('[SequenceProcessor] Starting to process active enrollments...')
    
    try {
      // Get all active enrollments with their sequences and contacts
      const activeEnrollments = await prisma.sequenceEnrollment.findMany({
        where: {
          status: 'ACTIVE'
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
          contact: true
        }
      })

      console.log(`[SequenceProcessor] Found ${activeEnrollments.length} active enrollments`)

      // Process each enrollment
      const results = await Promise.allSettled(
        activeEnrollments.map(enrollment => this.processEnrollment(enrollment))
      )

      // Log results
      const successful = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length
      
      console.log(`[SequenceProcessor] Processed ${successful} successfully, ${failed} failed`)

      return {
        total: activeEnrollments.length,
        successful,
        failed
      }
    } catch (error) {
      console.error('[SequenceProcessor] Error processing enrollments:', error)
      throw error
    }
  }

  /**
   * Process a single enrollment
   */
  async processEnrollment(enrollment: any) {
    try {
      const { sequence, contact } = enrollment
      let steps: SequenceStep[]
      
      // Handle both JSON string and object formats
      if (typeof sequence.steps === 'string') {
        try {
          steps = JSON.parse(sequence.steps) as SequenceStep[]
        } catch (parseError) {
          console.error(`[SequenceProcessor] Failed to parse steps for sequence ${sequence.id}:`, parseError)
          console.error(`[SequenceProcessor] Raw steps data:`, sequence.steps)
          throw new Error(`Invalid sequence steps format`)
        }
      } else if (Array.isArray(sequence.steps)) {
        steps = sequence.steps as SequenceStep[]
      } else {
        console.error(`[SequenceProcessor] Unexpected steps format for sequence ${sequence.id}:`, typeof sequence.steps)
        console.error(`[SequenceProcessor] Raw steps data:`, sequence.steps)
        steps = []
      }
      
      if (!steps || steps.length === 0) {
        console.log(`[SequenceProcessor] No steps found for sequence ${sequence.id}`)
        return
      }

      // Get the current step
      const currentStepIndex = enrollment.currentStep
      if (currentStepIndex >= steps.length) {
        // Sequence completed
        console.log(`[SequenceProcessor] Sequence completed for enrollment ${enrollment.id} (step ${currentStepIndex} >= ${steps.length})`)
        await this.completeEnrollment(enrollment.id)
        return
      }

      const currentStep = steps[currentStepIndex]
      console.log(`[SequenceProcessor] Processing step ${currentStepIndex} of type ${currentStep.type} for enrollment ${enrollment.id}`)
      console.log(`[SequenceProcessor] Contact: ${contact.email}, Last email sent: ${enrollment.lastEmailSentAt}`)

      // Check if enough time has passed since last action
      if (!(await this.isStepDue(enrollment, currentStep))) {
        console.log(`[SequenceProcessor] Step not due yet for enrollment ${enrollment.id}`)
        return
      }

      // Process based on step type
      switch (currentStep.type) {
        case 'email':
          await this.processEmailStep(enrollment, currentStep)
          break
        case 'delay':
          // For delay steps, just move to next step once delay has passed
          // isStepDue already verified the delay has passed
          await prisma.sequenceEnrollment.update({
            where: { id: enrollment.id },
            data: {
              currentStep: enrollment.currentStep + 1,
              updatedAt: new Date()
            }
          })
          console.log(`[SequenceProcessor] Delay completed, moved to step ${enrollment.currentStep + 1} for enrollment ${enrollment.id}`)
          break
        case 'condition':
          await this.processConditionStep(enrollment, currentStep, steps)
          break
        default:
          console.warn(`[SequenceProcessor] Unknown step type: ${currentStep.type}`)
      }
    } catch (error) {
      console.error(`[SequenceProcessor] Error processing enrollment ${enrollment.id}:`, error)
      console.error(`[SequenceProcessor] Enrollment details:`, {
        id: enrollment.id,
        currentStep: enrollment.currentStep,
        sequenceId: enrollment.sequenceId,
        contactEmail: enrollment.contact?.email,
        lastEmailSentAt: enrollment.lastEmailSentAt
      })
      throw error
    }
  }

  /**
   * Check if a step is due to be processed
   */
  async isStepDue(enrollment: any, step: SequenceStep): Promise<boolean> {
    // For email steps, check immediately
    if (step.type === 'email') {
      return true
    }

    // For delay steps, check if delay has passed since last email was sent
    if (step.type === 'delay' && step.delay) {
      // Use lastEmailSentAt as the reference point for delays
      const lastAction = enrollment.lastEmailSentAt || enrollment.updatedAt || enrollment.createdAt
      const delayMs = this.calculateDelayInMs(step.delay)
      const nextStepTime = new Date(lastAction.getTime() + delayMs)
      
      const now = new Date()
      const isDue = now >= nextStepTime
      
      if (!isDue) {
        console.log(`[SequenceProcessor] Delay not due yet. Waiting until ${nextStepTime.toISOString()} (current time: ${now.toISOString()})`)
      }
      
      return isDue
    }

    // For condition steps, evaluate immediately
    if (step.type === 'condition') {
      return true
    }

    return true
  }

  /**
   * Calculate delay in milliseconds
   */
  calculateDelayInMs(delay: { value: number; unit: string }): number {
    const { value, unit } = delay
    switch (unit) {
      case 'minutes':
        return value * 60 * 1000
      case 'hours':
        return value * 60 * 60 * 1000
      case 'days':
        return value * 24 * 60 * 60 * 1000
      default:
        return 0
    }
  }

  /**
   * Process an email step
   */
  async processEmailStep(enrollment: any, step: SequenceStep) {
    const { sequence, contact } = enrollment
    const { user } = sequence
    let steps: SequenceStep[]

    // Parse steps array
    if (typeof sequence.steps === 'string') {
      try {
        steps = JSON.parse(sequence.steps) as SequenceStep[]
      } catch (parseError) {
        console.error(`[SequenceProcessor] Failed to parse steps for sequence ${sequence.id}`)
        return
      }
    } else if (Array.isArray(sequence.steps)) {
      steps = sequence.steps as SequenceStep[]
    } else {
      console.error(`[SequenceProcessor] Unexpected steps format for sequence ${sequence.id}`)
      return
    }

    if (!user.gmailToken) {
      console.error(`[SequenceProcessor] No Gmail token for user ${user.id}`)
      return
    }

    try {
      // Initialize Gmail service
      const gmailService = new GmailService()

      // Prepare email content with variable replacement
      let subject = step.subject || 'No subject'
      let content = step.content || ''

      // Replace variables
      subject = this.replaceVariables(subject, contact)
      content = this.replaceVariables(content, contact)

      // Check if tracking is enabled for this sequence AND step
      // Access the step properties correctly - they're at the step level
      const isTrackingEnabled = sequence.trackingEnabled && (step.trackingEnabled !== false)
      
      // Check if we should reply to thread - also at step level
      const shouldReplyToThread = step.replyToThread === true
      
      console.log(`[SequenceProcessor] Email settings for step ${enrollment.currentStep}:`)
      console.log(`  - Step data:`, JSON.stringify(step, null, 2))
      console.log(`  - Tracking enabled: ${isTrackingEnabled} (sequence: ${sequence.trackingEnabled}, step: ${step.trackingEnabled})`)
      console.log(`  - Reply to thread: ${shouldReplyToThread}`)
      console.log(`  - Existing thread ID: ${enrollment.gmailThreadId}`)
      console.log(`  - Existing message ID: ${enrollment.gmailMessageId}`)

      // Prepare email data for GmailService
      const emailData: any = {
        to: [contact.email],
        subject: subject,
        htmlContent: content,
        textContent: content.replace(/<[^>]*>/g, ''), // Strip HTML for text version
        fromName: user.name || user.email,
        sequenceId: sequence.id,
        contactId: contact.id
      }

      // Only add threading info if replying to thread AND we have the necessary IDs
      if (shouldReplyToThread && enrollment.gmailMessageId) {
        emailData.threadId = enrollment.gmailThreadId || undefined
        emailData.messageId = enrollment.gmailMessageId
        console.log(`[SequenceProcessor] Threading enabled - will reply to message ${enrollment.gmailMessageId}`)
      } else if (shouldReplyToThread) {
        console.log(`[SequenceProcessor] Threading requested but no previous message ID available`)
      }

      // Only add tracking if enabled
      if (isTrackingEnabled) {
        emailData.trackingId = `seq_${sequence.id}_${enrollment.id}_${step.id}`
        console.log(`[SequenceProcessor] Tracking enabled with ID: ${emailData.trackingId}`)
      } else {
        console.log(`[SequenceProcessor] Tracking disabled for this email`)
      }

      // Send email via Gmail
      const result = await gmailService.sendEmail(
        user.id,
        user.email,
        emailData
      )

      // Determine next step index
      let nextStepIndex = enrollment.currentStep + 1
      
      // Check if this email is part of a condition branch
      if (enrollment.currentStep > 0) {
        const prevStep = steps[enrollment.currentStep - 1]
        if (prevStep && prevStep.type === 'condition') {
          // This is a true branch email (immediately after condition)
          // After sending, skip to N+3 (past the false branch)
          nextStepIndex = enrollment.currentStep + 2
          console.log(`[SequenceProcessor] Sent true branch email, skipping false branch to step ${nextStepIndex}`)
        } else if (enrollment.currentStep > 1) {
          const prevPrevStep = steps[enrollment.currentStep - 2]
          if (prevPrevStep && prevPrevStep.type === 'condition') {
            // This is a false branch email (two steps after condition)
            // After sending, move to the next step normally (already past both branches)
            nextStepIndex = enrollment.currentStep + 1
            console.log(`[SequenceProcessor] Sent false branch email, continuing to step ${nextStepIndex}`)
          }
        }
      }

      // Update enrollment with message info
      await prisma.sequenceEnrollment.update({
        where: { id: enrollment.id },
        data: {
          lastEmailSentAt: new Date(),
          gmailMessageId: result.messageId,
          gmailThreadId: result.threadId || enrollment.gmailThreadId,
          currentStep: nextStepIndex,
          updatedAt: new Date()
        }
      })

      // Record email event
      await prisma.emailEvent.create({
        data: {
          userId: user.id,
          sequenceId: sequence.id,
          contactId: contact.id,
          type: 'SENT',
          subject: subject,
          timestamp: new Date()
        }
      })

      console.log(`[SequenceProcessor] Email sent for enrollment ${enrollment.id}, moved to step ${nextStepIndex}`)
    } catch (error) {
      console.error(`[SequenceProcessor] Error sending email for enrollment ${enrollment.id}:`, error)
      throw error
    }
  }


  /**
   * Process a condition step
   */
  async processConditionStep(enrollment: any, step: SequenceStep, allSteps: SequenceStep[]) {
    if (!step.condition) {
      console.warn(`[SequenceProcessor] No condition defined for step`)
      // Skip this malformed condition step
      await prisma.sequenceEnrollment.update({
        where: { id: enrollment.id },
        data: {
          currentStep: enrollment.currentStep + 1
        }
      })
      return
    }

    console.log(`[SequenceProcessor] Evaluating condition type: ${step.condition.type} for enrollment ${enrollment.id}`)
    const conditionMet = await this.evaluateCondition(enrollment, step.condition)
    console.log(`[SequenceProcessor] Condition result: ${conditionMet}`)
    
    // Determine the next step based on the condition result
    // The sequence structure typically has:
    // - Condition step at index N
    // - True branch email at index N+1
    // - False branch email at index N+2
    // - Continue with steps after both branches at N+3
    
    let nextStepIndex: number
    
    if (conditionMet) {
      // Condition is TRUE - go to the next step (true branch)
      nextStepIndex = enrollment.currentStep + 1
      console.log(`[SequenceProcessor] Condition TRUE - proceeding to step ${nextStepIndex} (true branch)`)
    } else {
      // Condition is FALSE - skip true branch and go to false branch
      // We need to skip the true branch email (N+1) and go to false branch (N+2)
      nextStepIndex = enrollment.currentStep + 2
      console.log(`[SequenceProcessor] Condition FALSE - skipping to step ${nextStepIndex} (false branch)`)
    }
    
    // Update to set the correct next step
    await prisma.sequenceEnrollment.update({
      where: { id: enrollment.id },
      data: {
        currentStep: nextStepIndex
      }
    })

    console.log(`[SequenceProcessor] Condition evaluated (${conditionMet}) for enrollment ${enrollment.id}, moved to step ${nextStepIndex}`)
  }

  /**
   * Evaluate a condition
   */
  async evaluateCondition(enrollment: any, condition: any): Promise<boolean> {
    const { type, referenceStepId } = condition

    // Get recent email events for this enrollment
    const events = await prisma.emailEvent.findMany({
      where: {
        contactId: enrollment.contactId,
        sequenceId: enrollment.sequenceId,
        timestamp: {
          gte: enrollment.lastEmailSentAt || enrollment.createdAt
        }
      },
      orderBy: {
        timestamp: 'desc'
      }
    })

    switch (type) {
      case 'opened':
        return events.some(e => e.type === 'OPENED')
      case 'clicked':
        return events.some(e => e.type === 'CLICKED')
      case 'replied':
        return events.some(e => e.type === 'REPLIED')
      default:
        return false
    }
  }

  /**
   * Complete an enrollment
   */
  async completeEnrollment(enrollmentId: string) {
    await prisma.sequenceEnrollment.update({
      where: { id: enrollmentId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date()
      }
    })

    console.log(`[SequenceProcessor] Enrollment ${enrollmentId} completed`)
  }

  /**
   * Replace variables in content
   */
  replaceVariables(content: string, contact: any): string {
    let result = content
    
    // Replace standard variables
    result = result.replace(/\{\{firstName\}\}/g, contact.firstName || '')
    result = result.replace(/\{\{lastName\}\}/g, contact.lastName || '')
    result = result.replace(/\{\{email\}\}/g, contact.email || '')
    result = result.replace(/\{\{company\}\}/g, contact.company || '')
    result = result.replace(/\{\{phone\}\}/g, contact.phone || '')
    
    // Replace custom variables if they exist
    if (contact.variables && typeof contact.variables === 'object') {
      Object.entries(contact.variables).forEach(([key, value]) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
        result = result.replace(regex, String(value))
      })
    }
    
    return result
  }
}

export const sequenceProcessor = new SequenceProcessor()