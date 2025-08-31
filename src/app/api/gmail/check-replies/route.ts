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
        // Get full message details
        const fullMessage = await gmail.users.messages.get({
          userId: 'me',
          id: message.id
        })
        
        const headers = fullMessage.data.payload?.headers || []
        const threadId = fullMessage.data.threadId
        const inReplyTo = headers.find((h: any) => h.name === 'In-Reply-To')?.value
        const references = headers.find((h: any) => h.name === 'References')?.value
        const from = headers.find((h: any) => h.name === 'From')?.value
        const subject = headers.find((h: any) => h.name === 'Subject')?.value
        const date = headers.find((h: any) => h.name === 'Date')?.value
        
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
        
        if (recipients.length === 0) continue
        
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
          await prisma.emailEvent.create({
            data: {
              campaignId: recipient.campaignId,
              recipientId: recipient.id,
              eventType: 'REPLIED',
              eventData: {
                gmailMessageId: message.id,
                gmailThreadId: threadId,
                subject,
                fromEmail,
                date,
                timestamp: new Date().toISOString()
              }
            }
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