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
    referenceStep: z.string().optional(), // Optional during building, will validate later
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

// Validation schema for sequence creation
const createSequenceSchema = z.object({
  name: z.string().min(1, 'Sequence name is required'),
  description: z.string().optional(),
  triggerType: z.enum(['MANUAL', 'ON_SIGNUP', 'ON_EVENT']).default('MANUAL'),
  sequenceType: z.enum(['STANDALONE', 'CAMPAIGN_FOLLOWUP']).default('STANDALONE'),
  trackingEnabled: z.boolean().default(true),
  steps: z.array(sequenceStepSchema),
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED']).default('DRAFT')
})

// POST /api/sequences - Create new sequence
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate request data
    const validationResult = createSequenceSchema.safeParse(body)
    if (!validationResult.success) {
      console.error('Sequence validation failed:', validationResult.error.format())
      return NextResponse.json({ 
        error: 'Invalid data', 
        details: validationResult.error.format() 
      }, { status: 400 })
    }

    const { name, description, triggerType, sequenceType, trackingEnabled, steps, status } = validationResult.data

    // Validate sequence logic
    const emailSteps = steps.filter(s => s.type === 'email')
    if (emailSteps.length === 0) {
      return NextResponse.json({ 
        error: 'Sequence must contain at least one email step' 
      }, { status: 400 })
    }

    // Check that condition steps are properly configured
    for (const step of steps.filter(s => s.type === 'condition')) {
      // Condition must have a valid reference step for active sequences
      if (status === 'ACTIVE' && !step.condition?.referenceStep) {
        return NextResponse.json({
          error: `Condition step must reference an email step to check`
        }, { status: 400 })
      }
      
      // If referenceStep is provided, it must exist
      if (step.condition?.referenceStep && 
          !steps.find(s => s.id === step.condition?.referenceStep && s.type === 'email')) {
        return NextResponse.json({
          error: `Condition references invalid or non-email step: ${step.condition.referenceStep}`
        }, { status: 400 })
      }
    }

    // Create sequence with steps
    const sequence = await prisma.sequence.create({
      data: {
        userId: session.user.id,
        name,
        description,
        status,
        triggerType: triggerType.toLowerCase(),
        sequenceType: sequenceType || 'STANDALONE',
        trackingEnabled: trackingEnabled ?? true,
        steps: steps // Store steps as JSON
      }
    })

    return NextResponse.json({
      success: true,
      id: sequence.id,
      sequence: {
        id: sequence.id,
        name: sequence.name,
        description: sequence.description,
        status: sequence.status,
        triggerType: sequence.triggerType,
        trackingEnabled: sequence.trackingEnabled,
        steps: sequence.steps,
        stepCount: steps.length,
        createdAt: sequence.createdAt,
        updatedAt: sequence.updatedAt
      }
    })

  } catch (error) {
    console.error('Error creating sequence:', error)
    return NextResponse.json({ 
      error: 'Failed to create sequence' 
    }, { status: 500 })
  }
}

// GET /api/sequences - List user's sequences
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build filters
    const where: any = {
      userId: session.user.id
    }

    if (status) {
      where.status = status.toUpperCase()
    }

    // Fetch sequences with enrollment counts
    const sequences = await prisma.sequence.findMany({
      where,
      include: {
        _count: {
          select: {
            enrollments: true
          }
        },
        enrollments: {
          where: {
            status: 'ACTIVE'
          },
          select: {
            id: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    })

    // Calculate metrics for each sequence
    const sequencesWithMetrics = sequences.map(sequence => {
      const steps = Array.isArray(sequence.steps) ? sequence.steps : []
      return {
        id: sequence.id,
        name: sequence.name,
        description: sequence.description,
        status: sequence.status,
        triggerType: sequence.triggerType,
        trackingEnabled: sequence.trackingEnabled,
        steps: sequence.steps,
        totalEnrollments: sequence._count.enrollments,
        activeEnrollments: sequence.enrollments.length,
        stepCount: steps.length,
        hasConditions: steps.some((step: any) => step.type === 'condition'),
        createdAt: sequence.createdAt,
        updatedAt: sequence.updatedAt
      }
    })

    return NextResponse.json({
      success: true,
      sequences: sequencesWithMetrics,
      pagination: {
        limit,
        offset,
        total: sequences.length
      }
    })

  } catch (error) {
    console.error('Error fetching sequences:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch sequences' 
    }, { status: 500 })
  }
}