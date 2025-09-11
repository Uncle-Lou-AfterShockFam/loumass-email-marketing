const { PrismaClient } = require('@prisma/client')

async function testFullConditionalFlow() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🚀 Setting up FRESH test for conditional flow with reply detection...')
    
    // Get the Stand Alone sequence
    const sequence = await prisma.sequence.findUnique({
      where: {
        id: 'cmffb4i710001js04vg1uqddn'
      }
    })
    
    if (!sequence) {
      console.error('❌ Sequence not found')
      return
    }
    
    console.log(`✅ Found sequence: ${sequence.name}`)
    
    // Use a different test email
    const testEmail = 'louis@aftershockfam.org'
    
    // Find or create contact
    let contact = await prisma.contact.findFirst({
      where: {
        email: testEmail,
        userId: sequence.userId
      }
    })
    
    if (!contact) {
      console.log(`📝 Creating new contact: ${testEmail}`)
      contact = await prisma.contact.create({
        data: {
          email: testEmail,
          firstName: 'Louis',
          lastName: 'Test',
          userId: sequence.userId
        }
      })
    }
    
    console.log(`✅ Using contact: ${contact.email}`)
    
    // Delete any existing active enrollments for this contact
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
        replyCount: 0,
        lastRepliedAt: null,
        createdAt: new Date()
      }
    })
    
    console.log(`\n✅ Created new enrollment: ${enrollment.id}`)
    console.log(`   Contact: ${contact.email}`)
    console.log(`   Current Step: ${enrollment.currentStep}`)
    console.log(`   Reply Count: ${enrollment.replyCount}`)
    
    console.log('\n📋 TEST PLAN:')
    console.log('1. Step 1 will send immediately')
    console.log('2. YOU SHOULD REPLY to Step 1 email from louis@aftershockfam.org')
    console.log('3. Wait 1-2 minutes for reply detection cron job')
    console.log('4. Step 2 (delay) will wait 1 minute')
    console.log('5. Step 3 (condition) will check if you replied')
    console.log('6. If you replied: Step 4 (FALSE branch) should execute')
    console.log('7. If no reply: Step 5 (TRUE branch) would execute')
    
    console.log('\n🔍 IMPORTANT:')
    console.log('- Reply detection cron runs every MINUTE')
    console.log('- Make sure to REPLY FROM louis@aftershockfam.org')
    console.log('- The reply creates EmailEvent records for condition evaluation')
    console.log('- Step 4 should include proper thread history')
    
    console.log(`\n✨ Monitor enrollment ${enrollment.id} in production`)
    console.log('   Dashboard: https://loumassbeta.vercel.app/dashboard/sequences/cmffb4i710001js04vg1uqddn')
    
  } catch (error) {
    console.error('💥 ERROR:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testFullConditionalFlow()