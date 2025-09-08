import { NextRequest, NextResponse } from 'next/server'
import { automationTrigger } from '@/services/automationTrigger'
import { AutomationExecutor } from '@/services/automation-executor'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request (in production, use proper authentication)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Running automation scheduler cron job...')

    // 1. Schedule date-based automations
    await automationTrigger.scheduleAutomationTriggers()

    // 2. Resume waiting executions
    await resumeWaitingExecutions()

    // 3. Check until conditions
    await checkUntilConditions()

    // 4. Execute active automations
    const executor = new AutomationExecutor()
    await executor.executeAutomations()

    // 5. Clean up old execution events (optional)
    await cleanupOldEvents()

    return NextResponse.json({ 
      success: true,
      message: 'Automation scheduler completed successfully',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Automation scheduler cron error:', error)
    
    return NextResponse.json(
      { error: 'Scheduler error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * Resume executions that are waiting and whose wait time has passed
 */
async function resumeWaitingExecutions() {
  try {
    const now = new Date()
    
    // Find executions that are waiting and should resume
    const waitingExecutions = await prisma.automationExecution.findMany({
      where: {
        status: { in: ['WAITING', 'WAITING_UNTIL'] },
        waitUntil: {
          lte: now
        }
      },
      include: {
        automation: true
      }
    })

    console.log(`Found ${waitingExecutions.length} executions ready to resume`)

    for (const execution of waitingExecutions) {
      try {
        // Resume the execution
        await prisma.automationExecution.update({
          where: { id: execution.id },
          data: { status: 'ACTIVE' }
        })

        // Log the resume event
        await prisma.automationExecutionEvent.create({
          data: {
            executionId: execution.id,
            nodeId: execution.currentNodeId || 'system',
            eventType: 'EXECUTION_RESUMED',
            eventData: {
              message: 'Execution resumed after wait period',
              resumedAt: now.toISOString()
            },
            timestamp: now
          }
        })

        // Continue processing (you might want to use a job queue for this)
        console.log(`Resumed execution ${execution.id}`)

      } catch (error) {
        console.error(`Error resuming execution ${execution.id}:`, error)
      }
    }

  } catch (error) {
    console.error('Error resuming waiting executions:', error)
  }
}

/**
 * Check until conditions for executions in WAITING_UNTIL status
 */
async function checkUntilConditions() {
  try {
    const now = new Date()
    
    // Find executions waiting for conditions
    const untilExecutions = await prisma.automationExecution.findMany({
      where: {
        status: 'WAITING_UNTIL'
      },
      include: {
        automation: true,
        contact: true
      }
    })

    console.log(`Checking ${untilExecutions.length} until conditions`)

    for (const execution of untilExecutions) {
      try {
        const executionData = execution.executionData as any
        const untilCondition = executionData?.untilCondition

        if (!untilCondition) continue

        let conditionMet = false

        // Check different types of until conditions
        if (untilCondition.type === 'behavior') {
          // Check if the behavior has occurred
          conditionMet = await checkBehaviorCondition(execution, untilCondition.behavior)
        } else if (untilCondition.type === 'rules') {
          // Check if the rules are satisfied
          conditionMet = await checkRulesCondition(execution, untilCondition.rules)
        }

        // Check if max wait time has passed
        const maxWaitPassed = execution.waitUntil && execution.waitUntil <= now

        if (conditionMet || maxWaitPassed) {
          // Resume execution
          await prisma.automationExecution.update({
            where: { id: execution.id },
            data: { status: 'ACTIVE' }
          })

          // Log the event
          await prisma.automationExecutionEvent.create({
            data: {
              executionId: execution.id,
              nodeId: execution.currentNodeId || 'system',
              eventType: conditionMet ? 'UNTIL_CONDITION_MET' : 'UNTIL_TIMEOUT',
              eventData: {
                message: conditionMet ? 'Until condition was met' : 'Until condition timed out',
                conditionMet,
                maxWaitPassed
              },
              timestamp: now
            }
          })

          console.log(`Until condition resolved for execution ${execution.id}`)
        }

      } catch (error) {
        console.error(`Error checking until condition for execution ${execution.id}:`, error)
      }
    }

  } catch (error) {
    console.error('Error checking until conditions:', error)
  }
}

/**
 * Check if a behavior condition is met
 */
async function checkBehaviorCondition(execution: any, behaviorConfig: any): Promise<boolean> {
  try {
    const { action } = behaviorConfig

    switch (action) {
      case 'opens_campaign':
        // Check if contact has opened any recent email from this automation
        const openEvents = await prisma.emailEvent.findMany({
          where: {
            type: 'OPENED',
            contactId: execution.contactId,
            createdAt: {
              gte: execution.startedAt
            }
          },
          take: 1
        })
        return openEvents.length > 0

      case 'clicks':
        // Check if contact has clicked any link in recent emails from this automation
        const clickEvents = await prisma.emailEvent.findMany({
          where: {
            type: 'CLICKED',
            contactId: execution.contactId,
            createdAt: {
              gte: execution.startedAt
            }
          },
          take: 1
        })
        return clickEvents.length > 0

      default:
        return false
    }
  } catch (error) {
    console.error('Error checking behavior condition:', error)
    return false
  }
}

/**
 * Check if rules condition is met
 */
async function checkRulesCondition(execution: any, rulesConfig: any): Promise<boolean> {
  // Implement rules checking logic based on your contact model and rules structure
  // This is a placeholder for more complex rule evaluation
  return false
}

/**
 * Clean up old execution events to prevent database bloat
 */
async function cleanupOldEvents() {
  try {
    // Delete events older than 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const deletedCount = await prisma.automationExecutionEvent.deleteMany({
      where: {
        timestamp: {
          lt: thirtyDaysAgo
        }
      }
    })

    console.log(`Cleaned up ${deletedCount.count} old execution events`)

  } catch (error) {
    console.error('Error cleaning up old events:', error)
  }
}

// Add POST method for manual triggering
export async function POST(request: NextRequest) {
  console.log('Manual trigger of automation scheduler')
  return GET(request)
}