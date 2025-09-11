const { PrismaClient } = require('@prisma/client')

async function debugSequenceProcessor() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔍 Debugging sequence processor logic...')
    
    // Get the enrollment that just sent the problematic email
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
    
    console.log('\n📊 Enrollment Analysis:')
    console.log(`   Current Step: ${enrollment.currentStep}`)
    console.log(`   Gmail Thread ID: ${enrollment.gmailThreadId}`)
    console.log(`   Thread ID type: ${typeof enrollment.gmailThreadId}`)
    console.log(`   Thread ID length: ${enrollment.gmailThreadId?.length}`)
    
    // Check the condition logic
    const hasThreadId = enrollment.gmailThreadId !== null && enrollment.gmailThreadId !== undefined
    const isStepGreaterThanZero = enrollment.currentStep > 0
    
    console.log('\n🧠 Condition Analysis:')
    console.log(`   enrollment.currentStep > 0: ${isStepGreaterThanZero}`)
    console.log(`   enrollment.gmailThreadId exists: ${hasThreadId}`)
    console.log(`   Combined condition: ${isStepGreaterThanZero && hasThreadId}`)
    
    // Check if thread ID looks like a real Gmail thread
    const isRealGmailThread = hasThreadId && !enrollment.gmailThreadId.startsWith('thread-')
    console.log(`   Is real Gmail thread (not temp): ${isRealGmailThread}`)
    
    // Let's see what the sequence processor would do
    console.log('\n🔄 What sequenceProcessor SHOULD do:')
    console.log(`   Step ${enrollment.currentStep} > 0: ✅`)
    console.log(`   Has gmailThreadId: ✅ (${enrollment.gmailThreadId})`)
    console.log(`   Should call getFullThreadHistory: ✅`)
    console.log(`   Should append thread history: ✅`)
    
    console.log('\n🎯 THE ISSUE:')
    console.log('   The sequence processor should be calling getFullThreadHistory')
    console.log('   and appending it to the email content, but it\'s not happening!')
    
  } catch (error) {
    console.error('💥 ERROR:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugSequenceProcessor()