import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { GmailClient } from '@/lib/gmail-client'
import { google } from 'googleapis'

// Helper to decode Gmail webhook notification
function decodeGmailNotification(data: string) {
  try {
    const decoded = Buffer.from(data, 'base64').toString()
    return JSON.parse(decoded)
  } catch (error) {
    console.error('Failed to decode Gmail notification:', error)
    return null
  }
}

// POST /api/webhooks/gmail/reply - Handle Gmail push notifications for replies
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Gmail sends a base64 encoded message
    const message = body.message
    if (!message || !message.data) {
      return NextResponse.json({ error: 'Invalid notification' }, { status: 400 })
    }
    
    const notification = decodeGmailNotification(message.data)
    if (!notification) {
      return NextResponse.json({ error: 'Failed to decode notification' }, { status: 400 })
    }
    
    console.log('Gmail notification received:', notification)
    
    // Get email address and history ID from notification
    const { emailAddress, historyId } = notification
    
    if (!emailAddress || !historyId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    // Find the user by Gmail email
    const gmailToken = await prisma.gmailToken.findFirst({
      where: { email: emailAddress }
    })
    
    if (!gmailToken) {
      console.log('No Gmail token found for email:', emailAddress)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Get Gmail service
    const gmailClient = new GmailClient()
    const gmail = await gmailClient.getGmailService(gmailToken.userId, emailAddress)
    
    // Get history of changes since last known history ID
    const lastHistoryId = gmailToken.lastHistoryId || historyId
    
    try {
      const history = await gmail.users.history.list({
        userId: 'me',
        startHistoryId: lastHistoryId,
        historyTypes: ['messageAdded']
      })
      
      if (!history.data.history) {
        console.log('No new messages')
        return NextResponse.json({ success: true, message: 'No new messages' })
      }
      
      // Process each history item
      for (const historyItem of history.data.history) {
        if (!historyItem.messagesAdded) continue
        
        for (const messageAdded of historyItem.messagesAdded) {
          const messageId = messageAdded.message?.id
          if (!messageId) continue
          
          // Get the full message
          const fullMessage = await gmail.users.messages.get({
            userId: 'me',
            id: messageId
          })
          
          // Check if this is a reply to one of our campaigns
          const headers = fullMessage.data.payload?.headers || []
          const inReplyTo = headers.find((h: any) => h.name === 'In-Reply-To')?.value
          const references = headers.find((h: any) => h.name === 'References')?.value
          const from = headers.find((h: any) => h.name === 'From')?.value
          const subject = headers.find((h: any) => h.name === 'Subject')?.value
          
          if (!from) continue
          
          // Extract email from "Name <email>" format
          const emailMatch = from.match(/<(.+)>/)
          const fromEmail = emailMatch ? emailMatch[1] : from
          
          console.log('Processing potential reply from:', fromEmail)
          console.log('Subject:', subject)
          console.log('In-Reply-To:', inReplyTo)
          console.log('References:', references)
          
          // Find recipient by email and Gmail thread ID
          const threadId = fullMessage.data.threadId
          
          if (!threadId) continue
          
          // Find recipients with matching thread ID and email
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
          
          if (recipients.length === 0) {
            console.log('No matching recipient found for reply')
            continue
          }
          
          // Process reply for each matching recipient (should typically be just one)
          for (const recipient of recipients) {
            console.log('Reply detected for campaign:', recipient.campaign.name)
            console.log('From contact:', recipient.contact.email)
            
            // Create reply event
            await prisma.emailEvent.create({
              data: {
                campaignId: recipient.campaignId,
                recipientId: recipient.id,
                eventType: 'REPLIED',
                eventData: {
                  gmailMessageId: messageId,
                  gmailThreadId: threadId,
                  subject,
                  fromEmail,
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
          }
        }
      }
      
      // Update last history ID
      await prisma.gmailToken.update({
        where: { id: gmailToken.id },
        data: {
          lastHistoryId: history.data.historyId || historyId
        }
      })
      
    } catch (error) {
      console.error('Error processing Gmail history:', error)
      return NextResponse.json({ 
        error: 'Failed to process history' 
      }, { status: 500 })
    }
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Gmail webhook error:', error)
    return NextResponse.json({ 
      error: 'Webhook processing failed' 
    }, { status: 500 })
  }
}

// GET /api/webhooks/gmail/reply - Gmail webhook verification
export async function GET(request: NextRequest) {
  // Gmail may send a verification request
  const challenge = request.nextUrl.searchParams.get('hub.challenge')
  
  if (challenge) {
    // Echo back the challenge for verification
    return new NextResponse(challenge, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain'
      }
    })
  }
  
  return NextResponse.json({ status: 'ok' })
}