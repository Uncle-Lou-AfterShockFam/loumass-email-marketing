require('dotenv').config()
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testProcessStep() {
  console.log('=== TESTING SEQUENCE STEP PROCESSING ===\n')
  
  // Create a test enrollment with proper Message-ID
  const testSequenceId = 'cmfczvcb20001l504320elt76' // Your test sequence
  const testContactId = 'cmexqqz08000008l6g1vz8ptn' // Your test contact
  
  // First, check if we have an existing enrollment
  let enrollment = await prisma.sequenceEnrollment.findFirst({
    where: {
      sequenceId: testSequenceId,
      contactId: testContactId,
      status: 'ACTIVE'
    },
    orderBy: {
      createdAt: 'desc'
    }
  })
  
  if (!enrollment) {
    console.log('Creating new test enrollment...')
    enrollment = await prisma.sequenceEnrollment.create({
      data: {
        sequenceId: testSequenceId,
        contactId: testContactId,
        status: 'ACTIVE',
        currentStep: 0,
        // Simulate that first email was already sent
        messageIdHeader: 'CAMDusAtRpX_jNoctdC=6fJxh08Zhv0NkH8AJ_FFWn8vUKx1JqA@mail.gmail.com',
        gmailThreadId: '19930c20d48f07b7',
        lastEmailSentAt: new Date()
      }
    })
  }
  
  console.log('Test Enrollment:')
  console.log('  ID:', enrollment.id)
  console.log('  Current Step:', enrollment.currentStep)
  console.log('  Message-ID:', enrollment.messageIdHeader)
  console.log('  Thread ID:', enrollment.gmailThreadId)
  
  // Load the sequence
  const sequence = await prisma.sequence.findUnique({
    where: { id: testSequenceId },
    include: { user: true }
  })
  
  console.log('\nSequence:', sequence.name)
  console.log('Steps:')
  const steps = sequence.steps
  steps.forEach((step, i) => {
    console.log(`  ${i}: ${step.type}${step.replyToThread ? ' (reply to thread)' : ''}`)
  })
  
  // Now manually advance to step 3 (first follow-up email after condition)
  console.log('\n🎯 Setting enrollment to step 3 (follow-up email)...')
  await prisma.sequenceEnrollment.update({
    where: { id: enrollment.id },
    data: { 
      currentStep: 3,
      status: 'ACTIVE'
    }
  })
  
  // Import and call the actual sequence service
  const { SequenceService } = require('./src/services/sequence-service')
  const sequenceService = new SequenceService()
  
  console.log('\n📮 Processing step 3 (should thread properly)...\n')
  const result = await sequenceService.processSequenceStep(enrollment.id)
  
  console.log('\nResult:', result)
  
  // Check if Message-ID was passed
  const updatedEnrollment = await prisma.sequenceEnrollment.findUnique({
    where: { id: enrollment.id }
  })
  
  console.log('\nUpdated Enrollment:')
  console.log('  Current Step:', updatedEnrollment.currentStep)
  console.log('  Message-ID still present:', !!updatedEnrollment.messageIdHeader)
  console.log('  Message-ID value:', updatedEnrollment.messageIdHeader)
}

testProcessStep()
  .catch(console.error)
  .finally(() => prisma.$disconnect())