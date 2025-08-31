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
    hours: z.number().min(0).max(23)
  }).optional(),
  condition: z.object({
    type: z.enum(['opened', 'clicked', 'replied', 'not_opened', 'not_clicked']),
    referenceStep: z.string(),
    trueBranch: z.array(z.string()),
    falseBranch: z.array(z.string())
  }).optional(),
  replyToThread: z.boolean(),
  trackingEnabled: z.boolean(),
  position: z.object({
    x: z.number(),
    y: z.number()
  }),
  nextStepId: z.string().optional()
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
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch sequence with enrollment data and metrics
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
        },
        enrollments: {
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
            createdAt: 'desc'
          }
        }
      }
    })

    if (!sequence) {
      return NextResponse.json({ error: 'Sequence not found' }, { status: 404 })
    }

    // Calculate detailed metrics
    const steps = Array.isArray(sequence.steps) ? sequence.steps : []
    const totalEnrollments = sequence._count.enrollments
    const activeEnrollments = sequence.enrollments.filter(e => e.status === 'ACTIVE').length
    const completedEnrollments = sequence.enrollments.filter(e => e.status === 'COMPLETED').length
    const pausedEnrollments = sequence.enrollments.filter(e => e.status === 'PAUSED').length

    // TODO: Email metrics - implement once Email/SequenceStep models are added
    const totalEmails = 0 // Not tracked in current schema
    const sentEmails = 0 // Not tracked in current schema
    const openedEmails = 0 // Not tracked in current schema
    const clickedEmails = 0 // Not tracked in current schema
    const repliedEmails = 0 // Not tracked in current schema

    // Step-by-step performance - placeholder values
    const stepPerformance = steps.map((step: any) => {
      const stepSent = 0 // Not tracked in current schema
      const stepOpened = 0 // Not tracked in current schema
      const stepClicked = 0 // Not tracked in current schema
      
      return {
        stepId: step.id,
        stepType: step.type,
        subject: step.subject || 'No subject',
        sent: stepSent,
        opened: stepOpened,
        clicked: stepClicked,
        openRate: stepSent > 0 ? (stepOpened / stepSent * 100) : 0,
        clickRate: stepSent > 0 ? (stepClicked / stepSent * 100) : 0
      }
    }).filter(step => step.stepType === 'email') // Only email steps have metrics

    return NextResponse.json({
      success: true,
      sequence: {
        id: sequence.id,
        name: sequence.name,
        description: sequence.description,
        status: sequence.status,
        triggerType: sequence.triggerType,
        trackingEnabled: sequence.trackingEnabled,
        steps,
        stepCount: steps.length,
        hasConditions: steps.some((step: any) => step.type === 'condition'),
        createdAt: sequence.createdAt,
        updatedAt: sequence.updatedAt,
        
        // Enrollment metrics
        metrics: {
          enrollments: {
            total: totalEnrollments,
            active: activeEnrollments,
            completed: completedEnrollments,
            paused: pausedEnrollments
          },
          emails: {
            total: totalEmails,
            sent: sentEmails,
            opened: openedEmails,
            clicked: clickedEmails,
            replied: repliedEmails,
            openRate: sentEmails > 0 ? (openedEmails / sentEmails * 100) : 0,
            clickRate: sentEmails > 0 ? (clickedEmails / sentEmails * 100) : 0,
            replyRate: sentEmails > 0 ? (repliedEmails / sentEmails * 100) : 0
          },
          stepPerformance
        },
        
        // Recent enrollments with contact info
        recentEnrollments: sequence.enrollments.slice(0, 10).map(enrollment => ({
          id: enrollment.id,
          status: enrollment.status,
          currentStep: enrollment.currentStep,
          enrolledAt: enrollment.createdAt,
          nextActionAt: null, // Field doesn't exist in schema
          contact: enrollment.contact,
          emailsSent: 0, // Emails not tracked in current schema
          lastEmailSent: null // Emails not tracked in current schema
        }))
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
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

      // Check that condition reference steps exist
      for (const step of steps.filter(s => s.type === 'condition')) {
        if (step.condition?.referenceStep && 
            !steps.find(s => s.id === step.condition?.referenceStep)) {
          return NextResponse.json({
            error: `Invalid reference step in condition: ${step.condition.referenceStep}`
          }, { status: 400 })
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

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