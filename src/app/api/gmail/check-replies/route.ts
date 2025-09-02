import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { GmailClient } from '@/lib/gmail-client'

// POST /api/gmail/check-replies - Manually check for replies
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get user's Gmail token
    const gmailToken = await prisma.gmailToken.findUnique({
      where: { userId: session.user.id }
    })
    
    if (!gmailToken) {
      return NextResponse.json({ 
        error: 'Gmail not connected. Please connect your Gmail account first.' 
      }, { status: 400 })
    }
    
    // Initialize Gmail client
    const gmailClient = new GmailClient()
    const gmail = await gmailClient.getGmailService(session.user.id, gmailToken.email)
    
    // Get recent messages from INBOX
    const messages = await gmail.users.messages.list({
      userId: 'me',
      labelIds: ['INBOX'],
      q: 'newer_than:1d', // Check messages from last 24 hours
      maxResults: 50
    })
    
    if (!messages.data.messages || messages.data.messages.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No new messages to check',
        repliesFound: 0
      })
    }
    
    let repliesFound = 0
    const processedReplies = []
    
    // Check each message
    for (const message of messages.data.messages) {
      if (!message.id) continue
      
      try {
        // Get full message details with metadata
        const fullMessage = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'full'
        })
        
        const headers = fullMessage.data.payload?.headers || []
        const threadId = fullMessage.data.threadId
        const inReplyTo = headers.find((h: any) => h.name === 'In-Reply-To')?.value
        const references = headers.find((h: any) => h.name === 'References')?.value
        const from = headers.find((h: any) => h.name === 'From')?.value
        const subject = headers.find((h: any) => h.name === 'Subject')?.value
        const date = headers.find((h: any) => h.name === 'Date')?.value
        const messageId = headers.find((h: any) => h.name === 'Message-ID')?.value
        
        // Extract message body
        let messageBody = ''
        const extractBody = (payload: any): string => {
          if (payload.body?.data) {
            return Buffer.from(payload.body.data, 'base64').toString('utf-8')
          }
          if (payload.parts) {
            for (const part of payload.parts) {
              if (part.mimeType === 'text/plain' && part.body?.data) {
                return Buffer.from(part.body.data, 'base64').toString('utf-8')
              }
              if (part.parts) {
                const nestedBody = extractBody(part)
                if (nestedBody) return nestedBody
              }
            }
            // If no text/plain, try text/html
            for (const part of payload.parts) {
              if (part.mimeType === 'text/html' && part.body?.data) {
                return Buffer.from(part.body.data, 'base64').toString('utf-8')
              }
            }
          }
          return ''
        }
        
        messageBody = extractBody(fullMessage.data.payload)
        
        // Log for debugging
        if (messageBody) {
          console.log('Extracted message body length:', messageBody.length)
          console.log('First 200 chars:', messageBody.substring(0, 200))
        } else {
          console.log('No message body extracted for message:', message.id)
          console.log('Payload structure:', JSON.stringify(fullMessage.data.payload?.parts?.map((p: any) => ({ 
            mimeType: p.mimeType, 
            hasBody: !!p.body?.data,
            bodySize: p.body?.size 
          })), null, 2))
        }
        
        if (!from || !threadId) continue
        
        // Extract email from "Name <email>" format
        const emailMatch = from.match(/<(.+)>/)
        const fromEmail = emailMatch ? emailMatch[1] : from
        
        // Skip if this is from the user's own email
        if (fromEmail === gmailToken.email) continue
        
        // Find recipients with matching thread ID
        const recipients = await prisma.recipient.findMany({
          where: {
            gmailThreadId: threadId,
            contact: {
              email: fromEmail
            }
          },
          include: {
            contact: true,
            campaign: true
          }
        })
        
        // Also check for sequence enrollments with matching thread ID
        const contact = await prisma.contact.findFirst({
          where: { email: fromEmail }
        })
        
        let sequenceEnrollments: any[] = []
        if (contact) {
          sequenceEnrollments = await prisma.sequenceEnrollment.findMany({
            where: {
              gmailThreadId: threadId,
              contactId: contact.id
            },
            include: {
              contact: true,
              sequence: true
            }
          })
        }
        
        if (recipients.length === 0 && sequenceEnrollments.length === 0) continue
        
        // Process reply for each matching recipient
        for (const recipient of recipients) {
          // Check if we've already recorded this reply
          const existingReply = await prisma.emailEvent.findFirst({
            where: {
              recipientId: recipient.id,
              eventType: 'REPLIED',
              eventData: {
                path: ['gmailMessageId'],
                equals: message.id
              }
            }
          })
          
          if (existingReply) continue
          
          // Create reply event
          const replyEvent = await prisma.emailEvent.create({
            data: {
              campaignId: recipient.campaignId,
              recipientId: recipient.id,
              eventType: 'REPLIED',
              eventData: {
                gmailMessageId: message.id,
                gmailThreadId: threadId,
                gmailMessageIdHeader: messageId,
                subject,
                fromEmail,
                date,
                messageBody,
                inReplyTo,
                references,
                timestamp: new Date().toISOString()
              }
            }
          })
          
          console.log('Created reply event:', {
            eventId: replyEvent.id,
            campaignId: recipient.campaignId,
            recipientId: recipient.id,
            fromEmail,
            subject,
            hasMessageBody: !!messageBody,
            messageBodyLength: messageBody?.length || 0
          })
          
          // Update recipient status if this is their first reply
          if (!recipient.repliedAt) {
            await prisma.recipient.update({
              where: { id: recipient.id },
              data: {
                repliedAt: new Date(),
                status: 'REPLIED'
              }
            })
            
            // Update campaign reply count
            await prisma.campaign.update({
              where: { id: recipient.campaignId },
              data: {
                replyCount: {
                  increment: 1
                }
              }
            })
          }
          
          repliesFound++
          processedReplies.push({
            campaignName: recipient.campaign.name,
            contactEmail: recipient.contact.email,
            subject,
            date
          })
        }
        
        // Process reply for each matching sequence enrollment
        for (const enrollment of sequenceEnrollments) {
          // Check if we've already recorded this reply
          const existingReply = await prisma.sequenceEvent.findFirst({
            where: {
              enrollmentId: enrollment.id,
              eventType: 'REPLIED',
              eventData: {
                path: ['gmailMessageId'],
                equals: message.id
              }
            }
          })
          
          if (existingReply) continue
          
          // Get the current step index (the step that sent the email being replied to)
          const stepIndex = enrollment.currentStep > 0 ? enrollment.currentStep - 1 : 0
          
          // Create sequence reply event
          const replyEvent = await prisma.sequenceEvent.create({
            data: {
              enrollmentId: enrollment.id,
              stepIndex: stepIndex,
              eventType: 'REPLIED',
              eventData: {
                gmailMessageId: message.id,
                gmailThreadId: threadId,
                gmailMessageIdHeader: messageId,
                subject,
                fromEmail,
                date,
                messageBody,
                inReplyTo,
                references,
                timestamp: new Date().toISOString()
              }
            }
          })
          
          console.log('Created sequence reply event:', {
            eventId: replyEvent.id,
            enrollmentId: enrollment.id,
            sequenceName: enrollment.sequence.name,
            stepIndex: stepIndex,
            fromEmail,
            subject,
            hasMessageBody: !!messageBody,
            messageBodyLength: messageBody?.length || 0
          })
          
          // Update enrollment reply stats
          if (!enrollment.lastRepliedAt) {
            await prisma.sequenceEnrollment.update({
              where: { id: enrollment.id },
              data: {
                lastRepliedAt: new Date(),
                replyCount: {
                  increment: 1
                }
              }
            })
          }
          
          repliesFound++
          processedReplies.push({
            sequenceName: enrollment.sequence.name,
            contactEmail: enrollment.contact.email,
            subject,
            date
          })
        }
      } catch (error) {
        console.error(`Error processing message ${message.id}:`, error)
        continue
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Checked for replies. Found ${repliesFound} new replies.`,
      repliesFound,
      replies: processedReplies
    })
    
  } catch (error) {
    console.error('Error checking for replies:', error)
    return NextResponse.json({ 
      error: 'Failed to check for replies',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}