import { prisma } from '@/lib/prisma'
import { AutomationTriggerEvent } from '@prisma/client'

export class TriggerEvaluator {
  /**
   * Check triggers for an automation and return contact IDs to enroll
   */
  async checkTrigger(automation: any): Promise<string[]> {
    try {
      switch (automation.triggerEvent) {
        case AutomationTriggerEvent.NEW_SUBSCRIBER:
          return await this.checkNewSubscriberTrigger(automation)
        
        case AutomationTriggerEvent.SPECIFIC_DATE:
          return await this.checkDateBasedTrigger(automation)
        
        case AutomationTriggerEvent.SUBSCRIBER_SEGMENT:
          return await this.checkSegmentTrigger(automation)
        
        case AutomationTriggerEvent.WEBHOOK:
          return await this.checkWebhookTrigger(automation)
        
        case AutomationTriggerEvent.MANUAL:
          // Manual triggers don't need checking
          return []
        
        default:
          console.warn(`Unknown trigger event: ${automation.triggerEvent}`)
          return []
      }
    } catch (error) {
      console.error(`Error checking trigger for automation ${automation.id}:`, error)
      return []
    }
  }

  private async checkNewSubscriberTrigger(automation: any): Promise<string[]> {
    const triggerData = automation.triggerData || {}
    const lookbackMinutes = triggerData.lookbackMinutes || 10 // Default 10 minutes
    const since = new Date(Date.now() - lookbackMinutes * 60 * 1000)

    // Find new contacts that haven't been enrolled yet
    const newContacts = await prisma.contact.findMany({
      where: {
        userId: automation.userId,
        createdAt: { gte: since },
        // Exclude contacts already enrolled in this automation
        NOT: {
          automationExecutions: {
            some: {
              automationId: automation.id
            }
          }
        }
      },
      select: { id: true }
    })

    return newContacts.map(contact => contact.id)
  }

  private async checkSegmentTrigger(automation: any): Promise<string[]> {
    const triggerData = automation.triggerData || {}
    const segmentId = triggerData.segmentId
    
    if (!segmentId) {
      console.warn(`Segment trigger for automation ${automation.id} missing segment configuration`)
      return []
    }

    // Find segment and evaluate its conditions
    const segment = await prisma.segment.findFirst({
      where: {
        id: segmentId,
        list: {
          userId: automation.userId
        }
      }
    })

    if (!segment) {
      console.warn(`Segment ${segmentId} not found for automation ${automation.id}`)
      return []
    }

    const lookbackMinutes = triggerData.lookbackMinutes || 10
    const since = new Date(Date.now() - lookbackMinutes * 60 * 1000)

    // Find contacts updated recently that might match segment criteria
    // This is a simplified implementation - full segment evaluation would be complex
    const recentContacts = await prisma.contact.findMany({
      where: {
        userId: automation.userId,
        updatedAt: { gte: since },
        // Exclude contacts already enrolled in this automation
        NOT: {
          automationExecutions: {
            some: {
              automationId: automation.id
            }
          }
        }
      },
      select: { id: true }
    })

    return recentContacts.map((contact: any) => contact.id)
  }

  private async checkDateBasedTrigger(automation: any): Promise<string[]> {
    const triggerData = automation.triggerData || {}
    const dateField = triggerData.dateField // e.g., 'createdAt', 'birthday'
    const offsetDays = triggerData.offsetDays || 0 // Days before/after
    const offsetHours = triggerData.offsetHours || 0 // Hours before/after
    
    if (!dateField) {
      console.warn(`Date based trigger for automation ${automation.id} missing date field configuration`)
      return []
    }

    // Calculate the target date range (today + offset)
    const now = new Date()
    const targetDate = new Date(now)
    targetDate.setDate(targetDate.getDate() + offsetDays)
    targetDate.setHours(targetDate.getHours() + offsetHours)
    
    // Create a window around the target time (±30 minutes)
    const startTime = new Date(targetDate.getTime() - 30 * 60 * 1000)
    const endTime = new Date(targetDate.getTime() + 30 * 60 * 1000)

    // Build the where condition based on date field
    let whereCondition: any = {
      userId: automation.userId,
      // Exclude contacts already enrolled in this automation
      NOT: {
        automationExecutions: {
          some: {
            automationId: automation.id
          }
        }
      }
    }

    // Handle different date fields
    if (dateField === 'createdAt') {
      whereCondition.createdAt = { gte: startTime, lte: endTime }
    } else if (dateField === 'birthday' && triggerData.yearlyRecurring) {
      // For birthday triggers, match month/day regardless of year
      const targetMonth = targetDate.getMonth() + 1
      const targetDay = targetDate.getDate()
      
      // This is a simplified approach - in practice you'd want more sophisticated date matching
      whereCondition.customFields = {
        path: ['birthday'],
        string_contains: `${targetMonth.toString().padStart(2, '0')}-${targetDay.toString().padStart(2, '0')}`
      }
    }

    const matchingContacts = await prisma.contact.findMany({
      where: whereCondition,
      select: { id: true }
    })

    return matchingContacts.map((contact: any) => contact.id)
  }

  private async checkWebhookTrigger(automation: any): Promise<string[]> {
    // Webhook triggers are handled by the webhook endpoint
    // This method would check for pending webhook events
    const triggerData = automation.triggerData || {}
    const webhookId = triggerData.webhookId
    
    if (!webhookId) {
      return []
    }

    // In a full implementation, you'd have a WebhookEvent table
    // For now, return empty array
    console.warn('WEBHOOK trigger requires webhook event logging - not yet implemented')
    return []
  }
}