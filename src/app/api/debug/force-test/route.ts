import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SequenceService } from '@/services/sequence-service'

export async function POST(request: NextRequest) {
  try {
    console.log('=== FORCE TEST ENDPOINT ===')
    
    const targetSequenceId = 'cmfc04unm0005l504batqbm9w'
    const targetUserId = 'cmeuwk6x70000jj04gb20w4dk'
    
    // Create unique test contact
    const timestamp = Date.now()
    const testEmail = `test-${timestamp}@example.com`
    
    console.log('Creating test contact:', testEmail)
    const testContact = await prisma.contact.create({
      data: {
        email: testEmail,
        userId: targetUserId,
        firstName: 'Test',
        lastName: `User${timestamp}`
      }
    })
    
    console.log('Created contact:', testContact.id)
    
    // Create enrollment
    const newEnrollment = await prisma.sequenceEnrollment.create({
      data: {
        sequenceId: targetSequenceId,
        contactId: testContact.id,
        status: 'ACTIVE',
        currentStep: 0
      }
    })
    
    console.log('Created enrollment:', newEnrollment.id)
    
    // Force process this enrollment immediately
    const sequenceService = new SequenceService()
    console.log('Processing enrollment immediately...')
    
    const result = await sequenceService.processSequenceStep(newEnrollment.id)
    
    console.log('Processing result:', result)
    
    // Get updated enrollment to see what happened
    const updatedEnrollment = await prisma.sequenceEnrollment.findUnique({
      where: { id: newEnrollment.id },
      include: {
        contact: true,
        sequence: true
      }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Force test completed',
      testEmail,
      contactId: testContact.id,
      enrollmentId: newEnrollment.id,
      processingResult: result,
      updatedEnrollment,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Force test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}