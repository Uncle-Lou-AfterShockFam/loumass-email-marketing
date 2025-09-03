import { prisma } from '@/lib/prisma'
import { AutomationExecStatus } from '@prisma/client'

interface ExecutionContext {
  automationId: string
  contactId: string
  currentNodeId?: string
  executionData?: any
  variables?: Record<string, any>
}

export class AutomationEngine {
  /**
   * Start a new automation execution for a contact
   */
  async startExecution(automationId: string, contactId: string, initialData?: any): Promise<string> {
    try {
      // Get automation details
      const automation = await prisma.automation.findUnique({
        where: { id: automationId }
      })

      if (!automation) {
        throw new Error('Automation not found')
      }

      if (automation.status !== 'ACTIVE') {
        throw new Error('Automation is not active')
      }

      // Check if contact is already in this automation
      const existingExecution = await prisma.automationExecution.findFirst({
        where: {
          automationId,
          contactId,
          status: { in: ['ACTIVE', 'PAUSED'] }
        }
      })

      if (existingExecution) {
        throw new Error('Contact is already enrolled in this automation')
      }

      // Create new execution
      const execution = await prisma.automationExecution.create({
        data: {
          automationId,
          contactId,
          status: 'ACTIVE',
          startedAt: new Date(),
          currentNodeId: null, // Will be set to first node
          executionData: initialData || {},
          variables: {}
        }
      })

      // Log entry event
      await this.logExecutionEvent(execution.id, 'AUTOMATION_ENTERED', {
        message: 'Contact entered automation'
      })

      // Start processing from the first node
      await this.processNextNode(execution.id)

      return execution.id
    } catch (error) {
      console.error('Error starting automation execution:', error)
      throw error
    }
  }

  /**
   * Process the next node in an automation execution
   */
  async processNextNode(executionId: string): Promise<void> {
    try {
      const execution = await prisma.automationExecution.findUnique({
        where: { id: executionId },
        include: {
          automation: true,
          contact: true
        }
      })

      if (!execution) {
        throw new Error('Execution not found')
      }

      if (execution.status !== 'ACTIVE') {
        return // Execution is paused or completed
      }

      const automationNodes = execution.automation.nodes as any[]
      
      // Find the current node or start with the first node
      let currentNode: any
      
      if (execution.currentNodeId) {
        currentNode = automationNodes.find(node => node.id === execution.currentNodeId)
      } else {
        // Start with the first node (or a start node if you have one)
        currentNode = automationNodes[0]
      }

      if (!currentNode) {
        // No more nodes, complete the automation
        await this.completeExecution(executionId)
        return
      }

      // Update current node
      await prisma.automationExecution.update({
        where: { id: executionId },
        data: { currentNodeId: currentNode.id }
      })

      // Process the node based on its type
      await this.executeNode(executionId, currentNode)

    } catch (error) {
      console.error('Error processing next node:', error)
      await this.handleExecutionError(executionId, error)
    }
  }

