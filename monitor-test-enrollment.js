const { PrismaClient } = require('@prisma/client')

async function monitorEnrollment(enrollmentId) {
  const prisma = new PrismaClient()
  
  try {
    const id = enrollmentId || 'cmffu4lxo00018osxl5qkon83'
    
    console.log('📊 MONITORING ENROLLMENT: ' + id)
    console.log('=' .repeat(50))
    
    // Get enrollment details
    const enrollment = await prisma.sequenceEnrollment.findUnique({
      where: { id },
      include: {
        contact: true,
        sequence: true
      }
    })
    
    if (!enrollment) {
      console.log('❌ Enrollment not found!')
      return
    }
    
    console.log('📧 Enrollment Details:')
    console.log(`  ID: ${enrollment.id}`)
    console.log(`  Contact: ${enrollment.contact.email}`)
    console.log(`  Sequence: ${enrollment.sequence.name}`)
    console.log(`  Current Step: ${enrollment.currentStep}`)
    console.log(`  Reply Count: ${enrollment.replyCount}`)
    console.log(`  Last Replied At: ${enrollment.lastRepliedAt}`)
    console.log(`  Gmail Thread ID: ${enrollment.gmailThreadId}`)
    console.log(`  Created: ${enrollment.createdAt}`)
    console.log(`  Last Email Sent: ${enrollment.lastEmailSentAt}`)
    
    // Check for EmailEvent records (for reply detection)
    const emailEvents = await prisma.emailEvent.findMany({
      where: {
        sequenceId: enrollment.sequenceId,
        contactId: enrollment.contactId
      },
      orderBy: {
        timestamp: 'desc'
      }
    })
    
    console.log(`\n✉️ Email Events (${emailEvents.length} total):`)
    emailEvents.forEach(event => {
      console.log(`  - ${event.type} at ${event.timestamp}`)
      if (event.type === 'REPLIED' && event.eventData) {
        console.log(`    From: ${event.eventData.fromEmail}`)
        console.log(`    Subject: ${event.eventData.subject}`)
      }
    })
    
    // Check for SequenceEvent records
    const sequenceEvents = await prisma.sequenceEvent.findMany({
      where: {
        enrollmentId: enrollment.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    console.log(`\n📋 Sequence Events (${sequenceEvents.length} total):`)
    sequenceEvents.forEach(event => {
      console.log(`  - ${event.eventType} at Step ${event.stepIndex} (${event.createdAt})`)
    })
    
    // Parse the sequence steps
    const steps = enrollment.sequence.steps
    console.log('\n🔄 Sequence Flow:')
    steps.forEach((step, index) => {
      const isCurrent = index === enrollment.currentStep
      const isPast = index < enrollment.currentStep
      const status = isCurrent ? '👉 CURRENT' : isPast ? '✅ DONE' : '⏳ PENDING'
      
      console.log(`  Step ${index}: ${step.type.toUpperCase()} ${status}`)
      if (step.type === 'email') {
        console.log(`    Subject: ${step.subject}`)
      } else if (step.type === 'delay') {
        const delay = step.delay || {}
        const totalMinutes = (delay.days || 0) * 24 * 60 + (delay.hours || 0) * 60 + (delay.minutes || 0)
        console.log(`    Wait: ${totalMinutes} minutes`)
      } else if (step.type === 'condition') {
        console.log(`    Check: ${step.condition?.type || 'unknown'}`)
        console.log(`    TRUE → Step ${index + 1}`)
        console.log(`    FALSE → Step ${index + 2}`)
      }
    })
    
    console.log('\n🔍 Next Action:')
    if (enrollment.currentStep < steps.length) {
      const nextStep = steps[enrollment.currentStep]
      console.log(`  Step ${enrollment.currentStep}: ${nextStep.type.toUpperCase()}`)
      
      if (nextStep.type === 'delay' && enrollment.lastEmailSentAt) {
        const delay = nextStep.delay || {}
        const delayMinutes = (delay.days || 0) * 24 * 60 + (delay.hours || 0) * 60 + (delay.minutes || 0)
        const nextRunTime = new Date(enrollment.lastEmailSentAt.getTime() + delayMinutes * 60000)
        const now = new Date()
        const minutesLeft = Math.max(0, Math.round((nextRunTime - now) / 60000))
        console.log(`  Will continue in ~${minutesLeft} minutes (at ${nextRunTime.toLocaleTimeString()})`)
      } else if (nextStep.type === 'condition') {
        console.log(`  Evaluating: Has contact replied?`)
        console.log(`  Current reply count: ${enrollment.replyCount}`)
      }
    } else {
      console.log('  Sequence completed!')
    }
    
  } catch (error) {
    console.error('💥 ERROR:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Get enrollment ID from command line argument
const enrollmentId = process.argv[2]
monitorEnrollment(enrollmentId)