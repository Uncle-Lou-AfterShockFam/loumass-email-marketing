import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { GmailService } from '@/services/gmail-service'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const enrollmentId = searchParams.get('enrollmentId')
  
  if (!enrollmentId) {
    return NextResponse.json({ error: 'enrollmentId parameter required' }, { status: 400 })
  }

  try {
    // Get the enrollment
    const enrollment = await prisma.sequenceEnrollment.findFirst({
      where: { id: enrollmentId },
      include: {
        sequence: true,
        contact: { include: { user: true } }
      }
    })

    if (!enrollment) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 })
    }

    if (!enrollment.gmailThreadId) {
      return NextResponse.json({ error: 'Enrollment has no Gmail thread ID' }, { status: 400 })
    }

    // Test getFullThreadHistory in production
    const gmailService = new GmailService()
    const threadHistory = await gmailService.getFullThreadHistory(
      enrollment.contact.userId,
      enrollment.gmailThreadId
    )

    // Get step content  
    const steps = enrollment.sequence.steps
    const step = steps?.[enrollment.currentStep - 1]

    const result = {
      enrollment: {
        id: enrollment.id,
        threadId: enrollment.gmailThreadId,
        currentStep: enrollment.currentStep,
        contact: enrollment.contact.email,
        user: enrollment.contact.user.email
      },
      step: {
        content: step?.content,
        subject: step?.subject
      },
      threadHistory: {
        success: threadHistory !== null,
        htmlLength: threadHistory?.htmlContent?.length || 0,
        textLength: threadHistory?.textContent?.length || 0,
        hasGmailQuote: threadHistory?.htmlContent?.includes('gmail_quote') || false,
        lastMessageId: threadHistory?.lastMessageId,
        preview: threadHistory?.htmlContent?.substring(0, 200) + '...' || null
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
        timestamp: new Date().toISOString()
      }
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Debug Gmail Thread Error:', error)
    return NextResponse.json({ 
      error: 'Debug failed',
      message: error.message,
      stack: error.stack 
    }, { status: 500 })
  }
}