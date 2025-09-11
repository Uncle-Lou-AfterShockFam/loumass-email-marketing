const { PrismaClient } = require('@prisma/client')

async function testStep5WithNewLogging() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🚀 Creating NEW test enrollment now that enhanced logging is deployed...')
    
    // Get the Stand Alone sequence
    const sequence = await prisma.sequence.findUnique({
      where: {
        id: 'cmff9vk640001jr04ndru9n1m'
      }
    })
    
    if (!sequence) {
      console.error('❌ Sequence not found')
      return
    }
    
    console.log(`✅ Found sequence: ${sequence.name}`)
    
    // Use a different real email for testing
    const contact = await prisma.contact.findFirst({
      where: {
        email: 'ljpiotti@gmail.com',
        userId: sequence.userId
      }
    })
    
    if (!contact) {
      console.error('❌ Contact not found')
      return
    }
    
    console.log(`✅ Found contact: ${contact.email}`)
    
    // Delete any existing active enrollments
    await prisma.sequenceEnrollment.deleteMany({
      where: {
        contactId: contact.id,
        sequenceId: sequence.id,
        status: {
          in: ['ACTIVE', 'PAUSED']
        }
      }
    })
    
    // Create a new enrollment
    const enrollment = await prisma.sequenceEnrollment.create({
      data: {
        sequenceId: sequence.id,
        contactId: contact.id,
        currentStep: 0,
        status: 'ACTIVE',
        createdAt: new Date()
      }
    })
    
    console.log(`\n✅ Created new enrollment: ${enrollment.id}`)
    console.log(`   Contact: ${contact.email}`)
    console.log(`   Current Step: ${enrollment.currentStep}`)
    
    console.log('\n📋 Timeline:')
    console.log('   - Step 1 sends immediately')
    console.log('   - Step 2 delay (1 minute)')
    console.log('   - Step 3 condition → jumps to Step 5')
    console.log('   - Step 5 should execute ~2 minutes from now')
    
    console.log('\n🔍 CRITICAL LOGS TO WATCH FOR:')
    console.log('   [SequenceProcessor] 🎯 processEmailStep called:')
    console.log('   [SequenceProcessor] 🔍 Calling getFullThreadHistory...')
    console.log('   [SequenceProcessor] 📊 getFullThreadHistory returned: SUCCESS/NULL')
    console.log('   [GmailService] REJECTING FAKE THREAD ID (if it happens)')
    
    console.log(`\n✨ Monitor enrollment ${enrollment.id} in production`)
    console.log('   The enhanced logging is NOW DEPLOYED (8 minutes ago)')
    console.log('   We should see exactly why Step 5 fails to include thread history')
    
  } catch (error) {
    console.error('💥 ERROR:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testStep5WithNewLogging()