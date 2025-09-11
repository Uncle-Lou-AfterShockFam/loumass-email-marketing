// Trace the exact sequence processing to find where thread history is lost

const { PrismaClient } = require('@prisma/client')
const { GmailService } = require('./src/services/gmail-service')
const prisma = new PrismaClient()

async function traceSequenceBug() {
  console.log('🔍 === TRACING SEQUENCE BUG ===\n')
  
  try {
    // Get the problematic enrollment
    const enrollment = await prisma.sequenceEnrollment.findFirst({
      where: { id: 'cmff2cvri0003jp04retvdcjy' },
      include: {
        sequence: true,
        contact: { include: { user: true } }
      }
    })
    
    console.log('📧 Tracing enrollment:', enrollment.id)
    console.log(`   Thread ID: ${enrollment.gmailThreadId}`)
    console.log(`   Current Step: ${enrollment.currentStep}`)
    
    // Step 1: Get the step content (what sequence processor does)
    const steps = enrollment.sequence.steps
    const step = steps[enrollment.currentStep - 1]
    console.log('\n📋 Step 1: Get step content')
    console.log(`   Step index: ${enrollment.currentStep - 1}`)
    console.log(`   Step content: "${step.content}"`)
    console.log(`   Step subject: "${step.subject}"`)
    
    // Step 2: Get thread history (what sequence processor does)
    console.log('\n📋 Step 2: Get thread history')
    const gmailService = new GmailService()
    
    const threadHistory = await gmailService.getFullThreadHistory(
      enrollment.contact.userId,
      enrollment.gmailThreadId
    )
    
    console.log(`   Thread history result: ${threadHistory ? 'SUCCESS' : 'NULL'}`)
    if (threadHistory) {
      console.log(`   HTML length: ${threadHistory.htmlContent.length}`)
      console.log(`   Has gmail_quote: ${threadHistory.htmlContent.includes('gmail_quote')}`)
      console.log(`   First 100 chars: "${threadHistory.htmlContent.substring(0, 100)}..."`)
    }
    
    // Step 3: Build finalHtmlContent (what sequence processor does)
    console.log('\n📋 Step 3: Build finalHtmlContent')
    let finalHtmlContent
    
    if (threadHistory) {
      finalHtmlContent = `<div dir="ltr">${step.content}</div>
<br>
${threadHistory.htmlContent}`
      console.log(`   Final HTML built with thread history`)
      console.log(`   Final HTML length: ${finalHtmlContent.length}`)
      console.log(`   Final HTML has gmail_quote: ${finalHtmlContent.includes('gmail_quote')}`)
    } else {
      console.log('   ❌ NO THREAD HISTORY - using content only')
      finalHtmlContent = `<div dir="ltr">${step.content}</div>`
    }
    
    // Step 4: Add tracking (what sendEmail does)
    console.log('\n📋 Step 4: Add tracking')
    const trackingId = `seq:${enrollment.id}:${enrollment.currentStep}:${Date.now()}`
    
    console.log(`   Tracking ID: ${trackingId}`)
    console.log(`   Input HTML length: ${finalHtmlContent.length}`)
    console.log(`   Input has gmail_quote: ${finalHtmlContent.includes('gmail_quote')}`)
    
    const trackedHtml = await gmailService.addTrackingToEmail(finalHtmlContent, trackingId, enrollment.contact.userId)
    
    console.log(`   Tracked HTML length: ${trackedHtml.length}`)
    console.log(`   Tracked HTML has gmail_quote: ${trackedHtml.includes('gmail_quote')}`)
    
    // Step 5: Build email data (what sendEmail does)
    console.log('\n📋 Step 5: Build email data')
    const emailData = {
      to: [enrollment.contact.email],
      subject: step.subject,
      htmlContent: trackedHtml,
      textContent: undefined,
      fromName: 'Louis Piotti',
      campaignId: null,
      contactId: enrollment.contactId,
      trackingId: trackingId,
      threadId: enrollment.gmailThreadId,
      messageId: threadHistory?.lastMessageId,
      attachments: []
    }
    
    console.log(`   EmailData HTML length: ${emailData.htmlContent.length}`)
    console.log(`   EmailData has gmail_quote: ${emailData.htmlContent.includes('gmail_quote')}`)
    console.log(`   EmailData threadId: ${emailData.threadId}`)
    console.log(`   EmailData messageId: ${emailData.messageId}`)
    
    // Check if the issue is in the production sequence processor
    console.log('\n🔍 ANALYSIS:')
    
    if (!threadHistory) {
      console.log('❌ ISSUE: getFullThreadHistory returned null')
      console.log('   - This explains missing thread history')
      console.log('   - But our test shows it should return 875 chars!')
      console.log('   - There may be a difference between test and production')
    } else if (threadHistory.htmlContent.length === 0) {
      console.log('❌ ISSUE: getFullThreadHistory returned empty HTML')
      console.log('   - Thread exists but no quotable content')
    } else if (!finalHtmlContent.includes('gmail_quote')) {
      console.log('❌ ISSUE: gmail_quote lost during HTML building')
    } else if (!trackedHtml.includes('gmail_quote')) {
      console.log('❌ ISSUE: gmail_quote lost during tracking')
    } else {
      console.log('✅ All processing preserves gmail_quote')
      console.log('❌ Issue must be in production environment or Gmail API call')
    }
    
    // Final test - show exactly what SHOULD be sent
    console.log('\n📤 WHAT SHOULD BE SENT:')
    console.log('Subject:', emailData.subject)
    console.log('HTML length:', emailData.htmlContent.length)
    console.log('Has thread history:', emailData.htmlContent.includes('gmail_quote'))
    console.log('First 200 chars of HTML:')
    console.log(`"${emailData.htmlContent.substring(0, 200)}..."`)
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

traceSequenceBug()