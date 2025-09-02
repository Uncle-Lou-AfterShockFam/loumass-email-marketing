import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SequenceService } from '@/services/sequence-service'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Manual trigger endpoint for sequence processing
// This allows us to process sequences without waiting for cron
export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('=== MANUAL SEQUENCE PROCESSOR TRIGGERED ===')
    console.log('User:', session.user.email)
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

    console.log(`Found ${activeSequences.length} active sequences to process`)

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

      if (sequenceResults.processed > 0 || sequenceResults.errors.length > 0) {
        results.details.push(sequenceResults)
      }
    }

    const duration = Date.now() - startTime
    console.log(`=== SEQUENCE PROCESSOR COMPLETED in ${duration}ms ===`)
    console.log(`Processed: ${results.processed} enrollments`)
    console.log(`Sent: ${results.sentEmails} emails`)
    console.log(`Completed: ${results.completed} enrollments`)
    console.log(`Errors: ${results.errors}`)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration,
      results
    })

  } catch (error) {
    console.error('Manual sequence processor error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}