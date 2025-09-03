import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/automations/[id]/stats - Get automation statistics
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if automation exists and belongs to user
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
          select: {
            id: true,
            status: true,
            enteredAt: true,
            completedAt: true,
            currentNodeId: true
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

    // Calculate execution statistics
    const executions = automation.executions
    const totalExecutions = executions.length
    const activeExecutions = executions.filter(e => e.status === 'ACTIVE').length
    const pausedExecutions = executions.filter(e => e.status === 'PAUSED').length
    const completedExecutions = executions.filter(e => e.status === 'COMPLETED').length
    const failedExecutions = executions.filter(e => e.status === 'FAILED').length

    // Calculate completion rate
    const completionRate = totalExecutions > 0 ? (completedExecutions / totalExecutions) * 100 : 0

    // Calculate average completion time for completed executions
    const completedWithTime = executions.filter(e => e.status === 'COMPLETED' && e.completedAt)
    const avgCompletionTime = completedWithTime.length > 0 
      ? completedWithTime.reduce((sum, e) => {
          const duration = new Date(e.completedAt!).getTime() - new Date(e.enteredAt).getTime()
          return sum + duration
        }, 0) / completedWithTime.length
      : null

    // Group executions by current node to see distribution
    const nodeDistribution: Record<string, number> = {}
    executions.filter(e => e.currentNodeId).forEach(e => {
      nodeDistribution[e.currentNodeId!] = (nodeDistribution[e.currentNodeId!] || 0) + 1
    })

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentExecutions = await prisma.automationExecution.findMany({
      where: {
        automationId: params.id,
        enteredAt: {
          gte: thirtyDaysAgo
        }
      },
      select: {
        enteredAt: true,
        status: true,
        completedAt: true
      },
      orderBy: {
        enteredAt: 'asc'
      }
    })

    // Group by day for activity chart
    const activityByDay: Record<string, { entered: number, completed: number }> = {}
    recentExecutions.forEach(exec => {
      const dateKey = exec.enteredAt.toISOString().split('T')[0]
      if (!activityByDay[dateKey]) {
        activityByDay[dateKey] = { entered: 0, completed: 0 }
      }
      activityByDay[dateKey].entered++
      
      if (exec.status === 'COMPLETED' && exec.completedAt) {
        const completedDateKey = exec.completedAt.toISOString().split('T')[0]
        if (!activityByDay[completedDateKey]) {
          activityByDay[completedDateKey] = { entered: 0, completed: 0 }
        }
        activityByDay[completedDateKey].completed++
      }
    })

    // Get execution events for deeper insights
    const executionEvents = await prisma.automationExecutionEvent.findMany({
      where: {
        execution: {
          automationId: params.id
        }
      },
      select: {
        nodeId: true,
        eventType: true,
        timestamp: true
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: 100
    })

    // Group events by node and type for analytics
    const eventsByNode: Record<string, Record<string, number>> = {}
    executionEvents.forEach(event => {
      if (!eventsByNode[event.nodeId]) {
        eventsByNode[event.nodeId] = {}
      }
      eventsByNode[event.nodeId][event.eventType] = (eventsByNode[event.nodeId][event.eventType] || 0) + 1
    })

    return NextResponse.json({
      success: true,
      stats: {
        // Overall automation stats
        automation: {
          id: automation.id,
          name: automation.name,
          status: automation.status,
          totalEntered: automation.totalEntered,
          currentlyActive: automation.currentlyActive,
          totalCompleted: automation.totalCompleted,
          createdAt: automation.createdAt,
          updatedAt: automation.updatedAt
        },
        
        // Execution statistics
        executions: {
          total: totalExecutions,
          active: activeExecutions,
          paused: pausedExecutions,
          completed: completedExecutions,
          failed: failedExecutions,
          completionRate: Math.round(completionRate * 100) / 100,
          avgCompletionTimeMs: avgCompletionTime ? Math.round(avgCompletionTime) : null
        },
        
        // Node statistics
        nodeStats: automation.nodeStats.map(stat => ({
          nodeId: stat.nodeId,
          totalPassed: stat.totalPassed,
          currentPassed: stat.currentPassed,
          inNode: stat.inNode,
          lastUpdated: stat.lastUpdated
        })),
        
        // Distribution of contacts across nodes
        nodeDistribution,
        
        // Event statistics by node
        eventsByNode,
        
        // Activity over time
        activityByDay: Object.entries(activityByDay).map(([date, data]) => ({
          date,
          entered: data.entered,
          completed: data.completed
        })).sort((a, b) => a.date.localeCompare(b.date))
      }
    })

  } catch (error) {
    console.error('Error fetching automation stats:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch automation statistics' 
    }, { status: 500 })
  }
}