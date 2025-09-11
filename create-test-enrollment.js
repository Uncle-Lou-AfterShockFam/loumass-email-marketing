const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function createEnrollment() {
  console.log('🚀 CREATING NEW TEST ENROLLMENT')
  console.log('==================================================')
  
  try {
    // Find the sequence
    const sequence = await prisma.sequence.findUnique({
      where: { id: 'cmffvbebb0005id04l2xdel7k' }
    })
    
    if (!sequence) {
      throw new Error('Sequence not found!')
    }
    
    console.log(`📋 Sequence: ${sequence.name}`)
    
    // Find the contact
    const contact = await prisma.contact.findFirst({
      where: { email: 'ljpiotti@gmail.com' }
    })
    
    if (!contact) {
      throw new Error('Contact not found!')
    }
    
    console.log(`📧 Contact: ${contact.email}`)
    
    // Check for existing enrollment
    const existing = await prisma.sequenceEnrollment.findUnique({
      where: {
        sequenceId_contactId: {
          sequenceId: sequence.id,
          contactId: contact.id
        }
      }
    })
    
    if (existing) {
      console.log('⚠️  Existing enrollment found, deleting it first...')
      await prisma.sequenceEnrollment.delete({
        where: { id: existing.id }
      })
      console.log('✅ Old enrollment deleted')
    }
    
    // Create new enrollment
    const enrollment = await prisma.sequenceEnrollment.create({
      data: {
        sequenceId: sequence.id,
        contactId: contact.id,
        currentStep: 0,
        status: 'ACTIVE'
      }
    })
    
    console.log('\n✅ NEW ENROLLMENT CREATED!')
    console.log(`   ID: ${enrollment.id}`)
    console.log(`   Status: ${enrollment.status}`)
    console.log(`   Current Step: ${enrollment.currentStep}`)
    console.log('\n📨 The initial email should be sent within 1 minute by the cron job')
    console.log('   Watch your inbox at ljpiotti@gmail.com')
    console.log('\n🔄 NEXT STEPS:')
    console.log('   1. Wait for the initial email')
    console.log('   2. Reply to test reply detection')
    console.log('   3. Monitor the sequence to see which branch is taken')
    
    // Display sequence structure
    const steps = sequence.steps
    console.log('\n📊 SEQUENCE STRUCTURE:')
    steps.forEach((step, index) => {
      if (step.type === 'email') {
        console.log(`   Step ${index}: EMAIL - "${step.subject}"`)
      } else if (step.type === 'delay') {
        console.log(`   Step ${index}: DELAY - ${step.delayMinutes} minutes`)
      } else if (step.type === 'condition') {
        console.log(`   Step ${index}: CONDITION - ${step.conditionType}`)
      }
    })
    
    console.log(`\n🔍 Monitor with: node monitor-test-enrollment.js ${enrollment.id}`)
    
  } catch (error) {
    console.error('❌ ERROR:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

createEnrollment()
