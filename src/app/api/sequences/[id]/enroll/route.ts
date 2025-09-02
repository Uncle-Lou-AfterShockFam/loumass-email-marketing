import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schema for enrollment request
const enrollmentSchema = z.object({
  contactIds: z.array(z.string()).min(1, 'At least one contact must be selected'),
  startImmediately: z.boolean().default(true),
  customVariables: z.record(z.string(), z.any()).optional(),
  // Campaign context for conditional triggering
  campaignContext: z.object({
    campaignId: z.string(),
    recipientIds: z.array(z.string()) // Maps to contactIds
  }).optional()
})

// POST /api/sequences/[id]/enroll - Enroll contacts in sequence
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sequenceId } = await context.params
    
    // Support both session-based auth and internal API calls with x-user-id header
    const session = await getServerSession(authOptions)
    const internalUserId = request.headers.get('x-user-id')
    
    const userId = session?.user?.id || internalUserId
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json()
    
    // Validate request data
    const validationResult = enrollmentSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Invalid data', 
        details: validationResult.error.format() 
      }, { status: 400 })
    }

    const { contactIds, startImmediately, customVariables, campaignContext } = validationResult.data

    // Check sequence exists and belongs to user
    const sequence = await prisma.sequence.findFirst({
      where: {
        id: sequenceId,
        userId: userId
      }
    })

    if (!sequence) {
      return NextResponse.json({ error: 'Sequence not found' }, { status: 404 })
    }

    if (sequence.status !== 'ACTIVE') {
      return NextResponse.json({
        error: 'Can only enroll contacts in active sequences'
      }, { status: 400 })
    }

    // Validate all contacts belong to user
    const contacts = await prisma.contact.findMany({
      where: {
        id: { in: contactIds },
        userId: userId
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true
      }
    })

    if (contacts.length !== contactIds.length) {
      return NextResponse.json({
        error: 'One or more contacts not found or do not belong to you'
      }, { status: 400 })
    }

    // Check for existing enrollments
    const existingEnrollments = await prisma.sequenceEnrollment.findMany({
      where: {
        sequenceId,
        contactId: { in: contactIds }
      },
      select: {
        contactId: true,
        status: true,
        contact: {
          select: {
            email: true
          }
        }
      }
    })

    const alreadyEnrolled = existingEnrollments.filter(e => 
      e.status === 'ACTIVE' || e.status === 'COMPLETED'
    )

    if (alreadyEnrolled.length > 0) {
      return NextResponse.json({
        error: `Some contacts are already enrolled in this sequence: ${alreadyEnrolled.map(e => e.contact.email).join(', ')}`
      }, { status: 400 })
    }

    // Calculate initial step timing
    const steps = Array.isArray(sequence.steps) ? sequence.steps : []
    
    // Check if sequence starts with a condition (for campaign-triggered sequences)
    const firstStep = steps[0] as any
    const startsWithCondition = firstStep?.type === 'condition'
    
    // If not starting with condition, ensure there's an email step
    if (!startsWithCondition) {
      const hasEmailStep = steps.find((step: any) => step.type === 'email')
      if (!hasEmailStep) {
        return NextResponse.json({
          error: 'Sequence has no email steps to execute'
        }, { status: 400 })
      }
    }
    
    // If campaign context provided, validate recipient mapping
    let campaignRecipientMap: Map<string, string> = new Map()
    if (campaignContext) {
      // Create mapping of contactId to recipientId
      contactIds.forEach((contactId, index) => {
        if (campaignContext.recipientIds[index]) {
          campaignRecipientMap.set(contactId, campaignContext.recipientIds[index])
        }
      })
    }

    const now = new Date()
    // TODO: Implement scheduling for sequences when nextActionAt field is added to schema

    // Create enrollments
    const enrollments = await Promise.all(
      contacts.map(async (contact) => {
        // Remove any existing paused enrollments
        await prisma.sequenceEnrollment.deleteMany({
          where: {
            sequenceId,
            contactId: contact.id,
            status: 'PAUSED'
          }
        })

        // Create new enrollment with campaign context if provided
        const recipientId = campaignRecipientMap.get(contact.id)
        
        return prisma.sequenceEnrollment.create({
          data: {
            sequenceId,
            contactId: contact.id,
            status: 'ACTIVE',
            currentStep: 0,
            createdAt: now,
            // Add campaign context if provided
            ...(campaignContext && recipientId ? {
              triggerCampaignId: campaignContext.campaignId,
              triggerRecipientId: recipientId
            } : {})
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
          }
        })
      })
    )

    // If starting immediately, trigger the first step for each enrollment
    if (startImmediately) {
      const { SequenceService } = await import('@/services/sequence-service')
      const sequenceService = new SequenceService()
      
      // Process first step for each enrollment
      const processingResults = await Promise.allSettled(
        enrollments.map(enrollment => 
          sequenceService.processSequenceStep(enrollment.id)
        )
      )

      // Log any processing errors
      processingResults.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`Failed to process first step for enrollment ${enrollments[index].id}:`, result.reason)
        } else if (!result.value.success) {
          console.warn(`First step processing failed for enrollment ${enrollments[index].id}:`, result.value.reason)
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: `Successfully enrolled ${enrollments.length} contacts in sequence`,
      enrollments: enrollments.map(enrollment => ({
        id: enrollment.id,
        contact: enrollment.contact,
        status: enrollment.status,
        currentStep: enrollment.currentStep,
        enrolledAt: enrollment.createdAt
      })),
      summary: {
        sequenceName: sequence.name,
        contactsEnrolled: enrollments.length,
        startTime: startImmediately ? 'Immediately' : 'In 5 minutes',
        firstStepType: (firstStep as any)?.type || 'email'
      }
    })

  } catch (error) {
    console.error('Error enrolling contacts in sequence:', error)
    return NextResponse.json({ 
      error: 'Failed to enroll contacts in sequence' 
    }, { status: 500 })
  }
}

