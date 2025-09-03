import { prisma } from '@/lib/prisma'

interface ActionNodeData {
  actionType: 'add_tag' | 'remove_tag' | 'add_to_list' | 'remove_from_list' | 'update_field'
  target: string
  value?: string
}

interface ProcessResult {
  completed: boolean
  failed?: boolean
  error?: string
  executionData?: any
  waitUntil?: Date
  branch?: string
}

export class ActionNodeProcessor {
  async process(execution: any, nodeData: ActionNodeData): Promise<ProcessResult> {
    try {
      switch (nodeData.actionType) {
        case 'add_tag':
          return await this.addTag(execution, nodeData.target)
        
        case 'remove_tag':
          return await this.removeTag(execution, nodeData.target)
        
        case 'add_to_list':
          return await this.addToList(execution, nodeData.target)
        
        case 'remove_from_list':
          return await this.removeFromList(execution, nodeData.target)
        
        case 'update_field':
          return await this.updateField(execution, nodeData.target, nodeData.value)
        
        default:
          return {
            completed: false,
            failed: true,
            error: `Unknown action type: ${nodeData.actionType}`
          }
      }

    } catch (error) {
      console.error('Error in action node processor:', error)
      
      return {
        completed: false,
        failed: true,
        error: error instanceof Error ? error.message : 'Unknown action error'
      }
    }
  }

  private async addTag(execution: any, tagName: string): Promise<ProcessResult> {
    const contact = await prisma.contact.findFirst({
      where: {
        id: execution.contact.id,
        userId: execution.automation.userId
      }
    })

    if (!contact) {
      return {
        completed: false,
        failed: true,
        error: 'Contact not found'
      }
    }

    const currentTags = contact.tags || []
    if (!currentTags.includes(tagName)) {
      await prisma.contact.update({
        where: { id: contact.id },
        data: {
          tags: [...currentTags, tagName]
        }
      })
    }

    return { completed: true }
  }

  private async removeTag(execution: any, tagName: string): Promise<ProcessResult> {
    const contact = await prisma.contact.findFirst({
      where: {
        id: execution.contact.id,
        userId: execution.automation.userId
      }
    })

    if (!contact) {
      return {
        completed: false,
        failed: true,
        error: 'Contact not found'
      }
    }

    const currentTags = contact.tags || []
    const updatedTags = currentTags.filter(tag => tag !== tagName)

    await prisma.contact.update({
      where: { id: contact.id },
      data: { tags: updatedTags }
    })

    return { completed: true }
  }

  private async addToList(execution: any, listId: string): Promise<ProcessResult> {
    // Check if list exists and belongs to user
    const list = await prisma.emailList.findFirst({
      where: {
        id: listId,
        userId: execution.automation.userId
      }
    })

    if (!list) {
      return {
        completed: false,
        failed: true,
        error: 'Email list not found'
      }
    }

    // Add contact to list (upsert to avoid duplicates)
    await prisma.contactList.upsert({
      where: {
        contactId_listId: {
          contactId: execution.contact.id,
          listId: listId
        }
      },
      create: {
        contactId: execution.contact.id,
        listId: listId
      },
      update: {} // No update needed
    })

    // Update list subscriber count
    await prisma.emailList.update({
      where: { id: listId },
      data: {
        subscriberCount: {
          increment: 1
        }
      }
    })

    return { completed: true }
  }

  private async removeFromList(execution: any, listId: string): Promise<ProcessResult> {
    // Remove contact from list
    const deleted = await prisma.contactList.deleteMany({
      where: {
        contactId: execution.contact.id,
        listId: listId,
        list: {
          userId: execution.automation.userId
        }
      }
    })

    // Update list subscriber count if contact was removed
    if (deleted.count > 0) {
      await prisma.emailList.update({
        where: { id: listId },
        data: {
          subscriberCount: {
            decrement: 1
          }
        }
      })
    }

    return { completed: true }
  }

  private async updateField(execution: any, fieldName: string, value?: string): Promise<ProcessResult> {
    if (!value) {
      return {
        completed: false,
        failed: true,
        error: 'Value is required for update field action'
      }
    }

    // Define allowed fields that can be updated
    const allowedFields = ['firstName', 'lastName', 'company', 'notes']
    
    if (!allowedFields.includes(fieldName)) {
      return {
        completed: false,
        failed: true,
        error: `Field '${fieldName}' cannot be updated via automation`
      }
    }

    await prisma.contact.update({
      where: { 
        id: execution.contact.id,
        userId: execution.automation.userId
      },
      data: {
        [fieldName]: value
      }
    })

    return { completed: true }
  }
}