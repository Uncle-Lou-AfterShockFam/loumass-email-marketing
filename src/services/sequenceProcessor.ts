import { prisma } from '@/lib/prisma'
import { GmailService } from '@/services/gmail-service'
import { EventType, EnrollmentStatus } from '@prisma/client'

interface SequenceStep {
  id: string
  type: 'email' | 'delay' | 'condition'
  content?: string
  subject?: string
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
      const steps = JSON.parse(sequence.steps) as SequenceStep[]
      
      if (!steps || steps.length === 0) {
        console.log(`[SequenceProcessor] No steps found for sequence ${sequence.id}`)
        return
      }

      // Get the current step
      const currentStepIndex = enrollment.currentStep
      if (currentStepIndex >= steps.length) {
        // Sequence completed
        await this.completeEnrollment(enrollment.id)
        return
      }

      const currentStep = steps[currentStepIndex]
      console.log(`[SequenceProcessor] Processing step ${currentStepIndex} of type ${currentStep.type} for enrollment ${enrollment.id}`)

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
          await this.processDelayStep(enrollment, currentStep)
          break
        case 'condition':
          await this.processConditionStep(enrollment, currentStep, steps)
          break
        default:
          console.warn(`[SequenceProcessor] Unknown step type: ${currentStep.type}`)
      }
    } catch (error) {
      console.error(`[SequenceProcessor] Error processing enrollment ${enrollment.id}:`, error)
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

    // For delay steps, check if delay has passed
    if (step.type === 'delay' && step.delay) {
      const lastAction = enrollment.updatedAt || enrollment.createdAt
      const delayMs = this.calculateDelayInMs(step.delay)
      const nextStepTime = new Date(lastAction.getTime() + delayMs)
      
      return new Date() >= nextStepTime
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

      // Prepare email data for GmailService
      const emailData = {
        to: [contact.email],
        subject: subject,
        htmlContent: content,
        textContent: content.replace(/<[^>]*>/g, ''), // Strip HTML for text version
        fromName: user.name || user.email,
        threadId: enrollment.gmailThreadId || undefined,
        messageId: enrollment.gmailMessageId || undefined,
        trackingId: `seq_${sequence.id}_${enrollment.id}_${step.id}`,
        sequenceId: sequence.id,
        contactId: contact.id
      }

      // Send email via Gmail
      const result = await gmailService.sendEmail(
        user.id,
        user.email,
        emailData
      )

      // Update enrollment with message info
      await prisma.sequenceEnrollment.update({
        where: { id: enrollment.id },
        data: {
          lastEmailSentAt: new Date(),
          gmailMessageId: result.messageId,
          gmailThreadId: result.threadId || enrollment.gmailThreadId,
          currentStep: enrollment.currentStep + 1,
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

      console.log(`[SequenceProcessor] Email sent for enrollment ${enrollment.id}`)
    } catch (error) {
      console.error(`[SequenceProcessor] Error sending email for enrollment ${enrollment.id}:`, error)
      throw error
    }
  }

  /**
   * Process a delay step
   */
  async processDelayStep(enrollment: any, step: SequenceStep) {
    // For delay steps, we just move to the next step
    // The actual delay is handled by the isStepDue check
    await prisma.sequenceEnrollment.update({
      where: { id: enrollment.id },
      data: {
        currentStep: enrollment.currentStep + 1,
        updatedAt: new Date()
      }
    })

    console.log(`[SequenceProcessor] Delay step processed for enrollment ${enrollment.id}`)
  }

  /**
   * Process a condition step
   */
  async processConditionStep(enrollment: any, step: SequenceStep, allSteps: SequenceStep[]) {
    if (!step.condition) {
      console.warn(`[SequenceProcessor] No condition defined for step`)
      return
    }

    const conditionMet = await this.evaluateCondition(enrollment, step.condition)
    
    // Determine which branch to take
    const branch = conditionMet ? step.condition.trueBranch : step.condition.falseBranch
    
    if (!branch || branch.length === 0) {
      // No branch defined, move to next step
      await prisma.sequenceEnrollment.update({
        where: { id: enrollment.id },
        data: {
          currentStep: enrollment.currentStep + 1
        }
      })
    } else {
      // Insert branch steps into the sequence
      // This is a simplified approach - in production, you'd want more sophisticated branch handling
      const newSteps = [
        ...allSteps.slice(0, enrollment.currentStep + 1),
        ...branch,
        ...allSteps.slice(enrollment.currentStep + 1)
      ]

      // Update sequence with new steps
      await prisma.sequence.update({
        where: { id: enrollment.sequenceId },
        data: {
          steps: JSON.stringify(newSteps)
        }
      })

      // Move to next step (first step of the branch)
      await prisma.sequenceEnrollment.update({
        where: { id: enrollment.id },
        data: {
          currentStep: enrollment.currentStep + 1
        }
      })
    }

    console.log(`[SequenceProcessor] Condition evaluated (${conditionMet}) for enrollment ${enrollment.id}`)
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