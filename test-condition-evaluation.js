const { PrismaClient } = require('@prisma/client')

async function testConditionEvaluation() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🧪 TESTING CONDITION EVALUATION LOGIC')
    console.log('=' .repeat(50))
    
    // Test enrollment ID from the failed test
    const enrollmentId = 'cmfftotiu0001l204zaicm6x5'
    
    // Get enrollment details
    const enrollment = await prisma.sequenceEnrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        contact: true,
        sequence: true
      }
    })
    
    if (!enrollment) {
      console.log('❌ Enrollment not found!')
      return
    }
    
    console.log('\n📋 ENROLLMENT DETAILS:')
    console.log(`   ID: ${enrollment.id}`)
    console.log(`   Contact: ${enrollment.contact.email}`)
    console.log(`   Sequence: ${enrollment.sequence.name}`)
    console.log(`   Current Step: ${enrollment.currentStep}`)
    console.log(`   Reply Count: ${enrollment.replyCount}`)
    console.log(`   Thread ID: ${enrollment.gmailThreadId}`)
    
    // Check for reply events
    console.log('\n🔍 CHECKING FOR REPLY EVENTS:')
    
    // Check EmailEvent table
    const emailReplyEvents = await prisma.emailEvent.findMany({
      where: {
        contactId: enrollment.contactId,
        sequenceId: enrollment.sequenceId,
        type: 'REPLIED'
      },
      orderBy: {
        timestamp: 'desc'
      }
    })
    
    console.log(`\n   EmailEvent REPLIED records: ${emailReplyEvents.length}`)
    if (emailReplyEvents.length > 0) {
      emailReplyEvents.forEach((event, i) => {
        console.log(`   [${i+1}] Created: ${new Date(event.timestamp).toLocaleString()}`)
        if (event.eventData && typeof event.eventData === 'object') {
          const data = event.eventData
          console.log(`       From: ${data.fromEmail || 'N/A'}`)
          console.log(`       Thread: ${data.gmailThreadId || 'N/A'}`)
        }
      })
    }
    
    // Check SequenceEvent table
    const sequenceReplyEvents = await prisma.sequenceEvent.findMany({
      where: {
        enrollmentId: enrollment.id,
        eventType: 'REPLIED'
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    console.log(`\n   SequenceEvent REPLIED records: ${sequenceReplyEvents.length}`)
    if (sequenceReplyEvents.length > 0) {
      sequenceReplyEvents.forEach((event, i) => {
        console.log(`   [${i+1}] Created: ${new Date(event.createdAt).toLocaleString()}`)
      })
    }
    
    // Get sequence steps
    const steps = enrollment.sequence.steps
    console.log('\n📝 SEQUENCE STRUCTURE:')
    steps.forEach((step, i) => {
      console.log(`   Step ${i}: ${step.type}${step.condition ? ` (${step.condition.type})` : ''}`)
    })
    
    // Evaluate conditions
    const hasReplied = emailReplyEvents.length > 0 || sequenceReplyEvents.length > 0
    
    console.log('\n✅ CONDITION EVALUATION:')
    console.log(`   Has Replied: ${hasReplied}`)
    console.log(`   Condition 'replied' would return: ${hasReplied}`)
    console.log(`   Condition 'not_replied' would return: ${!hasReplied}`)
    
    // Check what step was sent
    const sentEvents = await prisma.sequenceEvent.findMany({
      where: {
        enrollmentId: enrollment.id,
        eventType: 'SENT'
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    })
    
    console.log('\n📨 RECENT EMAILS SENT:')
    sentEvents.forEach(event => {
      console.log(`   Step ${event.stepIndex}: ${new Date(event.createdAt).toLocaleString()}`)
    })
    
    // Determine expected vs actual behavior
    console.log('\n🎯 EXPECTED VS ACTUAL:')
    const conditionStep = steps[2] // Step 2 is the condition
    if (conditionStep && conditionStep.condition) {
      const conditionType = conditionStep.condition.type
      console.log(`   Condition Type: ${conditionType}`)
      
      if (conditionType === 'not_replied') {
        const expectedResult = !hasReplied
        console.log(`   Expected Result: ${expectedResult} (${expectedResult ? 'TRUE branch - Step 3' : 'FALSE branch - Step 4'})`)
        
        // Check what was actually sent
        const lastSentStep = sentEvents[0]?.stepIndex
        if (lastSentStep === 3) {
          console.log(`   Actual: Step 3 sent (TRUE branch) ✅`)
        } else if (lastSentStep === 4) {
          console.log(`   Actual: Step 4 sent (FALSE branch) ❌`)
          console.log(`   ERROR: Wrong branch taken!`)
        }
      }
    }
    
    console.log('\n' + '=' .repeat(50))
    console.log('TEST COMPLETE!')
    
  } catch (error) {
    console.error('❌ ERROR:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testConditionEvaluation()