import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateAutomationSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  triggerEvent: z.enum(['NEW_SUBSCRIBER', 'SPECIFIC_DATE', 'SUBSCRIBER_SEGMENT', 'WEBHOOK', 'MANUAL']).optional(),
  triggerData: z.object({
    listId: z.string().optional(),
    segmentId: z.string().optional(),
    specificDate: z.string().optional(),
    webhookUrl: z.string().optional()
  }).optional(),
  applyToExisting: z.boolean().optional(),
  trackingEnabled: z.boolean().optional(),
  nodes: z.array(z.any()).optional(), // Simplified for now
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'STOPPED']).optional()
})

// GET /api/automations/[id] - Get specific automation
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const automation = await prisma.automation.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      },
      include: {
        nodeStats: {
          orderBy: {
            nodeId: 'asc'
          }
        },
        executions: {
          where: {
            status: 'ACTIVE'
          },
          take: 10,
          orderBy: {
            enteredAt: 'desc'
          },
          include: {
            events: {
              take: 5,
              orderBy: {
                timestamp: 'desc'
              }
            }
          }
        },
        _count: {
          select: {
            executions: true
          }
        }
      }
    })

    if (!automation) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 })
    }

    const nodes = Array.isArray(automation.nodes) ? automation.nodes : []
    
    return NextResponse.json({
      success: true,
      automation: {
        id: automation.id,
        name: automation.name,
        description: automation.description,
        triggerEvent: automation.triggerEvent,
        triggerData: automation.triggerData,
        applyToExisting: automation.applyToExisting,
        trackingEnabled: automation.trackingEnabled,
        nodes: automation.nodes,
        status: automation.status,
        totalEntered: automation.totalEntered,
        currentlyActive: automation.currentlyActive,
        totalCompleted: automation.totalCompleted,
        totalExecutions: automation._count.executions,
        activeExecutions: automation.executions.length,
        nodeCount: nodes.length,
        hasConditions: nodes.some((node: any) => node.type === 'condition'),
        nodeStats: automation.nodeStats,
        recentExecutions: automation.executions,
        createdAt: automation.createdAt,
        updatedAt: automation.updatedAt
      }
    })

  } catch (error) {
    console.error('Error fetching automation:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch automation' 
    }, { status: 500 })
  }
}

// PUT /api/automations/[id] - Update automation
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if automation exists and belongs to user
    const existingAutomation = await prisma.automation.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    })

    if (!existingAutomation) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 })
    }

    // Check if automation is running and restrict certain updates
    if (existingAutomation.status === 'ACTIVE') {
      return NextResponse.json({
        error: 'Cannot modify running automation. Please pause first.'
      }, { status: 400 })
    }

    const body = await request.json()
    
    // Validate request data
    const validationResult = updateAutomationSchema.safeParse(body)
    if (!validationResult.success) {
      console.error('Automation update validation failed:', validationResult.error.format())
      return NextResponse.json({ 
        error: 'Invalid data', 
        details: validationResult.error.format() 
      }, { status: 400 })
    }

    const updateData = validationResult.data

    // If nodes are being updated, validate them
    if (updateData.nodes) {
      const emailNodes = updateData.nodes.filter((n: any) => n.type === 'email')
      if (emailNodes.length === 0) {
        return NextResponse.json({ 
          error: 'Automation must contain at least one email node' 
        }, { status: 400 })
      }
    }

    // Update automation
    const updatedAutomation = await prisma.automation.update({
      where: {
        id: params.id
      },
      data: updateData,
      include: {
        nodeStats: true,
        _count: {
          select: {
            executions: true
          }
        }
      }
    })

    const nodes = Array.isArray(updatedAutomation.nodes) ? updatedAutomation.nodes : []

    return NextResponse.json({
      success: true,
      automation: {
        id: updatedAutomation.id,
        name: updatedAutomation.name,
        description: updatedAutomation.description,
        triggerEvent: updatedAutomation.triggerEvent,
        triggerData: updatedAutomation.triggerData,
        applyToExisting: updatedAutomation.applyToExisting,
        trackingEnabled: updatedAutomation.trackingEnabled,
        nodes: updatedAutomation.nodes,
        status: updatedAutomation.status,
        totalEntered: updatedAutomation.totalEntered,
        currentlyActive: updatedAutomation.currentlyActive,
        totalCompleted: updatedAutomation.totalCompleted,
        totalExecutions: updatedAutomation._count.executions,
        nodeCount: nodes.length,
        hasConditions: nodes.some((node: any) => node.type === 'condition'),
        createdAt: updatedAutomation.createdAt,
        updatedAt: updatedAutomation.updatedAt
      }
    })

  } catch (error) {
    console.error('Error updating automation:', error)
    return NextResponse.json({ 
      error: 'Failed to update automation' 
    }, { status: 500 })
  }
}

// DELETE /api/automations/[id] - Delete automation
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if automation exists and belongs to user
    const existingAutomation = await prisma.automation.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    })

    if (!existingAutomation) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 })
    }

    // Check if automation is running
    if (existingAutomation.status === 'ACTIVE') {
      return NextResponse.json({
        error: 'Cannot delete running automation. Please stop first.'
      }, { status: 400 })
    }

    // Delete automation (cascade will handle related records)
    await prisma.automation.delete({
      where: {
        id: params.id
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Automation deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting automation:', error)
    return NextResponse.json({ 
      error: 'Failed to delete automation' 
    }, { status: 500 })
  }
}