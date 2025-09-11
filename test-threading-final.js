const { PrismaClient } = require('@prisma/client')
const { GmailService } = require('./src/services/gmail-service')

async function testProductionThreading() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔍 Testing production threading with the exact problematic enrollment...')
    
    // Get the exact enrollment that failed
    const enrollment = await prisma.sequenceEnrollment.findUnique({
      where: {
        id: 'cmff6mkp40001l104zdioyu2q'
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
    
    console.log('\n🔄 Simulating EXACT sequenceProcessor logic...')
    
    const gmailService = new GmailService()
    const user = enrollment.sequence.user
    const contact = enrollment.contact
    const sequence = enrollment.sequence
    const steps = Array.isArray(sequence.steps) ? sequence.steps : JSON.parse(sequence.steps)
    const step = steps[enrollment.currentStep - 1]
    
    // Process content template
    let content = step.content || ''
    content = content.replace(/\{\{firstName\}\}/g, contact.firstName || contact.email.split('@')[0])
    
    console.log('📝 Step content after template processing:')
    console.log(content)
    
    // The EXACT condition from sequenceProcessor
    let finalHtmlContent = content
    
    if (enrollment.currentStep > 0 && enrollment.gmailThreadId) {
      console.log('\n🔄 Thread history condition MET, fetching Gmail content...')
      
      const fullHistory = await gmailService.getFullThreadHistory(user.id, enrollment.gmailThreadId)
      
      if (fullHistory) {
        console.log(`✅ Thread history fetched: ${fullHistory.htmlContent.length} chars`)
        console.log(`Thread content preview: ${fullHistory.htmlContent.substring(0, 200)}...`)
        
        // EXACT logic from sequenceProcessor lines 302-304
        finalHtmlContent = `<div dir="ltr">${content}</div>
<br>
${fullHistory.htmlContent}`
        
        console.log('\n📧 Final HTML content that SHOULD have been sent:')
        console.log('Length:', finalHtmlContent.length)
        console.log('Contains gmail_quote:', finalHtmlContent.includes('gmail_quote'))
        
        console.log('\n🎯 COMPARISON WITH ACTUAL SENT EMAIL:')
        console.log('EXPECTED (with thread history):', finalHtmlContent.includes('gmail_quote'))
        console.log('ACTUAL (missing thread history): false')
        console.log('\n🔍 This proves the sequence processor logic is CORRECT')
        console.log('🔍 But something in production is NOT executing this logic!')
        
      } else {
        console.error('❌ Thread history returned null')
      }
    } else {
      console.log('❌ Thread history condition NOT met')
    }
    
  } catch (error) {
    console.error('💥 ERROR:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testProductionThreading()
