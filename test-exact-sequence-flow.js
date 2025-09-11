const { PrismaClient } = require('@prisma/client')
const { GmailService } = require('./src/services/gmail-service')

async function testExactSequenceFlow() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔍 Testing exact sequence flow that should have included thread history...')
    
    // Get the problematic enrollment
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
    
    console.log('📧 Problematic enrollment found:')
    console.log(`   Thread ID: ${enrollment.gmailThreadId}`)
    console.log(`   Step: ${enrollment.currentStep}`)
    console.log(`   User ID: ${enrollment.sequence.user.id}`)
    
    // Get the sequence step content
    const sequence = enrollment.sequence
    const steps = Array.isArray(sequence.steps) ? sequence.steps : JSON.parse(sequence.steps)
    const stepData = steps[enrollment.currentStep - 1]
    
    console.log('\n📄 Step content template:')
    console.log(stepData?.content)
    
    // Process template with contact data
    let content = stepData?.content || ''
    content = content.replace(/\{\{firstName\}\}/g, enrollment.contact.firstName || enrollment.contact.email.split('@')[0])
    content = content.replace(/\{\{lastName\}\}/g, enrollment.contact.lastName || '')
    content = content.replace(/\{\{email\}\}/g, enrollment.contact.email)
    content = content.replace(/\{\{companyName\}\}/g, enrollment.contact.companyName || '')
    
    console.log('\n📝 Processed content:')
    console.log(content)
    
    // Now test the EXACT condition that should trigger thread history
    console.log('\n🧠 Testing thread history condition:')
    console.log(`   enrollment.currentStep: ${enrollment.currentStep}`)
    console.log(`   enrollment.currentStep > 0: ${enrollment.currentStep > 0}`)
    console.log(`   enrollment.gmailThreadId: ${enrollment.gmailThreadId}`)
    console.log(`   enrollment.gmailThreadId exists: ${!!enrollment.gmailThreadId}`)
    
    const shouldFetchHistory = enrollment.currentStep > 0 && enrollment.gmailThreadId
    console.log(`   🎯 Should fetch history: ${shouldFetchHistory}`)
    
    if (shouldFetchHistory) {
      console.log('\n🔄 Testing getFullThreadHistory call...')
      const gmailService = new GmailService()
      const fullHistory = await gmailService.getFullThreadHistory(
        enrollment.sequence.user.id,
        enrollment.gmailThreadId
      )
      
      if (fullHistory) {
        console.log(`✅ Thread history fetched: ${fullHistory.htmlContent.length} chars`)
        
        // Build the EXACT final content that should have been sent
        const finalHtmlContent = `<div dir="ltr">${content}</div>
<br>
${fullHistory.htmlContent}`
        
        console.log('\n📧 Final HTML content that SHOULD have been sent:')
        console.log(finalHtmlContent.substring(0, 1000))
        console.log('\n🎯 THIS IS WHAT THE EMAIL SHOULD HAVE LOOKED LIKE!')
        
        // Check if it contains the missing elements
        if (finalHtmlContent.includes('gmail_quote')) {
          console.log('✅ Contains gmail_quote - This would have been a proper threaded reply')
        }
        
      } else {
        console.error('❌ getFullThreadHistory returned null')
      }
    } else {
      console.log('❌ Condition failed - thread history would not be fetched')
    }
    
  } catch (error) {
    console.error('💥 ERROR:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testExactSequenceFlow()