import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const targetSequenceId = 'cmfc04unm0005l504batqbm9w'
    const targetUserId = 'cmeuwk6x70000jj04gb20w4dk'
    
    // Create a unique test contact with timestamp
    const timestamp = Date.now()
    const testEmail = `debug-${timestamp}@loumasstest.com`
    
    console.log('Creating test contact for enrollment:', testEmail)
    
    const testContact = await prisma.contact.create({
      data: {
        email: testEmail,
        userId: targetUserId,
        firstName: 'Debug',
        lastName: 'Test'
      }
    })
    
    // Create new enrollment
    const enrollment = await prisma.sequenceEnrollment.create({
      data: {
        sequenceId: targetSequenceId,
        contactId: testContact.id,
        status: 'ACTIVE',
        currentStep: 0
      }
    })
    
    console.log('Created enrollment:', enrollment.id)
    
    return NextResponse.json({
      success: true,
      message: 'Enrollment created successfully',
      enrollmentId: enrollment.id,
      contactId: testContact.id,
      contactEmail: testEmail,
      sequenceId: targetSequenceId,
      nextStep: 'The cron job will process this enrollment within 1 minute',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Create enrollment error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}