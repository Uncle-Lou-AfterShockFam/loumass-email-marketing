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
    console.log(`\n🔥 ==== PROCESSING SEQUENCE STEP FOR ENROLLMENT ${enrollmentId} ====`)
    console.log(`⏰ Processing started at: ${new Date().toISOString()}`)
    
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

    console.log(`📋 Enrollment found:`, {
      id: enrollment?.id,
      sequenceId: enrollment?.sequenceId,
      contactId: enrollment?.contactId,
      status: enrollment?.status,
      currentStep: enrollment?.currentStep,
      lastEmailSentAt: enrollment?.lastEmailSentAt?.toISOString(),
      createdAt: enrollment?.createdAt?.toISOString(),
      updatedAt: enrollment?.updatedAt?.toISOString(),
      contactEmail: enrollment?.contact?.email
    })

    if (!enrollment || enrollment.status !== EnrollmentStatus.ACTIVE) {
      console.log(`❌ Enrollment invalid or not active - Status: ${enrollment?.status}`)
      return { success: false, reason: 'Enrollment not active' }
    }

    console.log(`✅ Enrollment is ACTIVE and valid`)

    const steps = enrollment.sequence.steps as any[] // JSON array of steps
    
    console.log(`📚 Sequence steps analysis:`)
    console.log(`  - Total steps in sequence: ${steps.length}`)
    console.log(`  - Current step index: ${enrollment.currentStep}`)
    console.log(`  - Step types: ${steps.map((s, i) => `${i}: ${s.type}`).join(', ')}`)
    console.log(`  - Step IDs: ${steps.map((s, i) => `${i}: ${s.id || 'NO_ID'}`).join(', ')}`)
    
    // The currentStep field represents the index of the step to execute NOW
    // (not the last step executed)
    let stepToExecute: any
    let stepToExecuteIndex: number = enrollment.currentStep
    
    console.log(`🎯 Attempting to get step at index ${stepToExecuteIndex}`)
    
    // Get the step to execute based on current index
    stepToExecute = steps[stepToExecuteIndex]
    
    console.log(`📝 Step to execute:`, {
      index: stepToExecuteIndex,
      exists: !!stepToExecute,
      type: stepToExecute?.type,
      id: stepToExecute?.id,
      hasNextStepId: !!stepToExecute?.nextStepId,
      nextStepId: stepToExecute?.nextStepId
    })
    
    // If we have a step with an ID and it has a nextStepId, use that for flow control
    if (stepToExecute?.id && stepToExecute?.nextStepId) {
      console.log(`🔗 Step has explicit flow control - nextStepId: ${stepToExecute.nextStepId}`)
      // This step has explicit flow control to another step
      const nextStepIndex = steps.findIndex((s: any) => s.id === stepToExecute.nextStepId)
      if (nextStepIndex >= 0) {
        console.log(`🎯 Next step found at index: ${nextStepIndex}`)
        // We'll update currentStep to this after processing
        // But for now, we execute the current step
      } else {
        console.log(`⚠️ WARNING: nextStepId ${stepToExecute.nextStepId} not found in sequence steps`)
      }
    }

    if (!stepToExecute) {
      console.log(`🏁 No step to execute - sequence completed. Step index ${stepToExecuteIndex} >= ${steps.length}`)
      // Sequence completed
      await prisma.sequenceEnrollment.update({
        where: { id: enrollmentId },
        data: {
          status: EnrollmentStatus.COMPLETED,
          completedAt: new Date()
        }
      })
      console.log(`✅ Enrollment marked as COMPLETED`)
      return { success: true, completed: true }
    }

    console.log(`🚀 Processing step type: ${stepToExecute.type} at index ${stepToExecuteIndex}`)

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
      console.log('Current step has ID:', stepToExecute.id)
      console.log('All step IDs in sequence:', steps.map((s: any) => s.id))
      
      // CRITICAL FIX: Prevent duplicate condition execution with better locking
      if (stepToExecute.id) {
        const executionKey = `${enrollmentId}-${stepToExecute.id}-${stepToExecuteIndex}`
        console.log('🔒 Checking condition execution lock:', executionKey)
        
        try {
          // Check if already executed
          const existing = await prisma.sequenceStepExecution.findFirst({
            where: {
              enrollmentId,
              stepId: stepToExecute.id
            }
          })
          
          if (existing) {
            console.log('⚠️ CONDITION ALREADY EXECUTED - PREVENTING DUPLICATE')
            console.log('  Previous execution:', existing.executedAt)
            console.log('  Status:', existing.status)
            
            // Find the step that was chosen in the previous execution
            const nextStepAfterCondition = await prisma.sequenceStepExecution.findFirst({
              where: {
                enrollmentId,
                stepIndex: { gt: stepToExecuteIndex }
              },
              orderBy: { stepIndex: 'asc' }
            })
            
            if (nextStepAfterCondition) {
              // Jump to the step after the already-executed branch
              const targetStepIndex = nextStepAfterCondition.stepIndex + 1
              console.log('  Jumping to step after executed branch:', targetStepIndex)
              
              await prisma.sequenceEnrollment.update({
                where: { id: enrollmentId },
                data: { currentStep: targetStepIndex }
              })
            } else {
              // No branch was executed yet, just move to next step
              await prisma.sequenceEnrollment.update({
                where: { id: enrollmentId },
                data: { currentStep: enrollment.currentStep + 1 }
              })
            }
            
            return this.processSequenceStep(enrollmentId)
          }
          
          // Create execution record with unique constraint
          await prisma.sequenceStepExecution.create({
            data: {
              enrollmentId,
              stepId: stepToExecute.id,
              stepIndex: stepToExecuteIndex,
              status: 'executing'
            }
          })
          console.log('📝 Recorded condition step execution:', stepToExecute.id)
        } catch (error: any) {
          if (error.code === 'P2002') {
            console.log('⚠️ Concurrent execution detected - another process is handling this condition')
            // Wait a moment for the other process to complete
            await new Promise(resolve => setTimeout(resolve, 1000))
            
            // Re-fetch enrollment to get updated state
            const updatedEnrollment = await prisma.sequenceEnrollment.findUnique({
              where: { id: enrollmentId }
            })
            
            if (updatedEnrollment && updatedEnrollment.currentStep > enrollment.currentStep) {
              console.log('  Other process advanced to step:', updatedEnrollment.currentStep)
              return this.processSequenceStep(enrollmentId)
            }
          }
          throw error
        }
      }
      
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
      
      console.log('🔀 Branch configuration:')
      console.log('  - True branch:', trueBranch)
      console.log('  - False branch:', falseBranch)
      console.log('  - Condition met:', conditionMet)
      
      // Handle empty arrays or invalid branch configuration
      const hasTrueBranch = trueBranch && Array.isArray(trueBranch) && trueBranch.length > 0 && trueBranch[0] !== null
      const hasFalseBranch = falseBranch && Array.isArray(falseBranch) && falseBranch.length > 0 && falseBranch[0] !== null
      
      console.log('🎯 BRANCH SELECTION LOGIC:')
      console.log('  - conditionMet:', conditionMet)
      console.log('  - hasTrueBranch:', hasTrueBranch)
      console.log('  - hasFalseBranch:', hasFalseBranch)
      
      if (conditionMet && hasTrueBranch) {
        branchStepId = trueBranch[0]
        console.log('✅ Condition is TRUE, following TRUE branch to step:', branchStepId)
      } else if (!conditionMet && hasFalseBranch) {
        branchStepId = falseBranch[0]
        console.log('✅ Condition is FALSE, following FALSE branch to step:', branchStepId)
      } else if ((conditionMet && !hasTrueBranch) || (!conditionMet && !hasFalseBranch)) {
        // No branch for this condition result, but might have branch for the other result
        // Check if we should continue to next step or if sequence design expects a branch
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
        // First try to find by ID
        let branchStepIndex = steps.findIndex((s: any) => s.id === branchStepId)
        
        // If not found and branchStepId is numeric, try using it as an index
        if (branchStepIndex < 0 && !isNaN(Number(branchStepId))) {
          const possibleIndex = Number(branchStepId)
          if (possibleIndex >= 0 && possibleIndex < steps.length) {
            console.log(`Using branch value as index: ${possibleIndex}`)
            branchStepIndex = possibleIndex
          }
        }
        
        // If still not found, check if branchStepId matches a step without IDs (legacy)
        if (branchStepIndex < 0) {
          // Try to match by position if the branch contains something like "3" or "4"
          const stepNumber = parseInt(branchStepId)
          if (!isNaN(stepNumber) && stepNumber > 0 && stepNumber <= steps.length) {
            branchStepIndex = stepNumber - 1 // Convert 1-based to 0-based
            console.log(`Interpreting branch as step number: Step ${stepNumber} -> Index ${branchStepIndex}`)
          }
        }
        
        if (branchStepIndex >= 0) {
          console.log(`Moving from step ${stepToExecuteIndex} to branch step ${branchStepIndex} (ID/Value: ${branchStepId})`)
          
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
          console.log(`❌ CRITICAL ERROR: Branch step ${branchStepId} not found in sequence steps`)
          console.log(`❌ This indicates a sequence design error - branch targets must exist`)
          console.log(`❌ STOPPING sequence to prevent incorrect execution of sequential steps`)
          
          // Log the step IDs for debugging
          console.log('Available step IDs:', steps.map((s: any, i: number) => `${i}: ${s.id || 'NO_ID'}`).join(', '))
          
          // Complete the sequence as the branching is broken
          await prisma.sequenceEnrollment.update({
            where: { id: enrollmentId },
            data: {
              status: EnrollmentStatus.COMPLETED,
              completedAt: new Date()
            }
          })
          
          return { success: false, completed: true, reason: `Branch target ${branchStepId} not found - sequence design error` }
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
      console.log(`⏩ Non-email step type "${stepToExecute.type}" - moving to next step`)
      console.log(`   Moving from step ${stepToExecuteIndex} to step ${stepToExecuteIndex + 1}`)
      
      // Move to next step
      await prisma.sequenceEnrollment.update({
        where: { id: enrollmentId },
        data: { 
          currentStep: stepToExecuteIndex + 1,
          updatedAt: new Date()
        }
      })
      
      console.log(`✅ Updated currentStep to ${stepToExecuteIndex + 1}, recursively processing...`)
      return this.processSequenceStep(enrollmentId)
    }
    
    console.log(`📧 Processing EMAIL step at index ${stepToExecuteIndex}`)
    
    // CRITICAL FIX: Record that we're executing this email step to prevent duplicates
    if (stepToExecute.id) {
      try {
        await prisma.sequenceStepExecution.create({
          data: {
            enrollmentId,
            stepId: stepToExecute.id,
            stepIndex: stepToExecuteIndex,
            status: 'executing'
          }
        })
        console.log('📝 Recorded email step execution:', stepToExecute.id)
      } catch (error) {
        console.log('⚠️ Email step already executed, preventing duplicate send')
        // Move to next step to prevent stuck enrollment
        await prisma.sequenceEnrollment.update({
          where: { id: enrollmentId },
          data: { currentStep: enrollment.currentStep + 1 }
        })
        return this.processSequenceStep(enrollmentId)
      }
    }
    
    // REMOVED BROKEN CONDITION LOGIC: 
    // The previous code was re-evaluating conditions for every email step and inappropriately 
    // completing sequences. Condition steps already handle branching logic correctly.
    // Trust the condition step's routing - if we reached this email step, it should be sent.

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
    
    // CRITICAL FIX: For standalone sequences, always use stored Message-ID for threading
    // This must happen BEFORE any other threading logic
    let isStandaloneSequence = !enrollment.triggerRecipientId
    
    // ENHANCED FIX: For standalone sequences, thread ALL follow-up emails (step > 0) regardless of replyToThread flag
    // This ensures emails after conditions also thread properly
    if (isStandaloneSequence && enrollment.messageIdHeader && enrollment.currentStep > 0) {
      console.log('🎯 STANDALONE SEQUENCE AUTO-THREADING: Step > 0, forcing thread')
      console.log('  Current step:', enrollment.currentStep)
      console.log('  Step has replyToThread:', stepToExecute.replyToThread)
      messageIdForReply = enrollment.messageIdHeader
      threadId = enrollment.gmailThreadId || undefined
      console.log('  Message-ID for threading:', messageIdForReply)
      console.log('  Thread ID:', threadId)
      console.log('  Is valid Message-ID format:', messageIdForReply.includes('@'))
      console.log('  FORCING THREADING for follow-up email in standalone sequence')
    } else if (stepToExecute.replyToThread && enrollment.messageIdHeader && isStandaloneSequence) {
      console.log('🎯 STANDALONE SEQUENCE THREADING: Using stored Message-ID (explicit replyToThread)')
      messageIdForReply = enrollment.messageIdHeader
      threadId = enrollment.gmailThreadId || undefined
      console.log('  Message-ID for threading:', messageIdForReply)
      console.log('  Thread ID:', threadId)
      console.log('  Is valid Message-ID format:', messageIdForReply.includes('@'))
    }
    
    // Check if this step should reply to thread
    console.log(`🧵 Threading check for step ${enrollment.currentStep}:`)
    console.log(`   - stepToExecute.replyToThread: ${stepToExecute.replyToThread}`)
    console.log(`   - enrollment.gmailThreadId: ${enrollment.gmailThreadId || 'None'}`)
    console.log(`   - enrollment.gmailMessageId: ${enrollment.gmailMessageId || 'None'}`)
    console.log(`   - enrollment.messageIdHeader: ${enrollment.messageIdHeader || 'None'}`)
    console.log(`   - enrollment.triggerRecipientId: ${enrollment.triggerRecipientId || 'None'}`)
    console.log(`   - Step type: ${stepToExecute.type}`)
    console.log(`   - Step ID: ${stepToExecute.id}`)
    
    // For campaign-triggered sequences, fetch Message-ID from campaign recipient if not stored
    if (!enrollment.messageIdHeader && enrollment.triggerRecipientId) {
      console.log('🔍 Fetching Message-ID from campaign recipient...')
      const campaignRecipient = await prisma.recipient.findUnique({
        where: { id: enrollment.triggerRecipientId },
        select: { 
          messageIdHeader: true,
          gmailThreadId: true,
          gmailMessageId: true
        }
      })
      
      if (campaignRecipient?.messageIdHeader) {
        // CRITICAL FIX: Strip angle brackets before storing
        let cleanMessageId = campaignRecipient.messageIdHeader
        if (cleanMessageId.startsWith('<') && cleanMessageId.endsWith('>')) {
          cleanMessageId = cleanMessageId.slice(1, -1)
          console.log('📝 Stripping angle brackets from campaign Message-ID:', campaignRecipient.messageIdHeader, '->', cleanMessageId)
        }
        
        // Store the campaign's Message-ID in the enrollment for future use
        await prisma.sequenceEnrollment.update({
          where: { id: enrollmentId },
          data: { 
            messageIdHeader: cleanMessageId,
            // Also copy the thread ID if not already set
            ...(campaignRecipient.gmailThreadId && !enrollment.gmailThreadId ? {
              gmailThreadId: campaignRecipient.gmailThreadId
            } : {})
          }
        })
        
        // Update our local enrollment object
        enrollment.messageIdHeader = cleanMessageId
        if (campaignRecipient.gmailThreadId && !enrollment.gmailThreadId) {
          enrollment.gmailThreadId = campaignRecipient.gmailThreadId
        }
        
        console.log('✅ Retrieved Message-ID from campaign:', campaignRecipient.messageIdHeader)
        console.log('✅ Retrieved Thread ID from campaign:', campaignRecipient.gmailThreadId)
      } else {
        console.warn('⚠️ Campaign recipient has no Message-ID stored')
      }
    }
    
    // For campaign-triggered sequences or when we don't have messageIdForReply yet
    if (stepToExecute.replyToThread && enrollment.gmailThreadId && !messageIdForReply && !isStandaloneSequence) {
      threadId = enrollment.gmailThreadId
      
      // Use stored Message-ID header if available, otherwise fetch it
      if (enrollment.messageIdHeader) {
        messageIdForReply = enrollment.messageIdHeader
        console.log('✅ Using stored Message-ID for threading:', messageIdForReply)
      } else if (enrollment.gmailMessageId && gmailToken) {
        // Fetch the actual Message-ID header from Gmail if we have a gmailMessageId
        try {
          console.log('🔍 Fetching Message-ID header from Gmail...')
          const messageHeaders = await this.gmailFetchService.getMessageHeaders(
            enrollment.sequence.userId,
            gmailToken.email,
            enrollment.gmailMessageId
          )
          messageIdForReply = messageHeaders.messageId || undefined
          console.log('✅ Fetched actual Message-ID for threading:', messageIdForReply)
          
          // Store it for future use
          if (messageIdForReply) {
            await prisma.sequenceEnrollment.update({
              where: { id: enrollmentId },
              data: { messageIdHeader: messageIdForReply }
            })
            console.log('💾 Stored Message-ID for future use')
          }
        } catch (error) {
          console.error('❌ Failed to fetch Message-ID header:', error)
        }
      }
      
      console.log('🧵 Using sequence thread ID for reply:', threadId)
      console.log('📧 Using message ID for threading headers:', messageIdForReply)
      
      // CRITICAL DEBUGGING: Log the exact values to trace the threading bug
      console.log('🔍 THREADING DEBUG:')
      console.log('  - stepToExecute.replyToThread:', stepToExecute.replyToThread)
      console.log('  - enrollment.gmailThreadId:', enrollment.gmailThreadId)
      console.log('  - enrollment.messageIdHeader:', enrollment.messageIdHeader)
      console.log('  - messageIdForReply:', messageIdForReply)
      
      // CRITICAL FIX: Only clear messageIdForReply if it's definitely invalid (empty or clearly a thread ID)
      // Gmail Message-IDs always contain @ symbols, but we should not clear valid ones
      if (messageIdForReply && !messageIdForReply.includes('@')) {
        console.log('❌ ERROR: messageIdForReply does not look like a valid Message-ID:', messageIdForReply)
        console.log('   This might be a threadId, clearing it to prevent broken threading')
        messageIdForReply = undefined
        
        // RECOVERY: Try to use the stored Message-ID from enrollment if available
        if (enrollment.messageIdHeader && enrollment.messageIdHeader.includes('@')) {
          console.log('🔄 RECOVERY: Using enrollment.messageIdHeader instead:', enrollment.messageIdHeader)
          messageIdForReply = enrollment.messageIdHeader
        }
      }
    } else if (stepToExecute.replyToThread && !enrollment.gmailThreadId && !messageIdForReply) {
      console.log('⚠️ WARNING: replyToThread is true but no gmailThreadId available!')
      console.log('   Checking for stored Message-ID header for threading...')
      
      // CRITICAL FIX: Check if we have a Message-ID header stored for threading
      if (enrollment.messageIdHeader) {
        console.log('✅ Found stored Message-ID header for threading:', enrollment.messageIdHeader)
        messageIdForReply = enrollment.messageIdHeader
        // We don't have a gmailThreadId, but we can still use threading headers
        threadId = undefined
      } else {
        console.log('   No Message-ID header stored either. This follow-up email will start a new thread.')
        threadId = undefined
      }
      
      // For better thread appearance, maintain the original subject or add "Re:" prefix
      const steps = Array.isArray(enrollment.sequence.steps) ? 
        enrollment.sequence.steps : JSON.parse(enrollment.sequence.steps as string)
      
      const firstEmailStep = (steps as any[]).find((s: any) => s.type === 'email')
      
      if (firstEmailStep) {
        const originalSubject = this.replaceVariables(firstEmailStep.subject || '', enrollment.contact)
        // Use "Re:" prefix for visual thread continuity even if technical thread is broken
        if (!subject.startsWith('Re:') && !originalSubject.startsWith('Re:')) {
          subject = `Re: ${originalSubject}`
          console.log('🎯 Adjusted subject for visual thread continuity:', subject)
        }
      }
    } else {
      // Start a new thread for this sequence
      threadId = undefined
      console.log('🆕 Starting new thread for this sequence email')
    }

    // CRITICAL: Final check - ensure we have messageIdForReply for standalone sequences
    if (isStandaloneSequence && stepToExecute.replyToThread && !messageIdForReply && enrollment.messageIdHeader) {
      console.log('⚠️ CRITICAL: messageIdForReply was cleared! Restoring from enrollment.messageIdHeader')
      messageIdForReply = enrollment.messageIdHeader
      console.log('  Restored Message-ID:', messageIdForReply)
    }
    
    // Apply "Re:" prefix for thread continuity when using threadId
    if (threadId) {
      // For campaign-triggered sequences, get the campaign subject
      if (enrollment.triggerCampaignId) {
        console.log('🎯 Fetching campaign subject for thread continuity...')
        const campaign = await prisma.campaign.findUnique({
          where: { id: enrollment.triggerCampaignId },
          select: { subject: true }
        })
        
        if (campaign?.subject) {
          const campaignSubject = this.replaceVariables(campaign.subject, enrollment.contact)
          // Use "Re:" prefix with the campaign subject for proper threading
          if (!campaignSubject.startsWith('Re:')) {
            subject = `Re: ${campaignSubject}`
          } else {
            subject = campaignSubject
          }
          console.log('📧 Using campaign subject for thread continuity:', subject)
        }
      } else {
        // For non-campaign sequences, use the sequence's first email subject
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
          console.log('📧 Adjusted subject for thread continuity:', subject)
        }
      }
    }

    // Send the email
    // ULTIMATE FINAL CHECK: Ensure messageIdForReply is set for threading
    // This is the LAST chance to fix threading before sending
    if (isStandaloneSequence && enrollment.messageIdHeader && enrollment.messageIdHeader.includes('@') && !messageIdForReply) {
      console.log('🚨 ULTIMATE FIX: messageIdForReply missing at send time! This is the final restoration!')
      console.log('  Current step:', enrollment.currentStep)
      console.log('  Has valid Message-ID:', enrollment.messageIdHeader)
      console.log('  Step has replyToThread:', stepToExecute.replyToThread)
      messageIdForReply = enrollment.messageIdHeader
      threadId = threadId || enrollment.gmailThreadId || undefined
      console.log('  ✅ RESTORED messageIdForReply:', messageIdForReply)
    }
    
    console.log('📮 SENDING EMAIL WITH THREADING INFO:')
    console.log('  threadId:', threadId)
    console.log('  messageId for In-Reply-To:', messageIdForReply)
    console.log('  replyToThread:', stepToExecute.replyToThread)
    console.log('  isStandaloneSequence:', isStandaloneSequence)
    console.log('  enrollment.messageIdHeader:', enrollment.messageIdHeader)
    console.log('  enrollment.currentStep:', enrollment.currentStep)
    console.log('  trackingEnabled (sequence):', enrollment.sequence.trackingEnabled)
    console.log('  trackingEnabled (step):', stepToExecute.trackingEnabled)
    console.log('  Will add tracking:', enrollment.sequence.trackingEnabled && (stepToExecute.trackingEnabled !== false))
    
    // CRITICAL DEBUG: Log exactly what we're passing to sendEmail
    console.log('🚨 CRITICAL: About to call sendEmail with:')
    console.log('  - messageId parameter:', messageIdForReply || 'NONE')
    console.log('  - threadId parameter:', threadId || 'NONE')
    
    if (messageIdForReply) {
      console.log('✅ THREADING SHOULD WORK: messageId is being passed to sendEmail')
      console.log('  Full messageId value:', messageIdForReply)
      console.log('  Contains @ symbol:', messageIdForReply.includes('@'))
    } else {
      console.log('❌ THREADING WILL FAIL: No messageId passed to sendEmail!')
      console.log('  This is step:', enrollment.currentStep)
      console.log('  Should have messageIdHeader:', enrollment.messageIdHeader)
    }
    
    try {
      // CRITICAL FIX: Ensure tracking is added to ALL emails when enabled
      const sequenceTrackingEnabled = enrollment.sequence.trackingEnabled !== false // Default to true if undefined
      const stepTrackingEnabled = stepToExecute.trackingEnabled !== false // Default to true if undefined
      const shouldAddTracking = sequenceTrackingEnabled && stepTrackingEnabled
      
      console.log('📊 TRACKING DECISION:')
      console.log('  Sequence tracking enabled:', sequenceTrackingEnabled)
      console.log('  Step tracking enabled:', stepTrackingEnabled)
      console.log('  Will add tracking:', shouldAddTracking)
      console.log('  Current step:', enrollment.currentStep)
      console.log('  Step type:', stepToExecute.type)
      
      const finalHtmlContent = shouldAddTracking ? 
        await this.addTrackingToEmail(htmlContent, trackingId, enrollment.sequence.userId) : htmlContent
      
      console.log('🔍 Final email content checks:')
      console.log('  - Has tracking pixel:', finalHtmlContent.includes('img src="') && finalHtmlContent.includes('/api/track/open'))
      console.log('  - Has tracked links:', finalHtmlContent.includes('/api/track/click'))
      console.log('  - Message-ID being passed:', messageIdForReply || 'NONE')
      
      // Fetch user's fromName setting
      const user = await prisma.user.findUnique({
        where: { id: enrollment.sequence.userId },
        select: { fromName: true }
      })
      
      const result = await this.gmailService.sendEmail(
        enrollment.sequence.userId,
        gmailToken.email,
        {
          to: [enrollment.contact.email],
          subject,
          htmlContent: finalHtmlContent,
          textContent,
          trackingId,
          sequenceId: enrollment.sequenceId,
          contactId: enrollment.contactId,
          threadId,
          messageId: messageIdForReply, // Pass message ID for proper threading headers
          fromName: user?.fromName || undefined // Use user's configured FROM name
        }
      )

      // CRITICAL: Always fetch the actual Message-ID header from the sent email for proper threading
      // This is the proper email Message-ID header (not Gmail's internal ID)
      let messageIdHeader: string | undefined
      if (result.messageId && gmailToken) {
        try {
          console.log('🔍 FETCHING MESSAGE-ID HEADER FOR THREADING...')
          console.log('  Gmail internal ID:', result.messageId)
          console.log('  Step index:', stepToExecuteIndex)
          console.log('  Is first email:', stepToExecuteIndex === 0)
          
          const messageHeaders = await this.gmailFetchService.getMessageHeaders(
            enrollment.sequence.userId,
            gmailToken.email,
            result.messageId
          )
          messageIdHeader = messageHeaders.messageId
          
          console.log('📧 THREADING HEADER CAPTURED:')
          console.log('  Message-ID header:', messageIdHeader)
          console.log('  Has @ symbol:', messageIdHeader?.includes('@'))
          console.log('  Has angle brackets:', messageIdHeader?.startsWith('<') && messageIdHeader?.endsWith('>'))
          console.log('  Gmail internal ID (NOT for threading):', result.messageId)
          console.log('  Gmail thread ID:', result.threadId)
          
          // Strip angle brackets if present for storage (we'll add them back when using)
          if (messageIdHeader && messageIdHeader.startsWith('<') && messageIdHeader.endsWith('>')) {
            const strippedId = messageIdHeader.slice(1, -1)
            console.log('  Stripped for storage:', strippedId)
          }
        } catch (error) {
          console.error('❌ Failed to fetch Message-ID after sending:', error)
        }
      } else {
        console.log('⚠️ Cannot fetch Message-ID header:')
        console.log('  Has result.messageId:', !!result.messageId)
        console.log('  Has gmailToken:', !!gmailToken)
      }
      
      console.log(`✅ Email sent successfully!`)
      console.log(`   Gmail Message ID: ${result.messageId}`)
      console.log(`   Gmail Thread ID: ${result.threadId}`)
      console.log(`   Message-ID Header: ${messageIdHeader || 'Not captured'}`)
      
      // Update enrollment with Gmail thread ID for reply tracking
      // CRITICAL FIX: Always store Message-ID for threading
      // This handles both campaign-triggered and standalone sequences
      let cleanMessageId = messageIdHeader
      if (cleanMessageId && cleanMessageId.startsWith('<') && cleanMessageId.endsWith('>')) {
        cleanMessageId = cleanMessageId.slice(1, -1)
        console.log('📝 Stripping angle brackets for storage:', messageIdHeader, '->', cleanMessageId)
      }
      
      // STANDALONE SEQUENCE FIX: Store Message-ID from first email
      const isFirstEmail = enrollment.currentStep === 0
      const needsMessageId = !enrollment.messageIdHeader && cleanMessageId
      
      if (isFirstEmail || needsMessageId) {
        console.log('🆕 STORING INITIAL MESSAGE-ID FOR STANDALONE SEQUENCE')
        console.log('  Is first email:', isFirstEmail)
        console.log('  Has existing Message-ID:', !!enrollment.messageIdHeader)
        console.log('  New Message-ID:', cleanMessageId)
      }
      
      // CRITICAL FIX: For standalone sequences, we MUST store the Message-ID from the first email
      // This is what will be used for threading in all subsequent emails
      const shouldStoreMessageId = (isFirstEmail && cleanMessageId) || (!enrollment.messageIdHeader && cleanMessageId)
      
      const updateData = { 
        currentStep: enrollment.currentStep + 1,
        lastEmailSentAt: new Date(),
        // Store Gmail's internal message ID for fetching purposes
        gmailMessageId: result.messageId,
        gmailThreadId: result.threadId,
        // CRITICAL FIX: Store the Message-ID header from the FIRST email for threading
        // Only update if this is the first email or we don't have one yet
        ...(shouldStoreMessageId ? { messageIdHeader: cleanMessageId } : {})
      }
      
      console.log(`📝 Updating enrollment after email sent:`, {
        enrollmentId: enrollmentId,
        oldCurrentStep: enrollment.currentStep,
        newCurrentStep: updateData.currentStep,
        lastEmailSentAt: updateData.lastEmailSentAt.toISOString(),
        oldGmailMessageId: enrollment.gmailMessageId,
        newGmailMessageId: updateData.gmailMessageId,
        oldGmailThreadId: enrollment.gmailThreadId,
        newGmailThreadId: updateData.gmailThreadId,
        messageIdHeader: updateData.messageIdHeader
      })
      
      await prisma.sequenceEnrollment.update({
        where: { id: enrollmentId },
        data: updateData
      })

      console.log(`🎉 Email step ${stepToExecuteIndex + 1} completed successfully!`)
      console.log(`🔥 ==== PROCESSING COMPLETE FOR ENROLLMENT ${enrollmentId} ====\n`)
      
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

  private async addTrackingToEmail(html: string, trackingId: string, userId: string): Promise<string> {
    console.log('=== SEQUENCE addTrackingToEmail CALLED ===')
    console.log('Input HTML length:', html.length)
    console.log('Tracking ID:', trackingId)
    
    // Fetch user's tracking domain from database
    const userTrackingDomain = await prisma.trackingDomain.findUnique({
      where: { userId },
      select: { domain: true, verified: true }
    })
    
    // Use user's verified domain, or fall back to default
    let baseUrl: string
    if (userTrackingDomain?.verified && userTrackingDomain.domain) {
      baseUrl = `https://${userTrackingDomain.domain}`.trim()
      console.log('Using user tracking domain:', baseUrl)
    } else {
      baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'https://loumassbeta.vercel.app').trim()
      console.log('Using default tracking domain:', baseUrl)
    }
    
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
    console.log('Reference campaign:', condition?.referenceCampaign)
    
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
    
    // Check if this is a campaign-based condition
    if (condition.referenceCampaign === 'trigger' && enrollment.triggerCampaignId) {
      console.log('Evaluating campaign-triggered condition for campaign:', enrollment.triggerCampaignId)
      return await this.evaluateCampaignCondition(
        condition,
        enrollment.triggerCampaignId,
        enrollment.triggerRecipientId || contactId
      )
    }

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
        // Check for replies in ALL sequences, not just campaign-triggered ones
        const repliedResult = await this.hasContactReplied(enrollment.id, condition.referenceStep)
        const notRepliedResult = !repliedResult
        console.log(`📧 not_replied condition: hasContactReplied=${repliedResult}, returning ${notRepliedResult}`)
        return notRepliedResult
      
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

  private async evaluateCampaignCondition(
    condition: any,
    campaignId: string,
    recipientId: string
  ): Promise<boolean> {
    console.log('=== EVALUATING CAMPAIGN CONDITION ===')
    console.log('Campaign ID:', campaignId)
    console.log('Recipient ID:', recipientId)
    console.log('Condition type:', condition.type)
    
    // Get the recipient record from the campaign
    const recipient = await prisma.recipient.findFirst({
      where: {
        id: recipientId,
        campaignId: campaignId
      }
    })
    
    if (!recipient) {
      console.log('No recipient found for campaign')
      // Try to find by contactId if recipientId doesn't match
      const recipientByContact = await prisma.recipient.findFirst({
        where: {
          contactId: recipientId,
          campaignId: campaignId
        }
      })
      
      if (!recipientByContact) {
        console.log('No recipient found by contact ID either')
        return false
      }
      
      // Use the found recipient
      return this.evaluateRecipientCondition(condition.type, recipientByContact)
    }
    
    return this.evaluateRecipientCondition(condition.type, recipient)
  }
  
  private evaluateRecipientCondition(conditionType: string, recipient: any): boolean {
    console.log('Evaluating recipient condition:', {
      type: conditionType,
      status: recipient.status,
      openedAt: recipient.openedAt,
      clickedAt: recipient.clickedAt,
      repliedAt: recipient.repliedAt
    })
    
    switch (conditionType) {
      case 'opened':
      case 'campaign_opened':
        return !!recipient.openedAt
      
      case 'clicked':
      case 'campaign_clicked':
        return !!recipient.clickedAt
      
      case 'replied':
      case 'campaign_replied':
        return !!recipient.repliedAt
      
      case 'not_opened':
      case 'campaign_not_opened':
        return !recipient.openedAt
      
      case 'not_clicked':
      case 'campaign_not_clicked':
        return !recipient.clickedAt
      
      case 'not_replied':
      case 'campaign_not_replied':
        return !recipient.repliedAt
      
      case 'opened_no_reply':
      case 'campaign_opened_no_reply':
        return !!recipient.openedAt && !recipient.repliedAt
      
      case 'opened_no_click':
      case 'campaign_opened_no_click':
        return !!recipient.openedAt && !recipient.clickedAt
      
      case 'clicked_no_reply':
      case 'campaign_clicked_no_reply':
        return !!recipient.clickedAt && !recipient.repliedAt
      
      default:
        console.warn(`Unknown campaign condition type: ${conditionType}`)
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
    console.log('🔍 hasContactReplied called with:', { enrollmentId, referenceStep })
    
    // Find the step index from the reference step ID
    const enrollment = await prisma.sequenceEnrollment.findUnique({
      where: { id: enrollmentId },
      include: { sequence: true }
    })
    
    if (!enrollment) {
      console.log('  No enrollment found')
      return false
    }
    
    const steps = enrollment.sequence.steps as any[]
    const stepIndex = referenceStep ? steps.findIndex((s: any) => s.id === referenceStep) : enrollment.currentStep - 1
    
    console.log('  Looking for REPLIED event at stepIndex:', stepIndex)
    
    if (stepIndex < 0) {
      console.log('  Invalid step index')
      return false
    }
    
    const replyEvent = await prisma.sequenceEvent.findFirst({
      where: {
        enrollmentId,
        stepIndex,
        eventType: 'REPLIED'
      }
    })
    
    const result = !!replyEvent
    console.log('  REPLIED event found:', result)
    console.log('  hasContactReplied returning:', result)
    
    return result
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
// Force deployment at Tue Sep  9 12:56:56 EDT 2025
