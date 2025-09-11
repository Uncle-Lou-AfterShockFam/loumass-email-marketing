const { PrismaClient } = require('@prisma/client')

async function triggerStep5Test() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🚀 Creating test enrollment to trigger Step 5 thread history issue...')
    
    // Get the sequence
    const sequence = await prisma.sequence.findUnique({
      where: {
        id: 'cmff84sdu0001l504xpkstmrr'
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
    
    // Create or get a test contact
    let testContact = await prisma.contact.findFirst({
      where: {
        email: 'test.step5.debug@example.com',
        userId: sequence.userId
      }
    })
    
    if (!testContact) {
      testContact = await prisma.contact.create({
        data: {
          email: 'test.step5.debug@example.com',
          firstName: 'Test',
          lastName: 'Step5Debug',
          userId: sequence.userId
        }
      })
      console.log(`✅ Created test contact: ${testContact.email}`)
    } else {
      console.log(`✅ Using existing test contact: ${testContact.email}`)
      
      // Delete any existing enrollments for clean test
      await prisma.sequenceEnrollment.deleteMany({
        where: {
          contactId: testContact.id,
          sequenceId: sequence.id
        }
      })
      console.log('   Cleared existing enrollments')
    }
    
    // Create new enrollment
    const enrollment = await prisma.sequenceEnrollment.create({
      data: {
        sequenceId: sequence.id,
        contactId: testContact.id,
        currentStep: 0,
        status: 'ACTIVE',
        createdAt: new Date()
      }
    })
    
    console.log(`\n✅ Created enrollment: ${enrollment.id}`)
    console.log(`   Contact: ${testContact.email}`)
    console.log(`   Sequence: ${sequence.name}`)
    console.log(`   Current Step: ${enrollment.currentStep}`)
    
    console.log('\n📋 Expected Flow:')
    console.log('   1. Step 1 (email) - Should send and set gmailThreadId')
    console.log('   2. Step 2 (delay 1 minute)')
    console.log('   3. Step 3 (condition - not replied) → TRUE branch')
    console.log('   4. Jump to Step 5 (email) - Should include thread history')
    
    console.log('\n⏰ Timeline:')
    console.log('   - Step 1 will send immediately (cron runs every minute)')
    console.log('   - Step 2 delay is 1 minute')
    console.log('   - Step 3 condition evaluates immediately after delay')
    console.log('   - Step 5 should send about 1-2 minutes after Step 1')
    
    console.log('\n🔍 Watch for in production logs:')
    console.log('   - "Thread history check:" logs')
    console.log('   - "Will include thread history:" true/false')
    console.log('   - "✅ INCLUDING THREAD HISTORY" or "❌ CRITICAL: Failed to fetch"')
    
    console.log('\n📊 Monitor this enrollment:')
    console.log(`   Enrollment ID: ${enrollment.id}`)
    console.log('   Check back in 2-3 minutes to see if Step 5 included thread history')
    
    // Also create an enrollment that starts at Step 4 to test that branch
    const enrollment2 = await prisma.sequenceEnrollment.create({
      data: {
        sequenceId: sequence.id,
        contactId: testContact.id,
        currentStep: 3, // Start at Step 4 (index 3)
        status: 'ACTIVE',
        gmailThreadId: 'test-thread-123', // Fake thread ID to test
        createdAt: new Date()
      }
    })
    
    console.log(`\n✅ Also created enrollment starting at Step 4: ${enrollment2.id}`)
    console.log('   This tests the FALSE branch (contact replied) path')
    console.log('   Should send Step 4 immediately with attempt to include thread history')
    
  } catch (error) {
    console.error('💥 ERROR:', error)
  } finally {
    await prisma.$disconnect()
  }
}

triggerStep5Test()