const { PrismaClient } = require('@prisma/client')

async function debugConditionEvaluation() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔍 DEBUGGING CONDITION EVALUATION')
    console.log('=' .repeat(50))
    
    // Check the test enrollments
    const testEnrollments = [
      'cmffvdncy00018o8xzpipc6h1', // ljpiotti@gmail.com - replied
      'cmffvn189000xie04qzrsrrcr'  // ljpiotti@polarispathways.com - did NOT reply
    ]
    
    for (const enrollmentId of testEnrollments) {
      const enrollment = await prisma.sequenceEnrollment.findUnique({
        where: { id: enrollmentId },
        include: {
          contact: true,
          sequence: true
        }
      })
      
      if (!enrollment) {
        console.log(`❌ Enrollment ${enrollmentId} not found`)
        continue
      }
      
      console.log(`\n📧 ENROLLMENT: ${enrollmentId}`)
      console.log(`   Contact: ${enrollment.contact.email}`)
      console.log(`   Sequence: ${enrollment.sequence.name}`)
      console.log(`   Current Step: ${enrollment.currentStep}`)
      console.log(`   Status: ${enrollment.status}`)
      console.log(`   Reply Count: ${enrollment.replyCount}`)
      console.log(`   Gmail Thread ID: ${enrollment.gmailThreadId}`)
      
      // Check for reply events
      console.log('\n   📬 EMAIL EVENTS:')
      const emailEvents = await prisma.emailEvent.findMany({
        where: {
          contactId: enrollment.contactId,
          sequenceId: enrollment.sequenceId
        },
        orderBy: {
          timestamp: 'desc'
        }
      })
      
      for (const event of emailEvents) {
        console.log(`      ${event.type}: ${event.timestamp.toISOString()} - ${event.subject || 'No subject'}`)
      }
      
      // Check for sequence events
      console.log('\n   📊 SEQUENCE EVENTS:')
      const sequenceEvents = await prisma.sequenceEvent.findMany({
        where: {
          enrollmentId: enrollment.id
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
      
      for (const event of sequenceEvents) {
        console.log(`      ${event.eventType}: ${event.createdAt.toISOString()}`)
      }
      
      // Analyze the sequence structure
      const steps = enrollment.sequence.steps
      console.log('\n   🔄 SEQUENCE FLOW:')
      steps.forEach((step, idx) => {
        let marker = idx === enrollment.currentStep ? '👉' : '  '
        if (step.type === 'condition') {
          console.log(`   ${marker} Step ${idx}: CONDITION - ${step.conditionType}`)
        } else if (step.type === 'email') {
          console.log(`   ${marker} Step ${idx}: EMAIL - "${step.subject}"`)
        } else if (step.type === 'delay') {
          console.log(`   ${marker} Step ${idx}: DELAY - ${step.delayMinutes} minutes`)
        }
      })
      
      // Simulate condition evaluation
      if (enrollment.currentStep < steps.length) {
        const currentStepData = steps[enrollment.currentStep]
        if (currentStepData && currentStepData.type === 'condition') {
          console.log('\n   🎯 CONDITION EVALUATION:')
          console.log(`      Type: ${currentStepData.conditionType}`)
          
          const hasReplyEvents = emailEvents.some(e => e.type === 'REPLIED')
          const hasSequenceReplyEvents = sequenceEvents.some(e => e.eventType === 'REPLIED')
          const hasReplied = hasReplyEvents || hasSequenceReplyEvents
          
          console.log(`      Has Reply Events: ${hasReplyEvents}`)
          console.log(`      Has Sequence Reply Events: ${hasSequenceReplyEvents}`)
          console.log(`      Has Replied: ${hasReplied}`)
          
          if (currentStepData.conditionType === 'not_replied') {
            const shouldBeTrueIfNoReply = !hasReplied
            console.log(`      not_replied should return: ${shouldBeTrueIfNoReply}`)
            console.log(`      Expected next step: ${shouldBeTrueIfNoReply ? enrollment.currentStep + 1 : enrollment.currentStep + 2}`)
          }
        }
      }
    }
    
    console.log('\n' + '=' .repeat(50))
    
  } catch (error) {
    console.error('❌ ERROR:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugConditionEvaluation()