import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schema for bulk operations
const bulkSequenceSchema = z.object({
  action: z.enum(['delete', 'pause', 'resume', 'duplicate', 'archive']),
  sequenceIds: z.array(z.string()).min(1, 'At least one sequence ID required'),
  options: z.object({
    newStatus: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED']).optional(),
    namePrefix: z.string().optional() // For duplicating
  }).optional()
})

// POST /api/sequences/bulk - Bulk operations on sequences
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate request data
    const validationResult = bulkSequenceSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Invalid data', 
        details: validationResult.error.format() 
      }, { status: 400 })
    }

    const { action, sequenceIds, options } = validationResult.data

    // Verify all sequences belong to the user
    const sequences = await prisma.sequence.findMany({
      where: {
        id: { in: sequenceIds },
        userId: session.user.id
      }
    })

    if (sequences.length !== sequenceIds.length) {
      return NextResponse.json({ 
        error: 'Some sequences not found or not owned by user' 
      }, { status: 404 })
    }

    let results = []

    switch (action) {
      case 'delete':
        // Check if any sequences have active enrollments
        const activeEnrollments = await prisma.sequenceEnrollment.count({
          where: {
            sequenceId: { in: sequenceIds },
            status: 'ACTIVE'
          }
        })
        
        if (activeEnrollments > 0) {
          return NextResponse.json({
            error: `Cannot delete sequences with active enrollments. Please pause or complete enrollments first.`
          }, { status: 400 })
        }

        // Delete sequences (cascading deletes will handle enrollments)
        await prisma.sequence.deleteMany({
          where: {
            id: { in: sequenceIds },
            userId: session.user.id
          }
        })

        results = sequenceIds.map(id => ({
          id,
          action: 'deleted',
          success: true
        }))
        break

      case 'pause':
        await prisma.sequence.updateMany({
          where: {
            id: { in: sequenceIds },
            userId: session.user.id,
            status: 'ACTIVE'
          },
          data: {
            status: 'PAUSED'
          }
        })

        // Also pause all active enrollments
        await prisma.sequenceEnrollment.updateMany({
          where: {
            sequenceId: { in: sequenceIds },
            status: 'ACTIVE'
          },
          data: {
            status: 'PAUSED',
            pausedAt: new Date()
          }
        })

        results = sequenceIds.map(id => ({
          id,
          action: 'paused',
          success: true
        }))
        break

      case 'resume':
        await prisma.sequence.updateMany({
          where: {
            id: { in: sequenceIds },
            userId: session.user.id,
            status: 'PAUSED'
          },
          data: {
            status: 'ACTIVE'
          }
        })

        // Resume paused enrollments
        await prisma.sequenceEnrollment.updateMany({
          where: {
            sequenceId: { in: sequenceIds },
            status: 'PAUSED'
          },
          data: {
            status: 'ACTIVE',
            pausedAt: null
          }
        })

        results = sequenceIds.map(id => ({
          id,
          action: 'resumed',
          success: true
        }))
        break

      case 'duplicate':
        results = []
        
        for (const sequence of sequences) {
          const newSequence = await prisma.sequence.create({
            data: {
              userId: session.user.id,
              name: `${options?.namePrefix || 'Copy of'} ${sequence.name}`,
              description: sequence.description,
              steps: sequence.steps as any, // Copy the steps JSON
              status: 'DRAFT',
              createdAt: new Date()
            }
          })

          results.push({
            id: sequence.id,
            action: 'duplicated',
            success: true,
            newSequenceId: newSequence.id,
            newSequenceName: newSequence.name
          })
        }
        break

      case 'archive':
        // Archive sequences by setting status to ARCHIVED
        await prisma.sequence.updateMany({
          where: {
            id: { in: sequenceIds },
            userId: session.user.id
          },
          data: {
            status: 'ARCHIVED'
          }
        })

        // Also complete any active enrollments
        await prisma.sequenceEnrollment.updateMany({
          where: {
            sequenceId: { in: sequenceIds },
            status: 'ACTIVE'
          },
          data: {
            status: 'COMPLETED',
            completedAt: new Date()
          }
        })

        results = sequenceIds.map(id => ({
          id,
          action: 'archived',
          success: true
        }))
        break

      default:
        return NextResponse.json({ 
          error: `Unsupported action: ${action}` 
        }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      action,
      results,
      summary: {
        total: sequenceIds.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    })

  } catch (error) {
    console.error('Error performing bulk sequence operation:', error)
    return NextResponse.json({ 
      error: 'Failed to perform bulk operation' 
    }, { status: 500 })
  }
}