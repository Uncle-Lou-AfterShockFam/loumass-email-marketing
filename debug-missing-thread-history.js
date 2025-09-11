// Debug why thread history is missing in the final email

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function debugMissingHistory() {
  console.log('=== DEBUGGING MISSING THREAD HISTORY ===\n')
  
  try {
    const enrollment = await prisma.sequenceEnrollment.findFirst({
      where: { id: 'cmff1je430001la047t9zv6wk' },
      include: {
        sequence: true,
        contact: {
          include: { user: true }
        }
      }
    })
    
    if (!enrollment) {
      console.log('❌ Enrollment not found')
      return
    }
    
    console.log('📧 Enrollment Details:')
    console.log(`   ID: ${enrollment.id}`)
    console.log(`   Current Step: ${enrollment.currentStep}`)
    console.log(`   Thread ID: ${enrollment.gmailThreadId}`)
    console.log(`   Sequence: ${enrollment.sequence.name}`)
    
    // Get the current step content
    const steps = enrollment.sequence.steps
    const currentStepIndex = enrollment.currentStep - 1 // 0-indexed
    const step = steps[currentStepIndex]
    
    console.log('\\n📝 Current Step:')
    console.log(`   Step ${enrollment.currentStep}: ${step?.type || 'unknown'}`)
    console.log(`   Subject: ${step?.subject || 'no subject'}`)
    console.log(`   Content length: ${step?.content?.length || 0}`)
    
    // Simulate the sequence processor logic
    console.log('\\n🔄 Simulating Sequence Processor Logic:')
    
    const shouldReplyToThread = enrollment.currentStep > 0 && enrollment.gmailThreadId
    console.log(`   Should reply to thread: ${shouldReplyToThread}`)
    
    if (shouldReplyToThread) {
      console.log(`   Thread ID: ${enrollment.gmailThreadId}`)
      
      // Test getFullThreadHistory
      const { GmailService } = require('./src/services/gmail-service')
      const gmailService = new GmailService()
      
      console.log('   Calling getFullThreadHistory...')
      const fullHistory = await gmailService.getFullThreadHistory(
        enrollment.contact.userId,
        enrollment.gmailThreadId
      )
      
      if (fullHistory) {
        console.log('   ✅ Got thread history from Gmail')
        console.log(`   HTML length: ${fullHistory.htmlContent.length}`)
        
        // Simulate building finalHtmlContent
        const mainContent = step?.content || '<div>Test content</div>'
        const finalHtmlContent = `<div dir="ltr">${mainContent}</div>
<br>
${fullHistory.htmlContent}`
        
        console.log('\\n📧 Final HTML Content Built:')
        console.log(`   Total length: ${finalHtmlContent.length}`)
        console.log(`   Has gmail_quote: ${finalHtmlContent.includes('gmail_quote')}`)
        console.log('   First 300 chars:', finalHtmlContent.substring(0, 300))
        
        // Simulate tracking addition
        console.log('\\n🏷️ Simulating Tracking Addition:')
        
        // This is what addTrackingToEmail does
        const trackingId = 'test-tracking-id'
        console.log(`   Calling addTrackingToEmail with ${finalHtmlContent.length} chars`)
        
        // Simulate stripTrackingFromQuotedContent
        console.log('   Stripping tracking from quoted content...')
        
        const quoteStartRegex = /<(?:div|blockquote)[^>]*class="gmail_quote[^"]*"[^>]*>/i
        const quoteMatch = finalHtmlContent.match(quoteStartRegex)
        
        if (quoteMatch) {
          const quoteIndex = finalHtmlContent.indexOf(quoteMatch[0])
          console.log(`   Found quote at index: ${quoteIndex}`)
          
          const mainPart = finalHtmlContent.substring(0, quoteIndex)
          const quotedPart = finalHtmlContent.substring(quoteIndex)
          
          console.log(`   Main part length: ${mainPart.length}`)
          console.log(`   Quoted part length: ${quotedPart.length}`)
          
          // Check for existing tracking in quoted part
          const hasTracking = quotedPart.includes('/api/track/')
          console.log(`   Quoted part has tracking: ${hasTracking}`)
          
          if (hasTracking) {
            console.log('   🔧 Would strip existing tracking')
          }
          
          const afterStripping = mainPart + quotedPart
          console.log(`   After stripping length: ${afterStripping.length}`)
          
          if (afterStripping.length !== finalHtmlContent.length) {
            console.log('   ❌ Content length changed during stripping!')
            console.log('   This indicates content was lost')
          } else {
            console.log('   ✅ Content preserved during stripping')
          }
          
        } else {
          console.log('   ❌ No gmail_quote found in final content!')
          console.log('   This indicates the thread history structure is wrong')
        }
        
      } else {
        console.log('   ❌ getFullThreadHistory returned null')
        console.log('   Would fall back to database history...')
        
        // Check database fallback
        const emailEvents = await prisma.emailEvent.findMany({
          where: {
            contactId: enrollment.contactId,
            sequenceId: enrollment.sequenceId,
            type: 'SENT'
          },
          orderBy: { createdAt: 'asc' }
        })
        
        console.log(`   Found ${emailEvents.length} email events for fallback`)
        if (emailEvents.length === 0) {
          console.log('   ❌ No email events - no thread history possible')
        }
      }
    } else {
      console.log('   ✅ First email in sequence - no thread history needed')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugMissingHistory()