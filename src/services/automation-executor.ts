import { prisma } from '@/lib/prisma'
import { EmailNodeProcessor } from './node-processors/email-node-processor'
import { DelayNodeProcessor } from './node-processors/delay-node-processor'
import { ConditionNodeProcessor } from './node-processors/condition-node-processor'
import { ActionNodeProcessor } from './node-processors/action-node-processor'
import { ApiRequestNodeProcessor } from './node-processors/api-request-node-processor'
import { TriggerEvaluator } from './automation-triggers'
import { AutomationExecStatus, AutomationStatus } from '@prisma/client'

interface NodeData {
  id: string
  type: string
  data: any
}

interface EdgeData {
  id: string
  source: string
  target: string
  sourceHandle?: string
}

interface AutomationFlow {
  nodes: NodeData[]
  edges: EdgeData[]
}

export class AutomationExecutor {
  private emailProcessor: EmailNodeProcessor
  private delayProcessor: DelayNodeProcessor
  private conditionProcessor: ConditionNodeProcessor
  private actionProcessor: ActionNodeProcessor
  private apiRequestProcessor: ApiRequestNodeProcessor
  private triggerEvaluator: TriggerEvaluator

  constructor() {
    this.emailProcessor = new EmailNodeProcessor()
    this.delayProcessor = new DelayNodeProcessor()
    this.conditionProcessor = new ConditionNodeProcessor()
    this.actionProcessor = new ActionNodeProcessor()
    this.apiRequestProcessor = new ApiRequestNodeProcessor()
    this.triggerEvaluator = new TriggerEvaluator()
  }

  /**
   * Main execution method - called by cron job every 5 minutes
   */
  async executeAutomations() {
    console.log('Starting automation execution cycle...')
    
    try {
      // Step 1: Process triggers for new enrollments
      await this.processAutomationTriggers()

      // Step 2: Process existing executions
      await this.processActiveExecutions()

      // Step 3: Update automation statistics
      await this.updateAutomationStats()

      console.log('Automation execution cycle completed')
    } catch (error) {
      console.error('Error in automation execution cycle:', error)
      throw error
    }
  }

  /**
   * Check triggers and enroll new contacts
   */
  private async processAutomationTriggers() {
    const activeAutomations = await prisma.automation.findMany({
      where: { status: AutomationStatus.ACTIVE },
      include: {
        user: true
      }
    })

    for (const automation of activeAutomations) {
      try {
        const newContacts = await this.triggerEvaluator.checkTrigger(automation)
        
        if (newContacts.length > 0) {
          // Create executions for new contacts
          await this.enrollContacts(automation.id, newContacts)
          
          // Update total entered count
          await prisma.automation.update({
            where: { id: automation.id },
            data: {
              totalEntered: { increment: newContacts.length },
              currentlyActive: { increment: newContacts.length }
            }
          })
        }
      } catch (error) {
        console.error(`Error processing trigger for automation ${automation.id}:`, error)
      }
    }
  }

  /**
   * Process all active executions
   */
  private async processActiveExecutions() {
    // Get executions that are ready to process
    const readyExecutions = await prisma.automationExecution.findMany({
      where: {
        status: {
          in: [AutomationExecStatus.ACTIVE, AutomationExecStatus.WAITING_UNTIL]
        },
        OR: [
          { waitUntil: null }, // No delay
          { waitUntil: { lte: new Date() } } // Delay has passed
        ]
      },
      include: {
        automation: true,
        contact: true
      },
      take: 100 // Process in batches
    })

    console.log(`Processing ${readyExecutions.length} ready executions`)

    for (const execution of readyExecutions) {
      try {
        await this.processExecution(execution)
      } catch (error) {
        console.error(`Error processing execution ${execution.id}:`, error)
        
        // Mark as failed
        await prisma.automationExecution.update({
          where: { id: execution.id },
          data: {
            status: AutomationExecStatus.FAILED,
            failedAt: new Date(),
            failureReason: error instanceof Error ? error.message : 'Unknown error'
          }
        })
      }
    }
  }

  /**
   * Process a single execution
   */
  private async processExecution(execution: any) {
    const automationFlow = execution.automation.nodes as AutomationFlow
    const currentNodeId = execution.currentNodeId

    // Find current node or start from trigger
    let currentNode: NodeData | null = null
    
    if (currentNodeId) {
      currentNode = automationFlow.nodes.find(n => n.id === currentNodeId) || null
    } else {
      // Find the trigger node to start
      const triggerNode = automationFlow.nodes.find(n => n.type === 'trigger')
      if (triggerNode) {
        // Move to first node after trigger
        const nextNode = this.getNextNode(triggerNode.id, automationFlow)
        if (nextNode) {
          currentNode = nextNode
        }
      }
    }

    if (!currentNode) {
      // No more nodes, mark as completed
      await this.completeExecution(execution.id)
      return
    }

    // Process the current node
    const result = await this.processNode(execution, currentNode)

    if (result.completed) {
      // Move to next node(s)
      await this.moveToNextNode(execution, currentNode, automationFlow, result.branch)
    } else if (result.waitUntil) {
      // Set wait time
      await prisma.automationExecution.update({
        where: { id: execution.id },
        data: {
          status: AutomationExecStatus.WAITING_UNTIL,
          waitUntil: result.waitUntil,
          executionData: result.executionData
        }
      })
    } else if (result.failed) {
      // Mark as failed
      await prisma.automationExecution.update({
        where: { id: execution.id },
        data: {
          status: AutomationExecStatus.FAILED,
          failedAt: new Date(),
          failureReason: result.error
        }
      })
    }

    // Update execution data if provided
    if (result.executionData) {
      await prisma.automationExecution.update({
        where: { id: execution.id },
        data: { executionData: result.executionData }
      })
    }

    // Log event
    await this.logExecutionEvent(execution.id, currentNode.id, result)
  }

