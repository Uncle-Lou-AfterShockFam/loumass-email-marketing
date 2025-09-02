import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schema for sequence step
const sequenceStepSchema = z.object({
  id: z.string(),
  type: z.enum(['email', 'delay', 'condition']),
  subject: z.string().optional(),
  content: z.string().optional(),
  delay: z.object({
    days: z.number().min(0),
    hours: z.number().min(0).max(23),
    minutes: z.number().min(0).max(59)
  }).optional(),
  condition: z.object({
    type: z.enum(['opened', 'clicked', 'replied', 'not_opened', 'not_clicked', 'not_replied', 'opened_no_reply', 'opened_no_click', 'clicked_no_reply']),
    referenceStep: z.string().optional(),
    trueBranch: z.array(z.string()).optional(),
    falseBranch: z.array(z.string()).optional()
  }).optional(),
  replyToThread: z.boolean().optional(),
  trackingEnabled: z.boolean().optional(),
  position: z.object({
    x: z.number(),
    y: z.number()
  }),
  nextStepId: z.string().nullable().optional()
})

// Validation schema for sequence update
const updateSequenceSchema = z.object({
  name: z.string().min(1, 'Sequence name is required').optional(),
  description: z.string().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED']).optional(),
  trackingEnabled: z.boolean().optional(),
  steps: z.array(sequenceStepSchema).optional()
})

