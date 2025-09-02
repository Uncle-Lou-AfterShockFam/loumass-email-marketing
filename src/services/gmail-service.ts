import { gmail_v1 } from 'googleapis'
import { GmailClient } from '@/lib/gmail-client'
import { prisma } from '@/lib/prisma'
import { RecipientStatus } from '@prisma/client'

interface EmailData {
  to: string[]
  subject: string
  htmlContent: string
  textContent?: string
  fromName?: string
  replyTo?: string
  threadId?: string // For follow-up sequences
  trackingId: string
  campaignId?: string
  sequenceId?: string
  contactId: string
}

export class GmailService {
  private gmailClient = new GmailClient()

  async sendEmail(userId: string, gmailAddress: string, emailData: EmailData) {
    console.log('=== sendEmail CALLED ===')
    console.log('To:', emailData.to)
    console.log('Subject:', emailData.subject)
    console.log('HTML content length:', emailData.htmlContent.length)
    console.log('HTML content (first 300):', emailData.htmlContent.substring(0, 300))
    console.log('Campaign ID:', emailData.campaignId)
    console.log('Contact ID:', emailData.contactId)
    
    try {
      const gmail = await this.gmailClient.getGmailService(userId, gmailAddress)
      
      // Build email message
      console.log('About to build message...')
      const message = this.buildMessage(emailData, gmailAddress)
      console.log('Message built, length:', message.length)
      
      // Send the email
      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: message,
          threadId: emailData.threadId // For threading follow-ups
        }
      })

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
            gmailThreadId: response.data.threadId
          },
          create: {
            campaignId: emailData.campaignId,
            contactId: emailData.contactId,
            status: RecipientStatus.SENT,
            sentAt: new Date(),
            gmailMessageId: response.data.id,
            gmailThreadId: response.data.threadId
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

  private buildMessage(emailData: EmailData, fromEmail: string): string {
    console.log('=== buildMessage CALLED ===')
    console.log('HTML content length:', emailData.htmlContent.length)
    console.log('HTML content (first 200):', emailData.htmlContent.substring(0, 200))
    console.log('HTML content (last 200):', emailData.htmlContent.slice(-200))
    
    const boundary = '----=_Part_' + Math.random().toString(36).substring(2)
    
    // Build headers
    const headers = [
      `From: ${emailData.fromName || 'LOUMASS'} <${fromEmail}>`,
      `To: ${emailData.to.join(', ')}`,
      `Subject: ${emailData.subject}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`
    ]

    if (emailData.replyTo) {
      headers.push(`Reply-To: ${emailData.replyTo}`)
    }

    if (emailData.threadId) {
      // Add threading headers for follow-ups
      headers.push(`In-Reply-To: ${emailData.threadId}`)
      headers.push(`References: ${emailData.threadId}`)
    }

    // Build message parts
    const messageParts = [
      headers.join('\r\n'),
      '',
      `--${boundary}`
    ]

    // Add text content if available
    if (emailData.textContent) {
      messageParts.push(
        'Content-Type: text/plain; charset="UTF-8"',
        'Content-Transfer-Encoding: quoted-printable',
        '',
        this.encodeQuotedPrintable(emailData.textContent),
        '',
        `--${boundary}`
      )
    }

    // Add HTML content with tracking
    messageParts.push(
      'Content-Type: text/html; charset="UTF-8"',
      'Content-Transfer-Encoding: quoted-printable',
      '',
      this.encodeQuotedPrintable(emailData.htmlContent),
      '',
      `--${boundary}--`
    )

    const message = messageParts.join('\r\n')
    
    // Encode to base64url
    return Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
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
    contacts: Array<{ id: string, email: string, firstName?: string, customFields?: any }>
  ) {
    console.log('=== STARTING BULK CAMPAIGN SEND ===')
    console.log('Campaign ID:', campaignId)
    console.log('Contact count:', contacts.length)
    
    const results = []
    
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
          trackedHtml = this.addTrackingToEmail(htmlContent, trackingId)
          console.log('Tracked HTML (first 500 chars):', trackedHtml.substring(0, 500))
          console.log('HTML length changed from', htmlContent.length, 'to', trackedHtml.length)
        } else {
          console.log('Tracking is DISABLED, using original HTML')
        }

        // Send email
        console.log('About to send email with:')
        console.log('- Subject:', subject)
        console.log('- To:', contact.email)
        console.log('- HTML content length:', trackedHtml.length)
        console.log('- HTML content (first 300):', trackedHtml.substring(0, 300))
        
        const result = await this.sendEmail(userId, gmailAddress, {
          to: [contact.email],
          subject,
          htmlContent: trackedHtml,
          textContent,
          fromName: undefined, // Campaign model doesn't have fromName field
          replyTo: undefined, // Campaign model doesn't have replyTo field
          trackingId,
          campaignId,
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

  private addTrackingToEmail(html: string, trackingId: string): string {
    console.log('=== addTrackingToEmail CALLED ===')
    console.log('Input HTML length:', html.length)
    console.log('Tracking ID:', trackingId)
    
    const baseUrl = process.env.NEXT_PUBLIC_TRACKING_DOMAIN || 'https://loumassbeta.vercel.app'
    
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