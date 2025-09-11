const { PrismaClient } = require('@prisma/client')
const SequenceProcessor = require('./src/services/sequenceProcessor').default

const prisma = new PrismaClient()

async function triggerSequence() {
  console.log('🚀 MANUALLY TRIGGERING SEQUENCE PROCESSOR')
  console.log('==================================================')
  
  try {
    const processor = new SequenceProcessor(prisma)
    
    // Get the enrollment
    const enrollment = await prisma.sequenceEnrollment.findUnique({
      where: { id: 'cmffvdncy00018o8xzpipc6h1' },
      include: {
        sequence: true,
        contact: true
      }
    })
    
    if (!enrollment) {
      throw new Error('Enrollment not found!')
    }
    
    console.log(`📋 Processing enrollment: ${enrollment.id}`)
    console.log(`   Contact: ${enrollment.contact.email}`)
    console.log(`   Sequence: ${enrollment.sequence.name}`)
    console.log(`   Current Step: ${enrollment.currentStep}`)
    
    // Process the enrollment
    await processor.processEnrollment(enrollment)
    
    console.log('✅ Enrollment processed!')
    
    // Check the updated status
    const updated = await prisma.sequenceEnrollment.findUnique({
      where: { id: enrollment.id }
    })
    
    console.log(`\n📊 Updated Status:`)
    console.log(`   Current Step: ${updated.currentStep}`)
    console.log(`   Gmail Thread ID: ${updated.gmailThreadId}`)
    console.log(`   Last Email Sent: ${updated.lastEmailSentAt}`)
    
  } catch (error) {
    console.error('❌ ERROR:', error.message)
    console.error(error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

triggerSequence()