// GET /api/sequences/[id]/enroll - Get enrollable contacts
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sequenceId } = await context.params
    
    // Support both session-based auth and internal API calls with x-user-id header
    const session = await getServerSession(authOptions)
    const internalUserId = request.headers.get('x-user-id')
    
    const userId = session?.user?.id || internalUserId
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check sequence exists and belongs to user
    const sequence = await prisma.sequence.findFirst({
      where: {
        id: sequenceId,
        userId: userId
      },
      select: {
        id: true,
        name: true,
        status: true
      }
    })

    if (!sequence) {
      return NextResponse.json({ error: 'Sequence not found' }, { status: 404 })
    }

    // Get all user contacts
    const allContacts = await prisma.contact.findMany({
      where: {
        userId: userId
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        tags: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Get existing enrollments for this sequence
    const existingEnrollments = await prisma.sequenceEnrollment.findMany({
      where: {
        sequenceId,
        status: { in: ['ACTIVE', 'COMPLETED', 'PAUSED'] }
      },
      select: {
        contactId: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    })

    const enrollmentMap = new Map(
      existingEnrollments.map(e => [e.contactId, e])
    )

    // Categorize contacts
    const availableContacts = allContacts.filter(contact => 
      !enrollmentMap.has(contact.id)
    )

    const enrolledContacts = allContacts
      .filter(contact => enrollmentMap.has(contact.id))
      .map(contact => ({
        ...contact,
        enrollment: enrollmentMap.get(contact.id)
      }))

    // Get user campaigns for bulk enrollment
    const campaigns = await prisma.campaign.findMany({
      where: {
        userId: userId
      },
      select: {
        id: true,
        name: true,
        status: true,
        _count: {
          select: {
            recipients: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      sequence: {
        id: sequence.id,
        name: sequence.name,
        status: sequence.status
      },
      contacts: {
        available: availableContacts.map(contact => ({
          id: contact.id,
          email: contact.email,
          displayName: `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || contact.email,
          firstName: contact.firstName,
          lastName: contact.lastName,
          tags: contact.tags,
          createdAt: contact.createdAt
        })),
        enrolled: enrolledContacts.map(contact => ({
          id: contact.id,
          email: contact.email,
          displayName: `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || contact.email,
          firstName: contact.firstName,
          lastName: contact.lastName,
          tags: contact.tags,
          enrollmentStatus: contact.enrollment?.status,
          createdAt: contact.enrollment?.createdAt,
          updatedAt: contact.enrollment?.updatedAt
        }))
      },
      campaigns: campaigns.map(campaign => ({
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        recipientCount: campaign._count.recipients
      })),
      summary: {
        totalContacts: allContacts.length,
        availableForEnrollment: availableContacts.length,
        alreadyEnrolled: enrolledContacts.length,
        canEnroll: sequence.status === 'ACTIVE' && availableContacts.length > 0
      }
    })

  } catch (error) {
    console.error('Error fetching enrollable contacts:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch contacts' 
    }, { status: 500 })
  }
}