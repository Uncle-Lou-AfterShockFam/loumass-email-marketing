import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Check for debug access
    const authHeader = request.headers.get('authorization')
    const userAgent = request.headers.get('user-agent')
    
    // Allow Vercel cron or specific debug auth
    const isVercelCron = userAgent?.includes('vercel-cron') || userAgent?.includes('Vercel-Cron')
    const hasValidAuth = authHeader === `Bearer ${process.env.CRON_SECRET || 'debug'}`
    
    if (!isVercelCron && !hasValidAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('=== DEBUG SEQUENCES ENDPOINT ===')
    
    // Get specific sequence details
    const targetSequenceId = 'cmfc04unm0005l504batqbm9w'
    
    // Check if sequence exists
    const targetSequence = await prisma.sequence.findUnique({
      where: { id: targetSequenceId },
      include: {
        enrollments: {
          include: {
            contact: {
              select: { email: true, id: true }
            }
          }
        }
      }
    })

    // Get all sequences with their statuses
    const allSequences = await prisma.sequence.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        userId: true,
        _count: {
          select: {
            enrollments: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: 20
    })

    // Get all enrollments for the target sequence if it exists
    let enrollmentDetails = null
    if (targetSequence) {
      enrollmentDetails = await prisma.sequenceEnrollment.findMany({
        where: { sequenceId: targetSequenceId },
        select: {
          id: true,
          status: true,
          currentStep: true,
          createdAt: true,
          updatedAt: true,
          lastEmailSentAt: true,
          contact: {
            select: { email: true, id: true }
          }
        }
      })
    }

    // Count sequences by status
    const sequenceStatusCounts = await prisma.sequence.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    })

    // Count enrollments by status
    const enrollmentStatusCounts = await prisma.sequenceEnrollment.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    })

    // Check for ACTIVE sequences with ACTIVE enrollments (same query as cron)
    const activeSequencesWithActiveEnrollments = await prisma.sequence.findMany({
      where: {
        status: 'ACTIVE',
        enrollments: {
          some: {
            status: 'ACTIVE'
          }
        }
      },
      select: {
        id: true,
        name: true,
        status: true,
        _count: {
          select: {
            enrollments: true
          }
        }
      }
    })

    const result = {
      timestamp: new Date().toISOString(),
      targetSequence: {
        id: targetSequenceId,
        found: !!targetSequence,
        data: targetSequence
      },
      enrollmentDetails,
      sequenceStatusCounts,
      enrollmentStatusCounts,
      activeSequencesWithActiveEnrollments,
      allSequencesPreview: allSequences,
      summary: {
        totalSequences: allSequences.length,
        activeSequencesWithActiveEnrollments: activeSequencesWithActiveEnrollments.length,
        targetSequenceExists: !!targetSequence,
        targetSequenceStatus: targetSequence?.status || 'NOT_FOUND',
        targetSequenceEnrollments: targetSequence?.enrollments?.length || 0
      }
    }

    console.log('DEBUG RESULTS:', JSON.stringify(result, null, 2))

    return NextResponse.json(result)

  } catch (error) {
    console.error('Debug sequences error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}