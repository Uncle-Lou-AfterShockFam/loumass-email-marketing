import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SequenceService } from '@/services/sequence-service'
import { z } from 'zod'

// Validation schema for scheduling request
const scheduleSchema = z.object({
  enrollmentIds: z.array(z.string()).optional(),
  contactIds: z.array(z.string()).optional(),
  scheduleAll: z.boolean().default(false),
  delayMinutes: z.number().min(0).default(0),
  forceNext: z.boolean().default(false)
}).refine(data => {
  return data.scheduleAll || data.enrollmentIds?.length || data.contactIds?.length
}, {
  message: "Must specify enrollmentIds, contactIds, or scheduleAll"
})

// POST /api/sequences/[id]/schedule - Schedule next steps for sequence enrollments
export async function POST(
  request: NextRequest,
  context: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    // Handle both sync and async params
    const params = 'then' in context.params ? await context.params : context.params
    const { id: sequenceId } = params
    
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json()
    
    // Validate request data
    const validationResult = scheduleSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Invalid data', 
        details: validationResult.error.format() 
      }, { status: 400 })
    }

    const { enrollmentIds, contactIds, scheduleAll, delayMinutes, forceNext } = validationResult.data

    // Check sequence exists and belongs to user
    const sequence = await prisma.sequence.findFirst({
      where: {
        id: sequenceId,
        userId: session.user.id
      },
      include: {
        user: {
          include: {
            gmailToken: true
          }
        }
      }
    })

    if (!sequence) {
      return NextResponse.json({ error: 'Sequence not found' }, { status: 404 })
    }

    if (sequence.status !== 'ACTIVE') {
      return NextResponse.json({
        error: 'Can only schedule steps for active sequences'
      }, { status: 400 })
    }

    if (!sequence.user.gmailToken) {
      return NextResponse.json({
        error: 'Gmail account not connected. Please connect Gmail to send emails.'
      }, { status: 400 })
    }

    // Build enrollment query
    let enrollmentQuery: any = {
      sequenceId,
      status: 'ACTIVE'
    }

    if (!scheduleAll) {
      if (enrollmentIds?.length) {
        enrollmentQuery.id = { in: enrollmentIds }
      } else if (contactIds?.length) {
        enrollmentQuery.contactId = { in: contactIds }
      }
    }

    // Get enrollments to schedule
    const enrollments = await prisma.sequenceEnrollment.findMany({
      where: enrollmentQuery,
      include: {
        contact: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })

    if (enrollments.length === 0) {
      return NextResponse.json({
        error: 'No active enrollments found to schedule'
      }, { status: 404 })
    }

    // Calculate scheduling time
    const scheduleTime = new Date()
    if (delayMinutes > 0) {
      scheduleTime.setMinutes(scheduleTime.getMinutes() + delayMinutes)
    }

    // Initialize sequence service
    const sequenceService = new SequenceService()

    const results = {
      scheduled: 0,
      completed: 0,
      failed: 0,
      errors: [] as Array<{
        enrollmentId: string;
        contactEmail: string;
        error: string;
      }>
    }

    // Process each enrollment
    for (const enrollment of enrollments) {
      try {
        // Check if enrollment should be scheduled now or later
        // TODO: Implement nextActionAt field once added to schema
        const shouldScheduleNow = delayMinutes === 0 && (
          forceNext || 
          true // Always schedule for now since nextActionAt doesn't exist in schema
        )

        if (shouldScheduleNow) {
          // Process immediately
          const result = await sequenceService.processSequenceStep(enrollment.id)
          
          if (result.success) {
            if (result.completed) {
              results.completed++
            } else {
              results.scheduled++
            }
          } else {
            results.failed++
            results.errors.push({
              enrollmentId: enrollment.id,
              contactEmail: enrollment.contact.email,
              error: result.reason || 'Unknown error'
            })
          }
        } else {
          // Schedule for later
          await prisma.sequenceEnrollment.update({
            where: { id: enrollment.id },
            data: {
              // nextActionAt field doesn't exist in schema - TODO: add to schema
              updatedAt: new Date()
            }
          })
          results.scheduled++
        }

      } catch (error) {
        console.error(`Failed to schedule step for enrollment ${enrollment.id}:`, error)
        results.failed++
        results.errors.push({
          enrollmentId: enrollment.id,
          contactEmail: enrollment.contact.email,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${enrollments.length} enrollments`,
      results: {
        totalProcessed: enrollments.length,
        scheduled: results.scheduled,
        completed: results.completed,
        failed: results.failed,
        scheduledFor: delayMinutes > 0 ? scheduleTime.toISOString() : 'Immediate',
        errors: results.errors
      },
      sequence: {
        id: sequence.id,
        name: sequence.name,
        totalSteps: Array.isArray(sequence.steps) ? sequence.steps.length : 0
      }
    })

  } catch (error) {
    console.error('Error scheduling sequence steps:', error)
    return NextResponse.json({ 
      error: 'Failed to schedule sequence steps' 
    }, { status: 500 })
  }
}

// GET /api/sequences/[id]/schedule - Get scheduling status and ready enrollments
export async function GET(
  request: NextRequest,
  context: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    // Handle both sync and async params
    const params = 'then' in context.params ? await context.params : context.params
    const { id: sequenceId } = params
    
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check sequence exists and belongs to user
    const sequence = await prisma.sequence.findFirst({
      where: {
        id: sequenceId,
        userId: session.user.id
      },
      select: {
        id: true,
        name: true,
        status: true,
        steps: true,
        user: {
          select: {
            gmailToken: {
              select: {
                email: true
              }
            }
          }
        }
      }
    })

    if (!sequence) {
      return NextResponse.json({ error: 'Sequence not found' }, { status: 404 })
    }

    const now = new Date()

    // Get all enrollments with their status
    const enrollments = await prisma.sequenceEnrollment.findMany({
      where: {
        sequenceId
      },
      include: {
        contact: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc' // Use createdAt since nextActionAt doesn't exist
      }
    })

    // Categorize enrollments - simplified since nextActionAt doesn't exist
    const readyToSchedule = enrollments.filter(e => 
      e.status === 'ACTIVE'
    )

    const scheduled: any[] = [] // No scheduled enrollments without nextActionAt field

    const completed = enrollments.filter(e => e.status === 'COMPLETED')
    const paused = enrollments.filter(e => e.status === 'PAUSED')

    // Get sequence steps info
    const steps = Array.isArray(sequence.steps) ? sequence.steps : []
    const emailSteps = steps.filter((step: any) => step.type === 'email')

    return NextResponse.json({
      success: true,
      sequence: {
        id: sequence.id,
        name: sequence.name,
        status: sequence.status,
        totalSteps: steps.length,
        emailSteps: emailSteps.length,
        gmailConnected: !!sequence.user.gmailToken?.email
      },
      enrollments: {
        total: enrollments.length,
        readyToSchedule: readyToSchedule.length,
        scheduled: scheduled.length,
        completed: completed.length,
        paused: paused.length,
        active: enrollments.filter(e => e.status === 'ACTIVE').length
      },
      details: {
        readyToSchedule: readyToSchedule.map(e => ({
          id: e.id,
          contactId: e.contactId,
          contactEmail: e.contact.email,
          displayName: `${e.contact.firstName || ''} ${e.contact.lastName || ''}`.trim() || e.contact.email,
          currentStep: e.currentStep,
          nextActionAt: null, // Field doesn't exist in schema
          enrolledAt: e.createdAt
        })),
        nextScheduled: scheduled.slice(0, 5).map(e => ({
          id: e.id,
          contactEmail: e.contact.email,
          displayName: `${e.contact.firstName || ''} ${e.contact.lastName || ''}`.trim() || e.contact.email,
          currentStep: e.currentStep,
          nextActionAt: null, // Field doesn't exist in schema
          timeUntilNext: e.nextActionAt ? Math.max(0, Math.floor((e.nextActionAt.getTime() - now.getTime()) / 1000 / 60)) : null
        }))
      },
      canSchedule: sequence.status === 'ACTIVE' && !!sequence.user.gmailToken?.email && readyToSchedule.length > 0
    })

  } catch (error) {
    console.error('Error fetching schedule status:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch schedule status' 
    }, { status: 500 })
  }
}