// GET /api/sequences/[id] - Get sequence details
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    
    console.log('Fetching sequence with ID:', id)
    
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      console.log('No session found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('User ID:', session.user.id)

    // Fetch sequence with enrollment data and analytics
    const sequence = await prisma.sequence.findFirst({
      where: {
        id,
        userId: session.user.id
      },
      include: {
        enrollments: {
          include: {
            contact: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                company: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })

    if (!sequence) {
      console.log('Sequence not found for ID:', id, 'and user:', session.user.id)
      return NextResponse.json({ error: 'Sequence not found' }, { status: 404 })
    }

    // Get sequence events for analytics
    const sequenceEvents = await prisma.sequenceEvent.findMany({
      where: {
        enrollment: {
          sequenceId: id
        }
      },
      include: {
        enrollment: {
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
        }
      }
    })

    console.log(`Found ${sequenceEvents.length} sequence events for sequence ${id}`)
    console.log('Sequence events by type:', {
      opens: sequenceEvents.filter(e => e.eventType === 'OPENED').length,
      clicks: sequenceEvents.filter(e => e.eventType === 'CLICKED').length,
      replies: sequenceEvents.filter(e => e.eventType === 'REPLIED').length
    })

    // Calculate analytics by step
    const steps = Array.isArray(sequence.steps) ? sequence.steps : []
    const stepAnalytics = steps.map((step: any, stepIndex: number) => {
      const stepEvents = sequenceEvents.filter(event => event.stepIndex === stepIndex)
      
      const opens = stepEvents.filter(e => e.eventType === 'OPENED').length
      const clicks = stepEvents.filter(e => e.eventType === 'CLICKED').length  
      const replies = stepEvents.filter(e => e.eventType === 'REPLIED').length
      
      console.log(`Step ${stepIndex} (${step.id}):`, {
        totalStepEvents: stepEvents.length,
        opens,
        clicks,
        replies
      })
      
      // Count enrollments that have reached this step (sent emails)
      const enrollmentsAtStep = sequence.enrollments.filter(enrollment => {
        const currentStep = typeof enrollment.currentStep === 'string' ? 
          parseInt(enrollment.currentStep) : enrollment.currentStep
        return currentStep > stepIndex || (currentStep === stepIndex && enrollment.lastEmailSentAt)
      }).length

      return {
        stepIndex,
        stepId: step.id,
        opens,
        clicks,
        replies,
        sent: enrollmentsAtStep,
        openRate: enrollmentsAtStep > 0 ? Math.round((opens / enrollmentsAtStep) * 100) : 0,
        clickRate: enrollmentsAtStep > 0 ? Math.round((clicks / enrollmentsAtStep) * 100) : 0,
        replyRate: enrollmentsAtStep > 0 ? Math.round((replies / enrollmentsAtStep) * 100) : 0
      }
    })

    console.log('Step analytics:', stepAnalytics)
    console.log('Found sequence:', sequence.name)

    return NextResponse.json({
      sequence: {
        id: sequence.id,
        name: sequence.name,
        description: sequence.description,
        status: sequence.status,
        triggerType: sequence.triggerType,
        trackingEnabled: sequence.trackingEnabled,
        steps: sequence.steps,
        createdAt: sequence.createdAt,
        updatedAt: sequence.updatedAt,
        enrollments: sequence.enrollments,
        analytics: {
          stepAnalytics,
          totalEvents: sequenceEvents.length,
          totalOpens: sequenceEvents.filter(e => e.eventType === 'OPENED').length,
          totalClicks: sequenceEvents.filter(e => e.eventType === 'CLICKED').length,
          totalReplies: sequenceEvents.filter(e => e.eventType === 'REPLIED').length
        }
      }
    })

  } catch (error) {
    console.error('Error fetching sequence:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch sequence' 
    }, { status: 500 })
  }
}

// PUT /api/sequences/[id] - Update sequence
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate request data
    const validationResult = updateSequenceSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Invalid data', 
        details: validationResult.error.format() 
      }, { status: 400 })
    }

    const { name, description, status, trackingEnabled, steps } = validationResult.data

    // Check sequence exists and belongs to user
    const existingSequence = await prisma.sequence.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    })

    if (!existingSequence) {
      return NextResponse.json({ error: 'Sequence not found' }, { status: 404 })
    }

    // If updating steps, validate sequence logic
    if (steps) {
      const emailSteps = steps.filter(s => s.type === 'email')
      if (emailSteps.length === 0) {
        return NextResponse.json({ 
          error: 'Sequence must contain at least one email step' 
        }, { status: 400 })
      }

      // Check that condition steps are properly configured for active sequences
      if (status === 'ACTIVE') {
        for (const step of steps.filter(s => s.type === 'condition')) {
          if (!step.condition?.referenceStep) {
            return NextResponse.json({
              error: `Condition step must reference an email step to check`
            }, { status: 400 })
          }
          
          // Verify referenceStep exists and is an email
          if (!steps.find(s => s.id === step.condition?.referenceStep && s.type === 'email')) {
            return NextResponse.json({
              error: `Condition references invalid or non-email step: ${step.condition.referenceStep}`
            }, { status: 400 })
          }
        }
      }
    }

    // Update sequence
    const updatedSequence = await prisma.sequence.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(status && { status }),
        ...(trackingEnabled !== undefined && { trackingEnabled }),
        ...(steps && { steps: steps })
      }
    })

    return NextResponse.json({
      success: true,
      sequence: {
        id: updatedSequence.id,
        name: updatedSequence.name,
        description: updatedSequence.description,
        status: updatedSequence.status,
        triggerType: updatedSequence.triggerType,
        trackingEnabled: updatedSequence.trackingEnabled,
        steps: updatedSequence.steps,
        stepCount: Array.isArray(updatedSequence.steps) ? updatedSequence.steps.length : 0,
        updatedAt: updatedSequence.updatedAt
      }
    })

  } catch (error) {
    console.error('Error updating sequence:', error)
    return NextResponse.json({ 
      error: 'Failed to update sequence' 
    }, { status: 500 })
  }
}

// DELETE /api/sequences/[id] - Delete sequence
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check sequence exists and belongs to user
    const sequence = await prisma.sequence.findFirst({
      where: {
        id,
        userId: session.user.id
      },
      include: {
        _count: {
          select: {
            enrollments: true
          }
        }
      }
    })

    if (!sequence) {
      return NextResponse.json({ error: 'Sequence not found' }, { status: 404 })
    }

    // Check if sequence has active enrollments
    const activeEnrollments = await prisma.sequenceEnrollment.count({
      where: {
        sequenceId: id,
        status: 'ACTIVE'
      }
    })

    if (activeEnrollments > 0) {
      return NextResponse.json({
        error: `Cannot delete sequence with ${activeEnrollments} active enrollments. Please pause or complete the sequence first.`
      }, { status: 400 })
    }

    // Delete sequence (cascade will handle related records)
    await prisma.sequence.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'Sequence deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting sequence:', error)
    return NextResponse.json({ 
      error: 'Failed to delete sequence' 
    }, { status: 500 })
  }
}