#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')
const { SequenceService } = require('./dist/services/sequence-service.js')

const prisma = new PrismaClient()

async function debugSequenceBugs() {
  try {
    console.log('🔍 DEBUGGING SEQUENCE PROCESSING BUGS')
    console.log('=====================================')
    
    // Sequence and user IDs from user's request
    const targetSequenceId = 'cmfc3h0zh0009la04ifdwmjzm'
    const targetUserId = 'cmeuwk6x70000jj04gb20w4dk'
    
    console.log('Target Sequence:', targetSequenceId)
    console.log('Target User:', targetUserId)
    
    // Create unique test contact
    const timestamp = Date.now()
    const testEmail = `debug-${timestamp}@debugtest.com`
    
    console.log('\n1. Creating test contact...')
    const testContact = await prisma.contact.create({
      data: {
        email: testEmail,
        userId: targetUserId,
        firstName: 'Debug',
        lastName: 'Test'
      }
    })
    console.log(`✅ Created contact: ${testContact.id} (${testEmail})`)
    
    // Create enrollment
    console.log('\n2. Creating sequence enrollment...')
    const enrollment = await prisma.sequenceEnrollment.create({
      data: {
        sequenceId: targetSequenceId,
        contactId: testContact.id,
        status: 'ACTIVE',
        currentStep: 0
      }
    })
    console.log(`✅ Created enrollment: ${enrollment.id}`)
    
    // Process immediately to trace execution
    console.log('\n3. Processing sequence step...')
    const sequenceService = new SequenceService()
    
    try {
      const result = await sequenceService.processSequenceStep(enrollment.id)
      console.log('✅ Processing result:', JSON.stringify(result, null, 2))
    } catch (error) {
      console.error('❌ Processing error:', error.message)
      console.error('Stack:', error.stack)
    }
    
    // Check final state
    console.log('\n4. Checking final enrollment state...')
    const finalEnrollment = await prisma.sequenceEnrollment.findUnique({
      where: { id: enrollment.id },
      include: {
        contact: true,
        sequence: true
      }
    })
    
    console.log('Final enrollment state:', JSON.stringify(finalEnrollment, null, 2))
    
  } catch (error) {
    console.error('❌ Debug script error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugSequenceBugs()