const { PrismaClient } = require('@prisma/client')
const { GmailService } = require('./src/services/gmail-service')

async function testProductionThreadLive() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔍 Testing LIVE production thread history issue...')
    
    // Get the enrollment that just failed
    const enrollment = await prisma.sequenceEnrollment.findUnique({
      where: {
        id: 'cmff851yk0003l504u182n1fu'
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
    
    if (!enrollment) {
      console.error('❌ Enrollment not found')
      return
    }
    
    console.log(`📧 Enrollment Details:`)
    console.log(`   ID: ${enrollment.id}`)
    console.log(`   Contact: ${enrollment.contact.email}`)
    console.log(`   Thread ID: ${enrollment.gmailThreadId}`)
    console.log(`   Current step: ${enrollment.currentStep}`)
    console.log(`   Last email: ${enrollment.lastEmailSentAt?.toISOString()}`)
    
    // Get the actual step that was sent
    const sequence = enrollment.sequence
    const steps = Array.isArray(sequence.steps) ? sequence.steps : JSON.parse(sequence.steps)
    const currentStep = steps[enrollment.currentStep - 1]
    
    console.log('\n📝 Step 2 content (the one that failed):')
    console.log(currentStep?.content?.substring(0, 200))
    
    // Test getFullThreadHistory
    const gmailService = new GmailService()
    
    console.log('\n🔄 Testing getFullThreadHistory with production data...')
    console.log(`   User ID: ${enrollment.sequence.user.id}`)
    console.log(`   Thread ID: ${enrollment.gmailThreadId}`)
    
    const fullHistory = await gmailService.getFullThreadHistory(
      enrollment.sequence.user.id,
      enrollment.gmailThreadId
    )
    
    if (fullHistory) {
      console.log(`\n✅ Thread history retrieved: ${fullHistory.htmlContent.length} chars`)
      console.log(`✅ Contains gmail_quote: ${fullHistory.htmlContent.includes('gmail_quote')}`)
      
      // Show what the email SHOULD have looked like
      let content = currentStep?.content || ''
      content = content.replace(/\{\{firstName\}\}/g, enrollment.contact.firstName || enrollment.contact.email.split('@')[0])
      
      const finalHtmlContent = `<div dir="ltr">${content}</div>
<br>
${fullHistory.htmlContent}`
      
      console.log('\n📧 What the email SHOULD have contained:')
      console.log('Length:', finalHtmlContent.length)
      console.log('Contains gmail_quote:', finalHtmlContent.includes('gmail_quote'))
      console.log('\nFirst 500 chars of what should have been sent:')
      console.log(finalHtmlContent.substring(0, 500))
      
      console.log('\n🔍 THE ISSUE:')
      console.log('Production IS NOT including this thread history in the emails!')
      console.log('The sequenceProcessor logic works locally but fails in production.')
      
    } else {
      console.error('❌ getFullThreadHistory returned null')
    }
    
    // Check the latest production deployment details
    console.log('\n🚀 Production Environment Check:')
    console.log(`   Vercel Deployment: v5WegdBNkAptKCiseBTazZg1zT1A`)
    console.log(`   Commit: "FINAL FIX: Force production deployment with Gmail thread history fix"`)
    console.log(`   Time: ${new Date().toISOString()}`)
    
  } catch (error) {
    console.error('💥 ERROR:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testProductionThreadLive()