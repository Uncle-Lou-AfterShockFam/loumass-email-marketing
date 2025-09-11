// Test the EXACT enrollment from the latest deployment that's missing thread history
const { PrismaClient } = require('@prisma/client')
const { GmailService } = require('./src/services/gmail-service')
const prisma = new PrismaClient()

async function testLatestDeploymentEnrollment() {
  console.log('🔍 === TESTING LATEST DEPLOYMENT ENROLLMENT ===\n')
  
  try {
    // Get the exact enrollment that was used in the latest emails
    const enrollment = await prisma.sequenceEnrollment.findFirst({
      where: { 
        id: 'cmff4i0h80003js04r9vlsmwu' // From the latest deployment
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
    
    console.log('📧 Testing Latest Deployment Enrollment:')
    console.log(`   ID: ${enrollment.id}`)
    console.log(`   Thread: ${enrollment.gmailThreadId}`)
    console.log(`   Step: ${enrollment.currentStep}`)
    console.log(`   Contact: ${enrollment.contact.email}`)
    console.log(`   Last email sent: ${enrollment.lastEmailSentAt}`)
    console.log(`   Should fetch thread history: ${enrollment.currentStep > 0 && !!enrollment.gmailThreadId}`)
    
    // Test the Gmail service thread history fetch
    const gmailService = new GmailService()
    
    console.log('\n🔧 Testing getFullThreadHistory for latest enrollment...')
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
      console.log(`   Last Message ID: ${threadHistory.lastMessageId}`)
      
      // Show preview
      console.log('\n📧 Thread History Preview (first 500 chars):')
      console.log(`"${threadHistory.htmlContent.substring(0, 500)}..."`)
      
      // Simulate the EXACT sequence processor logic for step 5
      console.log('\n🔧 Simulating sequence processor logic for step 5...')
      
      // Get step content (step 5 would be index 4)
      const steps = enrollment.sequence.steps
      const stepIndex = enrollment.currentStep - 1 // Step 5 = index 4
      const step = steps[stepIndex]
      
      console.log(`   Step index: ${stepIndex}`)
      console.log(`   Step type: ${step?.type}`)
      console.log(`   Step content: "${step?.content}"`)
      console.log(`   Step replyToThread: ${step?.replyToThread}`)
      
      // EXACT sequence processor logic from lines 276-278
      const finalHtmlContent = `<div dir="ltr">${step?.content}</div>
<br>
${threadHistory.htmlContent}`
      
      console.log(`   Final HTML length: ${finalHtmlContent.length}`)
      console.log(`   Final has gmail_quote: ${finalHtmlContent.includes('gmail_quote')}`)
      
      console.log('\n📧 Final Content Preview (first 800 chars):')
      console.log(`"${finalHtmlContent.substring(0, 800)}..."`)
      
      // Test if tracking preserves the thread history
      console.log('\n🔧 Testing tracking preservation...')
      const trackingId = `seq:${enrollment.id}:${enrollment.currentStep}:${Date.now()}`
      
      const trackedContent = await gmailService.addTrackingToEmail(
        finalHtmlContent, 
        trackingId, 
        enrollment.contact.userId
      )
      
      console.log(`   Tracked content length: ${trackedContent.length}`)
      console.log(`   Tracked has gmail_quote: ${trackedContent.includes('gmail_quote')}`)
      
      if (finalHtmlContent.includes('gmail_quote') && !trackedContent.includes('gmail_quote')) {
        console.log('❌ CRITICAL: gmail_quote LOST during tracking!')
      } else if (finalHtmlContent.includes('gmail_quote') && trackedContent.includes('gmail_quote')) {
        console.log('✅ SUCCESS: gmail_quote preserved through tracking!')
      }
      
      console.log('\n🎯 ANALYSIS RESULT:')
      console.log(`   Thread history IS working: ${!!threadHistory}`)
      console.log(`   Content assembly IS working: ${finalHtmlContent.includes('gmail_quote')}`)
      console.log(`   Tracking preservation IS working: ${trackedContent.includes('gmail_quote')}`)
      
      if (threadHistory && finalHtmlContent.includes('gmail_quote') && trackedContent.includes('gmail_quote')) {
        console.log('\n✅ ALL SYSTEMS WORKING - The issue must be in production execution!')
        console.log('   The sequence processor logic is correct but might not be called properly.')
      } else {
        console.log('\n❌ Found the bug in the pipeline!')
      }
      
    } else {
      console.log('❌ Thread History Returned NULL')
      console.log('   This explains why thread history is missing!')
      
      // Check if Gmail token is valid
      const user = enrollment.contact.user
      if (user.gmailToken) {
        console.log(`   Gmail token expires: ${user.gmailToken.expiresAt}`)
        console.log(`   Token expired: ${user.gmailToken.expiresAt < new Date()}`)
      } else {
        console.log(`   No Gmail token found!`)
      }
    }
    
  } catch (error) {
    console.error('❌ Test Error:', error.message)
    console.error('   Stack:', error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

testLatestDeploymentEnrollment()