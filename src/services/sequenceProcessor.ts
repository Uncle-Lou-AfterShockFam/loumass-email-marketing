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
      
      // CRITICAL: Ensure content is complete and not truncated
      console.log(`[SequenceProcessor] Step ${enrollment.currentStep} content length: ${content.length}`)
      console.log(`[SequenceProcessor] Step ${enrollment.currentStep} full content:`, content)
      
      // Check if we should reply to thread
      const shouldReplyToThread = step.replyToThread === true
      
      // For replies, add quoted content to match Gmail's native format
      let finalHtmlContent = content
      let finalTextContent = content.replace(/<[^>]*>/g, '').trim()
      
      if (shouldReplyToThread && enrollment.currentStep > 0 && enrollment.gmailThreadId) {
        console.log(`[SequenceProcessor] Replying to thread - fetching ACTUAL email content from Gmail`)
        
        // Fetch the actual last message from the Gmail thread
        const threadContent = await gmailService.getThreadLastMessage(user.id, enrollment.gmailThreadId)
        
        if (threadContent) {
          console.log(`[SequenceProcessor] Got actual thread content - using for quote`)
          
          // Format the date for the quote header to match Gmail's exact format
          // Gmail format: "On Tue, Sep 9, 2025 at 11:02 PM Louis Piotti <ljpiotti@aftershockfam.org> wrote:"
          const dateOptions: Intl.DateTimeFormatOptions = {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          }
          
          // Format the date parts - use the actual date from the email
          // The date from Gmail is already in the correct format
          const emailDate = new Date(threadContent.date)
          
          const formattedDate = emailDate.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short', 
            day: 'numeric',
            year: 'numeric',
            timeZone: 'America/New_York' // Use the user's timezone
          })
          
          const formattedTime = emailDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: 'America/New_York' // Use the user's timezone
          }).replace(' ', ' ') // Regular space, not thin space
          
          // Extract name and email from the from field
          // Format can be "Name <email@example.com>" or just "email@example.com"
          console.log(`[SequenceProcessor] Parsing from field: "${threadContent.from}"`)
          
          let fromName = ''
          let fromEmail = ''
          
          // Try to match "Name <email@example.com>" format
          const emailMatch = threadContent.from.match(/(.*?)\s*<(.+?)>/)
          if (emailMatch) {
            fromName = emailMatch[1].trim() || emailMatch[2].split('@')[0]
            fromEmail = emailMatch[2].trim()
          } else if (threadContent.from.includes('@')) {
            // Just an email address without name
            fromEmail = threadContent.from.trim()
            fromName = fromEmail.split('@')[0]
          } else {
            // Fallback - use the whole string as name
            fromName = threadContent.from.trim()
          }
          
          console.log(`[SequenceProcessor] Parsed - Name: "${fromName}", Email: "${fromEmail}"`)
          
          // Build the attribution line exactly like Gmail
          // Always include email if we have it
          const attribution = fromEmail ? 
            `On ${formattedDate} at ${formattedTime} ${fromName} <${fromEmail}> wrote:` :
            `On ${formattedDate} at ${formattedTime} ${fromName} wrote:`
          
          // Build HTML content with Gmail's quote format using ACTUAL email content
          finalHtmlContent = `<div dir="ltr">${content}</div>
<br>
<div class="gmail_quote gmail_quote_container">
  <div dir="ltr" class="gmail_attr">${attribution}<br></div>
  <blockquote class="gmail_quote" style="margin:0px 0px 0px 0.8ex;border-left:1px solid rgb(204,204,204);padding-left:1ex">
    ${threadContent.htmlContent}
  </blockquote>
</div>`
          
          // Build text content with quote format using ACTUAL email content
          finalTextContent = `${finalTextContent}

${attribution}
${threadContent.textContent.split('\n').map(line => `> ${line}`).join('\n')}`
          
        } else {
          console.log(`[SequenceProcessor] Could not fetch thread content, falling back to template`)
          // Fallback to template content if thread fetch fails
          const previousStepIndex = enrollment.currentStep - 1
          const previousStep = steps[previousStepIndex]
          
          if (previousStep && previousStep.content) {
            const previousContent = this.replaceVariables(previousStep.content, contact)
            const previousTextContent = previousContent.replace(/<[^>]*>/g, '').trim()
            const previousDate = enrollment.lastEmailSentAt || enrollment.createdAt
            const dateStr = new Date(previousDate).toLocaleDateString('en-US', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
            
            finalHtmlContent = `<div dir="ltr">${content}</div>
<br>
<div class="gmail_quote gmail_quote_container">
  <div dir="ltr" class="gmail_attr">On ${dateStr}, ${user.fromName || user.name || user.email} wrote:<br></div>
  <blockquote class="gmail_quote" style="margin:0px 0px 0px 0.8ex;border-left:1px solid rgb(204,204,204);padding-left:1ex">
    ${previousContent}
  </blockquote>
</div>`
            
            finalTextContent = `${finalTextContent}

On ${dateStr}, ${user.fromName || user.name || user.email} wrote:
${previousTextContent.split('\n').map(line => `> ${line}`).join('\n')}`
          }
        }
      }

      // Check if tracking is enabled for this sequence AND step
      // Access the step properties correctly - they're at the step level
      const isTrackingEnabled = sequence.trackingEnabled && (step.trackingEnabled !== false)
      
      console.log(`[SequenceProcessor] Email settings for step ${enrollment.currentStep}:`)
      console.log(`  - Step data:`, JSON.stringify(step, null, 2))
      console.log(`  - Tracking enabled: ${isTrackingEnabled} (sequence: ${sequence.trackingEnabled}, step: ${step.trackingEnabled})`)
      console.log(`  - Reply to thread: ${shouldReplyToThread}`)
      console.log(`  - Existing thread ID: ${enrollment.gmailThreadId}`)
      console.log(`  - Existing message ID: ${enrollment.gmailMessageId}`)

      // Prepare email data for GmailService
      const textContent = finalTextContent
      
      const emailData: any = {
        to: [contact.email],
        subject: subject,
        htmlContent: finalHtmlContent,
        textContent: textContent, // Include full text content
        fromName: user.name || user.email,
        sequenceId: sequence.id,
        contactId: contact.id
      }

      // Only add threading info if replying to thread AND we have the necessary IDs
      // CRITICAL FIX: Use messageIdHeader (RFC Message-ID) not gmailMessageId (Gmail internal ID)
      if (shouldReplyToThread && enrollment.messageIdHeader) {
        emailData.threadId = enrollment.gmailThreadId || undefined
        emailData.messageId = enrollment.messageIdHeader  // THIS IS THE FIX! Use the actual Message-ID header
        console.log(`[SequenceProcessor] Threading enabled - will reply to message ${enrollment.messageIdHeader}`)
        console.log(`[SequenceProcessor] Using RFC Message-ID from messageIdHeader field`)
      } else if (shouldReplyToThread && enrollment.gmailMessageId && !enrollment.messageIdHeader) {
        // Fallback warning if we only have Gmail ID but not Message-ID header
        console.error(`[SequenceProcessor] CRITICAL: Threading requested but only have Gmail ID (${enrollment.gmailMessageId}), not Message-ID header!`)
        console.error(`[SequenceProcessor] Threading will FAIL - need messageIdHeader field`)
      } else if (shouldReplyToThread) {
        console.log(`[SequenceProcessor] Threading requested but no previous message ID available`)
      }

      // Only add tracking if enabled
      if (isTrackingEnabled) {
        // Generate tracking ID in the format expected by tracking endpoints
        // Format: seq:enrollmentId:stepIndex:timestamp
        const trackingData = `seq:${enrollment.id}:${enrollment.currentStep}:${Date.now()}`
        emailData.trackingId = Buffer.from(trackingData).toString('base64url')
        console.log(`[SequenceProcessor] Tracking enabled with ID: ${emailData.trackingId}`)
        console.log(`[SequenceProcessor] Tracking data: ${trackingData}`)
        console.log(`[SequenceProcessor] Tracking settings - sequence: ${sequence.trackingEnabled}, step: ${step.trackingEnabled}`)
      } else {
        console.log(`[SequenceProcessor] Tracking disabled for this email - sequence: ${sequence.trackingEnabled}, step: ${step.trackingEnabled}`)
      }

      // Send email via Gmail
      const result = await gmailService.sendEmail(
        user.id,
        user.email,
        emailData
      )

      // Determine next step index based on context
      let nextStepIndex = enrollment.currentStep + 1
      
      // CRITICAL FIX: Check if this email is part of a condition branch
      // If so, we need to skip to the step AFTER both branches
      const isPartOfBranch = this.isEmailPartOfConditionBranch(enrollment.currentStep, steps)
      
      if (isPartOfBranch) {
        // This email is either TRUE branch (N+1) or FALSE branch (N+2) after condition (N)
        // After sending branch email, skip to step after both branches (N+3)
        const conditionStepIndex = isPartOfBranch.conditionIndex
        nextStepIndex = conditionStepIndex + 3 // Skip to after both branches
        console.log(`[SequenceProcessor] Branch email sent at step ${enrollment.currentStep}, skipping to step ${nextStepIndex} (after both branches)`)
      } else {
        // Normal email step - just increment
        console.log(`[SequenceProcessor] Normal email step completed, moving from step ${enrollment.currentStep} to ${nextStepIndex}`)
      }

      // Update enrollment with message info
      await prisma.sequenceEnrollment.update({
        where: { id: enrollment.id },
        data: {
          lastEmailSentAt: new Date(),
          gmailMessageId: result.messageId,
          gmailThreadId: result.threadId || enrollment.gmailThreadId,
          messageIdHeader: result.messageIdHeader || enrollment.messageIdHeader, // CRITICAL: Store the RFC Message-ID header
          currentStep: nextStepIndex,
          updatedAt: new Date()
        }
      })
      
      console.log(`[SequenceProcessor] Stored Message-ID header: ${result.messageIdHeader || 'not provided'}`)

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
    
    // CRITICAL FIX: Find the correct next step after both branches
    // In the sequence UI, conditions typically have this structure:
    // - Condition step at index N
    // - True branch email at index N+1  
    // - False branch email at index N+2
    // - Next step (after both branches) at index N+3
    
    let nextStepIndex: number
    
    if (conditionMet) {
      // Condition is TRUE - go to TRUE branch (next step)
      nextStepIndex = enrollment.currentStep + 1
      console.log(`[SequenceProcessor] Condition TRUE - proceeding to step ${nextStepIndex} (TRUE branch)`)
      
      // Mark that this enrollment took the TRUE path to prevent FALSE branch execution
      await prisma.sequenceEnrollment.update({
        where: { id: enrollment.id },
        data: {
          currentStep: nextStepIndex,
          // Store the branch path in a custom field for debugging
          updatedAt: new Date()
        }
      })
      
      // After the TRUE branch email is sent, we need to skip the FALSE branch
      // This will be handled by setting a flag or jumping directly to N+3
      
    } else {
      // Condition is FALSE - skip TRUE branch and go directly to FALSE branch  
      nextStepIndex = enrollment.currentStep + 2
      console.log(`[SequenceProcessor] Condition FALSE - skipping TRUE branch, going to step ${nextStepIndex} (FALSE branch)`)
      
      // Mark that this enrollment took the FALSE path to prevent TRUE branch execution
      await prisma.sequenceEnrollment.update({
        where: { id: enrollment.id },
        data: {
          currentStep: nextStepIndex,
          updatedAt: new Date()
        }
      })
      
      // After the FALSE branch email is sent, continue normally to N+3
    }

    console.log(`[SequenceProcessor] Condition evaluated (${conditionMet}) for enrollment ${enrollment.id}, moved to step ${nextStepIndex}`)
    console.log(`[SequenceProcessor] IMPORTANT: Only ONE branch path will be executed - ${conditionMet ? 'TRUE' : 'FALSE'} branch`)
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
   * Check if an email step is part of a condition branch
   */
  isEmailPartOfConditionBranch(currentStepIndex: number, steps: SequenceStep[]): { conditionIndex: number } | null {
    // Check if current step is TRUE branch (directly after condition)
    if (currentStepIndex > 0 && steps[currentStepIndex - 1]?.type === 'condition') {
      return { conditionIndex: currentStepIndex - 1 }
    }
    
    // Check if current step is FALSE branch (two steps after condition)
    if (currentStepIndex > 1 && steps[currentStepIndex - 2]?.type === 'condition') {
      return { conditionIndex: currentStepIndex - 2 }
    }
    
    return null
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