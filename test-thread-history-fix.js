const { PrismaClient } = require('@prisma/client')

async function testThreadHistoryFix() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🧪 TESTING THREAD HISTORY FIX')
    console.log('=' .repeat(50))
    
    // Find an enrollment that has already sent emails
    const enrollments = await prisma.sequenceEnrollment.findMany({
      where: {
        gmailMessageId: { not: null },
        status: 'ACTIVE',
        currentStep: { gte: 2 }
      },
      include: {
        contact: true,
        sequence: true
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 5
    })
    
    console.log(`\n📊 Found ${enrollments.length} enrollments with Gmail messages`)
    
    for (const enrollment of enrollments) {
      console.log(`\n📧 Enrollment: ${enrollment.id}`)
      console.log(`   Contact: ${enrollment.contact.email}`)
      console.log(`   Sequence: ${enrollment.sequence.name}`)
      console.log(`   Current Step: ${enrollment.currentStep}`)
      console.log(`   Gmail Message ID: ${enrollment.gmailMessageId}`)
      console.log(`   Gmail Thread ID: ${enrollment.gmailThreadId}`)
      
      // Check if this enrollment is about to send another email
      const steps = enrollment.sequence.steps
      if (enrollment.currentStep < steps.length) {
        const currentStep = steps[enrollment.currentStep]
        console.log(`   Next Step Type: ${currentStep.type}`)
        
        if (currentStep.type === 'email' && currentStep.replyToThread) {
          console.log(`   ✅ Next email WILL include thread history`)
          console.log(`   Will fetch content from message: ${enrollment.gmailMessageId}`)
        }
      }
    }
    
    console.log('\n' + '=' .repeat(50))
    console.log('💡 To test the fix:')
    console.log('1. Create a new enrollment that will send multiple emails')
    console.log('2. Let the sequence processor send the follow-up emails')
    console.log('3. Check Gmail to see if thread history is included')
    console.log('\nThe fix will:')
    console.log('- Fetch the actual previous email content from Gmail API')
    console.log('- Format it as a proper Gmail quote block')
    console.log('- Include it at the bottom of the new email')
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testThreadHistoryFix()