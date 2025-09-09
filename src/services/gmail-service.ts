import { gmail_v1 } from 'googleapis'
import { GmailClient } from '@/lib/gmail-client'
import { prisma } from '@/lib/prisma'
import { RecipientStatus } from '@prisma/client'
import { extractImagesAsAttachments } from '@/utils/email-attachments'
const MailComposer = require('nodemailer/lib/mail-composer')

export interface EmailAttachment {
  filename: string
  content: string | Buffer // base64 string or Buffer
  contentType?: string
  cid?: string // Content-ID for inline images
}

interface EmailData {
  to: string[]
  subject: string
  htmlContent: string
  textContent?: string
  fromName?: string
  replyTo?: string
  threadId?: string // For follow-up sequences
  messageId?: string // For proper threading headers (In-Reply-To and References)
  trackingId: string
  campaignId?: string
  sequenceId?: string
  contactId: string
  attachments?: EmailAttachment[] // New field for attachments
}

export class GmailService {
  private gmailClient = new GmailClient()

  async sendEmail(userId: string, gmailAddress: string, emailData: EmailData) {
    console.log('=== sendEmail CALLED ===')
    console.log('To:', emailData.to)
    console.log('Subject:', emailData.subject)
    console.log('HTML content length:', emailData.htmlContent.length)
    console.log('Campaign ID:', emailData.campaignId)
    console.log('Contact ID:', emailData.contactId)
    console.log('🔍 CRITICAL - Threading Info:')
    console.log('  threadId:', emailData.threadId)
    console.log('  messageId for In-Reply-To:', emailData.messageId)
    
    try {
      // Attempt to get Gmail service (with automatic token refresh if needed)
      const gmail = await this.gmailClient.getGmailService(userId, gmailAddress)
      
      // Build email message
      console.log('About to build message...')
      const message = await this.buildMessage(emailData, gmailAddress)
      console.log('Message built, length:', message.length)
      
      // Debug: decode and log the first part of the message to see headers
      try {
        const decodedStart = Buffer.from(
          message.slice(0, 800).replace(/-/g, '+').replace(/_/g, '/') + '==', 
          'base64'
        ).toString('utf-8')
        console.log('📧 First part of decoded message (showing headers):')
        console.log(decodedStart)
      } catch (e) {
        console.log('Could not decode message for debug'  )
      }
      
      // Send the email (with retry for token refresh)
      let response
      try {
        response = await gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: message,
            threadId: emailData.threadId // For threading follow-ups
          }
        })
      } catch (sendError: any) {
        console.log('❌ First send attempt failed:', sendError?.message)
        
        // Check if it's a token-related error
        if (sendError?.code === 401 || sendError?.message?.includes('Invalid Credentials')) {
          console.log('🔄 Token error detected, refreshing and retrying...')
          
          // Force token refresh and retry
          const refreshedGmail = await this.gmailClient.getGmailService(userId, gmailAddress)
          response = await refreshedGmail.users.messages.send({
            userId: 'me',
            requestBody: {
              raw: message,
              threadId: emailData.threadId
            }
          })
          console.log('✅ Retry after token refresh succeeded')
        } else {
          // Re-throw non-token errors
          throw sendError
        }
      }

      // Fetch the sent message to get the Message-ID header
      let messageIdHeader: string | undefined
      try {
        const sentMessage = await gmail.users.messages.get({
          userId: 'me',
          id: response.data.id!,
          format: 'metadata',
          metadataHeaders: ['Message-ID']
        })
        
        messageIdHeader = sentMessage.data.payload?.headers?.find(
          (h: any) => h.name?.toLowerCase() === 'message-id'
        )?.value
        
        console.log('📧 Captured Message-ID header:', messageIdHeader)
      } catch (error) {
        console.error('Failed to fetch Message-ID header:', error)
      }

      // Update recipient record for campaign emails
      let recipientId: string | undefined

      if (emailData.campaignId) {
        const recipient = await prisma.recipient.upsert({
          where: {
            campaignId_contactId: {
              campaignId: emailData.campaignId,
              contactId: emailData.contactId
            }
          },
          update: {
            status: RecipientStatus.SENT,
            sentAt: new Date(),
            gmailMessageId: response.data.id,
            gmailThreadId: response.data.threadId,
            messageIdHeader // Store the Message-ID for threading
          },
          create: {
            campaignId: emailData.campaignId,
            contactId: emailData.contactId,
            status: RecipientStatus.SENT,
            sentAt: new Date(),
            gmailMessageId: response.data.id,
            gmailThreadId: response.data.threadId,
            messageIdHeader // Store the Message-ID for threading
          }
        })
        recipientId = recipient.id
      }

      return {
        success: true,
        messageId: response.data.id,
        threadId: response.data.threadId,
        recipientId
      }
    } catch (error) {
      console.error('Failed to send email:', error)
      
      // Store failed recipient record for campaign emails
      if (emailData.campaignId) {
        await prisma.recipient.upsert({
          where: {
            campaignId_contactId: {
              campaignId: emailData.campaignId,
              contactId: emailData.contactId
            }
          },
          update: {
            status: RecipientStatus.FAILED,
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          },
          create: {
            campaignId: emailData.campaignId,
            contactId: emailData.contactId,
            status: RecipientStatus.FAILED,
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          }
        })
      }

      throw error
    }
  }

  private async buildMessage(emailData: EmailData, fromEmail: string): Promise<string> {
    console.log('=== buildMessage CALLED ===')
    console.log('HTML content length:', emailData.htmlContent.length)
    console.log('Has attachments:', !!emailData.attachments?.length)
    console.log('FromName provided:', emailData.fromName)
    
    try {
      // Create mail options for MailComposer
      console.log('Creating mailOptions object...')
      // Use the provided fromName or default to just the email
      const displayName = emailData.fromName || ''
      const mailOptions: any = {
        from: displayName ? `${displayName} <${fromEmail}>` : fromEmail,
        to: emailData.to.join(', '),
        subject: emailData.subject,
        text: emailData.textContent || '',
        html: emailData.htmlContent,
        textEncoding: 'base64'
      }
      console.log('mailOptions created with FROM:', mailOptions.from)

    // CRITICAL: Add threading headers when we have a messageId to reference
    if (emailData.messageId) {
      console.log('🔗 Adding threading headers for reply:')
      console.log('  Original Message-ID to reference:', emailData.messageId)
      console.log('  Gmail Thread ID (if any):', emailData.threadId)
      
      // CRITICAL FIX: Accept any Message-ID containing '@' as valid
      // Message-IDs from Gmail might not always have angle brackets when stored
      if (emailData.messageId.includes('@')) {
        // Ensure Message-ID has proper angle brackets for headers
        let formattedMessageId = emailData.messageId
        if (!formattedMessageId.startsWith('<')) {
          formattedMessageId = '<' + formattedMessageId
        }
        if (!formattedMessageId.endsWith('>')) {
          formattedMessageId = formattedMessageId + '>'
        }
        
        mailOptions.inReplyTo = formattedMessageId
        mailOptions.references = formattedMessageId
        console.log('✅ Threading headers SUCCESSFULLY added to message:')
        console.log('  - Original messageId:', emailData.messageId)
        console.log('  - Formatted for headers:', formattedMessageId)
        console.log('  - In-Reply-To:', mailOptions.inReplyTo)
        console.log('  - References:', mailOptions.references)
      } else {
        console.log('❌ CRITICAL ERROR: messageId does not contain @ symbol:', emailData.messageId)
        console.log('   This is likely a threadId being passed as messageId')
        console.log('   Threading will only work in sender\'s sent folder, not recipient\'s inbox')
        console.log('   HEADERS NOT ADDED - This email will NOT thread for recipients!')
      }
    } else if (emailData.threadId) {
      console.log('⚠️ Have threadId but no messageId - cannot add threading headers')
      console.log('  Threading will only work in sender\'s sent folder, not recipient\'s inbox')
    } else {
      console.log('🆕 No messageId or threadId provided - this will be a new thread')
    }

    if (emailData.replyTo) {
      mailOptions.replyTo = emailData.replyTo
    }

    // Add attachments if provided
    if (emailData.attachments && emailData.attachments.length > 0) {
      mailOptions.attachments = emailData.attachments.map(att => {
        // If content is a base64 data URL, extract the actual base64 data
        let content = att.content
        if (typeof content === 'string' && content.startsWith('data:')) {
          const base64Index = content.indexOf('base64,')
          if (base64Index !== -1) {
            content = content.substring(base64Index + 7)
          }
        }
        
        return {
          filename: att.filename,
          content: content,
          encoding: 'base64',
          contentType: att.contentType,
          cid: att.cid
        }
      })
      console.log(`📎 Added ${emailData.attachments.length} attachments to email`)
    }

      // Use MailComposer to build the MIME message properly
      console.log('About to create MailComposer instance...')
      console.log('MailComposer constructor type:', typeof MailComposer)
      
      const mail = new MailComposer(mailOptions)
      console.log('MailComposer instance created successfully')
      
      return new Promise((resolve, reject) => {
        console.log('Starting mail.compile().build()...')
        
        // Add timeout to prevent hanging
        const timeoutId = setTimeout(() => {
          console.error('MailComposer build timeout after 10 seconds')
          reject(new Error('MailComposer build timeout'))
        }, 10000)
        
        mail.compile().build((err: any, message: Buffer) => {
          clearTimeout(timeoutId)
          console.log('MailComposer build callback called, err:', !!err, 'message:', !!message)
          
          if (err) {
            console.error('Error compiling message with MailComposer:', err)
            reject(err)
            return
          }
          
          if (!message) {
            console.error('No message returned from MailComposer')
            reject(new Error('No message returned from MailComposer'))
            return
          }
          
          // Encode to base64url for Gmail API
          const encodedMessage = message
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '')
          
          console.log('✅ Message compiled successfully, length:', encodedMessage.length)
          resolve(encodedMessage)
        })
      })
    } catch (buildError) {
      console.error('Error in buildMessage:', buildError)
      throw buildError
    }
  }

  private encodeQuotedPrintable(text: string): string {
    // For HTML content, we should use base64 encoding instead
    // Gmail handles HTML better with base64
    // But for now, let's simplify the quoted-printable encoding
    
    // Replace non-ASCII characters
    let encoded = ''
    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      const code = char.charCodeAt(0)
      
      // Keep printable ASCII characters except =
      if (code >= 32 && code <= 126 && char !== '=') {
        encoded += char
      } else if (char === '\n') {
        encoded += '\r\n'
      } else if (char === '\r') {
        // Skip carriage returns (we add them with \n)
        continue
      } else {
        // Encode as =XX
        encoded += '=' + code.toString(16).toUpperCase().padStart(2, '0')
      }
    }
    
    // Add soft line breaks for long lines
    const maxLineLength = 76
    const lines = []
    let currentLine = ''
    
    for (let i = 0; i < encoded.length; i++) {
      currentLine += encoded[i]
      
      // Check if we need a soft line break
      if (currentLine.length >= maxLineLength - 1) {
        // Find a good break point (space or after punctuation)
        let breakPoint = currentLine.lastIndexOf(' ')
        if (breakPoint === -1) breakPoint = currentLine.lastIndexOf('>')
        if (breakPoint === -1) breakPoint = maxLineLength - 2
        
        lines.push(currentLine.substring(0, breakPoint) + '=')
        currentLine = currentLine.substring(breakPoint)
      }
    }
    
    // Add remaining content
    if (currentLine) {
      lines.push(currentLine)
    }
    
    return lines.join('\r\n')
  }

  async sendBulkCampaign(
    userId: string, 
    gmailAddress: string, 
    campaignId: string,
    contacts: Array<{ id: string, email: string, firstName?: string, lastName?: string, company?: string, customFields?: any }>
  ) {
    console.log('=== STARTING BULK CAMPAIGN SEND ===')
    console.log('User ID:', userId)
    console.log('Gmail Address:', gmailAddress)
    console.log('Campaign ID:', campaignId)
    console.log('Contact count:', contacts.length)
    
    // Validate inputs
    if (!userId || !gmailAddress || !campaignId || !contacts || contacts.length === 0) {
      console.error('Invalid inputs to sendBulkCampaign:', { userId, gmailAddress, campaignId, contactsLength: contacts?.length })
      throw new Error('Invalid inputs to sendBulkCampaign')
    }
    
    const results = []
    
    // Fetch user's fromName setting
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fromName: true }
    })
    
    // Send emails with rate limiting (Gmail API allows 250 quota units per second)
    for (const contact of contacts) {
      try {
        console.log(`Processing contact ${contact.id} (${contact.email})`)
        
        // Get campaign details
        const campaign = await prisma.campaign.findUnique({
          where: { id: campaignId }
        })

        if (!campaign) {
          throw new Error('Campaign not found')
        }

        console.log('Campaign details:', {
          id: campaign.id,
          subject: campaign.subject,
          trackingEnabled: campaign.trackingEnabled,
          contentLength: campaign.content?.length
        })

        // Replace variables in subject and content
        const subject = this.replaceVariables(campaign.subject, contact)
        const htmlContent = this.replaceVariables(campaign.content, contact)
        const textContent = undefined // Campaign model only has HTML content

        console.log('Original HTML content (first 200 chars):', htmlContent.substring(0, 200))

        // Generate tracking ID in the expected format: campaignId:contactId:timestamp
        const trackingData = `${campaignId}:${contact.id}:${Date.now()}`
        const trackingId = Buffer.from(trackingData).toString('base64url')
        
        console.log('Generated tracking ID:', trackingId)
        console.log('Tracking enabled?', campaign.trackingEnabled)

        // Add tracking to HTML
        let trackedHtml = htmlContent
        if (campaign.trackingEnabled) {
          console.log('CALLING addTrackingToEmail...')
          trackedHtml = await this.addTrackingToEmail(htmlContent, trackingId, userId)
          console.log('Tracked HTML (first 500 chars):', trackedHtml.substring(0, 500))
          console.log('HTML length changed from', htmlContent.length, 'to', trackedHtml.length)
        } else {
          console.log('Tracking is DISABLED, using original HTML')
        }

        // Extract embedded images as attachments to avoid size limits
        const { cleanedHtml, attachments: imageAttachments } = extractImagesAsAttachments(trackedHtml)
        console.log(`Extracted ${imageAttachments.length} images as attachments`)
        console.log('Cleaned HTML length:', cleanedHtml.length, 'vs original:', trackedHtml.length)

        // Combine image attachments with campaign file attachments
        const allAttachments: EmailAttachment[] = [...imageAttachments]
        
        // Add campaign file attachments if any
        if (campaign.attachments && Array.isArray(campaign.attachments)) {
          console.log(`Campaign has ${campaign.attachments.length} file attachments`)
          for (const attachment of campaign.attachments as any[]) {
            if (attachment.filename && attachment.content && attachment.contentType) {
              allAttachments.push({
                filename: attachment.filename,
                content: attachment.content, // Already base64 encoded
                contentType: attachment.contentType
              })
            }
          }
        }

        // Send email
        console.log('About to send email with:')
        console.log('- Subject:', subject)
        console.log('- To:', contact.email)
        console.log('- HTML content length:', cleanedHtml.length)
        console.log('- Total attachments:', allAttachments.length, `(${imageAttachments.length} images, ${allAttachments.length - imageAttachments.length} files)`)
        console.log('- HTML content (first 300):', cleanedHtml.substring(0, 300))
        
        const result = await this.sendEmail(userId, gmailAddress, {
          to: [contact.email],
          subject,
          htmlContent: cleanedHtml,
          textContent,
          fromName: user?.fromName || undefined, // Use user's configured FROM name
          replyTo: undefined, // Campaign model doesn't have replyTo field
          trackingId,
          campaignId,
          attachments: allAttachments.length > 0 ? allAttachments : undefined,
          contactId: contact.id
        })
        
        console.log('Email sent, result:', result)

        results.push({ contactId: contact.id, ...result })

        // Rate limiting - Gmail allows about 500 emails per day
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (error) {
        results.push({
          contactId: contact.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Update campaign stats
    const successCount = results.filter(r => r.success).length
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        sentCount: successCount,
        sentAt: new Date(),
        status: 'SENT'
      }
    })

    return results
  }

  private replaceVariables(text: string, contact: any): string {
    let result = text
    
    // Replace standard variables
    result = result.replace(/\{\{firstName\}\}/g, contact.firstName || '')
    result = result.replace(/\{\{lastName\}\}/g, contact.lastName || '')
    result = result.replace(/\{\{email\}\}/g, contact.email || '')
    result = result.replace(/\{\{company\}\}/g, contact.company || '')

    // Replace custom fields
    if (contact.customFields) {
      Object.entries(contact.customFields).forEach(([key, value]) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
        result = result.replace(regex, String(value))
      })
    }

    return result
  }

  private async addTrackingToEmail(html: string, trackingId: string, userId: string): Promise<string> {
    console.log('=== addTrackingToEmail CALLED ===')
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
    // Adding a random parameter to prevent Gmail from caching the pixel
    const cacheBuster = Math.random().toString(36).substring(7)
    const pixelUrl = `${baseUrl}/api/track/open/${trackingId}?cb=${cacheBuster}`
    const pixelHtml = `<img src="${pixelUrl}" width="1" height="1" style="display:none;" alt="" />`
    
    console.log('Pixel URL:', pixelUrl)
    console.log('Pixel HTML:', pixelHtml)
    
    // Write debugging info to file
    const fs = require('fs')
    const debugInfo = [
      '=== TRACKING DEBUG ===',
      `Time: ${new Date().toISOString()}`,
      `Base URL: ${baseUrl}`,
      `Tracking ID: ${trackingId}`,
      `Pixel URL: ${pixelUrl}`,
      `Original HTML length: ${html.length}`,
      `Original HTML (first 300): ${html.substring(0, 300)}`,
      ''
    ].join('\n')
    
    try {
      fs.appendFileSync('/tmp/tracking-debug.log', debugInfo)
    } catch (e) {
      console.log('Could not write debug log:', e)
    }
    
    // STEP 1: Convert plain text URLs to HTML links FIRST
    console.log('Converting plain text URLs to HTML links...')
    let trackedHtml = html
    
    // Check if content is plain text (no HTML tags)
    const hasHtmlTags = /<[^>]+>/.test(html)
    
    if (!hasHtmlTags) {
      console.log('Content appears to be plain text, converting to HTML...')
      // Convert plain text to HTML with proper structure
      // First, escape any HTML special characters except URLs
      trackedHtml = trackedHtml
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
      
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
      const convertedUrls: string[] = []
      
      trackedHtml = trackedHtml.replace(urlRegex, (match) => {
        urlsConverted++
        convertedUrls.push(`URL ${urlsConverted}: ${match} -> <a href="${match}">${match}</a>`)
        return `<a href="${match}">${match}</a>`
      })
      
      console.log(`Converted ${urlsConverted} plain text URLs to HTML links`)
      convertedUrls.forEach(url => console.log(url))
      
      // STEP 2: Ensure HTML has proper structure
      if (!trackedHtml.includes('<html') && !trackedHtml.includes('<body')) {
        trackedHtml = `<html><body>${trackedHtml}</body></html>`
      }
      
      // STEP 3: Insert pixel before closing body tag
      console.log('Before pixel insertion:', trackedHtml)
      if (trackedHtml.includes('</body>')) {
        console.log('Found </body> tag, inserting pixel before it')
        trackedHtml = trackedHtml.replace('</body>', `${pixelHtml}</body>`)
      } else {
        console.log('No </body> tag found, appending pixel to end')
        trackedHtml = trackedHtml + pixelHtml
      }
      console.log('After pixel insertion:', trackedHtml)
    }
    
    // STEP 4: Replace all HTML links for click tracking
    const linkRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1/gi
    let linkCount = 0
    const replacedLinks: string[] = []
    
    trackedHtml = trackedHtml.replace(linkRegex, (match, quote, url) => {
      // Don't track unsubscribe links
      if (url.includes('unsubscribe') || url.includes('mailto:')) {
        return match
      }
      
      linkCount++
      const trackedUrl = `${baseUrl}/api/track/click/${trackingId}?u=${encodeURIComponent(url)}`
      replacedLinks.push(`Link ${linkCount}: ${url} -> ${trackedUrl}`)
      return match.replace(url, trackedUrl)
    })
    
    // Write final result to debug log
    const finalDebug = [
      `HTML links replaced with tracking: ${linkCount}`,
      ...replacedLinks,
      `Final HTML length: ${trackedHtml.length}`,
      `Final HTML (first 500): ${trackedHtml.substring(0, 500)}`,
      '=== END TRACKING DEBUG ===\n'
    ].join('\n')
    
    try {
      fs.appendFileSync('/tmp/tracking-debug.log', finalDebug)
    } catch (e) {
      console.log('Could not write debug log:', e)
    }
    
    console.log('=== addTrackingToEmail COMPLETE ===')
    console.log('Final HTML length:', trackedHtml.length)
    console.log('Final HTML (last 200 chars):', trackedHtml.slice(-200))
    
    return trackedHtml
  }
}