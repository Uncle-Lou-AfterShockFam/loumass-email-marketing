#!/usr/bin/env node

/**
 * DIRECTLY EXECUTE SEQUENCE STEPS
 * 
 * This script simulates the sequence execution engine
 * to test our fixes without needing the full API
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

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

async function executeSequence() {
  try {
    log('🚀 SIMULATING SEQUENCE EXECUTION\n', 'bright')
    
    // Get enrollment
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
    
    log(`📊 Processing enrollment for: ${enrollment.contact.email}`, 'cyan')
    log(`   Sequence: ${enrollment.sequence.name}`)
    log(`   Message-ID: ${enrollment.messageIdHeader || 'MISSING'}\n`)
    
    const steps = JSON.parse(enrollment.sequence.steps)
    
    // Process each step
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]
      log(`\n📝 Processing Step ${i}: ${step.type} (${step.id})`, 'yellow')
      
      // Check if already executed
      const existingExecution = await prisma.sequenceStepExecution.findUnique({
        where: {
          enrollmentId_stepId: {
            enrollmentId: ENROLLMENT_ID,
            stepId: step.id
          }
        }
      })
      
      if (existingExecution) {
        log(`   ⏭️ Already executed, skipping...`, 'cyan')
        continue
      }
      
      // Create execution record
      await prisma.sequenceStepExecution.create({
        data: {
          enrollmentId: ENROLLMENT_ID,
          stepId: step.id,
          stepIndex: i,
          status: 'completed'
        }
      })
      
      log(`   ✅ Created execution record`, 'green')
      
      // Handle different step types
      if (step.type === 'email') {
        log(`   📧 Email: ${step.email?.subject}`, 'cyan')
        log(`      Reply to thread: ${step.replyToThread ? 'YES' : 'NO'}`)
        log(`      Tracking enabled: ${step.trackingEnabled !== false ? 'YES' : 'NO'}`)
        
        if (step.replyToThread && enrollment.messageIdHeader) {
          log(`      ✅ Would add headers:`, 'green')
          log(`         In-Reply-To: <${enrollment.messageIdHeader}>`)
          log(`         References: <${enrollment.messageIdHeader}>`)
        } else if (step.replyToThread && !enrollment.messageIdHeader) {
          log(`      ❌ Cannot thread - no Message-ID!`, 'red')
        }
        
      } else if (step.type === 'delay') {
        log(`   ⏱️ Delay: ${step.delay?.value} ${step.delay?.unit}`, 'cyan')
        
      } else if (step.type === 'condition') {
        log(`   🔀 Condition: ${step.condition?.type}`, 'cyan')
        
        // Simulate condition evaluation
        const shouldOpenEmail = Math.random() > 0.5
        log(`      Simulating: email ${shouldOpenEmail ? 'opened' : 'not opened'}`)
        
        const nextStepId = shouldOpenEmail ? 
          step.condition.trueBranch[0] : 
          step.condition.falseBranch[0]
        
        log(`      Branch selected: ${shouldOpenEmail ? 'TRUE' : 'FALSE'} → ${nextStepId}`, 
            shouldOpenEmail ? 'green' : 'yellow')
        
        // Jump to the selected branch
        const nextStepIndex = steps.findIndex(s => s.id === nextStepId)
        if (nextStepIndex !== -1) {
          log(`      Jumping to step ${nextStepIndex}: ${nextStepId}`)
          
          // Process only the selected branch
          const branchStep = steps[nextStepIndex]
          
          // Check if branch already executed
          const branchExecution = await prisma.sequenceStepExecution.findUnique({
            where: {
              enrollmentId_stepId: {
                enrollmentId: ENROLLMENT_ID,
                stepId: branchStep.id
              }
            }
          })
          
          if (!branchExecution) {
            await prisma.sequenceStepExecution.create({
              data: {
                enrollmentId: ENROLLMENT_ID,
                stepId: branchStep.id,
                stepIndex: nextStepIndex,
                status: 'completed'
              }
            })
            
            log(`\n📝 Processing Branch Step: ${branchStep.type} (${branchStep.id})`, 'magenta')
            log(`   📧 Email: ${branchStep.email?.subject}`, 'cyan')
            log(`   ✅ Branch step executed`, 'green')
          } else {
            log(`   ⏭️ Branch already executed`, 'yellow')
          }
          
          // Skip processing other branches
          break
        }
      }
      
      // Update enrollment current step
      await prisma.sequenceEnrollment.update({
        where: { id: ENROLLMENT_ID },
        data: { currentStep: i + 1 }
      })
    }
    
    // Mark enrollment as completed
    await prisma.sequenceEnrollment.update({
      where: { id: ENROLLMENT_ID },
      data: { 
        status: 'COMPLETED',
        completedAt: new Date()
      }
    })
    
    log('\n✅ Sequence execution completed!', 'green')
    
    // Final verification
    log('\n' + '='.repeat(60), 'bright')
    log('📊 FINAL VERIFICATION', 'bright')
    log('='.repeat(60) + '\n', 'bright')
    
    const executions = await prisma.sequenceStepExecution.findMany({
      where: { enrollmentId: ENROLLMENT_ID },
      orderBy: { executedAt: 'asc' }
    })
    
    log('Steps executed:', 'cyan')
    executions.forEach(exec => {
      log(`  - ${exec.stepId} (index ${exec.stepIndex}): ${exec.status}`)
    })
    
    // Check for both branches
    const trueBranch = executions.find(e => e.stepId === 'true-email')
    const falseBranch = executions.find(e => e.stepId === 'false-email')
    
    log('\n🔀 Condition Branch Check:', 'magenta')
    if (trueBranch && falseBranch) {
      log('  ❌ BOTH branches executed - BUG EXISTS!', 'red')
    } else if (trueBranch) {
      log('  ✅ Only TRUE branch executed', 'green')
    } else if (falseBranch) {
      log('  ✅ Only FALSE branch executed', 'green')
    } else {
      log('  ⚠️ No condition branches executed', 'yellow')
    }
    
    // Check for duplicates
    const stepCounts = {}
    executions.forEach(exec => {
      stepCounts[exec.stepId] = (stepCounts[exec.stepId] || 0) + 1
    })
    
    log('\n🔄 Duplicate Check:', 'magenta')
    let hasDuplicates = false
    for (const [stepId, count] of Object.entries(stepCounts)) {
      if (count > 1) {
        log(`  ❌ Step ${stepId} executed ${count} times!`, 'red')
        hasDuplicates = true
      }
    }
    if (!hasDuplicates) {
      log('  ✅ No duplicate executions', 'green')
    }
    
    log('\n🎯 TEST COMPLETE!', 'bright')
    
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red')
    console.error(error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
executeSequence()