import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { GmailClient } from '@/lib/gmail-client'

// POST /api/gmail/update-reply-bodies - Update existing reply events with missing message bodies
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
    
    // Find reply events without message bodies
    const replyEvents = await prisma.emailEvent.findMany({
      where: {
        eventType: 'REPLIED',
        campaign: {
          userId: session.user.id
        }
      }
    })
    
    let updatedCount = 0
    const errors: any[] = []
    
    for (const event of replyEvents) {
      const eventData = event.eventData as any
      
      // Skip if already has message body
      if (eventData?.messageBody) continue
      
      const gmailMessageId = eventData?.gmailMessageId
      if (!gmailMessageId) continue
      
      try {
        // Get full message details
        const fullMessage = await gmail.users.messages.get({
          userId: 'me',
          id: gmailMessageId,
          format: 'full'
        })
        
        // Extract message body
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
                const htmlContent = Buffer.from(part.body.data, 'base64').toString('utf-8')
                // Simple HTML to text conversion (remove tags)
                return htmlContent.replace(/<[^>]*>?/gm, '')
              }
            }
          }
          return ''
        }
        
        const messageBody = extractBody(fullMessage.data.payload)
        
        if (messageBody) {
          // Update the event with the message body
          await prisma.emailEvent.update({
            where: { id: event.id },
            data: {
              eventData: {
                ...eventData,
                messageBody
              }
            }
          })
          
          updatedCount++
          console.log(`Updated reply event ${event.id} with message body (${messageBody.length} chars)`)
        }
      } catch (error) {
        console.error(`Error updating reply event ${event.id}:`, error)
        errors.push({
          eventId: event.id,
          gmailMessageId,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Updated ${updatedCount} reply events with message bodies`,
      totalReplies: replyEvents.length,
      updatedCount,
      errors: errors.length > 0 ? errors : undefined
    })
    
  } catch (error) {
    console.error('Error updating reply bodies:', error)
    return NextResponse.json({ 
      error: 'Failed to update reply bodies',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}