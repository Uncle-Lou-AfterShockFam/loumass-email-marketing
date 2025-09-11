const { PrismaClient } = require('@prisma/client')
const { GmailService } = require('./src/services/gmail-service.ts')

async function testThreadHistory() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔍 Testing Gmail Thread History Fetching...')
    
    // Get a completed enrollment with a real thread ID
    const enrollment = await prisma.sequenceEnrollment.findFirst({
      where: {
        gmailThreadId: {
          not: null,
          not: {
            startsWith: 'thread-'
          }
        },
        currentStep: {
          gt: 0
        }
      },
      include: {
        sequence: {
          include: {
            user: true
          }
        },
        contact: true
      },
      orderBy: {
        lastEmailSentAt: 'desc'
      }
    })
    
    if (!enrollment) {
      console.error('❌ No completed enrollment with real thread ID found')
      return
    }
    
    console.log(`📧 Testing enrollment: ${enrollment.id}`)
    console.log(`   Contact: ${enrollment.contact.email}`)
    console.log(`   Thread ID: ${enrollment.gmailThreadId}`)
    console.log(`   Current step: ${enrollment.currentStep}`)
    console.log(`   Last email: ${enrollment.lastEmailSentAt?.toISOString()}`)
    
    // Initialize Gmail service
    const gmailService = new GmailService()
    
    // Test thread history fetching
    console.log('\n🔄 Calling getFullThreadHistory...')
    const fullHistory = await gmailService.getFullThreadHistory(
      enrollment.sequence.user.id, 
      enrollment.gmailThreadId
    )
    
    if (fullHistory) {
      console.log(`✅ SUCCESS: Retrieved ${fullHistory.htmlContent.length} chars of HTML content`)
      console.log(`✅ SUCCESS: Retrieved ${fullHistory.textContent.length} chars of text content`)
      console.log(`\n📋 HTML Content Preview (first 200 chars):`)
      console.log(fullHistory.htmlContent.substring(0, 200))
      console.log('\n📋 Text Content Preview (first 200 chars):')
      console.log(fullHistory.textContent.substring(0, 200))
    } else {
      console.error('❌ FAILED: getFullThreadHistory returned null')
      console.error('This means the Gmail API call failed or the thread ID is invalid')
    }
    
  } catch (error) {
    console.error('💥 ERROR:', error.message)
    console.error('Stack trace:', error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

testThreadHistory()