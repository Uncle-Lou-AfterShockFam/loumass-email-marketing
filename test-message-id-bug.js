#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')
const https = require('https')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function testMessageIdBug() {
  try {
    console.log('🔍 TESTING MESSAGE-ID THREADING BUG')
    console.log('==================================')
    
    const targetSequenceId = 'cmfc3h0zh0009la04ifdwmjzm'
    const targetUserId = 'cmeuwk6x70000jj04gb20w4dk'
    
    // Create test contact  
    const timestamp = Date.now()
    const testEmail = `messageid-test-${timestamp}@debugtest.com`
    
    console.log('1. Creating test contact...')
    const testContact = await prisma.contact.create({
      data: {
        email: testEmail,
        userId: targetUserId,
        firstName: 'MessageID',
        lastName: 'Test'
      }
    })
    console.log(`✅ Created contact: ${testContact.id} (${testEmail})`)
    
    // Create enrollment at step 0 (first email should already be sent)
    console.log('2. Creating enrollment at step 0...')
    const enrollment = await prisma.sequenceEnrollment.create({
      data: {
        sequenceId: targetSequenceId,
        contactId: testContact.id,
        status: 'ACTIVE',
        currentStep: 0,
        // Simulate that first email was sent with proper Message-ID
        gmailMessageId: '1992test001',
        gmailThreadId: '1992testthread001', 
        messageIdHeader: '<CAMDusTest123456789@mail.gmail.com>',
        lastEmailSentAt: new Date()
      }
    })
    console.log(`✅ Created enrollment: ${enrollment.id}`)
    console.log(`   Gmail Message ID: ${enrollment.gmailMessageId}`)
    console.log(`   Gmail Thread ID: ${enrollment.gmailThreadId}`)
    console.log(`   Message-ID Header: ${enrollment.messageIdHeader}`)
    
    // Now advance to step 1 (condition) which should trigger follow-up emails
    console.log('3. Advancing to step 1 (condition)...')
    await prisma.sequenceEnrollment.update({
      where: { id: enrollment.id },
      data: { currentStep: 1 }
    })
    
    console.log('4. Triggering sequence processing via cron...')
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
        'Authorization': 'Bearer debug',
        'User-Agent': 'MessageID-Test-Script'
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
      
      // Timeout after 30 seconds
      setTimeout(() => {
        req.destroy()
        reject(new Error('Request timeout'))
      }, 30000)
    })
    
    console.log('API Response:', JSON.stringify(apiResult, null, 2))
    
    // Wait for processing
    console.log('5. Waiting 5 seconds for processing...')
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    // Check final state
    console.log('6. Checking final enrollment state...')
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
      console.log(`   Gmail Message ID: ${finalEnrollment.gmailMessageId}`)
      console.log(`   Gmail Thread ID: ${finalEnrollment.gmailThreadId}`)
      console.log(`   Message-ID Header: ${finalEnrollment.messageIdHeader}`)
      console.log(`   Last Email Sent: ${finalEnrollment.lastEmailSentAt?.toISOString() || 'Never'}`)
    }
    
    // Check sequence events
    const sequenceEvents = await prisma.sequenceEvent.findMany({
      where: { enrollmentId: enrollment.id },
      orderBy: { createdAt: 'desc' }
    })
    
    console.log('7. Sequence events generated:')
    if (sequenceEvents.length === 0) {
      console.log('   No events generated')
    } else {
      sequenceEvents.forEach((event, index) => {
        console.log(`   ${index + 1}. ${event.eventType} - Step ${event.stepIndex}`)
        console.log(`      Created: ${event.createdAt.toISOString()}`)
        if (event.eventData) {
          console.log(`      Data:`, JSON.stringify(event.eventData, null, 4))
        }
      })
    }
    
  } catch (error) {
    console.error('❌ Test error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testMessageIdBug()