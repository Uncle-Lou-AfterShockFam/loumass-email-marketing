import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { GmailClient } from '@/lib/gmail-client'

// POST /api/gmail/watch - Set up Gmail watch for reply tracking
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
    
    try {
      // Set up Gmail push notifications
      // We'll watch for new messages in the SENT label
      const watchResponse = await gmail.users.watch({
        userId: 'me',
        requestBody: {
          topicName: process.env.GMAIL_PUBSUB_TOPIC || 'projects/loumass/topics/gmail-replies',
          labelIds: ['INBOX'], // Watch INBOX for replies
          labelFilterAction: 'include'
        }
      })
      
      console.log('Gmail watch set up:', watchResponse.data)
      
      // Update the watch expiry in database
      if (watchResponse.data.expiration) {
        await prisma.gmailToken.update({
          where: { id: gmailToken.id },
          data: {
            watchExpiry: new Date(parseInt(watchResponse.data.expiration)),
            lastHistoryId: watchResponse.data.historyId
          }
        })
      }
      
      return NextResponse.json({
        success: true,
        message: 'Gmail watch activated for reply tracking',
        expiration: watchResponse.data.expiration,
        historyId: watchResponse.data.historyId
      })
      
    } catch (gmailError: any) {
      console.error('Gmail watch error:', gmailError)
      
      // Check if it's a Pub/Sub configuration issue
      if (gmailError.message?.includes('pubsub')) {
        return NextResponse.json({
          error: 'Gmail Pub/Sub not configured. Reply tracking requires Google Cloud Pub/Sub setup.',
          details: 'Contact support to enable reply tracking.'
        }, { status: 400 })
      }
      
      return NextResponse.json({
        error: 'Failed to activate Gmail watch',
        details: gmailError.message
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('Error setting up Gmail watch:', error)
    return NextResponse.json({ 
      error: 'Failed to set up reply tracking' 
    }, { status: 500 })
  }
}

// GET /api/gmail/watch - Check Gmail watch status
export async function GET(request: NextRequest) {
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
        connected: false,
        message: 'Gmail not connected' 
      })
    }
    
    const now = new Date()
    const watchActive = gmailToken.watchExpiry && gmailToken.watchExpiry > now
    
    return NextResponse.json({
      connected: true,
      watchActive,
      watchExpiry: gmailToken.watchExpiry,
      lastHistoryId: gmailToken.lastHistoryId,
      email: gmailToken.email
    })
    
  } catch (error) {
    console.error('Error checking Gmail watch status:', error)
    return NextResponse.json({ 
      error: 'Failed to check watch status' 
    }, { status: 500 })
  }
}