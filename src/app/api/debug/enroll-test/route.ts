import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // Check for debug access
    const authHeader = request.headers.get('authorization')
    const userAgent = request.headers.get('user-agent')
    
    // Allow Vercel cron or specific debug auth
    const isVercelCron = userAgent?.includes('vercel-cron') || userAgent?.includes('Vercel-Cron')
    const hasValidAuth = authHeader === `Bearer ${process.env.CRON_SECRET || 'debug'}`
    
    if (!isVercelCron && !hasValidAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const targetSequenceId = 'cmfc04unm0005l504batqbm9w'
    const targetUserId = 'cmeuwk6x70000jj04gb20w4dk'
    
    // Create or find a test contact
    const testEmail = 'test-debug@example.com'
    
    let testContact = await prisma.contact.findFirst({
      where: {
        email: testEmail,
        userId: targetUserId
      }
    })
    
    if (!testContact) {
      testContact = await prisma.contact.create({
        data: {
          email: testEmail,
          userId: targetUserId,
          firstName: 'Debug',
          lastName: 'Test'
        }
      })
      console.log('Created test contact:', testContact.id)
    }
    
    // Check if there's already an active enrollment for this contact
    const existingEnrollment = await prisma.sequenceEnrollment.findFirst({
      where: {
        sequenceId: targetSequenceId,
        contactId: testContact.id,
        status: 'ACTIVE'
      }
    })
    
    if (existingEnrollment) {
      return NextResponse.json({
        success: true,
        message: 'Test enrollment already exists',
        enrollmentId: existingEnrollment.id,
        contactId: testContact.id,
        sequenceId: targetSequenceId
      })
    }
    
    // Create new enrollment
    const newEnrollment = await prisma.sequenceEnrollment.create({
      data: {
        sequenceId: targetSequenceId,
        contactId: testContact.id,
        status: 'ACTIVE',
        currentStep: 0
      }
    })
    
    console.log('Created test enrollment:', newEnrollment.id)
    
    return NextResponse.json({
      success: true,
      message: 'Created test enrollment successfully',
      enrollmentId: newEnrollment.id,
      contactId: testContact.id,
      sequenceId: targetSequenceId,
      testEmail: testEmail,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Debug enroll test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}