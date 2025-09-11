const { PrismaClient } = require('@prisma/client')

async function testNewEnrollmentWithFix() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🚀 CREATING NEW TEST ENROLLMENT WITH FIX')
    console.log('=' .repeat(50))
    
    // Use the test sequence that has backwards branches
    const sequenceId = 'cmffqb5yi000zky041joiaacl'
    const contactEmail = 'ljpiotti@gmail.com'
    
    // Get the contact
    const contact = await prisma.contact.findFirst({
      where: { email: contactEmail }
    })
    
    if (!contact) {
      console.log('❌ Contact not found!')
      return
    }
    
    // Get the sequence
    const sequence = await prisma.sequence.findUnique({
      where: { id: sequenceId }
    })
    
    if (!sequence) {
      console.log('❌ Sequence not found!')
      return
    }
    
    console.log('\n📋 TEST SETUP:')
    console.log(`   Sequence: ${sequence.name}`)
    console.log(`   Contact: ${contact.email}`)
    console.log('\n📝 SEQUENCE STRUCTURE:')
    console.log('   Step 0: Initial email')
    console.log('   Step 1: Delay (5 minutes)')
    console.log('   Step 2: Condition (not_replied)')
    console.log('   Step 3: TRUE branch - "REPLIED!" (confusing - should be "NO REPLY")')
    console.log('   Step 4: FALSE branch - "NO REPLY!" (confusing - should be "REPLIED")')
    
    console.log('\n⚠️  NOTE: The sequence has backwards naming!')
    console.log('   When not_replied = TRUE (no reply exists) → Step 3 "REPLIED!"')
    console.log('   When not_replied = FALSE (reply exists) → Step 4 "NO REPLY!"')
    
    console.log('\n🎯 WITH THE FIX:')
    console.log('   If you DON\'T reply → not_replied returns TRUE → Step 3 sent')
    console.log('   If you DO reply → not_replied returns FALSE → Step 4 sent')
    
    // Create new enrollment
    const enrollment = await prisma.sequenceEnrollment.create({
      data: {
        sequenceId: sequence.id,
        contactId: contact.id,
        currentStep: 0,
        status: 'ACTIVE',
        replyCount: 0
      }
    })
    
    console.log('\n✅ ENROLLMENT CREATED:')
    console.log(`   ID: ${enrollment.id}`)
    console.log(`   Status: ${enrollment.status}`)
    console.log(`   Current Step: ${enrollment.currentStep}`)
    
    console.log('\n📧 NEXT STEPS:')
    console.log('   1. Step 0 email will be sent by the cron job')
    console.log('   2. Check your email at: ' + contactEmail)
    console.log('   3. REPLY to the email to test reply detection')
    console.log('   4. Wait for the delay (5 minutes)')
    console.log('   5. The condition will evaluate:')
    console.log('      - If you replied: Step 4 "NO REPLY!" will be sent')
    console.log('      - If you didn\'t reply: Step 3 "REPLIED!" will be sent')
    console.log('\n   (Yes, the naming is backwards in the sequence!)')
    
    console.log('\n📊 MONITOR WITH:')
    console.log(`   node monitor-test-enrollment.js ${enrollment.id}`)
    
    console.log('\n' + '=' .repeat(50))
    console.log('TEST ENROLLMENT CREATED!')
    
  } catch (error) {
    console.error('❌ ERROR:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testNewEnrollmentWithFix()