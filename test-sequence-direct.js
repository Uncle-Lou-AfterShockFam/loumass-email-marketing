#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function testSequenceDirect() {
  try {
    console.log('🔍 DIRECT SEQUENCE TESTING - BYPASSING CRON')
    console.log('============================================')
    
    const targetSequenceId = 'cmfc3h0zh0009la04ifdwmjzm'
    const targetUserId = 'cmeuwk6x70000jj04gb20w4dk'
    
    // Create unique test contact
    const timestamp = Date.now()
    const testEmail = `direct-test-${timestamp}@debugtest.com`
    
    console.log('1. Creating test contact...')
    const testContact = await prisma.contact.create({
      data: {
        email: testEmail,
        userId: targetUserId,
        firstName: 'Direct',
        lastName: 'Test'
      }
    })
    console.log(`✅ Created contact: ${testContact.id} (${testEmail})`)
    
    // Create enrollment
    console.log('2. Creating sequence enrollment...')
    const enrollment = await prisma.sequenceEnrollment.create({
      data: {
        sequenceId: targetSequenceId,
        contactId: testContact.id,
        status: 'ACTIVE',
        currentStep: 0
      }
    })
    console.log(`✅ Created enrollment: ${enrollment.id}`)
    
    // Make direct API call to process sequence
    console.log('3. Making direct API call to /api/sequences/process...')
    const https = require('https')
    const data = JSON.stringify({ 
      enrollmentId: enrollment.id,
      debug: true
    })
    
    const options = {
      hostname: 'loumassbeta.vercel.app',
      port: 443,
      path: '/api/sequences/process',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer debug'
      }
    }
    
    const apiResult = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let body = ''
        res.on('data', chunk => body += chunk)
        res.on('end', () => {
          try {
            const parsed = body ? JSON.parse(body) : {}
            resolve({ status: res.statusCode, data: parsed })
          } catch (e) {
            resolve({ status: res.statusCode, data: body })
          }
        })
      })
      req.on('error', reject)
      req.write(data)
      req.end()
    })
    
    console.log('API Response:', JSON.stringify(apiResult, null, 2))
    
    // Wait for processing
    console.log('4. Waiting for processing...')
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // Check final state
    console.log('5. Checking final enrollment state...')
    const finalEnrollment = await prisma.sequenceEnrollment.findUnique({
      where: { id: enrollment.id },
      include: {
        contact: true,
        sequence: true
      }
    })
    
    if (finalEnrollment) {
      console.log(`   Status: ${finalEnrollment.status}`)
      console.log(`   Current Step: ${finalEnrollment.currentStep}`)
      console.log(`   Message ID Header: ${finalEnrollment.messageIdHeader || 'None'}`)
      console.log(`   Gmail Thread ID: ${finalEnrollment.gmailThreadId || 'None'}`)
      console.log(`   Last Email Sent: ${finalEnrollment.lastEmailSentAt?.toISOString() || 'Never'}`)
    }
    
    // Check sequence events
    const sequenceEvents = await prisma.sequenceEvent.findMany({
      where: {
        enrollmentId: enrollment.id
      },
      orderBy: { createdAt: 'asc' }
    })
    
    console.log('6. Sequence events generated:')
    if (sequenceEvents.length === 0) {
      console.log('   No events generated')
    } else {
      sequenceEvents.forEach((event, index) => {
        console.log(`   ${index + 1}. ${event.eventType} - Step ${event.stepIndex}`)
        console.log(`      Created: ${event.createdAt.toISOString()}`)
        if (event.eventData) {
          console.log(`      Data:`, JSON.stringify(event.eventData))
        }
      })
    }
    
  } catch (error) {
    console.error('❌ Test error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testSequenceDirect()