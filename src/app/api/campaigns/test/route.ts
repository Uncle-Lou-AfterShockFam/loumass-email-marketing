import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { GmailService } from '@/services/gmail-service'
import { z } from 'zod'

// Validation schema for test email
const testEmailSchema = z.object({
  to: z.string().email('Valid email address is required'),
  subject: z.string().min(1, 'Subject is required'),
  content: z.string().min(1, 'Content is required'),
  trackingEnabled: z.boolean().default(false)
})

// POST /api/campaigns/test - Send test email
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate request data
    const validationResult = testEmailSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Invalid data', 
        details: validationResult.error.format() 
      }, { status: 400 })
    }

    const { to, subject, content, trackingEnabled } = validationResult.data

    // Check if user has Gmail connected
    const gmailToken = await prisma.gmailToken.findUnique({
      where: { userId: session.user.id }
    })

    if (!gmailToken) {
      return NextResponse.json({ 
        error: 'Gmail not connected. Please connect your Gmail account first.' 
      }, { status: 400 })
    }

    // Send test email via Gmail API
    const gmailService = new GmailService()
    const trackingId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    try {
      await gmailService.sendEmail(session.user.id, gmailToken.email, {
        to: [to],
        subject,
        htmlContent: trackingEnabled ? 
          addTrackingToEmail(content, trackingId) : 
          content,
        trackingId,
        contactId: 'test', // Test emails don't have a real contact
        // Don't include campaignId for test emails
      })
    } catch (error) {
      console.error('Failed to send test email:', error)
      return NextResponse.json({ 
        error: 'Failed to send test email. Please check your Gmail connection.' 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully',
      details: {
        to,
        subject,
        sentAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error sending test email:', error)
    return NextResponse.json({ 
      error: 'Failed to send test email' 
    }, { status: 500 })
  }
}

// Helper function to add tracking to email content
function addTrackingToEmail(html: string, trackingId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_TRACKING_DOMAIN || 
                 process.env.NEXT_PUBLIC_APP_URL || 
                 'http://localhost:3000'
  
  // Add open tracking pixel
  const pixelUrl = `${baseUrl}/api/track/open/${trackingId}`
  const pixelHtml = `<img src="${pixelUrl}" width="1" height="1" style="display:none;" alt="" />`
  
  // Insert pixel before closing body tag
  let trackedHtml = html
  if (html.includes('</body>')) {
    trackedHtml = html.replace('</body>', `${pixelHtml}</body>`)
  } else {
    trackedHtml = html + pixelHtml
  }
  
  // Replace all links for click tracking
  const linkRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1/gi
  trackedHtml = trackedHtml.replace(linkRegex, (match, quote, url) => {
    // Don't track unsubscribe links
    if (url.includes('unsubscribe') || url.includes('mailto:')) {
      return match
    }
    
    const trackedUrl = `${baseUrl}/api/track/click/${trackingId}?url=${encodeURIComponent(url)}`
    return match.replace(url, trackedUrl)
  })
  
  return trackedHtml
}