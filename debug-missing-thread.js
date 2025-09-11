const { PrismaClient } = require('@prisma/client')
const { GmailService } = require('./src/services/gmail-service')

async function debugMissingThread() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔍 Debugging missing thread history...')
    
    // Get the specific enrollment that just sent the email (step 5)
    const enrollment = await prisma.sequenceEnrollment.findUnique({
      where: {
        id: 'cmff6mkp40001l104zdioyu2q' // The one that just sent the email at 09:07:16
      },
      include: {
        sequence: {
          include: {
            user: true
          }
        },
        contact: true
      }
    })
    
    if (!enrollment) {
      console.error('❌ Enrollment not found')
      return
    }
    
    console.log(`📧 Enrollment Details:`)
    console.log(`   ID: ${enrollment.id}`)
    console.log(`   Contact: ${enrollment.contact.email}`)
    console.log(`   Thread ID: ${enrollment.gmailThreadId}`)
    console.log(`   Current step: ${enrollment.currentStep}`)
    console.log(`   Last email: ${enrollment.lastEmailSentAt?.toISOString()}`)
    
    // Test the exact same call that should have been made
    const gmailService = new GmailService()
    
    console.log('\n🔄 Testing getFullThreadHistory with exact same parameters...')
    const fullHistory = await gmailService.getFullThreadHistory(
      enrollment.sequence.user.id, 
      enrollment.gmailThreadId
    )
    
    if (fullHistory) {
      console.log(`✅ Thread history retrieved: ${fullHistory.htmlContent.length} chars`)
      console.log(`✅ Contains gmail_quote: ${fullHistory.htmlContent.includes('gmail_quote')}`)
      console.log('\n📋 Thread History Content:')
      console.log(fullHistory.htmlContent.substring(0, 1000))
    } else {
      console.error('❌ getFullThreadHistory returned null')
    }
    
    console.log('\n🔍 Checking sequence step content...')
    const sequence = enrollment.sequence
    const steps = Array.isArray(sequence.steps) ? sequence.steps : JSON.parse(sequence.steps)
    const currentStepData = steps[enrollment.currentStep - 1]
    
    console.log(`Step ${enrollment.currentStep} content:`)
    console.log(currentStepData?.content?.substring(0, 500))
    
  } catch (error) {
    console.error('💥 ERROR:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugMissingThread()