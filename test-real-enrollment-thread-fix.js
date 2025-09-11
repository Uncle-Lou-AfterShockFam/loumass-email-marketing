const { PrismaClient } = require('@prisma/client')

async function testRealEnrollmentThreadFix() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔍 Analyzing why real enrollments failed to include thread history...')
    
    // Get the real enrollments that just processed
    const enrollments = await prisma.sequenceEnrollment.findMany({
      where: {
        id: {
          in: ['cmff9wjij00018ol5vqp5feiq', 'cmff9wjjn00038ol5wb2tj0yz']
        }
      },
      include: {
        contact: true,
        sequence: {
          include: {
            user: true
          }
        }
      }
    })
    
    console.log(`\n📧 Found ${enrollments.length} real enrollments:`)
    
    for (const enrollment of enrollments) {
      console.log(`\n━━━ Enrollment: ${enrollment.id} ━━━`)
      console.log(`Contact: ${enrollment.contact.email}`)
      console.log(`Current Step: ${enrollment.currentStep}`)
      console.log(`Gmail Thread ID: ${enrollment.gmailThreadId}`)
      console.log(`Last Email Sent: ${enrollment.lastEmailSentAt?.toISOString()}`)
      
      // Check the condition that controls thread history inclusion
      const shouldIncludeThreadHistory = enrollment.currentStep > 0 && enrollment.gmailThreadId
      console.log(`\nThread History Check:`)
      console.log(`  currentStep (${enrollment.currentStep}) > 0: ${enrollment.currentStep > 0}`)
      console.log(`  gmailThreadId exists: ${!!enrollment.gmailThreadId}`)
      console.log(`  Should include thread history: ${shouldIncludeThreadHistory}`)
      
      // The issue: When Step 5 was being processed, currentStep was 4 (not 5)
      console.log(`\n⚠️  When Step 5 was processing:`)
      console.log(`  currentStep would have been: 4`)
      console.log(`  Condition: 4 > 0 && '${enrollment.gmailThreadId}' = ${4 > 0 && enrollment.gmailThreadId ? 'TRUE' : 'FALSE'}`)
      
      // Check email events
      const emailEvents = await prisma.emailEvent.findMany({
        where: {
          contactId: enrollment.contactId,
          sequenceId: enrollment.sequenceId
        },
        orderBy: {
          createdAt: 'asc'
        }
      })
      
      console.log(`\n📊 Email Events:`)
      emailEvents.forEach((event, i) => {
        console.log(`  ${i + 1}. ${event.createdAt.toISOString()} - Step ${event.stepIndex} - ${event.subject || 'No subject'}`)
      })
    }
    
    console.log(`\n💡 DIAGNOSIS:`)
    console.log(`The condition (currentStep > 0 && gmailThreadId) SHOULD have been TRUE`)
    console.log(`But the thread history was NOT included in Step 5 emails`)
    console.log(`\nPossible causes:`)
    console.log(`1. getFullThreadHistory() is failing silently in production`)
    console.log(`2. The Gmail API call is timing out or returning empty`)
    console.log(`3. There's a race condition where the thread isn't ready yet`)
    console.log(`4. The thread history fetch is being skipped despite the condition being true`)
    
    console.log(`\n🔧 FIX NEEDED:`)
    console.log(`Need to add error logging around getFullThreadHistory() call`)
    console.log(`And ensure it doesn't fail silently when thread history can't be fetched`)
    
  } catch (error) {
    console.error('💥 ERROR:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testRealEnrollmentThreadFix()