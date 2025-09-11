const { PrismaClient } = require('@prisma/client')

async function testStep5WithEnhancedLogging() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🚀 Creating test enrollment to capture enhanced logging for Step 5...')
    
    // Get the Stand Alone sequence
    const sequence = await prisma.sequence.findUnique({
      where: {
        id: 'cmff9vk640001jr04ndru9n1m'
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
    
    // Use Lou's email for testing since it's a real email
    const contact = await prisma.contact.findFirst({
      where: {
        email: 'lou@soberafe.com',
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
    
    console.log('\n📋 Expected Timeline:')
    console.log('   - Step 1 (email) sends immediately')
    console.log('   - Step 2 (delay 1 minute)')
    console.log('   - Step 3 (condition) evaluates')
    console.log('   - Step 5 (email) sends ~2 minutes after Step 1')
    
    console.log('\n🔍 Watch for these logs in production:')
    console.log('   [SequenceProcessor] 🎯 processEmailStep called:')
    console.log('   [SequenceProcessor]   Current Step (at start): X')
    console.log('   [SequenceProcessor] 🔍 Calling getFullThreadHistory...')
    console.log('   [SequenceProcessor] 📊 getFullThreadHistory returned: SUCCESS/NULL')
    console.log('   [GmailService] Fetching full thread history...')
    
    console.log(`\n✨ Monitor enrollment ${enrollment.id} in production logs`)
    console.log('   Check Vercel logs in 2-3 minutes to see the enhanced debugging output')
    
  } catch (error) {
    console.error('💥 ERROR:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testStep5WithEnhancedLogging()