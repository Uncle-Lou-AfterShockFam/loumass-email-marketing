// Let's trace the exact issue by adding temporary debugging

const { PrismaClient } = require('@prisma/client')
const { GmailService } = require('./src/services/gmail-service')
const prisma = new PrismaClient()

async function findTheBug() {
  console.log('=== FINDING THE BUG ===\n')
  
  try {
    // Get the enrollment that sent the problematic email
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
    
    // Get the step content
    const steps = enrollment.sequence.steps
    const step = steps[enrollment.currentStep - 1]
    const content = step.content || '<div>Test content</div>'
    
    console.log('📧 Step Content:')
    console.log(`   Raw content: ${content}`)
    
    // Simulate sequence processor building finalHtmlContent
    console.log('\\n🔄 Simulating finalHtmlContent build...')
    
    const gmailService = new GmailService()
    const fullHistory = await gmailService.getFullThreadHistory(
      enrollment.contact.userId,
      enrollment.gmailThreadId
    )
    
    if (!fullHistory) {
      console.log('❌ No thread history - this explains it!')
      return
    }
    
    console.log(`✅ Got thread history: ${fullHistory.htmlContent.length} chars`)
    
    // This is exactly what sequence processor does
    const finalHtmlContent = `<div dir="ltr">${content}</div>
<br>
${fullHistory.htmlContent}`
    
    console.log('\\n📧 Final HTML Content Built:')
    console.log(`   Length: ${finalHtmlContent.length}`)
    console.log(`   Has gmail_quote: ${finalHtmlContent.includes('gmail_quote')}`)
    console.log(`   First 200 chars: "${finalHtmlContent.substring(0, 200)}..."`)
    
    // Now simulate what sendEmail does
    console.log('\\n🏷️ Simulating addTrackingToEmail...')
    
    const trackingId = 'test-tracking-123'
    
    // This is exactly what sendEmail calls
    const trackedHtml = await gmailService.addTrackingToEmail(finalHtmlContent, trackingId, enrollment.contact.userId)
    
    console.log('\\n📧 After Tracking Addition:')
    console.log(`   Length: ${trackedHtml.length}`)
    console.log(`   Has gmail_quote: ${trackedHtml.includes('gmail_quote')}`)
    console.log(`   Has tracking: ${trackedHtml.includes('/api/track/')}`)
    console.log(`   First 300 chars: "${trackedHtml.substring(0, 300)}..."`)
    
    if (!trackedHtml.includes('gmail_quote')) {
      console.log('\\n❌ GMAIL_QUOTE LOST DURING TRACKING!')
      console.log('This is the bug - addTrackingToEmail is removing the quoted content')
      
      // Let's see where it gets lost
      const testInput = finalHtmlContent
      console.log('\\n🔍 Debug tracking step by step:')
      console.log(`   Input length: ${testInput.length}`)
      console.log(`   Input has gmail_quote: ${testInput.includes('gmail_quote')}`)
      
    } else {
      console.log('\\n✅ Thread history preserved through tracking')
      
      // The bug must be elsewhere - maybe in buildMessage or Gmail API
      console.log('\\n🔍 Bug must be in buildMessage or Gmail API processing')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

findTheBug()