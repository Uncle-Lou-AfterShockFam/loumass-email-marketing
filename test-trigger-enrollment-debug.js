const { PrismaClient } = require('@prisma/client')

async function triggerEnrollmentDebug() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔍 Creating new enrollment to trigger debug logging...')
    
    // Get the sequence that we know has thread history issues
    const sequence = await prisma.sequence.findFirst({
      where: {
        id: 'cmfdw9s43000312thtpnfbpe5' // Same sequence from the failing enrollment
      },
      include: {
        user: true
      }
    })
    
    if (!sequence) {
      console.error('❌ Sequence not found')
      return
    }
    
    console.log(`✅ Found sequence: ${sequence.name}`)
    
    // Get or create a test contact
    const contact = await prisma.contact.findFirst({
      where: {
        email: 'test.debug@example.com',
        userId: sequence.userId
      }
    })
    
    if (!contact) {
      console.log('Creating test contact...')
      const newContact = await prisma.contact.create({
        data: {
          email: 'test.debug@example.com',
          firstName: 'Test',
          lastName: 'Debug',
          userId: sequence.userId
        }
      })
      console.log(`✅ Created test contact: ${newContact.email}`)
    } else {
      console.log(`✅ Found existing test contact: ${contact.email}`)
    }
    
    // Create a new enrollment to test step 1 (no thread history needed)
    const enrollment = await prisma.sequenceEnrollment.create({
      data: {
        sequenceId: sequence.id,
        contactId: contact?.id || 'test-contact-id',
        currentStep: 0,
        status: 'ACTIVE',
        nextStepAt: new Date() // Execute immediately
      }
    })
    
    console.log(`✅ Created enrollment: ${enrollment.id}`)
    console.log(`   Current step: ${enrollment.currentStep}`)
    console.log(`   Next step at: ${enrollment.nextStepAt}`)
    console.log('\n📊 This enrollment will be picked up by the next cron run')
    console.log('   Monitor the production logs to see the debug output!')
    
    // Also create an enrollment at step 5 to test thread history
    const enrollment2 = await prisma.sequenceEnrollment.create({
      data: {
        sequenceId: sequence.id,
        contactId: contact?.id || 'test-contact-id',
        currentStep: 4, // Start at step 5 (0-indexed)
        status: 'ACTIVE',
        gmailThreadId: '1932c9e4e13c9e4e', // Use a real thread ID
        nextStepAt: new Date() // Execute immediately
      }
    })
    
    console.log(`\n✅ Created second enrollment for thread history test: ${enrollment2.id}`)
    console.log(`   Current step: ${enrollment2.currentStep}`)
    console.log(`   Gmail thread ID: ${enrollment2.gmailThreadId}`)
    console.log(`   This should trigger the thread history logic!`)
    
  } catch (error) {
    console.error('💥 ERROR:', error)
  } finally {
    await prisma.$disconnect()
  }
}

triggerEnrollmentDebug()