const { PrismaClient } = require('@prisma/client')

async function monitorBothEnrollments() {
  const prisma = new PrismaClient()
  
  try {
    const enrollmentIds = [
      'cmffwniyt00018oi173tpu2nm', // ljpiotti@gmail.com
      'cmffwnj0s00038oi1kq3r77re'  // ljpiotti@polarispathways.com
    ]
    
    console.log('📊 MONITORING BOTH TEST ENROLLMENTS')
    console.log('=' .repeat(50))
    
    for (const id of enrollmentIds) {
      const enrollment = await prisma.sequenceEnrollment.findUnique({
        where: { id },
        include: {
          contact: true,
          sequence: true
        }
      })
      
      if (!enrollment) continue
      
      console.log(`\n📧 ${enrollment.contact.email}`)
      console.log(`   Status: ${enrollment.status}`)
      console.log(`   Current Step: ${enrollment.currentStep}`)
      console.log(`   Reply Count: ${enrollment.replyCount}`)
      console.log(`   Last Email: ${enrollment.lastEmailSentAt ? new Date(enrollment.lastEmailSentAt).toLocaleString() : 'Not sent yet'}`)
      console.log(`   Gmail Thread: ${enrollment.gmailThreadId || 'Not started'}`)
      
      // Check for reply events
      const replyEvent = await prisma.emailEvent.findFirst({
        where: {
          contactId: enrollment.contactId,
          sequenceId: enrollment.sequenceId,
          type: 'REPLIED'
        },
        orderBy: {
          timestamp: 'desc'
        }
      })
      
      if (replyEvent) {
        console.log(`   ✅ REPLIED at: ${replyEvent.timestamp.toLocaleString()}`)
      } else {
        console.log(`   ⏰ No reply yet`)
      }
      
      // Show next expected action
      const steps = enrollment.sequence.steps
      if (enrollment.currentStep < steps.length) {
        const currentStep = steps[enrollment.currentStep]
        if (currentStep.type === 'email') {
          console.log(`   📨 Next: Send email "${currentStep.subject}"`)
        } else if (currentStep.type === 'delay') {
          console.log(`   ⏱️  Next: Wait ${currentStep.delay?.minutes || 0} minutes`)
        } else if (currentStep.type === 'condition') {
          console.log(`   🔀 Next: Evaluate condition "${currentStep.condition?.type}"`)
        }
      }
    }
    
    console.log('\n' + '=' .repeat(50))
    console.log('Run again in 30 seconds to see updates')
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

monitorBothEnrollments()