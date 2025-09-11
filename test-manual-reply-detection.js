const { PrismaClient } = require('@prisma/client')

async function testManualReplyDetection() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔍 Manually triggering reply detection check...')
    
    // Call the reply detection endpoint
    const response = await fetch('https://loumassbeta.vercel.app/api/cron/check-replies', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    const result = await response.json()
    console.log('\n📊 Reply detection result:', result)
    
    // Check the enrollment status
    const enrollment = await prisma.sequenceEnrollment.findUnique({
      where: {
        id: 'cmffbj0om000njs04o0gu9x9u'
      },
      include: {
        contact: true,
        sequence: true
      }
    })
    
    if (enrollment) {
      console.log('\n📧 Enrollment status after reply check:')
      console.log(`  Contact: ${enrollment.contact.email}`)
      console.log(`  Current Step: ${enrollment.currentStep}`)
      console.log(`  Reply Count: ${enrollment.replyCount}`)
      console.log(`  Last Replied At: ${enrollment.lastRepliedAt}`)
      console.log(`  Gmail Thread ID: ${enrollment.gmailThreadId}`)
      
      // Check for EmailEvent records
      const emailEvents = await prisma.emailEvent.findMany({
        where: {
          type: 'REPLIED',
          sequenceId: enrollment.sequenceId,
          contactId: enrollment.contactId
        },
        orderBy: {
          timestamp: 'desc'
        }
      })
      
      console.log(`\n✉️ Found ${emailEvents.length} REPLIED EmailEvent records`)
      
      if (emailEvents.length > 0) {
        console.log('  Most recent reply event:')
        const latest = emailEvents[0]
        console.log(`    Timestamp: ${latest.timestamp}`)
        console.log(`    Message ID: ${latest.metadata?.gmailMessageId}`)
        console.log(`    From: ${latest.metadata?.fromEmail}`)
      }
      
      // Check for SequenceEvent records
      const sequenceEvents = await prisma.sequenceEvent.findMany({
        where: {
          enrollmentId: enrollment.id,
          eventType: 'REPLIED'
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
      
      console.log(`\n📋 Found ${sequenceEvents.length} REPLIED SequenceEvent records`)
    }
    
  } catch (error) {
    console.error('💥 ERROR:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testManualReplyDetection()