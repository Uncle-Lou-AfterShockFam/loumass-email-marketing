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
        
        // Only include messages that have content and aren't the most recent
        // (the most recent is what we're replying to)
        if (i < thread.data.messages.length - 1 && (messageHtml || messageText)) {
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
          
          // Build attribution line with proper email format like Gmail
          // Extract name and email from "Name <email>" format
          let attribution = ''
          const emailMatch = from.match(/^(.+?)\s*<(.+?)>$/)
          if (emailMatch) {
            const fromName = emailMatch[1].trim()
            const fromEmail = emailMatch[2].trim()
            attribution = `On ${formattedDate} at ${formattedTime} ${fromName} <${fromEmail}> wrote:`
          } else {
            // If no angle brackets found, assume it's just an email and add them
            const emailOnly = from.trim()
            attribution = `On ${formattedDate} at ${formattedTime} ${emailOnly} <${emailOnly}> wrote:`
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