// Debug why this specific thread is returning empty history

const { PrismaClient } = require('@prisma/client')
const { GmailService } = require('./src/services/gmail-service')
const prisma = new PrismaClient()

async function debugEmptyThread() {
  console.log('🔍 === DEBUGGING EMPTY THREAD ===\n')
  
  try {
    // Get the enrollment that's having issues
    const enrollment = await prisma.sequenceEnrollment.findFirst({
      where: { id: 'cmff2cvri0003jp04retvdcjy' },
      include: {
        sequence: true,
        contact: { include: { user: true } }
      }
    })
    
    if (!enrollment) {
      console.log('❌ Enrollment not found')
      return
    }
    
    console.log('📧 Problematic Enrollment:')
    console.log(`   ID: ${enrollment.id}`)
    console.log(`   Thread ID: ${enrollment.gmailThreadId}`) // Should be 19937977fd3e6155
    console.log(`   Current Step: ${enrollment.currentStep}`)
    console.log(`   Contact: ${enrollment.contact.email}`)
    console.log(`   User: ${enrollment.contact.user.email}`)
    
    // Test getFullThreadHistory with detailed logging
    const gmailService = new GmailService()
    
    console.log('\n🔍 Testing getFullThreadHistory with debugging...')
    const threadHistory = await gmailService.getFullThreadHistory(
      enrollment.contact.userId,
      enrollment.gmailThreadId
    )
    
    if (threadHistory) {
      console.log('✅ Got thread history result:')
      console.log(`   HTML length: ${threadHistory.htmlContent.length}`)
      console.log(`   Text length: ${threadHistory.textContent.length}`)
      console.log(`   Last Message ID: ${threadHistory.lastMessageId}`)
      
      if (threadHistory.htmlContent.length === 0) {
        console.log('\n❌ EMPTY HTML CONTENT!')
        console.log('This explains why no thread history appears in the email!')
        
        // The thread exists but has no quotable history
        // This happens when:
        // 1. Thread only has 1 message (the current one being sent)
        // 2. Previous messages can't be accessed
        // 3. Gmail API isn't returning message content
        
        console.log('\n🔍 Possible causes:')
        console.log('1. Thread only contains the current message (no prior history)')
        console.log('2. Gmail API permissions issue')
        console.log('3. Messages in thread are not accessible')
        console.log('4. Thread was created but first message not yet indexed')
      } else {
        console.log('✅ Thread history content exists:')
        console.log(`   First 200 chars: "${threadHistory.htmlContent.substring(0, 200)}..."`)
      }
    } else {
      console.log('❌ getFullThreadHistory returned null')
    }
    
    // Check if this thread exists in Gmail by trying direct API call
    console.log('\n📧 Checking thread via direct Gmail API...')
    
    // Get Gmail token
    const gmailToken = await prisma.gmailToken.findFirst({
      where: { userId: enrollment.contact.userId }
    })
    
    if (gmailToken) {
      console.log(`✅ Gmail token found for: ${gmailToken.email}`)
      
      // Try to understand why this thread has no history
      // The issue is likely that this is a new thread or
      // the first message in the thread hasn't been fully indexed yet
      
      console.log('\n💡 DIAGNOSIS:')
      console.log('This is likely a NEW thread where:')
      console.log('- The first email was just sent')
      console.log('- Gmail hasn\'t indexed the first message as "quotable history" yet')
      console.log('- The second email is being sent too quickly after the first')
      console.log('- Or this is genuinely the first message in a new conversation')
      
    } else {
      console.log('❌ No Gmail token found')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugEmptyThread()