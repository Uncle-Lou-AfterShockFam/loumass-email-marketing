import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const controlActionSchema = z.object({
  action: z.enum(['start', 'pause', 'stop', 'resume'])
})

// POST /api/automations/[id]/control - Control automation execution
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate request data
    const validationResult = controlActionSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Invalid action', 
        details: validationResult.error.format() 
      }, { status: 400 })
    }

    const { action } = validationResult.data

    // Check if automation exists and belongs to user
    const automation = await prisma.automation.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      },
      include: {
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

    let newStatus: string
    let updateData: any = {}

    switch (action) {
      case 'start':
        if (automation.status === 'ACTIVE') {
          return NextResponse.json({ error: 'Automation is already running' }, { status: 400 })
        }
        if (automation.status === 'PAUSED') {
          return NextResponse.json({ error: 'Use resume to continue a paused automation' }, { status: 400 })
        }
        // Allow starting from DRAFT or STOPPED status
        if (!['DRAFT', 'STOPPED'].includes(automation.status)) {
          return NextResponse.json({ error: 'Can only start automation from draft or stopped status' }, { status: 400 })
        }
        
        // Validate that automation has at least one email node before starting
        let nodes: any[] = []
        
        // Handle different node storage formats
        if (Array.isArray(automation.nodes)) {
          // Direct array format
          nodes = automation.nodes
        } else if (automation.nodes && typeof automation.nodes === 'object') {
          // Object format with nodes property
          if (Array.isArray(automation.nodes.nodes)) {
            nodes = automation.nodes.nodes
          }
        }
        
        console.log('Checking nodes for automation:', automation.id, 'nodes:', nodes.length)
        
        const emailNodes = nodes.filter((n: any) => n.type === 'email')
        console.log('Found email nodes:', emailNodes.length)
        
        if (emailNodes.length === 0) {
          return NextResponse.json({ 
            error: 'Cannot start automation without email nodes' 
          }, { status: 400 })
        }

        newStatus = 'ACTIVE'
        
        // If applyToExisting is true, enroll current subscribers
        if (automation.applyToExisting) {
          // TODO: Implement enrollment of existing contacts
          console.log('TODO: Enroll existing contacts for automation:', automation.id)
        }
        break
        
      case 'pause':
        if (automation.status !== 'ACTIVE') {
          return NextResponse.json({ error: 'Can only pause running automation' }, { status: 400 })
        }
        newStatus = 'PAUSED'
        
        // Pause all active executions
        await prisma.automationExecution.updateMany({
          where: {
            automationId: params.id,
            status: 'ACTIVE'
          },
          data: {
            status: 'PAUSED',
            pausedAt: new Date()
          }
        })
        break
        
      case 'resume':
        if (automation.status !== 'PAUSED') {
          return NextResponse.json({ error: 'Can only resume paused automation' }, { status: 400 })
        }
        newStatus = 'ACTIVE'
        
        // Resume all paused executions
        await prisma.automationExecution.updateMany({
          where: {
            automationId: params.id,
            status: 'PAUSED'
          },
          data: {
            status: 'ACTIVE',
            pausedAt: null
          }
        })
        break
        
      case 'stop':
        if (!['ACTIVE', 'PAUSED'].includes(automation.status)) {
          return NextResponse.json({ error: 'Can only stop running or paused automation' }, { status: 400 })
        }
        newStatus = 'STOPPED'
        
        // Complete all active executions
        await prisma.automationExecution.updateMany({
          where: {
            automationId: params.id,
            status: { in: ['ACTIVE', 'PAUSED'] }
          },
          data: {
            status: 'COMPLETED',
            completedAt: new Date()
          }
        })
        break
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Update automation status
    const updatedAutomation = await prisma.automation.update({
      where: {
        id: params.id
      },
      data: {
        status: newStatus as any,
        updatedAt: new Date()
      },
      include: {
        _count: {
          select: {
            executions: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: `Automation ${action}ed successfully`,
      automation: updatedAutomation
    })

  } catch (error) {
    console.error('Error controlling automation:', error)
    return NextResponse.json({ 
      error: 'Failed to control automation' 
    }, { status: 500 })
  }
}