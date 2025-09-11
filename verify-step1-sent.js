const { PrismaClient } = require('@prisma/client')

async function verifyStep1Sent() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔍 Verifying if Step 1 was actually sent...')
    
    // Get the enrollment
    const enrollment = await prisma.sequenceEnrollment.findUnique({
      where: {
        id: 'cmff99so70001k004hvuihsxe'
      },
      include: {
        contact: true
      }
    })
    
    console.log(`\n📧 Enrollment: ${enrollment.id}`)
    console.log(`   Contact: ${enrollment.contact.email}`)
    console.log(`   Gmail Thread ID: ${enrollment.gmailThreadId || 'NONE'}`)
    console.log(`   Created: ${enrollment.createdAt.toISOString()}`)
    console.log(`   Last Email: ${enrollment.lastEmailSentAt?.toISOString() || 'NONE'}`)
    
    // Check all email events for this contact in the time window
    const startTime = new Date(enrollment.createdAt.getTime() - 60000) // 1 minute before
    const endTime = new Date(enrollment.lastEmailSentAt || enrollment.updatedAt)
    
    const emailEvents = await prisma.emailEvent.findMany({
      where: {
        contactId: enrollment.contactId,
        createdAt: {
          gte: startTime,
          lte: endTime
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })
    
    console.log(`\n📊 Email events during enrollment period:`)
    console.log(`   From: ${startTime.toISOString()}`)
    console.log(`   To: ${endTime.toISOString()}`)
    console.log(`   Found: ${emailEvents.length} events`)
    
    emailEvents.forEach((event, i) => {
      console.log(`\n   ${i + 1}. ${event.createdAt.toISOString()}`)
      console.log(`      Type: ${event.type}`)
      console.log(`      Subject: ${event.subject || 'No subject'}`)
      console.log(`      Sequence: ${event.sequenceId === 'cmff84sdu0001l504xpkstmrr' ? 'THIS SEQUENCE' : event.sequenceId || 'NONE'}`)
    })
    
    // Check Gmail directly (would need Gmail API access)
    console.log(`\n💡 Analysis:`)
    if (emailEvents.length === 0) {
      console.log('   ❌ NO email events found during enrollment period!')
      console.log('   Step 1 email was likely NOT sent.')
    } else if (emailEvents.length === 1) {
      console.log('   ⚠️  Only ONE email event found (likely Step 5)')
      console.log('   Step 1 email was likely NOT sent or failed to log.')
    } else {
      console.log('   ✅ Multiple email events found')
      console.log('   Step 1 may have been sent.')
    }
    
    console.log(`\n🔍 Thread ID Analysis:`)
    if (enrollment.gmailThreadId) {
      console.log(`   ✅ Thread ID exists: ${enrollment.gmailThreadId}`)
      console.log('   This suggests Step 1 WAS sent (thread ID is set when first email sends)')
      console.log('   But the email event might not have been logged.')
    } else {
      console.log('   ❌ No thread ID!')
      console.log('   Step 1 definitely failed to send.')
    }
    
    console.log(`\n🐛 LIKELY BUG:`)
    console.log('   Step 1 sent successfully (set gmailThreadId)')
    console.log('   But Step 5 failed to include thread history')
    console.log('   Even though enrollment.gmailThreadId exists!')
    console.log('\n   The getFullThreadHistory() call might be failing in production')
    console.log('   Or there\'s a race condition with Gmail API')
    
  } catch (error) {
    console.error('💥 ERROR:', error)
  } finally {
    await prisma.$disconnect()
  }
}

verifyStep1Sent()