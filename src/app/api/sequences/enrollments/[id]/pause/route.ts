import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { EnrollmentStatus } from '@prisma/client'

export async function POST(
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
        }
      }
    })

    if (!enrollment) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 })
    }

    if (enrollment.sequence.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (enrollment.status !== EnrollmentStatus.ACTIVE) {
      return NextResponse.json({ error: 'Can only pause active enrollments' }, { status: 400 })
    }

    // Pause the enrollment
    const updatedEnrollment = await prisma.sequenceEnrollment.update({
      where: { id },
      data: {
        status: EnrollmentStatus.PAUSED,
        pausedAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        contact: {
          select: {
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      enrollment: updatedEnrollment
    })

  } catch (error) {
    console.error('Error pausing enrollment:', error)
    return NextResponse.json(
      { error: 'Failed to pause enrollment' },
      { status: 500 }
    )
  }
}