const { PrismaClient } = require('@prisma/client')

async function testThreadHistoryEnrollment() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🚀 CREATING TEST ENROLLMENT FOR THREAD HISTORY')
    console.log('=' .repeat(50))
    
    const sequenceId = 'cmffvbebb0005id04l2xdel7k'
    
    // Create enrollment for ljpiotti@gmail.com
    const contact = await prisma.contact.findFirst({
      where: { email: 'ljpiotti@gmail.com' }
    })
    
    if (contact) {
      // Delete existing enrollments
      await prisma.sequenceEnrollment.deleteMany({
        where: {
          sequenceId,
          contactId: contact.id
        }
      })
      
      const enrollment = await prisma.sequenceEnrollment.create({
        data: {
          sequenceId,
          contactId: contact.id,
          currentStep: 0,
          status: 'ACTIVE',
          replyCount: 0
        }
      })
      
      console.log(`\n✅ Created enrollment for ljpiotti@gmail.com`)
      console.log(`   ID: ${enrollment.id}`)
      console.log(`\n📧 EXPECTED BEHAVIOR WITH THREAD HISTORY FIX:`)
      console.log(`   1. First email sent (Step 0)`)
      console.log(`   2. After 5 min delay (Step 1)`)
      console.log(`   3. Condition evaluation (Step 2)`)
      console.log(`   4. Follow-up email (Step 3 or 4) should include:`)
      console.log(`      - The new email content at the top`)
      console.log(`      - A quoted section with "On [date] [from] wrote:"`)
      console.log(`      - The FULL content of the previous email in a gray box`)
      console.log(`      - NOT just "Subject: Hey LOUIS!"`)
      
      console.log(`\n⏰ WAIT FOR:`)
      console.log(`   1. Initial email to be sent (within 1 minute)`)
      console.log(`   2. Wait 5 minutes for delay`)
      console.log(`   3. Check the follow-up email for proper thread history`)
      console.log(`\n💡 The fix fetches actual email content from Gmail API`)
      console.log(`   instead of just showing the subject line`)
    } else {
      console.log('❌ Contact not found')
    }
    
    console.log('\n' + '=' .repeat(50))
    
  } catch (error) {
    console.error('❌ ERROR:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testThreadHistoryEnrollment()