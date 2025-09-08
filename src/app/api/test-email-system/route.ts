import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { GmailService } from '@/services/gmail-service'

// Diagnostic endpoint to test email functionality for specific user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userEmail, testRecipients, subject, content } = body
    
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      include: {
        gmailToken: true,
        contacts: {
          where: {
            email: {
              in: testRecipients || []
            }
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!user.gmailToken) {
      return NextResponse.json({ 
        error: 'Gmail not connected for this user',
        user: userEmail 
      }, { status: 400 })
    }

    const results = {
      user: userEmail,
      gmailConnected: !!user.gmailToken,
      gmailEmail: user.gmailToken?.email,
      testRecipients: testRecipients || [],
      contactsFound: user.contacts.map(c => c.email),
      emailTests: [] as any[]
    }

    // Test sending emails if recipients provided
    if (testRecipients && testRecipients.length > 0 && subject && content) {
      const gmailService = new GmailService()
      
      for (const recipient of testRecipients) {
        try {
          const trackingId = `diagnostic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          
          await gmailService.sendEmail(user.id, user.gmailToken.email, {
            to: [recipient],
            subject: subject || 'LOUMASS Diagnostic Test Email',
            htmlContent: content || '<h1>Test Email</h1><p>This is a diagnostic test email from LOUMASS.</p>',
            trackingId,
            contactId: 'diagnostic'
          })

          results.emailTests.push({
            recipient,
            status: 'sent',
            timestamp: new Date().toISOString()
          })
        } catch (error) {
          results.emailTests.push({
            recipient,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      results
    })

  } catch (error) {
    console.error('Email system test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}