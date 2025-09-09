#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function testThreadingIssue() {
  try {
    console.log('🔍 TESTING THREADING ISSUE')
    console.log('==========================\n')
    
    // Find the most recent enrollment for lou@soberafe.com
    const enrollment = await prisma.sequenceEnrollment.findFirst({
      where: {
        contact: {
          email: 'lou@soberafe.com'
        }
      },
      include: {
        contact: true,
        sequence: {
          include: {
            user: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    if (!enrollment) {
      console.log('❌ No enrollment found for lou@soberafe.com')
      return
    }
    
    console.log('✅ Found enrollment:', enrollment.id)
    console.log('   Status:', enrollment.status)
    console.log('   Current Step:', enrollment.currentStep)
    console.log('\n📧 STORED THREADING DATA:')
    console.log('   Gmail Message ID:', enrollment.gmailMessageId || 'None')
    console.log('   Gmail Thread ID:', enrollment.gmailThreadId || 'None')
    console.log('   Message-ID Header:', enrollment.messageIdHeader || 'None')
    
    // Parse sequence steps
    const steps = Array.isArray(enrollment.sequence.steps) ? 
      enrollment.sequence.steps : JSON.parse(enrollment.sequence.steps)
    
    console.log('\n📋 SEQUENCE STEPS:')
    steps.forEach((step, index) => {
      console.log(`   ${index}. ${step.type}: ${step.name || step.id}`)
      if (step.type === 'email') {
        console.log(`      - replyToThread: ${step.replyToThread || false}`)
        console.log(`      - trackingEnabled: ${step.trackingEnabled !== false}`)
      }
      if (step.type === 'condition') {
        console.log(`      - trueBranch: ${step.trueBranch}`)
        console.log(`      - falseBranch: ${step.falseBranch}`)
      }
    })
    
    // Test the threading validation logic
    console.log('\n🧪 TESTING THREADING VALIDATION:')
    const messageId = enrollment.messageIdHeader
    
    if (messageId) {
      console.log('   Testing Message-ID:', messageId)
      
      // Test the validation logic from gmail-service.ts
      const hasAtSign = messageId.includes('@')
      const hasAngleBracket = messageId.includes('<')
      const hasCAM = messageId.includes('CAM')
      
      console.log('   - Contains @:', hasAtSign)
      console.log('   - Contains <:', hasAngleBracket)
      console.log('   - Contains CAM:', hasCAM)
      
      const wouldPassValidation = hasAtSign && (hasAngleBracket || hasCAM)
      console.log('   ✅ Would pass validation:', wouldPassValidation)
      
      if (!wouldPassValidation) {
        console.log('   ❌ PROBLEM: Message-ID would fail validation!')
        console.log('      This explains why threading headers are not added')
      }
    } else {
      console.log('   ❌ No Message-ID stored - threading impossible!')
    }
    
    // Check if there are any events showing what happened
    console.log('\n📊 RECENT SEQUENCE EVENTS:')
    const events = await prisma.sequenceEvent.findMany({
      where: { enrollmentId: enrollment.id },
      orderBy: { createdAt: 'desc' },
      take: 5
    })
    
    events.forEach(event => {
      console.log(`   ${event.eventType} at step ${event.stepIndex}:`)
      console.log(`   Created: ${event.createdAt.toISOString()}`)
      if (event.eventData) {
        const data = typeof event.eventData === 'string' ? 
          JSON.parse(event.eventData) : event.eventData
        if (data.error) {
          console.log(`   ❌ Error: ${data.error}`)
        }
        if (data.gmailMessageId) {
          console.log(`   Gmail ID: ${data.gmailMessageId}`)
        }
        if (data.messageIdHeader) {
          console.log(`   Message-ID: ${data.messageIdHeader}`)
        }
      }
    })
    
  } catch (error) {
    console.error('❌ Test error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testThreadingIssue()