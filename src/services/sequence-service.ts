import { prisma } from '@/lib/prisma'
import { GmailService } from './gmail-service'
import { GmailFetchService } from './gmail-fetch-service'
import { EnrollmentStatus } from '@prisma/client'

export class SequenceService {
  private gmailService = new GmailService()
  private gmailFetchService = new GmailFetchService()

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
      console.log(`=== PROCESSING DELAY STEP ${stepToExecuteIndex + 1} ===`)
      console.log(`Enrollment ID: ${enrollmentId}`)
      console.log(`Sequence ID: ${enrollment.sequenceId}`)
      console.log(`Contact: ${enrollment.contact.email}`)
      
      // Check if delay has already been started
      const lastActionTime = enrollment.lastEmailSentAt || enrollment.createdAt
      const delayHours = (stepToExecute.delay?.hours || 0)
      const delayMinutes = (stepToExecute.delay?.minutes || 0)
      const delayDays = (stepToExecute.delay?.days || 0)
      const delayMs = (delayDays * 24 * 60 * 60 * 1000) + (delayHours * 60 * 60 * 1000) + (delayMinutes * 60 * 1000)
      
      console.log(`Delay configuration: ${delayDays}d ${delayHours}h ${delayMinutes}m (${delayMs}ms)`)
      console.log(`Last action time: ${lastActionTime.toISOString()}`)
      console.log(`Current time: ${new Date().toISOString()}`)
      
      const timeSinceLastAction = Date.now() - lastActionTime.getTime()
      const timeSinceMinutes = Math.floor(timeSinceLastAction / 60000)
      
      console.log(`Time since last action: ${timeSinceMinutes} minutes (${timeSinceLastAction}ms)`)
      
      if (timeSinceLastAction < delayMs) {
        const remainingMs = delayMs - timeSinceLastAction
        const remainingMinutes = Math.ceil(remainingMs / 60000)
        console.log(`⏰ Delay not complete, waiting ${remainingMinutes} more minutes`)
        return { success: true, reason: `Still waiting ${remainingMinutes} minutes` }
      }
      
      // Delay is complete, move to next step
      console.log('✅ Delay complete, moving to next step')
      await prisma.sequenceEnrollment.update({
        where: { id: enrollmentId },
        data: {
          currentStep: stepToExecuteIndex + 1,
          updatedAt: new Date() // Ensure updatedAt is updated
        }
      })
      
