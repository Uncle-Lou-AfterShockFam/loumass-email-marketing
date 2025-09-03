import { prisma } from '@/lib/prisma'
import { AutomationTriggerEvent } from '@prisma/client'
import { automationEngine } from './automationEngine'

export class AutomationTriggerService {
  /**
   * Trigger automations when a new subscriber is added
   */
  static async triggerNewSubscriber(userId: string, contactId: string) {
    try {
      // Find all active automations with NEW_SUBSCRIBER trigger for this user
      const automations = await prisma.automation.findMany({
        where: {
          userId,
          status: 'ACTIVE',
          triggerEvent: 'NEW_SUBSCRIBER'
        }
      })

      for (const automation of automations) {
        // Check if this contact should be enrolled
        const shouldEnroll = await this.shouldEnrollContact(automation, contactId)
        
        if (shouldEnroll) {
          await automationEngine.startExecution(automation.id, contactId)
          
          // Update automation statistics
          await prisma.automation.update({
            where: { id: automation.id },
            data: {
              totalEntered: { increment: 1 },
              currentlyActive: { increment: 1 }
            }
          })
        }
      }
    } catch (error) {
      console.error('Error triggering NEW_SUBSCRIBER automations:', error)
      throw error
    }
  }

  /**
   * Trigger automations for specific date/time
   */
  static async triggerSpecificDate(userId: string, targetDate: Date) {
    try {
      // Find automations with SPECIFIC_DATE trigger
      const automations = await prisma.automation.findMany({
        where: {
          userId,
          status: 'ACTIVE',
          triggerEvent: 'SPECIFIC_DATE'
        }
      })

      for (const automation of automations) {
        const triggerData = automation.triggerData as any
        if (triggerData?.datetime) {
          const automationDate = new Date(triggerData.datetime)
          
          // Check if it's time to trigger (within 5 minutes)
          const timeDiff = Math.abs(targetDate.getTime() - automationDate.getTime())
          if (timeDiff <= 5 * 60 * 1000) { // 5 minutes
            // Get contacts based on trigger criteria
            const contacts = await this.getContactsForTrigger(automation)
            
            for (const contact of contacts) {
              await automationEngine.startExecution(automation.id, contact.id)
            }
            
            // Update statistics
            await prisma.automation.update({
              where: { id: automation.id },
              data: {
                totalEntered: { increment: contacts.length },
                currentlyActive: { increment: contacts.length }
              }
            })
          }
        }
      }
    } catch (error) {
      console.error('Error triggering SPECIFIC_DATE automations:', error)
      throw error
    }
  }

  /**
   * Trigger automations for subscriber segments
   */
  static async triggerSubscriberSegment(userId: string, segmentId: string, contactIds?: string[]) {
    try {
      // Find automations with SUBSCRIBER_SEGMENT trigger
      const automations = await prisma.automation.findMany({
        where: {
          userId,
          status: 'ACTIVE',
          triggerEvent: 'SUBSCRIBER_SEGMENT'
        }
      })

      for (const automation of automations) {
        const triggerData = automation.triggerData as any
        
        // Check if this automation is triggered by this segment
        if (triggerData?.segmentId === segmentId) {
          let contacts: string[]
          
          if (contactIds) {
            // Use provided contact IDs
            contacts = contactIds
          } else {
            // Get all contacts in this segment
            const segmentContacts = await prisma.contact.findMany({
              where: {
                userId,
                // Add your segment filtering logic here based on your Contact model
              },
              select: { id: true }
            })
            contacts = segmentContacts.map(c => c.id)
          }
          
          // Start executions for all contacts
          for (const contactId of contacts) {
            const shouldEnroll = await this.shouldEnrollContact(automation, contactId)
            
            if (shouldEnroll) {
              await automationEngine.startExecution(automation.id, contactId)
            }
          }
          
          // Update statistics
          await prisma.automation.update({
            where: { id: automation.id },
            data: {
              totalEntered: { increment: contacts.length },
              currentlyActive: { increment: contacts.length }
            }
          })
        }
      }
    } catch (error) {
      console.error('Error triggering SUBSCRIBER_SEGMENT automations:', error)
      throw error
    }
  }

  /**
   * Trigger automations via webhook
   */
  static async triggerWebhook(userId: string, webhookId: string, payload: any) {
    try {
      // Find automations with WEBHOOK trigger
      const automations = await prisma.automation.findMany({
        where: {
          userId,
          status: 'ACTIVE',
          triggerEvent: 'WEBHOOK'
        }
      })

      for (const automation of automations) {
        const triggerData = automation.triggerData as any
        
        // Check if this automation is triggered by this webhook
        if (triggerData?.webhookId === webhookId) {
          // Extract contact information from payload
          const contactId = payload.contactId || payload.contact_id
          
          if (contactId) {
            const shouldEnroll = await this.shouldEnrollContact(automation, contactId)
            
            if (shouldEnroll) {
              await automationEngine.startExecution(automation.id, contactId, payload)
              
              // Update statistics
              await prisma.automation.update({
                where: { id: automation.id },
                data: {
                  totalEntered: { increment: 1 },
                  currentlyActive: { increment: 1 }
                }
              })
            }
          }
        }
      }
    } catch (error) {
      console.error('Error triggering WEBHOOK automations:', error)
      throw error
    }
  }

