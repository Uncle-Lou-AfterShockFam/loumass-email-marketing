import { prisma } from '@/lib/prisma'
import { GmailService } from '@/services/gmail-service'
import { TemplateProcessor } from '@/services/template-processor'

interface EmailNodeData {
  templateId?: string
  subject?: string
  content?: string
  sendFromTemplate: boolean
}

interface ProcessResult {
  completed: boolean
  failed?: boolean
  error?: string
  executionData?: any
  waitUntil?: Date
  branch?: string
}

export class EmailNodeProcessor {
  private templateProcessor = new TemplateProcessor()
  private gmailService = new GmailService()

  async process(execution: any, nodeData: EmailNodeData): Promise<ProcessResult> {
    try {
      let emailContent = { subject: '', content: '' }
      
      if (nodeData.sendFromTemplate && nodeData.templateId) {
        // Get template from database
        const template = await prisma.emailTemplate.findFirst({
          where: {
            id: nodeData.templateId,
            userId: execution.automation.userId
          }
        })

        if (!template) {
          return {
            completed: false,
            failed: true,
            error: 'Email template not found'
          }
        }

        emailContent = {
          subject: template.subject,
          content: template.content
        }
      } else {
        // Use inline content
        emailContent = {
          subject: nodeData.subject || '',
          content: nodeData.content || ''
        }
      }

      // Process template with contact data and variables
      const executionData = execution.executionData || {}
      const variables = executionData.variables || {}
      
      const processedEmail = await this.templateProcessor.process(
        emailContent,
        execution.contact,
        variables
      )

      // Get Gmail token for the user
      const gmailToken = await prisma.gmailToken.findUnique({
        where: { userId: execution.automation.userId }
      })

      if (!gmailToken) {
        return {
          completed: false,
          failed: true,
          error: 'Gmail not configured for user'
        }
      }

      // Generate tracking ID for this email
      const trackingId = `automation_${execution.automation.id}_${execution.id}_${Date.now()}`

      // Send email using GmailService
      const emailResult = await this.gmailService.sendEmail(
        execution.automation.userId,
        gmailToken.email,
        {
          to: [execution.contact.email],
          subject: processedEmail.subject,
          htmlContent: processedEmail.content,
          textContent: processedEmail.content,
          trackingId,
          contactId: execution.contact.id
        }
      )

      // Create email event record
      await prisma.emailEvent.create({
        data: {
          userId: execution.automation.userId,
          contactId: execution.contact.id,
          type: 'SENT',
          subject: processedEmail.subject,
          details: `Sent via automation: ${execution.automation.name}`,
          eventData: {
            automationId: execution.automation.id,
            executionId: execution.id,
            gmailMessageId: emailResult.messageId,
            gmailThreadId: emailResult.threadId,
            templateUsed: nodeData.sendFromTemplate ? nodeData.templateId : null
          }
        }
      })

      // Update execution data with email info
      const updatedExecutionData = {
        ...executionData,
        lastEmail: {
          subject: processedEmail.subject,
          sentAt: new Date().toISOString(),
          messageId: emailResult.messageId
        }
      }

      return {
        completed: true,
        executionData: updatedExecutionData
      }

    } catch (error) {
      console.error('Error in email node processor:', error)
      
      return {
        completed: false,
        failed: true,
        error: error instanceof Error ? error.message : 'Unknown email error'
      }
    }
  }
}