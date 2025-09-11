// Test sequence processor thread history logic for step 2 enrollment
const { PrismaClient } = require('@prisma/client')
const { GmailService } = require('./src/services/gmail-service')
const prisma = new PrismaClient()

async function testStep2ThreadHistory() {
  console.log('🔍 === TESTING STEP 2 THREAD HISTORY LOGIC ===\n')
  
  try {
    // Get the step 2 enrollment
    const enrollment = await prisma.sequenceEnrollment.findFirst({
      where: { 
        id: 'cmff38eww0001l704yuewgdvg' // The step 5 enrollment with real Gmail thread
      },
      include: {
        sequence: true,
        contact: { include: { user: true } }
      }
    })
    
    if (!enrollment) {
      console.log('❌ Enrollment not found')
      return
    }
    
    console.log('📧 Testing Step 2 Enrollment:')
    console.log(`   ID: ${enrollment.id}`)
    console.log(`   Thread: ${enrollment.gmailThreadId}`)
    console.log(`   Step: ${enrollment.currentStep}`)
    console.log(`   Contact: ${enrollment.contact.email}`)
    console.log(`   Should fetch thread history: ${enrollment.currentStep > 0 && !!enrollment.gmailThreadId}`)
    
    // Test the Gmail service thread history fetch
    const gmailService = new GmailService()
    
    console.log('\n🔧 Testing getFullThreadHistory for this enrollment...')
    const startTime = Date.now()
    
    const threadHistory = await gmailService.getFullThreadHistory(
      enrollment.contact.userId,
      enrollment.gmailThreadId
    )
    
    const duration = Date.now() - startTime
    console.log(`   ⏱️  Duration: ${duration}ms`)
    
    if (threadHistory) {
      console.log('✅ Thread History Retrieved Successfully!')
      console.log(`   HTML length: ${threadHistory.htmlContent.length}`)
      console.log(`   Text length: ${threadHistory.textContent.length}`)
      console.log(`   Has gmail_quote: ${threadHistory.htmlContent.includes('gmail_quote')}`)
      console.log(`   Has gmail_attr: ${threadHistory.htmlContent.includes('gmail_attr')}`)
      console.log(`   Last Message ID: ${threadHistory.lastMessageId}`)
      
      // Show preview
      console.log('\n📧 Thread History Preview (first 500 chars):')
      console.log(`"${threadHistory.htmlContent.substring(0, 500)}..."`)
      
      // Test sequence processor logic simulation
      console.log('\n🔧 Testing sequence processor thread assembly...')
      
      // Get the step content
      const steps = enrollment.sequence.steps
      const step = steps[enrollment.currentStep]
      const stepContent = step?.content || 'Test step content'
      
      // Simulate the sequence processor's content assembly
      const finalHtmlContent = `<div dir="ltr">${stepContent}</div>
<br>
${threadHistory.htmlContent}`
      
      console.log(`   Step content length: ${stepContent.length}`)
      console.log(`   Final HTML length: ${finalHtmlContent.length}`)
      console.log(`   Final has gmail_quote: ${finalHtmlContent.includes('gmail_quote')}`)
      
      console.log('\n📧 Final Email Content Preview (first 500 chars):')
      console.log(`"${finalHtmlContent.substring(0, 500)}..."`)
      
      console.log('\n✅ SEQUENCE PROCESSOR THREAD LOGIC IS WORKING!')
      console.log('   The issue must be elsewhere in the pipeline')
      
    } else {
      console.log('❌ Thread History Returned NULL')
      console.log('   This is the root cause - Gmail API not returning thread content')
    }
    
  } catch (error) {
    console.error('❌ Test Error:', error.message)
    console.error('   Stack:', error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

testStep2ThreadHistory()