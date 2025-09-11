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
    
    // CRITICAL DEBUGGING: Catch the exact issue
    if (!emailData.messageId && emailData.threadId) {
      console.log('🚨 CRITICAL BUG DETECTED: threadId provided but NO messageId!')
      console.log('  This means sequence-service failed to pass the Message-ID')
      console.log('  Threading headers will be EMPTY - this is the root cause!')
    } else if (emailData.messageId && !emailData.messageId.includes('@')) {
      console.log('🚨 CRITICAL BUG DETECTED: Invalid messageId format:', emailData.messageId)
      console.log('  This looks like a thread ID, not a Message-ID')
      console.log('  Threading headers will be INVALID!')
    } else if (emailData.messageId) {
      console.log('✅ GOOD: Valid messageId provided for threading:', emailData.messageId)
    }
    
    try {
      // Attempt to get Gmail service (with automatic token refresh if needed)
      const gmail = await this.gmailClient.getGmailService(userId, gmailAddress)
      
      // CRITICAL FIX: Add tracking to sequences (not just campaigns)
      if (emailData.trackingId && emailData.htmlContent) {
        console.log('🔍 SEQUENCE TRACKING: Adding tracking to email')
        console.log('  Tracking ID:', emailData.trackingId)
        console.log('  Original HTML length:', emailData.htmlContent.length)
        
        // Add tracking pixels and tracked links
        emailData.htmlContent = await this.addTrackingToEmail(
          emailData.htmlContent, 
          emailData.trackingId, 
          userId
        )
        
        console.log('  Tracked HTML length:', emailData.htmlContent.length)
        console.log('✅ Tracking added to sequence email')
      }
      
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
        recipientId,
        messageIdHeader // CRITICAL: Return the actual Message-ID header for threading
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
      // CRITICAL FIX: Prepare threading headers BEFORE creating mailOptions
      let threadingHeaders: any = {}
      let formattedMessageId: string | undefined
      
      if (emailData.messageId && emailData.messageId.includes('@')) {
        console.log('🔗 PREPARING THREADING HEADERS:')
        console.log('  Original Message-ID:', emailData.messageId)
        
        // Format Message-ID with angle brackets
        formattedMessageId = emailData.messageId.trim()
        if (!formattedMessageId.startsWith('<')) {
          formattedMessageId = '<' + formattedMessageId
        }
        if (!formattedMessageId.endsWith('>')) {
          formattedMessageId = formattedMessageId + '>'
        }
        
        console.log('  Formatted Message-ID:', formattedMessageId)
        
        // Set threading headers
        threadingHeaders = {
          'In-Reply-To': formattedMessageId,
          'References': formattedMessageId
        }
        
        console.log('✅ Threading headers prepared:', JSON.stringify(threadingHeaders))
      }
      
      // Create mail options for MailComposer WITH threading built-in
      console.log('Creating mailOptions object...')
      const displayName = emailData.fromName || ''
      
      // CRITICAL: Include ALL properties at creation time
      const mailOptions: any = {
        from: displayName ? `${displayName} <${fromEmail}>` : fromEmail,
        to: emailData.to.join(', '),
        subject: emailData.subject,
        text: emailData.textContent || '',
        html: emailData.htmlContent,
        textEncoding: 'base64',
        // CRITICAL: Set threading properties at creation time if we have them
        ...(formattedMessageId ? {
          inReplyTo: formattedMessageId,
          references: formattedMessageId,
          headers: threadingHeaders
        } : {})
      }
      
      console.log('📧 FINAL mailOptions object created:')
      console.log('  - FROM:', mailOptions.from)
      console.log('  - TO:', mailOptions.to)
      console.log('  - SUBJECT:', mailOptions.subject)
      console.log('  - Has inReplyTo:', !!mailOptions.inReplyTo)
      console.log('  - Has references:', !!mailOptions.references)
      console.log('  - Has headers:', !!mailOptions.headers)
      if (mailOptions.headers) {
        console.log('  - Headers content:', JSON.stringify(mailOptions.headers))
      }
      
      // FINAL SAFETY CHECK: Ensure threading headers are properly set
      if (emailData.messageId && !mailOptions.inReplyTo) {
        console.error('❌ CRITICAL ERROR: messageId provided but headers NOT set!')
        console.error('  - emailData.messageId:', emailData.messageId)
        console.error('  - Contains @:', emailData.messageId?.includes('@'))
        console.error('  - formattedMessageId:', formattedMessageId)
        console.error('  - This email will NOT thread properly!')
        console.error('  - Root cause: buildMessage threading logic failed')
      } else if (emailData.messageId && mailOptions.inReplyTo) {
        console.log('✅ THREADING SUCCESS: Headers properly set for Message-ID:', emailData.messageId)
        console.log('  - inReplyTo:', mailOptions.inReplyTo)
        console.log('  - references:', mailOptions.references)
      } else if (!emailData.messageId) {
        console.log('ℹ️ NO THREADING: No messageId provided (this is normal for first emails)')
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
      
      // DEBUG: Log the exact mailOptions being passed
      console.log('📋 FINAL mailOptions passed to MailComposer:')
      console.log(JSON.stringify({
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject,
        inReplyTo: mailOptions.inReplyTo,
        references: mailOptions.references,
        headers: mailOptions.headers,
        replyTo: mailOptions.replyTo,
        hasText: !!mailOptions.text,
        hasHtml: !!mailOptions.html,
        attachmentCount: mailOptions.attachments?.length || 0
      }, null, 2))
      
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
          const messageString = message.toString()
          
          // DEBUG: Log the first 1500 chars of the raw message to see headers
          console.log('📧 RAW MIME MESSAGE (first 1500 chars):')
          console.log(messageString.substring(0, 1500))
          console.log('...[truncated]')
          
          // Check if threading headers are present
          const hasInReplyTo = messageString.includes('In-Reply-To:')
          const hasReferences = messageString.includes('References:')
          console.log('🔍 HEADER CHECK:')
          console.log('  - Has In-Reply-To header:', hasInReplyTo)
          console.log('  - Has References header:', hasReferences)
          
          if (!hasInReplyTo && mailOptions.inReplyTo) {
            console.error('❌ CRITICAL: In-Reply-To was set but not in MIME message!')
            console.error('  Expected:', mailOptions.inReplyTo)
          }
          if (!hasReferences && mailOptions.references) {
            console.error('❌ CRITICAL: References was set but not in MIME message!')
            console.error('  Expected:', mailOptions.references)
          }
          
          const encodedMessage = Buffer.from(messageString)
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

  /**
   * Strip existing tracking from quoted content to prevent double/triple tracking
   * This is critical for standalone sequences that reply to tracked emails
   */
  private stripTrackingFromQuotedContent(html: string): string {
    console.log('[Tracking] PRODUCTION DEBUG: stripTrackingFromQuotedContent called')
    console.log(`[Tracking] PRODUCTION DEBUG: Input HTML length: ${html.length}`)
    console.log(`[Tracking] PRODUCTION DEBUG: Input has gmail_quote: ${html.includes('gmail_quote')}`)
    
    // PRODUCTION SAFETY: Return original if content too small
    if (html.length < 50) {
      console.log('[Tracking] PRODUCTION SAFETY: HTML too small, returning original')
      return html
    }
    
    // Find gmail_quote section
    const quoteStartRegex = /<(?:div|blockquote)[^>]*class="gmail_quote[^"]*"[^>]*>/i
    const quoteMatch = html.match(quoteStartRegex)
    
    if (!quoteMatch) {
      // No quoted section found
      console.log('[Tracking] PRODUCTION DEBUG: No gmail_quote found, returning original')
      return html
    }
    
    // Split content at quote boundary
    const quoteIndex = html.indexOf(quoteMatch[0])
    const mainContent = html.substring(0, quoteIndex)
    let quotedContent = html.substring(quoteIndex)
    
    console.log('[Tracking] Stripping tracking from quoted content')
    console.log(`[Tracking] Quote starts at index ${quoteIndex}`)
    console.log(`[Tracking] PRODUCTION DEBUG: Main content length: ${mainContent.length}`)
    console.log(`[Tracking] PRODUCTION DEBUG: Quoted content length: ${quotedContent.length}`)
    
    // PRODUCTION SAFETY: Validate split worked correctly
    if (mainContent.length + quotedContent.length !== html.length) {
      console.error('[Tracking] PRODUCTION ERROR: Split failed, content length mismatch!')
      console.error(`[Tracking] Original: ${html.length}, Main: ${mainContent.length}, Quoted: ${quotedContent.length}`)
      return html // Return original on error
    }
    
    // Count tracking before stripping
    const trackingBefore = (quotedContent.match(/\/api\/track\/click\//g) || []).length
    const pixelsBefore = (quotedContent.match(/\/api\/track\/open\//g) || []).length
    console.log(`[Tracking] Found ${trackingBefore} tracked links and ${pixelsBefore} pixels in quoted content`)
    
    // PRODUCTION SAFETY: Only strip if tracking found
    if (trackingBefore === 0 && pixelsBefore === 0) {
      console.log('[Tracking] PRODUCTION DEBUG: No tracking found, returning original')
      return html
    }
    
    const originalQuotedLength = quotedContent.length
    
    // 1. Remove ALL tracking pixels from quoted content
    quotedContent = quotedContent.replace(
      /<img[^>]*\/api\/track\/open\/[^>]*>/gi,
      ''
    )
    
    // 2. Replace tracked links with original URLs
    const linkRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1/gi
    quotedContent = quotedContent.replace(linkRegex, (match, quote, url) => {
      // Check if this is a tracking URL
      const trackingMatch = url.match(/\/api\/track\/click\/[^?]+\?u=(.+)/)
      if (trackingMatch) {
        // Decode the original URL
        try {
          const originalUrl = decodeURIComponent(trackingMatch[1])
          console.log(`[Tracking] Reverting tracked URL to: ${originalUrl}`)
          return match.replace(url, originalUrl)
        } catch (e) {
          console.log('[Tracking] Failed to decode tracked URL, keeping as-is')
          return match
        }
      }
      return match
    })
    
    // Count tracking after stripping
    const trackingAfter = (quotedContent.match(/\/api\/track\/click\//g) || []).length
    const pixelsAfter = (quotedContent.match(/\/api\/track\/open\//g) || []).length
    console.log(`[Tracking] After stripping: ${trackingAfter} tracked links and ${pixelsAfter} pixels remain`)
    
    // PRODUCTION SAFETY: Check if content was damaged
    if (quotedContent.length < originalQuotedLength / 2) {
      console.error('[Tracking] PRODUCTION ERROR: Too much content removed, returning original!')
      console.error(`[Tracking] Original quoted: ${originalQuotedLength}, After stripping: ${quotedContent.length}`)
      return html
    }
    
    // Recombine
    const result = mainContent + quotedContent
    console.log(`[Tracking] PRODUCTION DEBUG: Final result length: ${result.length}`)
    console.log(`[Tracking] PRODUCTION DEBUG: Result has gmail_quote: ${result.includes('gmail_quote')}`)
    
    return result
  }

  private async addTrackingToEmail(html: string, trackingId: string, userId: string): Promise<string> {
    console.log('=== addTrackingToEmail CALLED ===')
    console.log('Input HTML length:', html.length)
    console.log('Tracking ID:', trackingId)
    console.log('PRODUCTION DEBUG: Input has gmail_quote:', html.includes('gmail_quote'))
    
    // PRODUCTION SAFETY: Return original if content too small or missing
    if (!html || html.length < 10) {
      console.log('PRODUCTION SAFETY: HTML too small or empty, returning original')
      return html
    }
    
    const originalHtml = html
    const originalLength = html.length
    const originalHasQuote = html.includes('gmail_quote')
    
    // CRITICAL FIX: Strip any existing tracking from quoted content FIRST
    // This prevents double/triple tracking when replying to tracked emails
    html = this.stripTrackingFromQuotedContent(html)
    console.log('HTML after stripping quoted tracking:', html.length)
    console.log('PRODUCTION DEBUG: After stripping has gmail_quote:', html.includes('gmail_quote'))
    
    // PRODUCTION SAFETY: Check if stripping damaged content
    if (html.length < originalLength / 3) {
      console.error('PRODUCTION ERROR: Too much content removed by stripping, reverting!')
      console.error(`Original: ${originalLength}, After stripping: ${html.length}`)
      html = originalHtml
    }
    
    // PRODUCTION SAFETY: Ensure gmail_quote is preserved
    if (originalHasQuote && !html.includes('gmail_quote')) {
      console.error('PRODUCTION ERROR: gmail_quote content lost during stripping!')
      console.log('PRODUCTION FALLBACK: Reverting to original content')
      html = originalHtml
    }
    
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
      // PRODUCTION FIX: Better environment detection and URL handling
      const nextPublicBaseUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim()
      const vercelUrl = process.env.VERCEL_URL?.trim()
      const isProduction = process.env.NODE_ENV === 'production'
      
      if (nextPublicBaseUrl) {
        baseUrl = nextPublicBaseUrl
        console.log('Using NEXT_PUBLIC_BASE_URL:', baseUrl)
      } else if (vercelUrl && isProduction) {
        baseUrl = `https://${vercelUrl}`
        console.log('Using VERCEL_URL for production:', baseUrl)
      } else if (isProduction) {
        baseUrl = 'https://loumassbeta.vercel.app'
        console.log('Using fallback production URL:', baseUrl)
      } else {
        baseUrl = 'http://localhost:3000'
        console.log('Using development URL:', baseUrl)
      }
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
      
      // Convert line breaks to HTML breaks
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
      // DON'T show the original URL text when converting - just make it a clickable link
      const urlRegex = /(?<!<[^>]*)(https?:\/\/[^\s<>'"]+)/gi
      let urlsConverted = 0
      const convertedUrls: string[] = []
      
      trackedHtml = trackedHtml.replace(urlRegex, (match) => {
        urlsConverted++
        // Keep displaying the URL as the link text (it will be tracked later)
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
    
    // STEP 4: Replace all HTML links for click tracking - BUT NOT IN QUOTED SECTIONS
    // Find the gmail_quote section and only track links BEFORE it
    const quoteStartRegex = /<(?:div|blockquote)[^>]*class="gmail_quote[^"]*"[^>]*>/i
    const quoteMatch = trackedHtml.match(quoteStartRegex)
    
    let linkCount = 0
    const replacedLinks: string[] = []
    
    if (quoteMatch) {
      // Found quoted section - split the email
      const quoteIndex = trackedHtml.indexOf(quoteMatch[0])
      const mainContent = trackedHtml.substring(0, quoteIndex)
      const quotedContent = trackedHtml.substring(quoteIndex)
      
      console.log(`[Tracking] Found quoted section at index ${quoteIndex}`)
      console.log(`[Tracking] Main content length: ${mainContent.length}`)
      console.log(`[Tracking] Quoted content length: ${quotedContent.length}`)
      
      // Only track links in main content
      const linkRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1/gi
      const trackedMain = mainContent.replace(linkRegex, (match, quote, url) => {
        // Skip if already tracked
        if (url.includes('/api/track/click/')) {
          console.log(`[Tracking] Skipping already tracked URL: ${url.substring(0, 50)}...`)
          return match
        }
        
        // Don't track unsubscribe or mailto links
        if (url.includes('unsubscribe') || url.includes('mailto:')) {
          return match
        }
        
        linkCount++
        const trackedUrl = `${baseUrl}/api/track/click/${trackingId}?u=${encodeURIComponent(url)}`
        replacedLinks.push(`Link ${linkCount}: ${url} -> ${trackedUrl}`)
        console.log(`[Tracking] Tracking link ${linkCount}: ${url.substring(0, 50)}...`)
        return match.replace(url, trackedUrl)
      })
      
      // Recombine with untracked quoted content
      trackedHtml = trackedMain + quotedContent
      console.log(`[Tracking] Skipped tracking in quoted section`)
    } else {
      // No quoted section - track all links
      console.log(`[Tracking] No quoted section found, tracking all links`)
      const linkRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1/gi
      trackedHtml = trackedHtml.replace(linkRegex, (match, quote, url) => {
        // Skip if already tracked
        if (url.includes('/api/track/click/')) {
          console.log(`[Tracking] Skipping already tracked URL: ${url.substring(0, 50)}...`)
          return match
        }
        
        // Don't track unsubscribe or mailto links
        if (url.includes('unsubscribe') || url.includes('mailto:')) {
          return match
        }
        
        linkCount++
        const trackedUrl = `${baseUrl}/api/track/click/${trackingId}?u=${encodeURIComponent(url)}`
        replacedLinks.push(`Link ${linkCount}: ${url} -> ${trackedUrl}`)
        console.log(`[Tracking] Tracking link ${linkCount}: ${url.substring(0, 50)}...`)
        return match.replace(url, trackedUrl)
      })
    }
    
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
    console.log('PRODUCTION DEBUG: Final result has gmail_quote:', trackedHtml.includes('gmail_quote'))
    
    // FINAL PRODUCTION SAFETY CHECK
    if (originalHasQuote && !trackedHtml.includes('gmail_quote')) {
      console.error('CRITICAL PRODUCTION ERROR: gmail_quote lost during tracking process!')
      console.error(`Original had quote: ${originalHasQuote}, Final has quote: ${trackedHtml.includes('gmail_quote')}`)
      console.log('EMERGENCY FALLBACK: Using original HTML to preserve thread history')
      return originalHtml
    }
    
    // FINAL LENGTH SAFETY CHECK  
    if (trackedHtml.length < originalLength / 4) {
      console.error('CRITICAL PRODUCTION ERROR: Too much content lost during tracking!')
      console.error(`Original: ${originalLength}, Final: ${trackedHtml.length}`)
      console.log('EMERGENCY FALLBACK: Using original HTML')
      return originalHtml
    }
    
    return trackedHtml
  }

  /**
   * Get the last message content from a Gmail thread
   * This fetches the ACTUAL sent email content, not templates
   */
  async getThreadLastMessage(userId: string, threadId: string): Promise<{ htmlContent: string; textContent: string; from: string; date: Date } | null> {
    try {
      console.log(`[GmailService] Fetching thread ${threadId} for quoting`)
      
      // Get user's gmail token
      const gmailToken = await prisma.gmailToken.findUnique({
        where: { userId }
      })
      
      if (!gmailToken) {
        console.error('[GmailService] No Gmail token found for user')
        return null
      }
      
      // Get Gmail service
      const gmail = await this.gmailClient.getGmailService(userId, gmailToken.email)
      
      // Fetch the thread
      const thread = await gmail.users.threads.get({
        userId: 'me',
        id: threadId,
        format: 'full'
      })
      
      if (!thread.data.messages || thread.data.messages.length === 0) {
        console.log('[GmailService] No messages in thread')
        return null
      }
      
      // Get the last message (most recent)
      const lastMessage = thread.data.messages[thread.data.messages.length - 1]
      console.log(`[GmailService] Found last message: ${lastMessage.id}`)
      
      // Extract the sender
      const fromHeader = lastMessage.payload?.headers?.find((h: any) => h.name?.toLowerCase() === 'from')
      const from = fromHeader?.value || 'Unknown Sender'
      
      // Extract the date
      const dateHeader = lastMessage.payload?.headers?.find((h: any) => h.name?.toLowerCase() === 'date')
      const date = dateHeader?.value ? new Date(dateHeader.value) : new Date()
      
      // Extract message content
      let htmlContent = ''
      let textContent = ''
      
      // Helper function to extract content from message parts
      const extractContent = (parts: any[]): void => {
        for (const part of parts) {
          if (part.mimeType === 'text/html' && part.body?.data) {
            // Decode base64 HTML content
            htmlContent = Buffer.from(part.body.data, 'base64').toString('utf-8')
          } else if (part.mimeType === 'text/plain' && part.body?.data) {
            // Decode base64 text content
            textContent = Buffer.from(part.body.data, 'base64').toString('utf-8')
          } else if (part.parts) {
            // Recursive for multipart messages
            extractContent(part.parts)
          }
        }
      }
      
      // Check if message has parts (multipart)
      if (lastMessage.payload?.parts) {
        extractContent(lastMessage.payload.parts)
      } else if (lastMessage.payload?.body?.data) {
        // Single part message
        const content = Buffer.from(lastMessage.payload.body.data, 'base64').toString('utf-8')
        if (lastMessage.payload.mimeType === 'text/html') {
          htmlContent = content
        } else {
          textContent = content
        }
      }
      
      console.log(`[GmailService] Extracted content - HTML: ${htmlContent.length} chars, Text: ${textContent.length} chars`)
      
      return {
        htmlContent,
        textContent,
        from,
        date
      }
    } catch (error) {
      console.error('[GmailService] Error fetching thread:', error)
      return null
    }
  }

  /**
   * Get ALL messages from a Gmail thread for including full conversation history
   * This fetches the entire thread history like Gmail does by default
   */
  async getFullThreadHistory(userId: string, threadId: string): Promise<{ htmlContent: string; textContent: string } | null> {
    try {
      console.log(`[GmailService] Fetching full thread history for ${threadId}`)
      
      // CRITICAL: Validate that this is a real Gmail thread ID
      // Real Gmail thread IDs are hexadecimal strings like "19931fea6baa1065"
      // Fake thread IDs look like "thread-1757430840066"
      if (threadId.startsWith('thread-') || threadId.includes('test-') || !threadId.match(/^[0-9a-fA-F]+$/)) {
        console.error(`[GmailService] REJECTING FAKE THREAD ID: ${threadId}`)
        console.error(`[GmailService] Real Gmail thread IDs are hexadecimal strings, not fake IDs`)
        return null
      }
      
      // Get user's gmail token
      const gmailToken = await prisma.gmailToken.findUnique({
        where: { userId }
      })
      
      if (!gmailToken) {
        console.error('[GmailService] No Gmail token found for user')
        return null
      }
      
      // Get Gmail service with retry logic
      let gmail = await this.gmailClient.getGmailService(userId, gmailToken.email)
      let thread
      
      try {
        // First attempt to fetch the thread
        thread = await gmail.users.threads.get({
          userId: 'me',
          id: threadId,
          format: 'full'
        })
      } catch (fetchError: any) {
        console.log('❌ First thread fetch attempt failed:', fetchError?.message)
        
        // Check if it's a token-related error
        if (fetchError?.code === 401 || fetchError?.message?.includes('Invalid Credentials')) {
          console.log('🔄 Token error detected, refreshing and retrying thread fetch...')
          
          // Force token refresh and retry
          const refreshedGmail = await this.gmailClient.getGmailService(userId, gmailToken.email)
          thread = await refreshedGmail.users.threads.get({
            userId: 'me',
            id: threadId,
            format: 'full'
          })
          console.log('✅ Thread fetch retry after token refresh succeeded')
        } else {
          // Re-throw non-token errors
          throw fetchError
        }
      }
      
      if (!thread.data.messages || thread.data.messages.length === 0) {
        console.log('[GmailService] No messages in thread')
        return null
      }
      
      console.log(`[GmailService] Found ${thread.data.messages.length} messages in thread`)
      
      // Build the complete thread history
      let fullHtmlContent = ''
      let fullTextContent = ''
      
      // Helper function to extract content from message parts
      const extractContent = (parts: any[]): { html: string; text: string } => {
        let html = ''
        let text = ''
        
        for (const part of parts) {
          if (part.mimeType === 'text/html' && part.body?.data) {
            html = Buffer.from(part.body.data, 'base64').toString('utf-8')
          } else if (part.mimeType === 'text/plain' && part.body?.data) {
            text = Buffer.from(part.body.data, 'base64').toString('utf-8')
          } else if (part.parts) {
            const nested = extractContent(part.parts)
            html = html || nested.html
            text = text || nested.text
          }
        }
        
        return { html, text }
      }
      
      // Process all messages in chronological order (oldest to newest)
      // Start from the most recent and work backwards to build the nested structure
      for (let i = thread.data.messages.length - 1; i >= 0; i--) {
        const message = thread.data.messages[i]
        
        // Extract headers
        const fromHeader = message.payload?.headers?.find((h: any) => h.name?.toLowerCase() === 'from')
        const from = fromHeader?.value || 'Unknown Sender'
        
        const dateHeader = message.payload?.headers?.find((h: any) => h.name?.toLowerCase() === 'date')
        const date = dateHeader?.value ? new Date(dateHeader.value) : new Date()
        
        // Extract message content
        let messageHtml = ''
        let messageText = ''
        
        if (message.payload?.parts) {
          const content = extractContent(message.payload.parts)
          messageHtml = content.html
          messageText = content.text
        } else if (message.payload?.body?.data) {
          const content = Buffer.from(message.payload.body.data, 'base64').toString('utf-8')
          if (message.payload.mimeType === 'text/html') {
            messageHtml = content
          } else {
            messageText = content
          }
        }
        
        // Include all messages that have content
        // When composing a reply, we want to include ALL previous messages in the thread
        if ((messageHtml || messageText)) {
          // Format date like Gmail
          const formattedDate = date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            timeZone: 'America/New_York'
          })
          
          const formattedTime = date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: 'America/New_York'
          }).replace(' ', ' ')
          
          // Build attribution line EXACTLY like Gmail does
          // Extract name and email from "Name <email>" format
          let attribution = ''
          const emailMatch = from.match(/^(.+?)\s*<(.+?)>$/)
          if (emailMatch) {
            const fromName = emailMatch[1].trim()
            const fromEmail = emailMatch[2].trim()
            // Gmail format: "On [Date] at [Time] Name <email> wrote:"
            attribution = `On ${formattedDate} at ${formattedTime} ${fromName} <${fromEmail}> wrote:`
          } else {
            // If it's just a plain name or email without angle brackets
            const trimmedFrom = from.trim()
            
            // Try to find the email address from other headers
            const senderHeader = message.payload?.headers?.find((h: any) => h.name?.toLowerCase() === 'sender')
            const returnPathHeader = message.payload?.headers?.find((h: any) => h.name?.toLowerCase() === 'return-path')
            const replyToHeader = message.payload?.headers?.find((h: any) => h.name?.toLowerCase() === 'reply-to')
            
            // Debug logging
            console.log(`[GmailService] Attribution debug for message ${i}:`)
            console.log(`  From header: ${from}`)
            console.log(`  Sender header: ${senderHeader?.value}`)
            console.log(`  Return-Path header: ${returnPathHeader?.value}`)
            console.log(`  Reply-To header: ${replyToHeader?.value}`)
            
            // Try to find the email address
            let emailAddress = ''
            if (trimmedFrom.includes('@')) {
              // It's already an email address
              emailAddress = trimmedFrom
            } else {
              // Try to extract from other headers
              // Often, when From header just has a name, the email is in Sender or Return-Path
              if (senderHeader?.value) {
                const senderMatch = senderHeader.value.match(/<(.+?)>/) || senderHeader.value.match(/([^\s]+@[^\s]+)/)
                if (senderMatch) emailAddress = senderMatch[1].trim()
              }
              if (!emailAddress && returnPathHeader?.value) {
                const returnMatch = returnPathHeader.value.match(/<(.+?)>/) || returnPathHeader.value.match(/([^\s]+@[^\s]+)/)
                if (returnMatch) emailAddress = returnMatch[1].trim()
              }
              if (!emailAddress && replyToHeader?.value) {
                const replyMatch = replyToHeader.value.match(/<(.+?)>/) || replyToHeader.value.match(/([^\s]+@[^\s]+)/)
                if (replyMatch) emailAddress = replyMatch[1].trim()
              }
              
              // As a last resort, check if the from field is in format "name@domain" without spaces
              if (!emailAddress && trimmedFrom.match(/^[^\s]+@[^\s]+$/)) {
                emailAddress = trimmedFrom
              }
            }
            
            console.log(`  Extracted email: ${emailAddress}`)
            
            // Build the attribution
            if (emailAddress) {
              // If we have an email, always include it in angle brackets
              if (trimmedFrom === emailAddress) {
                // Just the email address
                attribution = `On ${formattedDate} at ${formattedTime} ${emailAddress} <${emailAddress}> wrote:`
              } else if (trimmedFrom.includes('@')) {
                // Email without name
                attribution = `On ${formattedDate} at ${formattedTime} ${trimmedFrom} <${trimmedFrom}> wrote:`
              } else {
                // Name with email from other headers
                attribution = `On ${formattedDate} at ${formattedTime} ${trimmedFrom} <${emailAddress}> wrote:`
              }
            } else {
              // No email found, just use the name (shouldn't happen in real Gmail threads)
              console.warn(`[GmailService] No email found for sender: ${trimmedFrom}`)
              attribution = `On ${formattedDate} at ${formattedTime} ${trimmedFrom} wrote:`
            }
          }
          
          // Fix any missing email addresses in existing attribution lines within the message
          // This handles cases where Gmail has already quoted content but without email addresses
          if (messageHtml) {
            // Extract the current message's email for potential reuse
            let currentFromEmail = ''
            const currentEmailMatch = from.match(/<(.+?)>/)
            if (currentEmailMatch) {
              currentFromEmail = currentEmailMatch[1].trim()
            } else if (from.includes('@')) {
              currentFromEmail = from.trim()
            } else {
              // Try other headers for current message - reuse the headers we already found
              const msgSenderHeader = message.payload?.headers?.find((h: any) => h.name?.toLowerCase() === 'sender')
              const msgReturnPathHeader = message.payload?.headers?.find((h: any) => h.name?.toLowerCase() === 'return-path')
              const senderVal = msgSenderHeader?.value
              const returnVal = msgReturnPathHeader?.value
              if (senderVal) {
                const match = senderVal.match(/<(.+?)>/) || senderVal.match(/([^\s]+@[^\s]+)/)
                if (match) currentFromEmail = match[1].trim()
              } else if (returnVal) {
                const match = returnVal.match(/<(.+?)>/) || returnVal.match(/([^\s]+@[^\s]+)/)
                if (match) currentFromEmail = match[1].trim()
              }
            }
            
            // IMPORTANT: Fix attribution BEFORE any tracking is applied
            // First, remove any tracking from quoted content to prevent double-tracking
            messageHtml = messageHtml.replace(
              /href="[^"]*\/api\/track\/click\/[^"]*\?u=([^"]+)"/gi,
              (match, encodedUrl) => {
                try {
                  const originalUrl = decodeURIComponent(encodedUrl)
                  console.log(`[GmailService] Removing tracking from quoted URL: ${originalUrl}`)
                  return `href="${originalUrl}"`
                } catch (e) {
                  return match
                }
              }
            )
            
            // Fix existing Gmail attribution lines that are missing email addresses
            // These come from Gmail's own quote formatting
            // Look for patterns in gmail_attr divs: "On Thu, Sep 11, 2025 at 12:51 AM Louis Piotti  wrote:"
            // Notice the double space after the name - that's where the email should be
            messageHtml = messageHtml.replace(
              /(<div[^>]*class="gmail_attr"[^>]*>)([\s\S]*?)(<\/div>)/gi,
              (match, divStart, content, divEnd) => {
                // Remove any HTML tags from content for pattern matching
                const plainContent = content.replace(/<[^>]+>/g, '').trim()
                
                // Check if this is an attribution line
                // Match pattern: "On [date] at [time] [name] wrote:"
                const attrMatch = plainContent.match(/^On\s+(.+?)\s+at\s+(\d{1,2}:\d{2}\s*[AP]M)\s+(.+?)\s+wrote:$/i)
                if (!attrMatch) {
                  return match // Not an attribution line
                }
                
                const dateStr = attrMatch[1]
                const time = attrMatch[2]
                const nameSection = attrMatch[3].trim()
                
                // Check if it already has email in angle brackets
                if (nameSection.includes('<') && nameSection.includes('>')) {
                  return match // Already formatted correctly
                }
                
                console.log(`[GmailService] Found Gmail attribution without email: "${plainContent}"`)
                
                // For Louis Piotti, we know the email
                if (nameSection === 'Louis Piotti' || nameSection.toLowerCase() === 'louis piotti') {
                  console.log(`  Adding email for Louis Piotti: ljpiotti@aftershockfam.org`)
                  return `${divStart}On ${dateStr} at ${time} ${nameSection} &lt;<a href="mailto:ljpiotti@aftershockfam.org">ljpiotti@aftershockfam.org</a>&gt; wrote:${divEnd}`
                }
                
                // If we can detect it's the same person as the current from
                const currentFromName = from.split('<')[0].trim()
                if (nameSection === currentFromName && currentFromEmail) {
                  console.log(`  Matched current sender, adding email: ${currentFromEmail}`)
                  return `${divStart}On ${dateStr} at ${time} ${nameSection} &lt;<a href="mailto:${currentFromEmail}">${currentFromEmail}</a>&gt; wrote:${divEnd}`
                }
                
                console.log(`  Could not determine email for: ${nameSection}`)
                return match // Can't fix it, leave as is
              }
            )
            
            // Also fix attribution lines that aren't in gmail_attr divs
            // Match both formats: "On Thu, Sep 11, 2025 at" and "On Wed, Sep 10, 2025 at"
            messageHtml = messageHtml.replace(
              /On\s+(.+?)\s+at\s+(\d{1,2}:\d{2}\s+[AP]M)\s+([^<\n]+?)\s+wrote:/gi,
              (match, dateStr, time, name) => {
                const cleanName = name.trim()
                // Check if it already has email in angle brackets
                if (cleanName.includes('<') && cleanName.includes('>')) {
                  return match // Already formatted correctly
                }
                
                // Try to find the email for this person
                console.log(`[GmailService] Found attribution without email: "${match}"`)
                console.log(`  Date: ${dateStr}, Time: ${time}, Name: ${cleanName}`)
                
                // If we can detect it's the same person as the current from
                const currentFromName = from.split('<')[0].trim()
                if (cleanName === currentFromName && currentFromEmail) {
                  console.log(`  Matched current sender, adding email: ${currentFromEmail}`)
                  return `On ${dateStr} at ${time} ${cleanName} <${currentFromEmail}> wrote:`
                }
                
                // As a fallback for common names, try to guess the email
                // This is a simple heuristic - in production you'd look up the contact
                if (cleanName.toLowerCase() === 'louis piotti' || cleanName === 'Louis Piotti') {
                  // Based on the context, this is likely Louis Piotti's email
                  console.log(`  Matched Louis Piotti, adding email: ljpiotti@aftershockfam.org`)
                  return `On ${dateStr} at ${time} ${cleanName} <ljpiotti@aftershockfam.org> wrote:`
                }
                
                console.log(`  Could not find email for: ${cleanName}`)
                return match // Can't fix it, leave as is
              }
            )
          }
          
          // Build the quoted content with proper nesting
          const quotedHtml = `<div class="gmail_quote gmail_quote_container">
  <div dir="ltr" class="gmail_attr">${attribution}<br></div>
  <blockquote class="gmail_quote" style="margin:0px 0px 0px 0.8ex;border-left:1px solid rgb(204,204,204);padding-left:1ex">
    ${messageHtml}${fullHtmlContent ? '\n' + fullHtmlContent : ''}
  </blockquote>
</div>`
          
          fullHtmlContent = quotedHtml
          
          // For text version
          const quotedText = `${attribution}\n> ${messageText.split('\n').join('\n> ')}${fullTextContent ? '\n>\n> ' + fullTextContent.split('\n').join('\n> ') : ''}`
          fullTextContent = quotedText
        }
      }
      
      console.log(`[GmailService] Built full thread history - HTML: ${fullHtmlContent.length} chars`)
      
      return {
        htmlContent: fullHtmlContent,
        textContent: fullTextContent
      }
    } catch (error) {
      console.error('[GmailService] Error fetching full thread history:', error)
      return null
    }
  }
}