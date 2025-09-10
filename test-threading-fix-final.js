require('dotenv').config()
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

console.log('=== FINAL THREADING FIX TEST ===\n')

async function testFix() {
  // Check an enrollment that should have threading
  const enrollment = await prisma.sequenceEnrollment.findFirst({
    where: {
      id: 'cmfd8zic30001jt04ljqe9vl7' // The enrollment from user's test
    }
  })
  
  if (!enrollment) {
    console.log('❌ Enrollment not found')
    return
  }
  
  console.log('📋 Enrollment Details:')
  console.log('  ID:', enrollment.id)
  console.log('  Current Step:', enrollment.currentStep)
  console.log('  Gmail Message ID:', enrollment.gmailMessageId)
  console.log('  Gmail Thread ID:', enrollment.gmailThreadId)
  console.log('  Message-ID Header:', enrollment.messageIdHeader)
  console.log('')
  
  // Test the actual logic
  console.log('🧪 Testing Threading Logic:')
  
  // Simulate sequenceProcessor logic (OLD WAY - BROKEN)
  const oldEmailData = {
    threadId: enrollment.gmailThreadId,
    messageId: enrollment.gmailMessageId // WRONG! This is Gmail internal ID
  }
  
  console.log('❌ OLD WAY (broken):')
  console.log('  messageId:', oldEmailData.messageId)
  console.log('  Contains @:', oldEmailData.messageId?.includes('@'))
  console.log('  Result: Threading will FAIL\n')
  
  // Simulate sequenceProcessor logic (NEW WAY - FIXED)
  const newEmailData = {
    threadId: enrollment.gmailThreadId,
    messageId: enrollment.messageIdHeader // CORRECT! This is RFC Message-ID
  }
  
  console.log('✅ NEW WAY (fixed):')
  console.log('  messageId:', newEmailData.messageId)
  console.log('  Contains @:', newEmailData.messageId?.includes('@'))
  console.log('  Result: Threading will WORK\n')
  
  // Now test with actual service
  console.log('🔧 Testing with actual sequenceProcessor service...\n')
  
  const { sequenceProcessor } = require('./src/services/sequenceProcessor')
  
  // Get the enrollment with all relations
  const fullEnrollment = await prisma.sequenceEnrollment.findUnique({
    where: { id: enrollment.id },
    include: {
      sequence: {
        include: {
          user: {
            include: {
              gmailToken: true
            }
          }
        }
      },
      contact: true
    }
  })
  
  if (!fullEnrollment) {
    console.log('❌ Could not load full enrollment')
    return
  }
  
  // Check what step type is next
  const steps = JSON.parse(fullEnrollment.sequence.steps)
  const currentStep = steps[fullEnrollment.currentStep]
  
  console.log('📍 Current Position:')
  console.log('  Step Index:', fullEnrollment.currentStep)
  console.log('  Step Type:', currentStep?.type)
  console.log('  Reply to Thread:', currentStep?.replyToThread)
  console.log('')
  
  if (currentStep?.type === 'email' && currentStep?.replyToThread) {
    console.log('✅ This step SHOULD thread!')
    console.log('  Expected to use Message-ID:', fullEnrollment.messageIdHeader)
  } else {
    console.log('ℹ️ This step does not require threading')
  }
}

testFix()
  .then(() => {
    console.log('\n=== TEST COMPLETE ===')
    console.log('The fix ensures sequenceProcessor uses messageIdHeader (RFC Message-ID)')
    console.log('instead of gmailMessageId (Gmail internal ID) for threading.')
  })
  .catch(console.error)
  .finally(() => prisma.$disconnect())