  /**
   * Manually trigger automation for specific contacts
   */
  static async triggerManual(automationId: string, contactIds: string[]) {
    try {
      const automation = await prisma.automation.findUnique({
        where: { id: automationId }
      })

      if (!automation) {
        throw new Error('Automation not found')
      }

      if (automation.status !== 'ACTIVE') {
        throw new Error('Automation is not active')
      }

      let enrolledCount = 0
      
      for (const contactId of contactIds) {
        const shouldEnroll = await this.shouldEnrollContact(automation, contactId)
        
        if (shouldEnroll) {
          await automationEngine.startExecution(automation.id, contactId)
          enrolledCount++
        }
      }
      
      // Update statistics
      await prisma.automation.update({
        where: { id: automationId },
        data: {
          totalEntered: { increment: enrolledCount },
          currentlyActive: { increment: enrolledCount }
        }
      })
      
      return { enrolledCount, totalContacts: contactIds.length }
    } catch (error) {
      console.error('Error triggering MANUAL automation:', error)
      throw error
    }
  }

  /**
   * Apply automation to existing subscribers when automation is activated
   */
  static async applyToExistingSubscribers(automationId: string) {
    try {
      const automation = await prisma.automation.findUnique({
        where: { id: automationId }
      })

      if (!automation || !automation.applyToExisting) {
        return { enrolledCount: 0 }
      }

      // Get all contacts for this user
      const contacts = await this.getContactsForTrigger(automation)
      let enrolledCount = 0
      
      for (const contact of contacts) {
        const shouldEnroll = await this.shouldEnrollContact(automation, contact.id)
        
        if (shouldEnroll) {
          await automationEngine.startExecution(automation.id, contact.id)
          enrolledCount++
        }
      }
      
      // Update statistics
      await prisma.automation.update({
        where: { id: automationId },
        data: {
          totalEntered: { increment: enrolledCount },
          currentlyActive: { increment: enrolledCount }
        }
      })
      
      return { enrolledCount }
    } catch (error) {
      console.error('Error applying automation to existing subscribers:', error)
      throw error
    }
  }

  /**
   * Check if a contact should be enrolled in an automation
   */
  private static async shouldEnrollContact(automation: any, contactId: string): Promise<boolean> {
    try {
      // Check if contact is already in this automation
      const existingExecution = await prisma.automationExecution.findFirst({
        where: {
          automationId: automation.id,
          contactId,
          status: { in: ['ACTIVE', 'PAUSED'] }
        }
      })

      if (existingExecution) {
        return false // Already enrolled
      }

      // Check trigger data for additional conditions
      const triggerData = automation.triggerData as any
      
      // Add your business logic here for enrollment conditions
      // For example:
      // - Check contact segments
      // - Check contact tags
      // - Check contact status
      // - Check previous automation completions
      
      return true // Enroll by default
    } catch (error) {
      console.error('Error checking enrollment eligibility:', error)
      return false
    }
  }

  /**
   * Get contacts for automation trigger
   */
  private static async getContactsForTrigger(automation: any) {
    const triggerData = automation.triggerData as any
    
    let whereClause: any = {
      userId: automation.userId
    }
    
    // Add filtering based on trigger data
    if (triggerData?.segmentId) {
      // Add segment filtering logic based on your Contact model
    }
    
    if (triggerData?.tags) {
      // Add tag filtering logic
    }
    
    return await prisma.contact.findMany({
      where: whereClause,
      select: { id: true, email: true }
    })
  }

  /**
   * Schedule automation triggers for date-based automations
   */
  static async scheduleAutomationTriggers() {
    try {
      const now = new Date()
      const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000)
      
      // Find all active date-based automations that should trigger soon
      const automations = await prisma.automation.findMany({
        where: {
          status: 'ACTIVE',
          triggerEvent: 'SPECIFIC_DATE'
        }
      })
      
      for (const automation of automations) {
        const triggerData = automation.triggerData as any
        if (triggerData?.datetime) {
          const triggerDate = new Date(triggerData.datetime)
          
          // If trigger time is between now and 5 minutes from now
          if (triggerDate >= now && triggerDate <= fiveMinutesFromNow) {
            await this.triggerSpecificDate(automation.userId, triggerDate)
          }
        }
      }
    } catch (error) {
      console.error('Error scheduling automation triggers:', error)
      throw error
    }
  }
}

// Export singleton instance
export const automationTrigger = AutomationTriggerService