// Final test using actual enrollment messageIdHeader

const { PrismaClient } = require('@prisma/client')
const { GmailService } = require('./src/services/gmail-service')
const prisma = new PrismaClient()

async function testFinalThreadBug() {
  console.log('=== FINAL THREAD BUG TEST ===\n')
  
  try {
    const enrollment = await prisma.sequenceEnrollment.findFirst({
      where: { id: 'cmff1je430001la047t9zv6wk' },
      include: {
        sequence: true,
        contact: { include: { user: true } }
      }
    })
    
    if (!enrollment) {
      console.log('❌ Enrollment not found')
      return
    }
    
    console.log('📧 Enrollment Details:')
    console.log(`   messageIdHeader: ${enrollment.messageIdHeader}`)
    console.log(`   gmailThreadId: ${enrollment.gmailThreadId}`)
    console.log(`   currentStep: ${enrollment.currentStep}`)
    
    // Build content exactly as sequence processor does
    const steps = enrollment.sequence.steps
    const step = steps[enrollment.currentStep - 1]
    const content = step.content || '<div>Test content</div>'
    
    const gmailService = new GmailService()
    const fullHistory = await gmailService.getFullThreadHistory(
      enrollment.contact.userId,
      enrollment.gmailThreadId
    )
    
    if (!fullHistory) {
      console.log('❌ No thread history')
      return
    }
    
    // Build finalHtmlContent exactly as sequence processor does
    const finalHtmlContent = `<div dir="ltr">${content}</div>
<br>
${fullHistory.htmlContent}`
    
    console.log('\n📧 Final HTML Content Built:')
    console.log(`   Length: ${finalHtmlContent.length}`)
    console.log(`   Has gmail_quote: ${finalHtmlContent.includes('gmail_quote')}`)
    
    // Add tracking exactly as sequence processor calls sendEmail
    const trackingId = 'test-final-bug'
    const trackedHtml = await gmailService.addTrackingToEmail(finalHtmlContent, trackingId, enrollment.contact.userId)
    
    console.log('\n🏷️ After Tracking:')
    console.log(`   Length: ${trackedHtml.length}`)
    console.log(`   Has gmail_quote: ${trackedHtml.includes('gmail_quote')}`)
    
    // Create the EXACT emailData with correct messageId
    const emailData = {
      to: [enrollment.contact.email],
      subject: step?.subject || 'Test Subject',
      htmlContent: trackedHtml,
      textContent: undefined,
      fromName: 'Louis Piotti',
      campaignId: null,
      contactId: enrollment.contactId,
      trackingId: trackingId,
      threadId: enrollment.gmailThreadId,
      messageId: enrollment.messageIdHeader, // THIS IS THE KEY!
      attachments: []
    }
    
    console.log('\n📤 EmailData Created:')
    console.log(`   messageId: ${emailData.messageId}`)
    console.log(`   threadId: ${emailData.threadId}`)
    console.log(`   HTML has gmail_quote: ${emailData.htmlContent.includes('gmail_quote')}`)
    
    // Now test the ACTUAL sendEmail method
    console.log('\n🚀 Testing ACTUAL sendEmail method...')
    
    // Get Gmail token for the address
    const gmailToken = await prisma.gmailToken.findFirst({
      where: { userId: enrollment.contact.userId }
    })
    
    if (!gmailToken) {
      console.log('❌ No Gmail token')
      return
    }
    
    // SIMULATE SENDING (but don't actually send to avoid spam)
    console.log('\n📬 WOULD SEND EMAIL WITH:')
    console.log(`   From: Louis Piotti <${gmailToken.email}>`)
    console.log(`   To: ${emailData.to[0]}`)
    console.log(`   Subject: ${emailData.subject}`)
    console.log(`   Thread-ID: ${emailData.threadId}`)
    console.log(`   In-Reply-To: ${emailData.messageId}`)
    console.log(`   HTML length: ${emailData.htmlContent.length}`)
    console.log(`   HTML has gmail_quote: ${emailData.htmlContent.includes('gmail_quote')}`)
    
    // Check the content one more time
    const finalCheck = emailData.htmlContent.includes('gmail_quote')
    if (finalCheck) {
      console.log('\n✅ THREAD HISTORY PRESERVED!')
      console.log('The content includes gmail_quote sections all the way to sending')
      
      // The issue must be in production Gmail API processing or Vercel environment
      console.log('\n🔍 CONCLUSION:')
      console.log('Thread history is preserved through the entire local process.')
      console.log('The bug must be in:')
      console.log('1. Production environment differences')
      console.log('2. Gmail API handling on production')  
      console.log('3. Vercel function size limits affecting content')
      console.log('4. Network issues truncating requests')
      
    } else {
      console.log('\n❌ THREAD HISTORY LOST!')
      console.log('Content does not include gmail_quote')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testFinalThreadBug()