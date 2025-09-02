import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SequenceService } from '@/services/sequence-service'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`\n🧪 ==== THREADING TEST STARTED FOR ${session.user.email} ====`)

    const body = await request.json()
    const { contactEmail, testSequenceId } = body

    if (!contactEmail) {
      return NextResponse.json({ error: 'contactEmail is required' }, { status: 400 })
    }

    // Find or create test contact
    const testContact = await prisma.contact.upsert({
      where: {
        userId_email: {
          userId: session.user.id,
          email: contactEmail
        }
      },
      update: {},
      create: {
        userId: session.user.id,
        email: contactEmail,
        firstName: 'Test',
        lastName: 'Contact'
      }
    })

    console.log('Test contact:', testContact.email)

    // Create a simple test sequence for threading
    const testSequence = await prisma.sequence.create({
      data: {
        userId: session.user.id,
        name: 'Threading Test Sequence',
        description: 'Test sequence for debugging threading',
        status: 'ACTIVE',
        steps: [
          {
            id: 'email-test-1',
            type: 'email',
            subject: 'Threading Test - Email 1',
            content: 'This is the first email in the threading test sequence.',
            replyToThread: false, // First email starts new thread
            trackingEnabled: true,
            position: { x: 100, y: 100 },
            nextStepId: 'delay-test-1'
          },
          {
            id: 'delay-test-1',
            type: 'delay',
            delay: { days: 0, hours: 0, minutes: 1 }, // 1 minute delay
            position: { x: 300, y: 100 },
            nextStepId: 'email-test-2'
          },
          {
            id: 'email-test-2',
            type: 'email',
            subject: 'Threading Test - Email 2',
            content: 'This is the second email. It should be in the SAME THREAD as the first email.',
            replyToThread: true, // Second email should reply to thread
            trackingEnabled: true,
            position: { x: 500, y: 100 }
          }
        ]
      }
    })

    console.log('Created test sequence:', testSequence.id)

    // Create enrollment
    const sequenceService = new SequenceService()
    const enrollment = await sequenceService.enrollContact(testSequence.id, testContact.id)

    console.log('Created enrollment:', enrollment.id)

    // Process first email immediately
    console.log('\n📧 Processing first email...')
    const firstResult = await sequenceService.processSequenceStep(enrollment.id)
    console.log('First email result:', firstResult)

    // Wait a moment then process the delay/second email
    console.log('\n⏳ Waiting for delay to complete...')
    setTimeout(async () => {
      try {
        console.log('📧 Processing second email...')
        const secondResult = await sequenceService.processSequenceStep(enrollment.id)
        console.log('Second email result:', secondResult)
      } catch (error) {
        console.error('Error processing second email:', error)
      }
    }, 65000) // 65 seconds to ensure 1-minute delay is complete

    return NextResponse.json({
      success: true,
      message: 'Threading test sequence created and started',
      testSequenceId: testSequence.id,
      enrollmentId: enrollment.id,
      contactEmail: testContact.email,
      firstEmailResult: firstResult,
      note: 'Second email will be processed automatically after 1-minute delay'
    })

  } catch (error) {
    console.error('Threading test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}