  /**
   * Process a single node based on its type
   */
  private async processNode(execution: any, node: NodeData) {
    switch (node.type) {
      case 'email':
        // For email nodes, pass emailTemplate data if available, otherwise fallback to node.data
        const emailData = node.emailTemplate ? {
          subject: node.emailTemplate.subject || '',
          content: node.emailTemplate.htmlContent || node.emailTemplate.textContent || '',
          htmlContent: node.emailTemplate.htmlContent,
          textContent: node.emailTemplate.textContent
        } : node.data
        return await this.emailProcessor.process(execution, emailData)
      
      case 'delay':
        return await this.delayProcessor.process(execution, node.data)
      
      case 'condition':
        return await this.conditionProcessor.process(execution, node.data)
      
      case 'action':
        return await this.actionProcessor.process(execution, node.data)
      
      case 'apiRequest':
        return await this.apiRequestProcessor.process(execution, node.data)
      
      default:
        return {
          completed: true,
          error: `Unknown node type: ${node.type}`
        }
    }
  }

  /**
   * Move execution to the next node(s)
   */
  private async moveToNextNode(
    execution: any,
    currentNode: NodeData,
    flow: AutomationFlow,
    branch?: string
  ) {
    const nextNodes = this.getNextNodes(currentNode.id, flow, branch)
    
    if (nextNodes.length === 0) {
      // No more nodes, complete execution
      await this.completeExecution(execution.id)
    } else if (nextNodes.length === 1) {
      // Single path, move to next node
      await prisma.automationExecution.update({
        where: { id: execution.id },
        data: { currentNodeId: nextNodes[0].id }
      })
    } else {
      // Multiple paths (shouldn't happen in current design)
      // For now, take the first path
      await prisma.automationExecution.update({
        where: { id: execution.id },
        data: { currentNodeId: nextNodes[0].id }
      })
    }
  }

  /**
   * Get next node(s) based on edges
   */
  private getNextNodes(nodeId: string, flow: AutomationFlow, branch?: string): NodeData[] {
    const edges = flow.edges.filter(edge => {
      if (edge.source === nodeId) {
        // If branch is specified, match the source handle
        return !branch || edge.sourceHandle === branch
      }
      return false
    })

    return edges
      .map(edge => flow.nodes.find(n => n.id === edge.target))
      .filter(Boolean) as NodeData[]
  }

  /**
   * Get single next node
   */
  private getNextNode(nodeId: string, flow: AutomationFlow): NodeData | null {
    const nextNodes = this.getNextNodes(nodeId, flow)
    return nextNodes.length > 0 ? nextNodes[0] : null
  }

  /**
   * Complete an execution
   */
  private async completeExecution(executionId: string) {
    await prisma.automationExecution.update({
      where: { id: executionId },
      data: {
        status: AutomationExecStatus.COMPLETED,
        completedAt: new Date()
      }
    })
  }

  /**
   * Enroll contacts in an automation
   */
  private async enrollContacts(automationId: string, contactIds: string[]) {
    const enrollments = contactIds.map(contactId => ({
      automationId,
      contactId,
      status: AutomationExecStatus.ACTIVE,
      executionData: { variables: {} },
      enteredAt: new Date(),
      startedAt: new Date()
    }))

    await prisma.automationExecution.createMany({
      data: enrollments,
      skipDuplicates: true
    })
  }

  /**
   * Log execution events
   */
  private async logExecutionEvent(
    executionId: string,
    nodeId: string,
    result: any
  ) {
    try {
      await prisma.automationExecutionEvent.create({
        data: {
          executionId,
          nodeId,
          eventType: result.completed 
            ? 'EXITED_NODE' 
            : result.failed 
              ? 'FAILED' 
              : 'ENTERED_NODE',
          eventData: result,
          timestamp: new Date()
        }
      })
    } catch (error) {
      console.error('Error logging execution event:', error)
    }
  }

  /**
   * Update automation statistics
   */
  private async updateAutomationStats() {
    const automations = await prisma.automation.findMany({
      where: { status: AutomationStatus.ACTIVE }
    })

    for (const automation of automations) {
      try {
        const [activeCount, completedCount] = await Promise.all([
          prisma.automationExecution.count({
            where: {
              automationId: automation.id,
              status: { in: [AutomationExecStatus.ACTIVE, AutomationExecStatus.WAITING_UNTIL] }
            }
          }),
          prisma.automationExecution.count({
            where: {
              automationId: automation.id,
              status: AutomationExecStatus.COMPLETED
            }
          })
        ])

        await prisma.automation.update({
          where: { id: automation.id },
          data: {
            currentlyActive: activeCount,
            totalCompleted: completedCount
          }
        })
      } catch (error) {
        console.error(`Error updating stats for automation ${automation.id}:`, error)
      }
    }
  }

  /**
   * Manual enrollment (for testing or manual triggers)
   */
  async enrollContactsManually(automationId: string, contactIds: string[]) {
    // Verify automation exists and is active
    const automation = await prisma.automation.findFirst({
      where: { id: automationId, status: AutomationStatus.ACTIVE }
    })

    if (!automation) {
      throw new Error('Automation not found or not active')
    }

    await this.enrollContacts(automationId, contactIds)

    // Update stats
    await prisma.automation.update({
      where: { id: automationId },
      data: {
        totalEntered: { increment: contactIds.length },
        currentlyActive: { increment: contactIds.length }
      }
    })
  }
}