const { PrismaClient } = require('@prisma/client')

async function monitorFixResults() {
  const prisma = new PrismaClient()
  
  try {
    console.clear()
    console.log('🔍 MONITORING FIX RESULTS - ' + new Date().toLocaleTimeString())
    console.log('=' .repeat(60))
    
    const enrollments = await prisma.sequenceEnrollment.findMany({
      where: {
        id: {
          in: [
            'cmffwniyt00018oi173tpu2nm', // ljpiotti@gmail.com
            'cmffwnj0s00038oi1kq3r77re'  // ljpiotti@polarispathways.com
          ]
        }
      },
      include: {
        contact: true,
        sequence: true
      }
    })
    
    for (const enrollment of enrollments) {
      console.log(`\n📧 ${enrollment.contact.email}`)
      console.log(`   Status: ${enrollment.status}`)
      console.log(`   Current Step: ${enrollment.currentStep}`)
      
      const steps = enrollment.sequence.steps
      
      // Show what step they're on
      if (enrollment.currentStep < steps.length) {
        const currentStep = steps[enrollment.currentStep]
        console.log(`   On: ${currentStep.type} - ${currentStep.type === 'email' ? currentStep.subject : currentStep.type === 'delay' ? `${currentStep.delay?.minutes}min` : currentStep.condition?.type}`)
      }
      
      // Check for replies
      const replyEvent = await prisma.emailEvent.findFirst({
        where: {
          contactId: enrollment.contactId,
          sequenceId: enrollment.sequenceId,
          type: 'REPLIED',
          timestamp: {
            gte: new Date('2025-09-11T21:00:00Z')
          }
        }
      })
      
      console.log(`   Reply Status: ${replyEvent ? '✅ REPLIED' : '❌ NO REPLY'}`)
      
      // Check what emails were sent
      const sentEmails = await prisma.emailEvent.findMany({
        where: {
          contactId: enrollment.contactId,
          sequenceId: enrollment.sequenceId,
          type: 'SENT',
          timestamp: {
            gte: new Date('2025-09-11T21:00:00Z')
          }
        },
        orderBy: {
          timestamp: 'asc'
        }
      })
      
      console.log(`   Emails Sent:`)
      for (const email of sentEmails) {
        const time = new Date(email.timestamp).toLocaleTimeString()
        console.log(`      ${time}: "${email.subject}"`)
        
        // Check if this is a branch email
        if (email.subject === 'Hey LOUIS!' && email.timestamp > new Date('2025-09-11T21:15:00Z')) {
          // This is a branch email - check which one based on content
          // We'd need to check the actual email content to know which branch
          console.log(`      ⚠️  BRANCH EMAIL SENT - Need to check content to verify correct branch`)
        }
      }
      
      // If completed, show which branch was taken
      if (enrollment.status === 'COMPLETED' || enrollment.currentStep >= 4) {
        console.log(`   🎯 RESULT: Went to Step ${enrollment.currentStep}`)
        if (enrollment.currentStep === 4 || enrollment.currentStep === 5) {
          // They got one of the branch emails
          const branchStep = steps[3] // or steps[4]
          console.log(`      Branch content starts with: "${branchStep.content?.substring(0, 30)}"`)
        }
      }
    }
    
    console.log('\n' + '=' .repeat(60))
    console.log('Expected Results:')
    console.log('  ljpiotti@gmail.com (REPLIED) → Step 4 "NO REPLY!" email')
    console.log('  ljpiotti@polarispathways.com (NO REPLY) → Step 3 "REPLIED!" email')
    console.log('\nDelay expires at: ' + new Date(Date.now() + 5*60*1000 - (Date.now() - new Date('2025-09-11T21:13:16Z').getTime())).toLocaleTimeString())
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run immediately
monitorFixResults()

// Run every 30 seconds
setInterval(monitorFixResults, 30000)