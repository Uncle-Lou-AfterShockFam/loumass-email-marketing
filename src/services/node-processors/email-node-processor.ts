import { prisma } from '@/lib/prisma'
import { GmailService } from '@/services/gmail-service'
import { TemplateProcessor } from '@/services/template-processor'

interface EmailNodeData {
  templateId?: string
  subject?: string
  content?: string
  sendFromTemplate: boolean
  emailTemplate?: {
    subject?: string
    content?: string
  }
  email?: {
    fromName?: string
  }
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
        // Use inline content from the node's emailTemplate data
        emailContent = {
          subject: nodeData.emailTemplate?.subject || nodeData.subject || '',
          content: nodeData.emailTemplate?.content || nodeData.content || ''
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

      // Generate tracking ID in the format: automationId:contactId:timestamp
      const trackingData = `${execution.automation.id}:${execution.contact.id}:${Date.now()}`
      const trackingId = Buffer.from(trackingData).toString('base64url')

      // Add tracking to email content (pixel and click tracking)
      let finalContent = processedEmail.content
      if (execution.automation.trackingEnabled !== false) { // Default to enabled unless explicitly disabled
        finalContent = await this.addTrackingToEmail(processedEmail.content, trackingId, execution.automation.userId)
      }

      // Send email using GmailService (with automatic token refresh)
      console.log('📧 Sending email via Gmail service...')
      const emailResult = await this.gmailService.sendEmail(
        execution.automation.userId,
        gmailToken.email,
        {
          to: [execution.contact.email],
          subject: processedEmail.subject,
          htmlContent: finalContent,
          textContent: processedEmail.content,
          trackingId,
          contactId: execution.contact.id,
          fromName: nodeData.email?.fromName || 'LOUMASS'
        }
      )
      console.log('✅ Email sent successfully:', emailResult.messageId)

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

      // Update node statistics
      const currentNodeId = execution.currentNodeId || 'email-node'
      await prisma.automationNodeStats.upsert({
        where: {
          automationId_nodeId: {
            automationId: execution.automation.id,
            nodeId: currentNodeId
          }
        },
        update: {
          totalPassed: { increment: 1 },
          currentPassed: { increment: 1 },
          lastUpdated: new Date()
        },
        create: {
          automationId: execution.automation.id,
          nodeId: currentNodeId,
          totalPassed: 1,
          currentPassed: 1,
          inNode: 0
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
      console.error('❌ Error in email node processor:', error)
      
      // Enhanced error handling for different types of Gmail errors
      let errorMessage = 'Unknown email error'
      
      if (error instanceof Error) {
        if (error.message.includes('Gmail account not connected')) {
          errorMessage = 'Gmail account not connected. Please reconnect your Gmail account in Settings.'
        } else if (error.message.includes('Gmail token expired and could not be refreshed')) {
          errorMessage = 'Gmail token expired. Please reconnect your Gmail account in Settings.'
        } else if (error.message.includes('Invalid Credentials') || error.message.includes('unauthorized')) {
          errorMessage = 'Gmail authentication failed. Please reconnect your Gmail account in Settings.'
        } else if (error.message.includes('quota')) {
          errorMessage = 'Gmail API quota exceeded. Please try again later.'
        } else if (error.message.includes('Rate limit')) {
          errorMessage = 'Gmail rate limit exceeded. Email will be retried automatically.'
        } else {
          errorMessage = error.message
        }
      }
      
      // Log the error for debugging
      await prisma.emailEvent.create({
        data: {
          userId: execution.automation.userId,
          contactId: execution.contact.id,
          type: 'FAILED',
          subject: execution.executionData?.lastEmail?.subject || 'Email Failed',
          details: `Failed via automation: ${execution.automation.name}`,
          eventData: {
            automationId: execution.automation.id,
            executionId: execution.id,
            error: errorMessage,
            failedAt: new Date().toISOString()
          }
        }
      }).catch(dbError => {
        console.error('Failed to log email error to database:', dbError)
      })
      
      return {
        completed: false,
        failed: true,
        error: errorMessage
      }
    }
  }

  private async addTrackingToEmail(html: string, trackingId: string, userId: string): Promise<string> {
    console.log('=== AUTOMATION addTrackingToEmail CALLED ===')
    console.log('Input HTML length:', html.length)
    console.log('Tracking ID:', trackingId)
    
    // Fetch user's tracking domain from database
    const userTrackingDomain = await prisma.trackingDomain.findUnique({
      where: { userId },
      select: { domain: true, verified: true }
    })
    
    // Use user's verified domain, or fall back to default
    let baseUrl: string
    if (userTrackingDomain?.verified && userTrackingDomain.domain) {
      baseUrl = `https://${userTrackingDomain.domain}`.trim()
      console.log('Using user tracking domain:', baseUrl)
    } else {
      baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'https://loumassbeta.vercel.app').trim()
      console.log('Using default tracking domain:', baseUrl)
    }
    
    console.log('Base URL for tracking:', baseUrl)
    
    // Add open tracking pixel with cache-busting parameter
    const cacheBuster = Math.random().toString(36).substring(7)
    const pixelUrl = `${baseUrl}/api/track/open/${trackingId}?cb=${cacheBuster}`
    const pixelHtml = `<img src="${pixelUrl}" width="1" height="1" style="display:none;" alt="" />`
    
    console.log('Automation pixel URL:', pixelUrl)
    
    // STEP 1: Convert plain text URLs to HTML links FIRST
    console.log('Converting plain text URLs to HTML links...')
    let trackedHtml = html
    
    // Check if content is plain text (no HTML tags)
    const hasHtmlTags = /<[^>]+>/.test(html)
    
    if (!hasHtmlTags) {
      console.log('Content appears to be plain text, converting to HTML...')
      // Convert line breaks to <br> tags
      trackedHtml = trackedHtml.replace(/\n/g, '<br>')
      
      // Then convert URLs to links
      trackedHtml = trackedHtml.replace(/(https?:\/\/[^\s<>'"]+)/gi, '<a href="$1">$1</a>')
      
      // Wrap in proper HTML structure
      trackedHtml = `<html><body>${trackedHtml}${pixelHtml}</body></html>`
      
      console.log('Converted plain text to HTML with pixel')
    } else {
      // Content already has HTML, process normally
      console.log('Content already has HTML tags')
      
      // Convert HTTP/HTTPS URLs that are not already inside HTML tags
      const urlRegex = /(?<!<[^>]*)(https?:\/\/[^\s<>'"]+)/gi
      let urlsConverted = 0
      
      trackedHtml = trackedHtml.replace(urlRegex, (match) => {
        urlsConverted++
        return `<a href="${match}">${match}</a>`
      })
      
      console.log(`Converted ${urlsConverted} plain text URLs to HTML links`)
      
      // STEP 2: Ensure HTML has proper structure
      if (!trackedHtml.includes('<html') && !trackedHtml.includes('<body')) {
        trackedHtml = `<html><body>${trackedHtml}</body></html>`
      }
      
      // STEP 3: Insert pixel before closing body tag
      if (trackedHtml.includes('</body>')) {
        console.log('Found </body> tag, inserting pixel before it')
        trackedHtml = trackedHtml.replace('</body>', `${pixelHtml}</body>`)
      } else {
        console.log('No </body> tag found, appending pixel to end')
        trackedHtml = trackedHtml + pixelHtml
      }
    }
    
    // STEP 4: Replace all HTML links for click tracking
    const linkRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1/gi
    let linkCount = 0
    
    trackedHtml = trackedHtml.replace(linkRegex, (match, quote, url) => {
      // Don't track unsubscribe links or mailto links
      if (url.includes('unsubscribe') || url.includes('mailto:')) {
        return match
      }
      
      linkCount++
      const trackedUrl = `${baseUrl}/api/track/click/${trackingId}?u=${encodeURIComponent(url)}`
      console.log(`Automation link ${linkCount}: ${url} -> ${trackedUrl}`)
      return match.replace(url, trackedUrl)
    })
    
    console.log('=== AUTOMATION addTrackingToEmail COMPLETE ===')
    console.log('Final HTML length:', trackedHtml.length)
    console.log('Links tracked:', linkCount)
    
    return trackedHtml
  }
}