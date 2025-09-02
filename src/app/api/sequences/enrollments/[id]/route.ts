import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { EnrollmentStatus } from '@prisma/client'

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

    // Find the enrollment and verify ownership through sequence
    const enrollment = await prisma.sequenceEnrollment.findUnique({
      where: { id },
      include: {
        sequence: {
          select: { userId: true }
        },
        contact: {
          select: {
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })

    if (!enrollment) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 })
    }

    if (enrollment.sequence.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete the enrollment
    await prisma.sequenceEnrollment.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: `${enrollment.contact.email} has been removed from the sequence`
    })

  } catch (error) {
    console.error('Error removing enrollment:', error)
    return NextResponse.json(
      { error: 'Failed to remove enrollment' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get enrollment details
    const enrollment = await prisma.sequenceEnrollment.findUnique({
      where: { id },
      include: {
        sequence: {
          select: { 
            userId: true,
            name: true,
            steps: true
          }
        },
        contact: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
            company: true,
            variables: true
          }
        }
      }
    })

    if (!enrollment) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 })
    }

    if (enrollment.sequence.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get email events for this enrollment (sequences don't use recipients table)
    return NextResponse.json({
      enrollment: {
        ...enrollment,
        emailEvents: [] // TODO: Add sequence-specific email events when implemented
      }
    })

  } catch (error) {
    console.error('Error fetching enrollment:', error)
    return NextResponse.json(
      { error: 'Failed to fetch enrollment' },
      { status: 500 }
    )
  }
}