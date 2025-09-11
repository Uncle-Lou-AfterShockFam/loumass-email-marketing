const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testSpecificThread() {
  console.log('=== Testing Specific Thread ===\n')
  
  try {
    // Get the enrollment
    const enrollment = await prisma.sequenceEnrollment.findFirst({
      where: {
        id: 'cmff1je430001la047t9zv6wk'
      },
      include: {
        contact: {
          include: {
            user: {
              include: {
                gmailToken: true
              }
            }
          }
        }
      }
    })
    
    if (!enrollment) {
      console.log('❌ Enrollment not found')
      return
    }
    
    console.log('✅ Found enrollment:')
    console.log(`   ID: ${enrollment.id}`)
    console.log(`   Current Step: ${enrollment.currentStep}`)
    console.log(`   Thread ID: ${enrollment.gmailThreadId}`)
    console.log(`   Contact: ${enrollment.contact.email}`)
    console.log(`   User ID: ${enrollment.contact.userId}`)
    
    // Test getFullThreadHistory
    const { GmailService } = require('./src/services/gmail-service')
    const gmailService = new GmailService()
    
    console.log('\\n📧 Testing getFullThreadHistory...')
    const threadHistory = await gmailService.getFullThreadHistory(
      enrollment.contact.userId, 
      enrollment.gmailThreadId
    )
    
    if (threadHistory) {
      console.log('✅ SUCCESS: Got thread history from Gmail')
      console.log(`   HTML length: ${threadHistory.htmlContent.length}`)
      console.log(`   Text length: ${threadHistory.textContent.length}`)
      console.log('   First 200 chars:', threadHistory.htmlContent.substring(0, 200))
    } else {
      console.log('❌ FAILED: getFullThreadHistory returned null')
      console.log('   This explains why there\'s no thread history!')
      
      // Check what the fallback would do
      console.log('\\n📊 Checking database fallback...')
      const emailEvents = await prisma.emailEvent.findMany({
        where: {
          contactId: enrollment.contactId,
          sequenceId: enrollment.sequenceId,
          type: 'SENT'
        },
        orderBy: {
          createdAt: 'asc'
        }
      })
      
      console.log(`   Found ${emailEvents.length} previous email events`)
      
      if (emailEvents.length === 0) {
        console.log('   ❌ No previous emails to build history from')
        console.log('   This explains why the final email has no thread history')
      } else {
        console.log('   ✅ Should have built fallback history')
        emailEvents.forEach((event, i) => {
          console.log(`   Email ${i + 1}: ${event.subject} (${event.createdAt})`)
        })
      }
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testSpecificThread()