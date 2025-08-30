import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schema for enrollment request
const enrollmentSchema = z.object({
  contactIds: z.array(z.string()).min(1, 'At least one contact must be selected'),
  startImmediately: z.boolean().default(true),
  customVariables: z.record(z.string()).optional()
})

// POST /api/sequences/[id]/enroll - Enroll contacts in sequence
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: sequenceId } = await params
    const body = await request.json()
    
    // Validate request data
    const validationResult = enrollmentSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Invalid data', 
        details: validationResult.error.format() 
      }, { status: 400 })
    }

    const { contactIds, startImmediately, customVariables } = validationResult.data

    // Check sequence exists and belongs to user
    const sequence = await prisma.sequence.findFirst({
      where: {
        id: sequenceId,
        userId: session.user.id
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
        userId: session.user.id
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
    const firstStep = steps.find((step: any) => step.type === 'email')
    
    if (!firstStep) {
      return NextResponse.json({
        error: 'Sequence has no email steps to execute'
      }, { status: 400 })
    }

    const now = new Date()
    const nextActionAt = startImmediately ? now : new Date(now.getTime() + 5 * 60 * 1000) // 5 minutes delay if not immediate

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

        // Create new enrollment
        return prisma.sequenceEnrollment.create({
          data: {
            sequenceId,
            contactId: contact.id,
            status: 'ACTIVE',
            currentStep: 0,
            nextActionAt,
            customVariables: customVariables || {},
            createdAt: now
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

    return NextResponse.json({
      success: true,
      message: `Successfully enrolled ${enrollments.length} contacts in sequence`,
      enrollments: enrollments.map(enrollment => ({
        id: enrollment.id,
        contact: enrollment.contact,
        status: enrollment.status,
        currentStep: enrollment.currentStep,
        nextActionAt: enrollment.nextActionAt,
        enrolledAt: enrollment.enrolledAt
      })),
      summary: {
        sequenceName: sequence.name,
        contactsEnrolled: enrollments.length,
        startTime: startImmediately ? 'Immediately' : 'In 5 minutes',
        firstStepType: firstStep.type
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: sequenceId } = await params

    // Check sequence exists and belongs to user
    const sequence = await prisma.sequence.findFirst({
      where: {
        id: sequenceId,
        userId: session.user.id
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
        userId: session.user.id
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