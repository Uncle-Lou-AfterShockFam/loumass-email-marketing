#!/usr/bin/env node

/**
 * TRIGGER AND MONITOR SEQUENCE EXECUTION
 * 
 * This script will:
 * 1. Trigger the sequence execution
 * 2. Monitor the step executions
 * 3. Check for threading headers
 * 4. Verify condition logic
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

// Get enrollment ID from command line or use the one we just created
const ENROLLMENT_ID = process.argv[2] || 'cmfcovmy200098o5smq5iq6g9'

// Colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function header(title) {
  console.log('\n' + '='.repeat(80))
  log(`📡 ${title}`, 'bright')
  console.log('='.repeat(80))
}

async function triggerAndMonitor() {
  try {
    header('TRIGGERING SEQUENCE EXECUTION')
    
    // Get the enrollment details
    const enrollment = await prisma.sequenceEnrollment.findUnique({
      where: { id: ENROLLMENT_ID },
      include: {
        sequence: true,
        contact: true
      }
    })
    
    if (!enrollment) {
      log(`❌ Enrollment not found: ${ENROLLMENT_ID}`, 'red')
      return
    }
    
    log(`\n📊 Enrollment Details:`, 'cyan')
    log(`  Sequence: ${enrollment.sequence.name}`)
    log(`  Contact: ${enrollment.contact.email}`)
    log(`  Status: ${enrollment.status}`)
    log(`  Current Step: ${enrollment.currentStep}`)
    log(`  Message-ID: ${enrollment.messageIdHeader || 'MISSING'}`)
    
    // Import sequence service directly
    log('\n⚠️ Manual Execution Required:', 'yellow')
    log('Since we need to trigger the actual service, you need to:')
    log('1. Start the Next.js dev server: npm run dev')
    log('2. Use the API endpoint or manual trigger')
    
    // Monitor executions
    header('MONITORING STEP EXECUTIONS')
    
    let previousCount = 0
    let checkCount = 0
    const maxChecks = 20
    
    const monitor = setInterval(async () => {
      checkCount++
      
      const executions = await prisma.sequenceStepExecution.findMany({
        where: { enrollmentId: ENROLLMENT_ID },
        orderBy: { executedAt: 'asc' }
      })
      
      if (executions.length > previousCount) {
        log(`\n✅ New executions detected! Total: ${executions.length}`, 'green')
        
        for (let i = previousCount; i < executions.length; i++) {
          const exec = executions[i]
          log(`  📧 Step ${exec.stepId} (index ${exec.stepIndex}): ${exec.status}`, 'cyan')
          log(`     Executed at: ${exec.executedAt}`)
        }
        
        previousCount = executions.length
        
        // Check for condition branches
        const conditionBranches = executions.filter(e => 
          e.stepId === 'true-email' || e.stepId === 'false-email'
        )
        
        if (conditionBranches.length > 0) {
          log(`\n🔀 Condition Branch Analysis:`, 'magenta')
          
          if (conditionBranches.length === 1) {
            log(`  ✅ Only ONE branch executed: ${conditionBranches[0].stepId}`, 'green')
          } else {
            log(`  ❌ Multiple branches executed:`, 'red')
            conditionBranches.forEach(b => {
              log(`     - ${b.stepId} at ${b.executedAt}`, 'red')
            })
          }
        }
        
        // Check current enrollment status
        const currentEnrollment = await prisma.sequenceEnrollment.findUnique({
          where: { id: ENROLLMENT_ID }
        })
        
        log(`\n📊 Enrollment Status:`, 'yellow')
        log(`  Status: ${currentEnrollment.status}`)
        log(`  Current Step: ${currentEnrollment.currentStep}`)
        
        if (currentEnrollment.status === 'COMPLETED') {
          log(`\n🎉 Sequence completed!`, 'green')
          clearInterval(monitor)
          await checkFinalResults()
        }
      } else if (checkCount % 5 === 0) {
        log(`.`, 'yellow', false)
      }
      
      if (checkCount >= maxChecks) {
        log(`\n⏱️ Timeout reached after ${maxChecks} checks`, 'yellow')
        clearInterval(monitor)
        await checkFinalResults()
      }
    }, 2000) // Check every 2 seconds
    
    log('\n🔍 Monitoring for step executions... (max 40 seconds)', 'cyan')
    
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red')
    console.error(error)
  }
}

async function checkFinalResults() {
  header('FINAL RESULTS')
  
  const enrollment = await prisma.sequenceEnrollment.findUnique({
    where: { id: ENROLLMENT_ID },
    include: {
      sequence: true,
      contact: true,
      stepExecutions: {
        orderBy: { executedAt: 'asc' }
      }
    }
  })
  
  log('\n📊 Final Enrollment Status:', 'bright')
  log(`  Status: ${enrollment.status}`)
  log(`  Current Step: ${enrollment.currentStep}`)
  log(`  Total Steps Executed: ${enrollment.stepExecutions.length}`)
  
  // Check threading
  log('\n🔗 Threading Check:', 'magenta')
  if (enrollment.messageIdHeader) {
    log(`  ✅ Message-ID stored: ${enrollment.messageIdHeader}`, 'green')
  } else {
    log(`  ❌ No Message-ID stored`, 'red')
  }
  
  // Check condition logic
  const conditionSteps = enrollment.stepExecutions.filter(e => 
    e.stepId === 'true-email' || e.stepId === 'false-email'
  )
  
  log('\n🔀 Condition Logic Check:', 'magenta')
  if (conditionSteps.length === 0) {
    log(`  ⚠️ No condition branches executed`, 'yellow')
  } else if (conditionSteps.length === 1) {
    log(`  ✅ Only ONE branch executed: ${conditionSteps[0].stepId}`, 'green')
  } else {
    log(`  ❌ BOTH branches executed - BUG STILL EXISTS`, 'red')
  }
  
  // Check for duplicate executions
  const stepCounts = {}
  enrollment.stepExecutions.forEach(exec => {
    stepCounts[exec.stepId] = (stepCounts[exec.stepId] || 0) + 1
  })
  
  log('\n🔄 Duplicate Execution Check:', 'magenta')
  let hasDuplicates = false
  for (const [stepId, count] of Object.entries(stepCounts)) {
    if (count > 1) {
      log(`  ❌ Step ${stepId} executed ${count} times!`, 'red')
      hasDuplicates = true
    }
  }
  if (!hasDuplicates) {
    log(`  ✅ No duplicate executions detected`, 'green')
  }
  
  log('\n✅ Monitoring complete!', 'green')
  
  await prisma.$disconnect()
  process.exit(0)
}

// Run the monitor
triggerAndMonitor()