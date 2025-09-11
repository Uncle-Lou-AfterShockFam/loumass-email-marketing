// Debug the exact enrollment that's missing thread history in production
const { PrismaClient } = require('@prisma/client')
const { GmailService } = require('./src/services/gmail-service')
const prisma = new PrismaClient()

async function debugProductionEnrollment() {
  console.log('🔍 === DEBUGGING PRODUCTION ENROLLMENT THREAD HISTORY ===\n')
  
  try {
    // Get the exact enrollment from the failing sequence
    const enrollment = await prisma.sequenceEnrollment.findFirst({
      where: { 
        id: 'cmff3qedg0001k004xzid78rp' // The enrollment that sent the email without thread history
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
    
    console.log('📧 Debugging Production Enrollment:')
    console.log(`   ID: ${enrollment.id}`)
    console.log(`   Thread: ${enrollment.gmailThreadId}`)
    console.log(`   Step: ${enrollment.currentStep}`)
    console.log(`   Contact: ${enrollment.contact.email}`)
    console.log(`   Should fetch thread history: ${enrollment.currentStep > 0 && !!enrollment.gmailThreadId}`)
    console.log(`   Last email sent: ${enrollment.lastEmailSentAt}`)
    
    // Test the Gmail service thread history fetch exactly as sequence processor does
    const gmailService = new GmailService()
    
    console.log('\n🔧 Testing getFullThreadHistory EXACTLY like sequence processor...')
    console.log(`   Using userId: ${enrollment.contact.userId}`)
    console.log(`   Using threadId: ${enrollment.gmailThreadId}`)
    
    const startTime = Date.now()
    
    // This is the EXACT call sequence processor makes
    const fullHistory = await gmailService.getFullThreadHistory(
      enrollment.contact.userId,
      enrollment.gmailThreadId
    )
    
    const duration = Date.now() - startTime
    console.log(`   ⏱️  Duration: ${duration}ms`)
    
    if (fullHistory) {
      console.log('✅ Thread History Retrieved Successfully!')
      console.log(`   HTML length: ${fullHistory.htmlContent.length}`)
      console.log(`   Text length: ${fullHistory.textContent.length}`)
      console.log(`   Has gmail_quote: ${fullHistory.htmlContent.includes('gmail_quote')}`)
      console.log(`   Has gmail_attr: ${fullHistory.htmlContent.includes('gmail_attr')}`)
      console.log(`   Last Message ID: ${fullHistory.lastMessageId}`)
      
      // Show the exact thread history preview
      console.log('\n📧 Thread History HTML Preview:')
      console.log(`"${fullHistory.htmlContent.substring(0, 800)}..."`)
      
      // Simulate exactly what sequence processor does
      console.log('\n🔧 Simulating sequence processor thread assembly...')
      
      // Get the step content from the sequence
      const steps = enrollment.sequence.steps
      const step = steps[enrollment.currentStep - 1] // Current step is 1-based
      console.log(`   Current step index: ${enrollment.currentStep - 1}`)
      console.log(`   Step content: ${step?.content || 'NO CONTENT'}`)
      
      // This is EXACTLY what sequence processor does
      const finalHtmlContent = `<div dir="ltr">${step?.content || 'NO CONTENT'}</div>
<br>
${fullHistory.htmlContent}`
      
      console.log(`   Final HTML length: ${finalHtmlContent.length}`)
      console.log(`   Final has gmail_quote: ${finalHtmlContent.includes('gmail_quote')}`)
      
      console.log('\n📧 EXACT Final Content (first 1000 chars):')
      console.log(`"${finalHtmlContent.substring(0, 1000)}..."`)
      
      // Check if the issue is in the tracking integration
      console.log('\n🔧 Testing tracking integration with thread history...')
      
      const isTrackingEnabled = enrollment.sequence.trackingEnabled && (step?.trackingEnabled !== false)
      console.log(`   Tracking enabled: ${isTrackingEnabled}`)
      
      if (isTrackingEnabled) {
        const trackingData = `seq:${enrollment.id}:${enrollment.currentStep}:${Date.now()}`
        const trackingId = Buffer.from(trackingData).toString('base64url')
        console.log(`   Would use tracking ID: ${trackingId}`)
        
        // Test addTrackingToEmail with this exact content
        const trackedContent = await gmailService.addTrackingToEmail(
          finalHtmlContent, 
          trackingId, 
          enrollment.contact.userId
        )
        
        console.log(`   Tracked content length: ${trackedContent.length}`)
        console.log(`   Tracked has gmail_quote: ${trackedContent.includes('gmail_quote')}`)
        
        if (finalHtmlContent.includes('gmail_quote') && !trackedContent.includes('gmail_quote')) {
          console.log('❌ CRITICAL BUG FOUND: gmail_quote LOST during tracking!')
          console.log('   This is why production emails are missing thread history!')
        } else if (finalHtmlContent.includes('gmail_quote') && trackedContent.includes('gmail_quote')) {
          console.log('✅ SUCCESS: gmail_quote PRESERVED through tracking!')
        }
        
        console.log('\n📧 FINAL Tracked Content (first 1000 chars):')
        console.log(`"${trackedContent.substring(0, 1000)}..."`)
      }
      
    } else {
      console.log('❌ Thread History Returned NULL')
      console.log('   This is why the sequence processor cannot include thread history!')
      console.log('   Gmail API is not returning thread content for this thread')
      
      // Debug why Gmail API is failing
      console.log('\n🔍 Debugging Gmail API failure...')
      console.log(`   Thread ID format: ${enrollment.gmailThreadId}`)
      console.log(`   Thread ID length: ${enrollment.gmailThreadId.length}`)
      console.log(`   Is hex: ${/^[0-9a-fA-F]+$/.test(enrollment.gmailThreadId)}`)
      
      // Check if user has valid Gmail token
      const user = enrollment.contact.user
      if (user.gmailToken) {
        console.log(`   Gmail token exists: YES`)
        console.log(`   Token expires: ${user.gmailToken.expiresAt}`)
        console.log(`   Token expired: ${user.gmailToken.expiresAt < new Date()}`)
      } else {
        console.log(`   Gmail token exists: NO`)
      }
    }
    
  } catch (error) {
    console.error('❌ Debug Error:', error.message)
    console.error('   Stack:', error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

debugProductionEnrollment()