require('dotenv').config()
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function debugThreading() {
  console.log('=== DEBUGGING SEQUENCE THREADING ===\n')
  
  // Get most recent enrollment
  const enrollment = await prisma.sequenceEnrollment.findFirst({
    where: {
      createdAt: {
        gte: new Date(Date.now() - 3 * 60 * 60 * 1000) // Last 3 hours
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    include: {
      sequence: true,
      contact: true
    }
  })
  
  if (!enrollment) {
    console.log('No recent enrollments found')
    return
  }
  
  console.log('Latest Enrollment:')
  console.log('  ID:', enrollment.id)
  console.log('  Sequence:', enrollment.sequence.name)
  console.log('  Contact:', enrollment.contact.email)
  console.log('  Status:', enrollment.status)
  console.log('  Current Step:', enrollment.currentStep)
  console.log('  Message-ID Header:', enrollment.messageIdHeader)
  console.log('  Gmail Thread ID:', enrollment.gmailThreadId)
  console.log('  Created:', enrollment.createdAt)
  
  // Check steps
  const steps = enrollment.sequence.steps
  console.log('\nSequence Steps:')
  steps.forEach((step, index) => {
    console.log(`  ${index}: ${step.type}${step.replyToThread ? ' (reply to thread)' : ''}`)
    if (step.type === 'email') {
      console.log(`     Subject: ${step.subject}`)
    }
  })
  
  // Check if there are any executions
  const executions = await prisma.sequenceStepExecution.findMany({
    where: {
      enrollmentId: enrollment.id
    },
    orderBy: {
      executedAt: 'asc'
    }
  })
  
  console.log('\nStep Executions:')
  if (executions.length > 0) {
    executions.forEach(exec => {
      console.log(`  Step ${exec.stepIndex} (${exec.stepId}): ${exec.status} at ${exec.executedAt}`)
    })
  } else {
    console.log('  No step executions recorded')
  }
  
  // Check email events for this contact
  const emailEvents = await prisma.emailEvent.findMany({
    where: {
      contactId: enrollment.contactId,
      createdAt: {
        gte: enrollment.createdAt
      }
    },
    orderBy: {
      createdAt: 'asc'
    }
  })
  
  console.log('\nEmail Events:')
  if (emailEvents.length > 0) {
    emailEvents.forEach(event => {
      console.log(`  ${event.type}: ${event.createdAt}`)
      if (event.metadata) {
        console.log(`    Metadata:`, event.metadata)
      }
    })
  } else {
    console.log('  No email events found')
  }
  
  // Check if Message-ID is being passed correctly
  console.log('\n🔍 THREADING ANALYSIS:')
  
  if (!enrollment.messageIdHeader) {
    console.log('❌ NO Message-ID stored! This is the root cause.')
    console.log('   First email did not store Message-ID header')
  } else if (!enrollment.messageIdHeader.includes('@')) {
    console.log('❌ Invalid Message-ID format:', enrollment.messageIdHeader)
    console.log('   This looks like a thread ID, not a Message-ID')
  } else {
    console.log('✅ Valid Message-ID stored:', enrollment.messageIdHeader)
    console.log('   Threading should work if being passed to sendEmail')
  }
  
  // Check current step
  const currentStep = steps[enrollment.currentStep]
  if (currentStep) {
    console.log('\nNext Step to Execute:')
    console.log('  Type:', currentStep.type)
    console.log('  Reply to Thread:', currentStep.replyToThread)
    
    if (currentStep.type === 'email' && currentStep.replyToThread && !enrollment.messageIdHeader) {
      console.log('❌ PROBLEM: Next email wants to thread but no Message-ID available!')
    }
  }
}

debugThreading()
  .catch(console.error)
  .finally(() => prisma.$disconnect())