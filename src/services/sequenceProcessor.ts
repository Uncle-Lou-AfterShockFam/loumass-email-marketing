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
    console.log(`[SequenceProcessor] 🎯 processEmailStep called:`)
    console.log(`[SequenceProcessor]   Enrollment ID: ${enrollment.id}`)
    console.log(`[SequenceProcessor]   Contact: ${enrollment.contact?.email}`)
    console.log(`[SequenceProcessor]   Current Step (at start): ${enrollment.currentStep}`)
    console.log(`[SequenceProcessor]   Gmail Thread ID: ${enrollment.gmailThreadId}`)
    console.log(`[SequenceProcessor]   Step subject: ${step.subject}`)
    
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
      
      // Check if we should reply to thread (logging purposes only)
      const shouldReplyToThread = step.replyToThread === true
      console.log(`[SequenceProcessor] Step replyToThread flag: ${shouldReplyToThread}`)
      
      // For replies, add quoted content to match Gmail's native format
      let finalHtmlContent = content
      let finalTextContent = content.replace(/<[^>]*>/g, '').trim()
      
      // ALWAYS include thread history when replying (Gmail's default behavior)
      console.log(`[SequenceProcessor] Thread history check:`)
      console.log(`[SequenceProcessor]   enrollment.currentStep: ${enrollment.currentStep}`)
      console.log(`[SequenceProcessor]   enrollment.gmailThreadId: ${enrollment.gmailThreadId}`)
      console.log(`[SequenceProcessor]   step.replyToThread: ${step.replyToThread}`)
      console.log(`[SequenceProcessor]   Condition (currentStep > 0): ${enrollment.currentStep > 0}`)
      console.log(`[SequenceProcessor]   Condition (has threadId): ${!!enrollment.gmailThreadId}`)
      console.log(`[SequenceProcessor]   Will include thread history: ${enrollment.currentStep > 0 && enrollment.gmailThreadId}`)
      
      if (enrollment.currentStep > 0 && enrollment.gmailThreadId) {
        console.log(`[SequenceProcessor] ✅ INCLUDING THREAD HISTORY - fetching ACTUAL email content from Gmail`)
        
        // CRITICAL FIX: Ensure enough time has passed for Gmail thread to be established
        // Gmail needs time to fully establish thread after initial email is sent
        const threadEstablishmentTime = 30000 // 30 seconds minimum
        const timeSinceLastEmail = enrollment.lastEmailSentAt ? 
          Date.now() - new Date(enrollment.lastEmailSentAt).getTime() : 
          threadEstablishmentTime + 1000
          
        if (timeSinceLastEmail < threadEstablishmentTime) {
          const waitTime = threadEstablishmentTime - timeSinceLastEmail
          console.log(`[SequenceProcessor] ⏰ TIMING FIX: Waiting ${Math.ceil(waitTime/1000)}s for Gmail thread to be established...`)
          await new Promise(resolve => setTimeout(resolve, waitTime))
        }
        
        // CRITICAL: Fetch the ACTUAL thread history from Gmail API with retry logic
        console.log(`[SequenceProcessor] FETCHING REAL EMAIL THREAD CONTENT for thread: ${enrollment.gmailThreadId}`)
        let fullHistory = null
        let retryCount = 0
        const maxRetries = 3
        
        // Retry logic for thread history fetching
        while (!fullHistory && retryCount < maxRetries) {
          if (retryCount > 0) {
            console.log(`[SequenceProcessor] 🔄 Retry ${retryCount}/${maxRetries} for thread history...`)
            await new Promise(resolve => setTimeout(resolve, 5000)) // 5 second delay between retries
          }
          
          try {
            console.log(`[SequenceProcessor] 🔍 Calling getFullThreadHistory with userId: ${user.id}, threadId: ${enrollment.gmailThreadId}`)
            fullHistory = await gmailService.getFullThreadHistory(user.id, enrollment.gmailThreadId)
            console.log(`[SequenceProcessor] 📊 getFullThreadHistory returned: ${fullHistory ? 'SUCCESS' : 'NULL'}`)
            if (fullHistory) {
              console.log(`[SequenceProcessor]   HTML length: ${fullHistory.htmlContent?.length || 0}`)
              console.log(`[SequenceProcessor]   Text length: ${fullHistory.textContent?.length || 0}`)
            }
          } catch (error: any) {
            console.error(`[SequenceProcessor] ❌ ERROR calling getFullThreadHistory:`, error)
            console.error(`[SequenceProcessor]   Error message: ${error?.message || 'Unknown error'}`)
            console.error(`[SequenceProcessor]   Error stack: ${error?.stack || 'No stack trace'}`)
          }
          retryCount++
        }
        
        if (fullHistory) {
          console.log(`[SequenceProcessor] ✅ SUCCESS: Got ACTUAL Gmail thread history with ${fullHistory.htmlContent.length} chars`)
          console.log(`[SequenceProcessor] This includes the real email content from the conversation thread`)
          
          // Build HTML content with the new message and full thread history
          finalHtmlContent = `<div dir="ltr">${content}</div>
<br>
${fullHistory.htmlContent}`
          
          // Build text content with full thread history  
          finalTextContent = `${finalTextContent}

${fullHistory.textContent}`
          
        } else {
          console.error(`[SequenceProcessor] ❌ CRITICAL: Failed to fetch Gmail thread content`)
          console.error(`[SequenceProcessor]   Thread ID: ${enrollment.gmailThreadId}`)
          console.error(`[SequenceProcessor]   User ID: ${user.id}`)
          console.error(`[SequenceProcessor]   Enrollment: ${enrollment.id}`)
          console.error(`[SequenceProcessor]   Step: ${enrollment.currentStep}`)
          console.error(`[SequenceProcessor] Implementing EmailEvent database fallback to build thread history`)
          
          // ROBUST FALLBACK: Build thread history from EmailEvent database records
          console.log(`[SequenceProcessor] Building thread history from EmailEvent database for contact ${contact.email}`)
          
          try {
            const emailEvents = await prisma.emailEvent.findMany({
              where: {
                contactId: contact.id,
                sequenceId: sequence.id,
                type: 'SENT'
              },
              orderBy: {
                createdAt: 'asc'
              }
            })
            
            if (emailEvents.length > 0) {
              console.log(`[SequenceProcessor] Found ${emailEvents.length} previous email events for thread history`)
              
              // Build thread history from database records
              let threadHistoryHtml = ''
              let threadHistoryText = ''
              
              for (let i = emailEvents.length - 1; i >= 0; i--) {
                const event = emailEvents[i]
                const eventDate = event.createdAt.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric'
                })
                const eventTime = event.createdAt.toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })
                
                // Build Gmail-style attribution
                const attribution = `On ${eventDate} at ${eventTime} ${user.name || user.email} <${user.email}> wrote:`
                
                threadHistoryHtml += `<div class="gmail_quote gmail_quote_container">
  <div dir="ltr" class="gmail_attr">${attribution}<br></div>
  <blockquote class="gmail_quote" style="margin:0px 0px 0px 0.8ex;border-left:1px solid rgb(204,204,204);padding-left:1ex">
    <div>Subject: ${event.subject || 'No subject'}</div>
  </blockquote>
</div>`
                
                threadHistoryText += `\n\n${attribution}\n${event.subject || 'No content'}`
              }
              
              if (threadHistoryHtml) {
                finalHtmlContent = `<div dir="ltr">${content}</div>
<br>
${threadHistoryHtml}`
                
                finalTextContent = `${finalTextContent}${threadHistoryText}`
                
                console.log(`[SequenceProcessor] ✅ SUCCESS: Built thread history from EmailEvent database (${threadHistoryHtml.length} chars)`)
              }
            } else {
              console.log(`[SequenceProcessor] No previous EmailEvents found - this may be the first email in sequence`)
            }
          } catch (dbError) {
            console.error(`[SequenceProcessor] Failed to build thread history from database:`, dbError)
            console.error(`[SequenceProcessor] Proceeding with email but WITHOUT thread history`)
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

    // CRITICAL FIX: Check for replies RIGHT BEFORE evaluating condition
    // This ensures we have the most up-to-date reply status
    if (step.condition.type === 'replied') {
      console.log(`[SequenceProcessor] Checking for replies before condition evaluation for enrollment ${enrollment.id}`)
      await this.checkForRepliesForEnrollment(enrollment)
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
   * Check for replies for a specific enrollment right before condition evaluation
   */
  async checkForRepliesForEnrollment(enrollment: any) {
    console.log(`[SequenceProcessor] Checking for replies for enrollment ${enrollment.id}`)
    
    if (!enrollment.gmailThreadId) {
      console.log(`[SequenceProcessor] No Gmail thread ID for enrollment ${enrollment.id}`)
      return
    }

    try {
      const { sequence, contact } = enrollment
      const { user } = sequence
      
      if (!user.gmailToken) {
        console.log(`[SequenceProcessor] No Gmail token for user ${user.id}`)
        return
      }

      // Initialize Gmail client
      const gmailClient = new (await import('@/lib/gmail-client')).GmailClient()
      const gmail = await gmailClient.getGmailService(user.id, user.gmailToken.email)
      
      // Get the thread to check for replies
      const thread = await gmail.users.threads.get({
        userId: 'me',
        id: enrollment.gmailThreadId,
        format: 'metadata',
        metadataHeaders: ['From', 'To', 'Subject', 'Date', 'Message-ID', 'In-Reply-To', 'References']
      })
      
      if (!thread.data.messages || thread.data.messages.length <= 1) {
        console.log(`[SequenceProcessor] No replies found in thread ${enrollment.gmailThreadId}`)
        return
      }
      
      // Check each message in the thread (skip the first one which is our sent email)
      for (let i = 1; i < thread.data.messages.length; i++) {
        const message = thread.data.messages[i]
        if (!message.id || !message.payload?.headers) continue
        
        const headers = message.payload.headers
        const from = headers.find((h: any) => h.name === 'From')?.value
        const messageId = headers.find((h: any) => h.name === 'Message-ID')?.value
        const inReplyTo = headers.find((h: any) => h.name === 'In-Reply-To')?.value
        const date = headers.find((h: any) => h.name === 'Date')?.value
        const subject = headers.find((h: any) => h.name === 'Subject')?.value
        
        if (!from) continue
        
        // Extract email from "Name <email>" format
        const emailMatch = from.match(/<(.+)>/)
        const fromEmail = emailMatch ? emailMatch[1] : from
        
        // Skip if this is from the user's own email
        if (fromEmail === user.gmailToken.email) continue
        
        // Check if this is from the contact
        if (fromEmail !== contact.email) continue
        
        console.log(`[SequenceProcessor] Found reply from ${fromEmail} in thread ${enrollment.gmailThreadId}`)
        
        // Check if we've already recorded this reply
        const existingReply = await prisma.sequenceEvent.findFirst({
          where: {
            enrollmentId: enrollment.id,
            eventType: 'REPLIED',
            eventData: {
              path: ['gmailMessageId'],
              equals: message.id
            }
          }
        })
        
        if (existingReply) {
          console.log(`[SequenceProcessor] Reply already recorded for message ${message.id}`)
          continue
        }
        
        // Also check EmailEvent
        const existingEmailEvent = await prisma.emailEvent.findFirst({
          where: {
            type: 'REPLIED',
            sequenceId: enrollment.sequenceId,
            contactId: contact.id,
            eventData: {
              path: ['gmailMessageId'],
              equals: message.id
            }
          }
        })
        
        if (existingEmailEvent) {
          console.log(`[SequenceProcessor] EmailEvent already recorded for message ${message.id}`)
          continue
        }
        
        // Get the current step index
        const stepIndex = enrollment.currentStep > 0 ? enrollment.currentStep - 1 : 0
        
        console.log(`[SequenceProcessor] Recording new reply for enrollment ${enrollment.id}`)
        
        // Create BOTH SequenceEvent AND EmailEvent for reply detection
        await prisma.sequenceEvent.create({
          data: {
            enrollmentId: enrollment.id,
            stepIndex: stepIndex,
            eventType: 'REPLIED',
            eventData: {
              gmailMessageId: message.id,
              gmailThreadId: enrollment.gmailThreadId,
              gmailMessageIdHeader: messageId,
              subject,
              fromEmail,
              date,
              inReplyTo,
              timestamp: new Date().toISOString()
            }
          }
        })
        
        // EmailEvent for condition evaluation
        await prisma.emailEvent.create({
          data: {
            type: 'REPLIED',
            sequenceId: enrollment.sequenceId,
            contactId: contact.id,
            timestamp: new Date(),
            eventData: {
              gmailMessageId: message.id,
              gmailThreadId: enrollment.gmailThreadId,
              gmailMessageIdHeader: messageId,
              subject,
              fromEmail,
              date,
              inReplyTo,
              enrollmentId: enrollment.id,
              stepIndex: stepIndex
            }
          }
        })
        
        // Update enrollment reply stats
        if (!enrollment.lastRepliedAt) {
          await prisma.sequenceEnrollment.update({
            where: { id: enrollment.id },
            data: {
              lastRepliedAt: new Date(),
              replyCount: {
                increment: 1
              }
            }
          })
        }
        
        console.log(`[SequenceProcessor] ✅ Reply recorded successfully for enrollment ${enrollment.id}`)
      }
    } catch (error) {
      console.error(`[SequenceProcessor] Error checking replies for enrollment ${enrollment.id}:`, error)
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