      // Continue processing the next step immediately
      return this.processSequenceStep(enrollmentId)
    }
    
    if (stepToExecute.type === 'condition') {
      console.log(`=== PROCESSING CONDITION STEP ${stepToExecuteIndex + 1} ===`)
      console.log('Condition data:', JSON.stringify(stepToExecute.condition))
      console.log('True branch:', stepToExecute.condition?.trueBranch)
      console.log('False branch:', stepToExecute.condition?.falseBranch)
      
      // Evaluate condition and choose branch
      const conditionMet = await this.evaluateCondition(
        stepToExecute.condition,
        enrollment.contactId,
        enrollment.sequenceId
      )
      
      console.log('Condition result:', conditionMet ? 'TRUE' : 'FALSE')
      
      // Determine next step based on condition result
      let branchStepId: string | undefined
      
      // Check if branches are configured properly
      const trueBranch = stepToExecute.condition?.trueBranch
      const falseBranch = stepToExecute.condition?.falseBranch
      
      // Handle empty arrays or invalid branch configuration
      const hasTrueBranch = trueBranch && Array.isArray(trueBranch) && trueBranch.length > 0 && trueBranch[0] !== null
      const hasFalseBranch = falseBranch && Array.isArray(falseBranch) && falseBranch.length > 0 && falseBranch[0] !== null
      
      if (conditionMet && hasTrueBranch) {
        branchStepId = trueBranch[0]
        console.log('Following TRUE branch to step:', branchStepId)
      } else if (!conditionMet && hasFalseBranch) {
        branchStepId = falseBranch[0]
        console.log('Following FALSE branch to step:', branchStepId)
      } else {
        // No valid branch for the condition result, skip to next sequential step
        const nextStepIndex = stepToExecuteIndex + 1
        console.log(`No ${conditionMet ? 'TRUE' : 'FALSE'} branch defined, moving to next sequential step ${nextStepIndex}`)
        
        if (nextStepIndex < steps.length) {
          // Move to the next step in sequence
          await prisma.sequenceEnrollment.update({
            where: { id: enrollmentId },
            data: {
              currentStep: nextStepIndex,
              updatedAt: new Date()
            }
          })
          
          // Continue processing immediately
          return this.processSequenceStep(enrollmentId)
        } else {
          console.log('No next step available, completing sequence')
          await prisma.sequenceEnrollment.update({
            where: { id: enrollmentId },
            data: {
              status: EnrollmentStatus.COMPLETED,
              completedAt: new Date()
            }
          })
          return { success: true, completed: true, reason: 'Sequence completed after condition' }
        }
      }
      
      // Check if the branch indicates ending the sequence
      if (branchStepId === 'END') {
        console.log('Branch indicates END, completing sequence')
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
        
        if (branchStepIndex >= 0) {
          console.log(`Moving from step ${stepToExecuteIndex} to branch step ${branchStepIndex} (ID: ${branchStepId})`)
          
          // Update enrollment to point to branch step
          await prisma.sequenceEnrollment.update({
            where: { id: enrollmentId },
            data: {
              currentStep: branchStepIndex,
              updatedAt: new Date()
            }
          })
          
          // Continue processing the branch step immediately
          console.log('Processing branch step immediately...')
          return this.processSequenceStep(enrollmentId)
        } else {
          console.log(`WARNING: Branch step ID ${branchStepId} not found in sequence steps`)
          // Try to continue to next sequential step
          const nextStepIndex = stepToExecuteIndex + 1
          if (nextStepIndex < steps.length) {
            console.log(`Falling back to next sequential step ${nextStepIndex}`)
            await prisma.sequenceEnrollment.update({
              where: { id: enrollmentId },
              data: {
                currentStep: nextStepIndex,
                updatedAt: new Date()
              }
            })
            return this.processSequenceStep(enrollmentId)
          }
        }
      }
      
      // Should not reach here because we handle the no-branch case above
      console.log('Unexpected: No valid branch path found, completing sequence')
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
    
    // Check if this email step is part of a conditional branch that wasn't chosen
    // Look for any condition steps that have this email in their branches
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]
      if (step.type === 'condition' && i < stepToExecuteIndex) {
        const isInTrueBranch = step.condition?.trueBranch?.includes(stepToExecute.id)
        const isInFalseBranch = step.condition?.falseBranch?.includes(stepToExecute.id)
        
        if (isInTrueBranch || isInFalseBranch) {
          console.log(`Email step ${stepToExecute.id} is part of a conditional branch from step ${i}`)
          
          // Re-evaluate the condition to see if this branch should be executed
          const conditionMet = await this.evaluateCondition(
            step.condition,
            enrollment.contactId,
            enrollment.sequenceId
          )
          
          const shouldExecute = (conditionMet && isInTrueBranch) || (!conditionMet && isInFalseBranch)
          
          if (!shouldExecute) {
            console.log(`Skipping conditional branch email - condition result: ${conditionMet}, isInTrueBranch: ${isInTrueBranch}, isInFalseBranch: ${isInFalseBranch}`)
            // Complete the sequence instead of sending the wrong branch
            await prisma.sequenceEnrollment.update({
              where: { id: enrollmentId },
              data: {
                status: EnrollmentStatus.COMPLETED,
                completedAt: new Date()
              }
            })
            return { success: true, completed: true, reason: 'Conditional branch not chosen, sequence completed' }
          }
        }
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
    // Handle both 'content' and 'htmlContent' fields for backward compatibility
    let subject = this.replaceVariables(stepToExecute.subject || '', enrollment.contact)
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

    // Get thread ID for replies - only use thread from current sequence enrollment
    let threadId: string | undefined
    let messageIdForReply: string | undefined
    
    // Check if this step should reply to thread
    if (stepToExecute.replyToThread && enrollment.gmailThreadId) {
      threadId = enrollment.gmailThreadId
      
      // Use stored Message-ID header if available, otherwise fetch it
      if (enrollment.messageIdHeader) {
        messageIdForReply = enrollment.messageIdHeader
        console.log('Using stored Message-ID for threading:', messageIdForReply)
      } else if (enrollment.gmailMessageId && gmailToken) {
        // Fetch the actual Message-ID header from Gmail if we have a gmailMessageId
        try {
          const messageHeaders = await this.gmailFetchService.getMessageHeaders(
            enrollment.sequence.userId,
            gmailToken.email,
            enrollment.gmailMessageId
          )
          messageIdForReply = messageHeaders.messageId || undefined
          console.log('Fetched actual Message-ID for threading:', messageIdForReply)
          
          // Store it for future use
          if (messageIdForReply) {
            await prisma.sequenceEnrollment.update({
              where: { id: enrollmentId },
              data: { messageIdHeader: messageIdForReply }
            })
          }
        } catch (error) {
          console.error('Failed to fetch Message-ID header:', error)
        }
      }
      
      console.log('Using sequence thread ID for reply:', threadId)
      console.log('Using message ID for threading headers:', messageIdForReply)
      
      // For thread continuity, maintain the original subject or add "Re:" prefix
      // Get the first email step's subject to maintain thread
      const steps = Array.isArray(enrollment.sequence.steps) ? 
        enrollment.sequence.steps : JSON.parse(enrollment.sequence.steps as string)
      
      const firstEmailStep = (steps as any[]).find((s: any) => s.type === 'email')
      
      if (firstEmailStep) {
        const originalSubject = this.replaceVariables(firstEmailStep.subject || '', enrollment.contact)
        // Use "Re:" prefix for thread continuity
        if (!subject.startsWith('Re:') && !originalSubject.startsWith('Re:')) {
          subject = `Re: ${originalSubject}`
        } else if (originalSubject.startsWith('Re:')) {
          subject = originalSubject // Keep the original Re: subject
        }
        console.log('Adjusted subject for thread continuity:', subject)
      }
    } else {
      // Start a new thread for this sequence
      threadId = undefined
      console.log('Starting new thread for this sequence email')
    }

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
          threadId,
          messageId: messageIdForReply // Pass message ID for proper threading headers
        }
      )

      // Fetch the actual Message-ID header from the sent email for future threading
      // Only do this for the first email in the sequence
      let messageIdHeader: string | undefined
      if (!enrollment.messageIdHeader && result.messageId && gmailToken) {
        try {
          const messageHeaders = await this.gmailFetchService.getMessageHeaders(
            enrollment.sequence.userId,
            gmailToken.email,
            result.messageId
          )
          messageIdHeader = messageHeaders.messageId
          console.log('Stored Message-ID header for future threading:', messageIdHeader)
        } catch (error) {
          console.error('Failed to fetch Message-ID after sending:', error)
        }
      }
      
      // Update enrollment with Gmail thread ID for reply tracking
      await prisma.sequenceEnrollment.update({
        where: { id: enrollmentId },
        data: { 
          currentStep: enrollment.currentStep + 1,
          lastEmailSentAt: new Date(),
          gmailMessageId: enrollment.gmailMessageId || result.messageId,
          gmailThreadId: result.threadId,
          // Store the Message-ID header only for the first email
          ...(messageIdHeader && !enrollment.messageIdHeader ? { messageIdHeader } : {})
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
    console.log('=== SEQUENCE replaceVariables CALLED ===')
    console.log('Input text:', text.substring(0, 200) + '...')
    console.log('Contact data:', {
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      company: contact.company,
      variables: contact.variables
    })
    
    let result = text
    
    result = result.replace(/\{\{firstName\}\}/g, contact.firstName || '')
    result = result.replace(/\{\{lastName\}\}/g, contact.lastName || '')
    result = result.replace(/\{\{email\}\}/g, contact.email || '')
    result = result.replace(/\{\{company\}\}/g, contact.company || '')

    // Use 'variables' field from Prisma schema instead of 'customFields'
    if (contact.variables) {
      Object.entries(contact.variables as Record<string, any>).forEach(([key, value]) => {
        console.log(`Replacing {{${key}}} with: ${value}`)
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
        result = result.replace(regex, String(value))
      })
    }

    console.log('Final result:', result.substring(0, 200) + '...')
    console.log('=== replaceVariables COMPLETE ===')
    return result
  }

  private addTrackingToEmail(html: string, trackingId: string): string {
    console.log('=== SEQUENCE addTrackingToEmail CALLED ===')
    console.log('Input HTML length:', html.length)
    console.log('Tracking ID:', trackingId)
    
    const baseUrl = (process.env.NEXT_PUBLIC_TRACKING_DOMAIN || 'https://loumassbeta.vercel.app').trim()
    
    console.log('Base URL for tracking:', baseUrl)
    
    // Add open tracking pixel with cache-busting parameter
    const cacheBuster = Math.random().toString(36).substring(7)
    const pixelUrl = `${baseUrl}/api/track/open/${trackingId}?cb=${cacheBuster}`
    const pixelHtml = `<img src="${pixelUrl}" width="1" height="1" style="display:none;" alt="" />`
    
    console.log('Pixel URL:', pixelUrl)
    console.log('Pixel HTML:', pixelHtml)
    
    let trackedHtml = html
    
    // Check if content is plain text (no HTML tags)
    const hasHtmlTags = /<[^>]+>/.test(html)
    
    if (!hasHtmlTags) {
      console.log('Content appears to be plain text, converting to HTML...')
      // Convert plain text to HTML with proper structure
      // First, escape any HTML special characters except URLs
      trackedHtml = trackedHtml
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
      
      // Then convert URLs to links
      trackedHtml = trackedHtml.replace(/(https?:\/\/[^\s<>'"]+)/gi, '<a href="$1">$1</a>')
      
      // Wrap in proper HTML structure
      trackedHtml = `<html><body>${trackedHtml}${pixelHtml}</body></html>`
      
      console.log('Converted plain text to HTML with pixel')
    } else {
      // Content already has HTML, process normally
      console.log('Content already has HTML tags')
      
      // Convert HTTP/HTTPS URLs that are not already inside HTML tags
      const urlRegex = /(?<!<[^>]*)(https?:\/\/[^\s<>'"]+)/gi
      let urlsConverted = 0
      
      trackedHtml = trackedHtml.replace(urlRegex, (match) => {
        urlsConverted++
        console.log(`URL ${urlsConverted}: ${match} -> <a href="${match}">${match}</a>`)
        return `<a href="${match}">${match}</a>`
      })
      
      console.log(`Converted ${urlsConverted} plain text URLs to HTML links`)
      
      // Ensure HTML has proper structure
      if (!trackedHtml.includes('<html') && !trackedHtml.includes('<body')) {
        trackedHtml = `<html><body>${trackedHtml}</body></html>`
      }
      
      // Insert pixel before closing body tag
      if (trackedHtml.includes('</body>')) {
        console.log('Found </body> tag, inserting pixel before it')
        trackedHtml = trackedHtml.replace('</body>', `${pixelHtml}</body>`)
      } else {
        console.log('No </body> tag found, appending pixel to end')
        trackedHtml = trackedHtml + pixelHtml
      }
    }
    
    // Replace all HTML links for click tracking - FIXED: Use 'u' parameter like campaigns
    const linkRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1/gi
    let linkCount = 0
    
    trackedHtml = trackedHtml.replace(linkRegex, (match, quote, url) => {
      // Don't track unsubscribe links
      if (url.includes('unsubscribe') || url.includes('mailto:')) {
        return match
      }
      
      linkCount++
      const trackedUrl = `${baseUrl}/api/track/click/${trackingId}?u=${encodeURIComponent(url)}`
      console.log(`Link ${linkCount}: ${url} -> ${trackedUrl}`)
      return match.replace(url, trackedUrl)
    })
    
    console.log('=== SEQUENCE addTrackingToEmail COMPLETE ===')
    console.log('Final HTML length:', trackedHtml.length)
    console.log('Links tracked:', linkCount)
    
    return trackedHtml
  }

  private async evaluateCondition(
    condition: any,
    contactId: string,
    sequenceId: string
  ): Promise<boolean> {
    console.log('=== EVALUATING CONDITION ===')
    console.log('Condition type:', condition?.type)
    console.log('Reference step:', condition?.referenceStep)
    
    if (!condition || !condition.type) {
      console.log('No condition or condition type specified, returning false')
      return false
    }

    // Get enrollment for checking events
    const enrollment = await prisma.sequenceEnrollment.findFirst({
      where: {
        sequenceId,
        contactId
      }
    })

    if (!enrollment) {
      console.log('No enrollment found for contact')
      return false
    }

    console.log(`Evaluating condition type: ${condition.type} for enrollment ${enrollment.id}`)

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