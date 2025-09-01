import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SequenceService } from '@/services/sequence-service'

// Manual trigger to process all active sequences
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('=== MANUAL SEQUENCE PROCESSING TRIGGERED ===')
    const startTime = Date.now()

    // Get all active sequences for this user
    const activeSequences = await prisma.sequence.findMany({
      where: {
        userId: session.user.id,
        status: 'ACTIVE',
        enrollments: {
          some: {
            status: 'ACTIVE'
          }
        }
      },
      include: {
        user: {
          include: {
            gmailToken: true
          }
        },
        enrollments: {
          where: {
            status: 'ACTIVE'
          },
          include: {
            contact: true
          }
        }
      }
    })

    if (activeSequences.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active sequences with enrollments to process',
        results: {
          totalSequences: 0,
          totalEnrollments: 0,
          processed: 0
        }
      })
    }

    const sequenceService = new SequenceService()
    const results = {
      totalSequences: activeSequences.length,
      totalEnrollments: 0,
      processed: 0,
      sentEmails: 0,
      completed: 0,
      errors: 0,
      details: [] as any[]
    }

    // Process each sequence
    for (const sequence of activeSequences) {
      // Skip if no Gmail token
      if (!sequence.user.gmailToken) {
        console.log(`Skipping sequence ${sequence.id} - no Gmail token`)
        continue
      }

      const sequenceResults = {
        sequenceId: sequence.id,
        sequenceName: sequence.name,
        enrollments: sequence.enrollments.length,
        processed: 0,
        sent: 0,
        completed: 0,
        errors: [] as any[]
      }

      // Process each enrollment
      for (const enrollment of sequence.enrollments) {
        try {
          results.totalEnrollments++
          
          // Parse sequence steps
          const steps = Array.isArray(sequence.steps) ? sequence.steps : 
                       typeof sequence.steps === 'string' ? JSON.parse(sequence.steps) : []
          
          // Check if we're at a delay step
          const currentStepIndex = enrollment.currentStep
          if (currentStepIndex < steps.length) {
            const currentStep = steps[currentStepIndex]
            
            // If it's a delay step, check if enough time has passed
            if (currentStep.type === 'delay') {
              const delayHours = currentStep.hours || 0
              const delayMinutes = currentStep.minutes || 0
              const delayMs = (delayHours * 60 * 60 * 1000) + (delayMinutes * 60 * 1000)
              
              // Check when the last action was (email sent or enrollment created)
              const lastActionTime = enrollment.lastEmailSentAt || enrollment.createdAt
              const timeSinceLastAction = Date.now() - lastActionTime.getTime()
              
              if (timeSinceLastAction < delayMs) {
                // Not ready yet
                const remainingMs = delayMs - timeSinceLastAction
                const remainingMinutes = Math.ceil(remainingMs / 60000)
                console.log(`Enrollment ${enrollment.id} waiting ${remainingMinutes} more minutes`)
                sequenceResults.errors.push({
                  enrollmentId: enrollment.id,
                  contact: enrollment.contact.email,
                  error: `Waiting ${remainingMinutes} more minutes before next step`
                })
                continue
              }
            }
          }

          // Process the enrollment step
          console.log(`Processing enrollment ${enrollment.id} at step ${enrollment.currentStep}`)
          const result = await sequenceService.processSequenceStep(enrollment.id)
          
          results.processed++
          sequenceResults.processed++
          
          if (result.success) {
            if (result.sentStep) {
              results.sentEmails++
              sequenceResults.sent++
              console.log(`Sent email for enrollment ${enrollment.id}, step ${result.sentStep}`)
            }
            if (result.completed) {
              results.completed++
              sequenceResults.completed++
              console.log(`Completed enrollment ${enrollment.id}`)
            }
          } else {
            results.errors++
            sequenceResults.errors.push({
              enrollmentId: enrollment.id,
              contact: enrollment.contact.email,
              error: result.reason
            })
            console.error(`Failed to process enrollment ${enrollment.id}:`, result.reason)
          }
          
        } catch (error) {
          results.errors++
          sequenceResults.errors.push({
            enrollmentId: enrollment.id,
            contact: enrollment.contact.email,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
          console.error(`Error processing enrollment ${enrollment.id}:`, error)
        }
      }

      results.details.push(sequenceResults)
    }

    const duration = Date.now() - startTime
    console.log(`=== MANUAL SEQUENCE PROCESSING COMPLETED in ${duration}ms ===`)

    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed} enrollments across ${results.totalSequences} sequences`,
      timestamp: new Date().toISOString(),
      duration,
      results
    })

  } catch (error) {
    console.error('Manual sequence processing error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}