  /**
   * Execute a specific node
   */
  private async executeNode(executionId: string, node: any): Promise<void> {
    try {
      // Log node entry
      await this.logExecutionEvent(executionId, 'NODE_ENTERED', {
        nodeId: node.id,
        nodeType: node.type,
        nodeName: node.name || node.type
      })

      switch (node.type) {
        case 'email':
          await this.executeEmailNode(executionId, node)
          break
        case 'wait':
          await this.executeWaitNode(executionId, node)
          break
        case 'condition':
          await this.executeConditionNode(executionId, node)
          break
        case 'webhook':
          await this.executeWebhookNode(executionId, node)
          break
        case 'sms':
          await this.executeSMSNode(executionId, node)
          break
        case 'until':
          await this.executeUntilNode(executionId, node)
          break
        case 'when':
          await this.executeWhenNode(executionId, node)
          break
        case 'moveTo':
          await this.executeMoveToNode(executionId, node)
          break
        default:
          throw new Error(`Unknown node type: ${node.type}`)
      }

      // Update node statistics
      await this.updateNodeStats(node.id, 'ENTERED')

    } catch (error) {
      console.error(`Error executing ${node.type} node:`, error)
      await this.logExecutionEvent(executionId, 'NODE_ERROR', {
        nodeId: node.id,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Execute email node
   */
  private async executeEmailNode(executionId: string, node: any): Promise<void> {
    const execution = await prisma.automationExecution.findUnique({
      where: { id: executionId },
      include: { contact: true, automation: true }
    })

    if (!execution) return

    try {
      // Extract email configuration
      const emailConfig = node.email || node.emailTemplate
      
      if (!emailConfig) {
        throw new Error('Email configuration not found')
      }

      // Create campaign for this email (reusing existing campaign system)
      const campaign = await prisma.campaign.create({
        data: {
          userId: execution.automation.userId,
          name: `Automation: ${execution.automation.name} - ${node.name || 'Email'}`,
          subject: emailConfig.subject || 'Automated Email',
          content: emailConfig.content || '',
          status: 'DRAFT',
          trackingEnabled: emailConfig.trackingEnabled !== false,
          // Add other email configuration
        }
      })

      // Send the email (you'll need to implement the actual sending logic)
      // This would integrate with your existing email sending service
      console.log(`Sending email to ${execution.contact.email} for automation ${execution.automationId}`)

      // Log email sent
      await this.logExecutionEvent(executionId, 'EMAIL_SENT', {
        nodeId: node.id,
        campaignId: campaign.id,
        recipient: execution.contact.email,
        subject: emailConfig.subject
      })

      // Continue to next node
      await this.moveToNextNode(executionId, node)

    } catch (error) {
      await this.logExecutionEvent(executionId, 'EMAIL_ERROR', {
        nodeId: node.id,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Execute wait node
   */
  private async executeWaitNode(executionId: string, node: any): Promise<void> {
    try {
      const waitConfig = node.wait
      
      if (!waitConfig) {
        throw new Error('Wait configuration not found')
      }

      // Calculate wait duration
      let waitMinutes = 0
      
      switch (waitConfig.unit) {
        case 'minutes':
          waitMinutes = waitConfig.duration
          break
        case 'hours':
          waitMinutes = waitConfig.duration * 60
          break
        case 'days':
          waitMinutes = waitConfig.duration * 24 * 60
          break
        case 'weeks':
          waitMinutes = waitConfig.duration * 7 * 24 * 60
          break
        default:
          waitMinutes = waitConfig.duration || 5
      }

      const resumeAt = new Date(Date.now() + waitMinutes * 60 * 1000)

      // Update execution to wait state
      await prisma.automationExecution.update({
        where: { id: executionId },
        data: {
          status: 'WAITING',
          waitUntil: resumeAt
        }
      })

      // Log wait start
      await this.logExecutionEvent(executionId, 'WAIT_STARTED', {
        nodeId: node.id,
        waitDuration: `${waitConfig.duration} ${waitConfig.unit}`,
        resumeAt: resumeAt.toISOString()
      })

      // Schedule resume (in a real implementation, you'd use a job queue)
      setTimeout(async () => {
        await this.resumeFromWait(executionId, node)
      }, waitMinutes * 60 * 1000)

    } catch (error) {
      throw error
    }
  }

  /**
   * Execute condition node
   */
  private async executeConditionNode(executionId: string, node: any): Promise<void> {
    try {
      const conditionConfig = node.condition
      
      if (!conditionConfig) {
        throw new Error('Condition configuration not found')
      }

      // Evaluate the condition
      const conditionResult = await this.evaluateCondition(executionId, conditionConfig)

      // Log condition result
      await this.logExecutionEvent(executionId, 'CONDITION_EVALUATED', {
        nodeId: node.id,
        result: conditionResult ? 'YES' : 'NO',
        conditionType: conditionConfig.type
      })

      // Move to appropriate branch
      const branchPath = conditionResult ? 'yes' : 'no'
      await this.moveToNextNode(executionId, node, branchPath)

    } catch (error) {
      throw error
    }
  }

  /**
   * Execute webhook node
   */
  private async executeWebhookNode(executionId: string, node: any): Promise<void> {
    const execution = await prisma.automationExecution.findUnique({
      where: { id: executionId },
      include: { contact: true }
    })

    if (!execution) return

    try {
      const webhookConfig = node.webhook
      
      if (!webhookConfig || !webhookConfig.url) {
        throw new Error('Webhook configuration not found')
      }

      // Prepare webhook payload
      const payload = {
        automation: {
          id: execution.automationId,
          name: execution.automation?.name
        },
        contact: {
          id: execution.contactId,
          email: execution.contact.email,
          // Add other contact fields as needed
        },
        execution: {
          id: executionId,
          startedAt: execution.startedAt
        },
        node: {
          id: node.id,
          name: node.name,
          type: node.type
        },
        ...execution.executionData
      }

      // Send webhook
      const response = await fetch(webhookConfig.url, {
        method: webhookConfig.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...webhookConfig.headers
        },
        body: JSON.stringify(payload)
      })

      // Log webhook result
      await this.logExecutionEvent(executionId, 'WEBHOOK_SENT', {
        nodeId: node.id,
        url: webhookConfig.url,
        method: webhookConfig.method || 'POST',
        status: response.status,
        response: response.ok ? 'Success' : 'Failed'
      })

      if (!response.ok) {
        throw new Error(`Webhook failed with status ${response.status}`)
      }

      // Continue to next node
      await this.moveToNextNode(executionId, node)

    } catch (error) {
      await this.logExecutionEvent(executionId, 'WEBHOOK_ERROR', {
        nodeId: node.id,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Execute SMS node
   */
  private async executeSMSNode(executionId: string, node: any): Promise<void> {
    const execution = await prisma.automationExecution.findUnique({
      where: { id: executionId },
      include: { contact: true }
    })

    if (!execution) return

    try {
      const smsConfig = node.sms
      
      if (!smsConfig || !smsConfig.message) {
        throw new Error('SMS configuration not found')
      }

      // Send SMS (implement your SMS service integration here)
      console.log(`Sending SMS to ${execution.contact.email} for automation ${execution.automationId}`)
      
      // Log SMS sent
      await this.logExecutionEvent(executionId, 'SMS_SENT', {
        nodeId: node.id,
        recipient: execution.contact.email,
        message: smsConfig.message.substring(0, 100) + '...',
        sender: smsConfig.sender
      })

      // Continue to next node
      await this.moveToNextNode(executionId, node)

    } catch (error) {
      await this.logExecutionEvent(executionId, 'SMS_ERROR', {
        nodeId: node.id,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Execute until node (wait until condition is met)
   */
  private async executeUntilNode(executionId: string, node: any): Promise<void> {
    try {
      const untilConfig = node.until
      
      if (!untilConfig) {
        throw new Error('Until configuration not found')
      }

      // Set execution to waiting state
      const maxWaitMinutes = this.calculateWaitMinutes(
        untilConfig.maxWait?.duration || 7,
        untilConfig.maxWait?.unit || 'days'
      )
      const maxWaitUntil = new Date(Date.now() + maxWaitMinutes * 60 * 1000)

      await prisma.automationExecution.update({
        where: { id: executionId },
        data: {
          status: 'WAITING_UNTIL',
          waitUntil: maxWaitUntil,
          executionData: {
            ...await this.getExecutionData(executionId),
            untilCondition: untilConfig,
            maxWaitUntil: maxWaitUntil.toISOString()
          }
        }
      })

      // Log until start
      await this.logExecutionEvent(executionId, 'UNTIL_STARTED', {
        nodeId: node.id,
        condition: untilConfig.type,
        maxWait: `${untilConfig.maxWait?.duration || 7} ${untilConfig.maxWait?.unit || 'days'}`
      })

      // The condition checking will be handled by a separate process
      // that periodically checks for until conditions

    } catch (error) {
      throw error
    }
  }

  /**
   * Execute when node (wait until specific date/time)
   */
  private async executeWhenNode(executionId: string, node: any): Promise<void> {
    try {
      const whenConfig = node.when
      
      if (!whenConfig || !whenConfig.datetime) {
        throw new Error('When configuration not found')
      }

      const waitUntil = new Date(whenConfig.datetime)

      // Update execution to wait state
      await prisma.automationExecution.update({
        where: { id: executionId },
        data: {
          status: 'WAITING_UNTIL',
          waitUntil
        }
      })

      // Log when start
      await this.logExecutionEvent(executionId, 'WHEN_STARTED', {
        nodeId: node.id,
        waitUntil: waitUntil.toISOString()
      })

      // Schedule resume
      const waitMilliseconds = waitUntil.getTime() - Date.now()
      if (waitMilliseconds > 0) {
        setTimeout(async () => {
          await this.resumeFromWait(executionId, node)
        }, waitMilliseconds)
      } else {
        // Time has already passed, continue immediately
        await this.resumeFromWait(executionId, node)
      }

    } catch (error) {
      throw error
    }
  }

  /**
   * Execute move to node
   */
  private async executeMoveToNode(executionId: string, node: any): Promise<void> {
    const execution = await prisma.automationExecution.findUnique({
      where: { id: executionId },
      include: { contact: true }
    })

    if (!execution) return

    try {
      const moveToConfig = node.moveTo
      
      if (!moveToConfig) {
        throw new Error('MoveTo configuration not found')
      }

      // Update contact segment/list (implement based on your contact model)
      console.log(`Moving contact ${execution.contactId} to ${moveToConfig.type}: ${moveToConfig.segmentId || moveToConfig.listId}`)

      // Log move action
      await this.logExecutionEvent(executionId, 'CONTACT_MOVED', {
        nodeId: node.id,
        moveType: moveToConfig.type,
        targetId: moveToConfig.segmentId || moveToConfig.listId,
        targetName: moveToConfig.segmentName || moveToConfig.listName
      })

      // Continue to next node
      await this.moveToNextNode(executionId, node)

    } catch (error) {
      await this.logExecutionEvent(executionId, 'MOVE_ERROR', {
        nodeId: node.id,
        error: error.message
      })
      throw error
    }
  }

  // Helper methods
  private async moveToNextNode(executionId: string, currentNode: any, branchPath?: string): Promise<void> {
    // Implement logic to find and move to the next node in the flow
    // This would depend on your node connection/flow structure
    
    // For now, just complete the execution
    await this.completeExecution(executionId)
  }

  private async resumeFromWait(executionId: string, node: any): Promise<void> {
    // Resume execution from wait
    await prisma.automationExecution.update({
      where: { id: executionId },
      data: { status: 'ACTIVE' }
    })

    await this.logExecutionEvent(executionId, 'WAIT_COMPLETED', {
      nodeId: node.id
    })

    await this.moveToNextNode(executionId, node)
  }

  private async evaluateCondition(executionId: string, conditionConfig: any): Promise<boolean> {
    // Implement condition evaluation logic based on your requirements
    // This is a placeholder - implement based on your business logic
    return Math.random() > 0.5
  }

  private calculateWaitMinutes(duration: number, unit: string): number {
    switch (unit) {
      case 'minutes': return duration
      case 'hours': return duration * 60
      case 'days': return duration * 24 * 60
      case 'weeks': return duration * 7 * 24 * 60
      default: return duration
    }
  }

  private async completeExecution(executionId: string): Promise<void> {
    await prisma.automationExecution.update({
      where: { id: executionId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date()
      }
    })

    await this.logExecutionEvent(executionId, 'AUTOMATION_COMPLETED', {
      message: 'Automation execution completed'
    })

    // Update automation statistics
    const execution = await prisma.automationExecution.findUnique({
      where: { id: executionId }
    })

    if (execution) {
      await prisma.automation.update({
        where: { id: execution.automationId },
        data: {
          currentlyActive: { decrement: 1 },
          totalCompleted: { increment: 1 }
        }
      })
    }
  }

  private async handleExecutionError(executionId: string, error: any): Promise<void> {
    await prisma.automationExecution.update({
      where: { id: executionId },
      data: {
        status: 'ERROR',
        executionData: {
          error: error.message,
          errorAt: new Date().toISOString()
        }
      }
    })

    await this.logExecutionEvent(executionId, 'EXECUTION_ERROR', {
      error: error.message
    })
  }

  private async logExecutionEvent(executionId: string, eventType: string, eventData: any): Promise<void> {
    await prisma.automationExecutionEvent.create({
      data: {
        executionId,
        eventType,
        eventData,
        timestamp: new Date()
      }
    })
  }

  private async updateNodeStats(nodeId: string, action: string): Promise<void> {
    // Update or create node statistics
    const today = new Date().toISOString().split('T')[0]
    
    await prisma.automationNodeStats.upsert({
      where: {
        nodeId_date: {
          nodeId,
          date: today
        }
      },
      update: {
        enteredCount: action === 'ENTERED' ? { increment: 1 } : undefined,
        completedCount: action === 'COMPLETED' ? { increment: 1 } : undefined,
        errorCount: action === 'ERROR' ? { increment: 1 } : undefined
      },
      create: {
        nodeId,
        date: today,
        enteredCount: action === 'ENTERED' ? 1 : 0,
        completedCount: action === 'COMPLETED' ? 1 : 0,
        errorCount: action === 'ERROR' ? 1 : 0
      }
    })
  }

  private async getExecutionData(executionId: string): Promise<any> {
    const execution = await prisma.automationExecution.findUnique({
      where: { id: executionId }
    })
    return execution?.executionData || {}
  }
}

// Export singleton instance
export const automationEngine = new AutomationEngine()