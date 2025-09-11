import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { GmailClient } from '@/lib/gmail-client'

// GET /api/cron/check-replies - Cron job to check for replies
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security (skip in development)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    if (!isDevelopment && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    console.log('[CRON] Starting reply check...')
    
    // Get all users with Gmail tokens
    const gmailTokens = await prisma.gmailToken.findMany()
    
    console.log(`[CRON] Found ${gmailTokens.length} users with Gmail tokens`)
    
    let totalRepliesFound = 0
    const results = []
    
    for (const gmailToken of gmailTokens) {
      try {
        console.log(`[CRON] Checking replies for user ${gmailToken.userId} (${gmailToken.email})`)
        
        // Initialize Gmail client
        const gmailClient = new GmailClient()
        const gmail = await gmailClient.getGmailService(gmailToken.userId, gmailToken.email)
        
        // Get recent messages from INBOX
        const messages = await gmail.users.messages.list({
          userId: 'me',
          labelIds: ['INBOX'],
          q: 'newer_than:2m', // Check messages from last 2 minutes (cron runs every minute)
          maxResults: 50
        })
        
        if (!messages.data.messages || messages.data.messages.length === 0) {
          console.log(`[CRON] No new messages for ${gmailToken.email}`)
          continue
        }
        
        let userRepliesFound = 0
        
        // Check each message
        for (const message of messages.data.messages) {
          if (!message.id) continue
          
          try {
            // Get full message details
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
            
            if (!from || !threadId) continue
            
            // Extract email from "Name <email>" format
            const emailMatch = from.match(/<(.+)>/)
            const fromEmail = emailMatch ? emailMatch[1] : from
            
            // Skip if this is from the user's own email
            if (fromEmail === gmailToken.email) continue
            
            // Check for matching sequence enrollments
            const contact = await prisma.contact.findFirst({
              where: { 
                email: fromEmail,
                userId: gmailToken.userId
              }
            })
            
            if (!contact) continue
            
            // Find sequence enrollments with matching thread ID
            const sequenceEnrollments = await prisma.sequenceEnrollment.findMany({
              where: {
                gmailThreadId: threadId,
                contactId: contact.id,
                status: 'ACTIVE'
              },
              include: {
                contact: true,
                sequence: true
              }
            })
            
            // Process reply for each matching sequence enrollment
            for (const enrollment of sequenceEnrollments) {
              // Check if we've already recorded this reply in SequenceEvent
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
              
              // Also check if we have an EmailEvent for this reply
              const existingEmailEvent = await prisma.emailEvent.findFirst({
                where: {
                  type: 'REPLIED',
                  sequenceId: enrollment.sequenceId,
                  contactId: contact.id,
                  eventData: {
                    path: ['gmailMessageId'],
                    equals: message.id
                  }
                }
              })
              
              if (existingEmailEvent) continue
              
              // Get the current step index
              const stepIndex = enrollment.currentStep > 0 ? enrollment.currentStep - 1 : 0
              
              // Create BOTH SequenceEvent AND EmailEvent for reply detection
              // SequenceEvent for tracking
              await prisma.sequenceEvent.create({
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
              
              // EmailEvent for condition evaluation
              await prisma.emailEvent.create({
                data: {
                  type: 'REPLIED',
                  sequenceId: enrollment.sequenceId,
                  contactId: contact.id,
                  timestamp: new Date(),
                  eventData: {
                    gmailMessageId: message.id,
                    gmailThreadId: threadId,
                    gmailMessageIdHeader: messageId,
                    subject,
                    fromEmail,
                    date,
                    messageBody: messageBody.substring(0, 1000), // Limit size
                    inReplyTo,
                    references,
                    enrollmentId: enrollment.id,
                    stepIndex: stepIndex
                  }
                }
              })
              
              console.log(`[CRON] Created reply event for sequence ${enrollment.sequence.name}, contact ${enrollment.contact.email}`)
              
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
              
              userRepliesFound++
              totalRepliesFound++
            }
            
            // Also check for campaign recipients with matching thread ID
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
              await prisma.emailEvent.create({
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
              
              console.log(`[CRON] Created reply event for campaign ${recipient.campaign.name}, contact ${recipient.contact.email}`)
              
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
              
              userRepliesFound++
              totalRepliesFound++
            }
          } catch (error) {
            console.error(`[CRON] Error processing message ${message.id}:`, error)
            continue
          }
        }
        
        if (userRepliesFound > 0) {
          results.push({
            userId: gmailToken.userId,
            email: gmailToken.email,
            repliesFound: userRepliesFound
          })
        }
      } catch (error) {
        console.error(`[CRON] Error checking replies for user ${gmailToken.userId}:`, error)
        continue
      }
    }
    
    console.log(`[CRON] Reply check complete. Total replies found: ${totalRepliesFound}`)
    
    return NextResponse.json({
      success: true,
      message: `Reply check complete. Found ${totalRepliesFound} new replies.`,
      totalRepliesFound,
      results
    })
    
  } catch (error) {
    console.error('[CRON] Error in reply check cron job:', error)
    return NextResponse.json({ 
      error: 'Failed to check replies',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST /api/cron/check-replies - Manual trigger for testing
export async function POST(request: NextRequest) {
  return GET(request)
}