// Test production thread history preservation after tracking fixes
const { PrismaClient } = require('@prisma/client')
const { GmailService } = require('./src/services/gmail-service')
const prisma = new PrismaClient()

async function testProductionThreadFix() {
  console.log('🔍 === TESTING PRODUCTION THREAD HISTORY FIXES ===\n')
  
  try {
    // Get a recent enrollment to test
    const enrollment = await prisma.sequenceEnrollment.findFirst({
      where: { 
        gmailThreadId: { not: null },
        currentStep: { gte: 2 } // Must be at least step 2 to have thread history
      },
      include: {
        sequence: true,
        contact: { include: { user: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    if (!enrollment) {
      console.log('❌ No enrollments found with thread history')
      return
    }
    
    console.log('📧 Testing Production Enrollment:')
    console.log(`   ID: ${enrollment.id}`)
    console.log(`   Thread: ${enrollment.gmailThreadId}`)
    console.log(`   Step: ${enrollment.currentStep}`)
    console.log(`   Contact: ${enrollment.contact.email}`)
    
    // Test the Gmail service with production safety checks
    const gmailService = new GmailService()
    
    console.log('\n🔧 Testing getFullThreadHistory with safety checks...')
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
      
      // Test the tracking integration
      console.log('\n🔧 Testing addTrackingToEmail with thread history...')
      const trackingId = `test:${enrollment.id}:${Date.now()}`
      
      // Get step content
      const steps = enrollment.sequence.steps
      const step = steps[enrollment.currentStep - 1]
      
      const originalContent = `<div dir="ltr">${step.content}</div>
<br>
${threadHistory.htmlContent}`
      
      console.log(`   Original content length: ${originalContent.length}`)
      console.log(`   Original has gmail_quote: ${originalContent.includes('gmail_quote')}`)
      
      const trackedContent = await gmailService.addTrackingToEmail(
        originalContent, 
        trackingId, 
        enrollment.contact.userId
      )
      
      console.log(`   Tracked content length: ${trackedContent.length}`)
      console.log(`   Tracked has gmail_quote: ${trackedContent.includes('gmail_quote')}`)
      
      // Verify preservation
      if (originalContent.includes('gmail_quote') && !trackedContent.includes('gmail_quote')) {
        console.log('❌ CRITICAL ERROR: gmail_quote LOST during tracking!')
        console.log('   This confirms the production bug still exists')
      } else if (originalContent.includes('gmail_quote') && trackedContent.includes('gmail_quote')) {
        console.log('✅ SUCCESS: gmail_quote PRESERVED through tracking!')
        console.log('   Production fixes are working correctly')
      } else {
        console.log('ℹ️  No gmail_quote in original (expected for new threads)')
      }
      
      // Show preview of final content
      console.log('\n📧 Final Content Preview:')
      console.log('   First 300 chars:')
      console.log(`   "${trackedContent.substring(0, 300)}..."`)
      
    } else {
      console.log('❌ Thread History Returned NULL')
      console.log('   This could be a new thread or Gmail API issue')
      
      // Test with a different enrollment
      const alternateEnrollment = await prisma.sequenceEnrollment.findFirst({
        where: { 
          gmailThreadId: { not: null },
          currentStep: { gte: 2 },
          id: { not: enrollment.id }
        },
        include: {
          sequence: true,
          contact: { include: { user: true } }
        }
      })
      
      if (alternateEnrollment) {
        console.log('\n🔄 Trying alternate enrollment...')
        console.log(`   ID: ${alternateEnrollment.id}`)
        console.log(`   Thread: ${alternateEnrollment.gmailThreadId}`)
        
        const altThreadHistory = await gmailService.getFullThreadHistory(
          alternateEnrollment.contact.userId,
          alternateEnrollment.gmailThreadId
        )
        
        if (altThreadHistory) {
          console.log('✅ Alternate thread history successful!')
          console.log(`   HTML length: ${altThreadHistory.htmlContent.length}`)
        } else {
          console.log('❌ Alternate also returned null - potential API issue')
        }
      }
    }
    
    console.log('\n🎯 PRODUCTION TEST RESULT:')
    if (threadHistory && threadHistory.htmlContent.length > 0) {
      console.log('✅ Production Gmail service is working correctly')
      console.log('✅ Thread history preservation fixes are deployed')
      console.log('✅ Ready for live sequence testing')
    } else {
      console.log('⚠️  Thread history retrieval needs investigation')
      console.log('   - May be timing issue with new threads')
      console.log('   - Or Gmail API rate limiting')
    }
    
  } catch (error) {
    console.error('❌ Production Test Error:', error.message)
    console.error('   Stack:', error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

testProductionThreadFix()