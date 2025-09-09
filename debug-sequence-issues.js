#!/usr/bin/env node

/**
 * COMPREHENSIVE DEBUGGING SCRIPT FOR EMAIL SEQUENCE ISSUES
 * 
 * This script will help diagnose the 3 critical issues:
 * 1. Threading not working (missing In-Reply-To/References headers)
 * 2. Tracking not being added to follow-up emails
 * 3. Both condition branches executing
 */

const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  },
  log: ['query', 'info', 'warn', 'error'],
})

// ANSI color codes for terminal output
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
  log(`🔍 ${title}`, 'bright')
  console.log('='.repeat(80))
}

async function debugSequenceIssues() {
  try {
    header('EMAIL SEQUENCE DEBUGGING - COMPREHENSIVE ANALYSIS')
    
    // 1. CHECK RECENT SEQUENCE ENROLLMENTS
    header('1. RECENT SEQUENCE ENROLLMENTS')
    
    const enrollments = await prisma.sequenceEnrollment.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        contact: true,
        sequence: true,
      }
    })
    
    log('\nFound ' + enrollments.length + ' recent enrollments:', 'cyan')
    
    for (const enrollment of enrollments) {
      console.log('\n---')
      log(`Enrollment ID: ${enrollment.id}`, 'yellow')
      log(`  Contact: ${enrollment.contact.email}`)
      log(`  Sequence: ${enrollment.sequence.name}`)
      log(`  Status: ${enrollment.status}`)
      log(`  Current Step: ${enrollment.currentStep}`)
      
      // CRITICAL: Check Message-ID storage
      log('\n  📧 THREADING DATA:', 'magenta')
      log(`    messageIdHeader: ${enrollment.messageIdHeader || '❌ MISSING'}`, 
          enrollment.messageIdHeader ? 'green' : 'red')
      log(`    gmailMessageId: ${enrollment.gmailMessageId || '❌ MISSING'}`)
      log(`    gmailThreadId: ${enrollment.gmailThreadId || '❌ MISSING'}`)
      log(`    triggerRecipientId: ${enrollment.triggerRecipientId || '❌ MISSING'}`)
      
      if (!enrollment.messageIdHeader) {
        log('\n    ⚠️ NO MESSAGE-ID STORED - THREADING WILL FAIL!', 'red')
      } else {
        // Validate Message-ID format
        const hasAngleBrackets = enrollment.messageIdHeader.startsWith('<') && 
                                enrollment.messageIdHeader.endsWith('>')
        const hasAtSign = enrollment.messageIdHeader.includes('@')
        
        log(`\n    Message-ID Validation:`)
        log(`      Has @ sign: ${hasAtSign ? '✅' : '❌'}`)
        log(`      Has angle brackets: ${hasAngleBrackets ? '⚠️ SHOULD NOT BE STORED WITH BRACKETS' : '✅'}`)
        
        if (hasAngleBrackets) {
          log('      🔧 FIX: Message-ID should be stored WITHOUT angle brackets', 'yellow')
        }
      }
    }
    
    // 2. CHECK CAMPAIGN RECIPIENTS (SOURCE OF MESSAGE-IDS)
    header('2. CAMPAIGN RECIPIENTS (MESSAGE-ID SOURCE)')
    
    const recipients = await prisma.recipient.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      where: {
        messageIdHeader: { not: null }
      },
      include: {
        contact: true,
        campaign: true
      }
    })
    
    log('\nFound ' + recipients.length + ' recipients with Message-IDs:', 'cyan')
    
    for (const recipient of recipients) {
      console.log('\n---')
      log(`Recipient ID: ${recipient.id}`, 'yellow')
      log(`  Contact: ${recipient.contact.email}`)
      log(`  Campaign: ${recipient.campaign.name}`)
      log(`  messageIdHeader: ${recipient.messageIdHeader}`, 'green')
      
      // Check if this recipient triggered any sequences
      const triggeredEnrollment = await prisma.sequenceEnrollment.findFirst({
        where: {
          triggerRecipientId: recipient.id
        }
      })
      
      if (triggeredEnrollment) {
        log(`  ✅ Triggered enrollment: ${triggeredEnrollment.id}`)
        log(`     Enrollment messageIdHeader: ${triggeredEnrollment.messageIdHeader || '❌ MISSING'}`,
            triggeredEnrollment.messageIdHeader ? 'green' : 'red')
        
        if (triggeredEnrollment.messageIdHeader !== recipient.messageIdHeader) {
          log('  ⚠️ MESSAGE-ID MISMATCH!', 'red')
          log(`     Campaign: ${recipient.messageIdHeader}`)
          log(`     Enrollment: ${triggeredEnrollment.messageIdHeader}`)
        }
      } else {
        log(`  ❌ No sequence triggered from this recipient`)
      }
    }
    
    // 3. CHECK SEQUENCE CONFIGURATIONS
    header('3. SEQUENCE CONFIGURATIONS')
    
    const sequences = await prisma.sequence.findMany({
      take: 3,
      orderBy: { updatedAt: 'desc' }
    })
    
    for (const sequence of sequences) {
      console.log('\n---')
      log(`Sequence: ${sequence.name}`, 'yellow')
      log(`  Status: ${sequence.status}`)
      log(`  Tracking Enabled: ${sequence.trackingEnabled ? '✅' : '❌'}`)
      
      const steps = typeof sequence.steps === 'string' ? 
      JSON.parse(sequence.steps) : sequence.steps
      log(`  Total Steps: ${steps.length}`)
      
      // Analyze each step
      let hasCondition = false
      let conditionBranches = []
      
      for (const step of steps) {
        if (step.type === 'email') {
          log(`\n  📧 Email Step: ${step.id}`)
          log(`     Subject: ${step.email?.subject || 'N/A'}`)
          log(`     Reply To Thread: ${step.replyToThread ? '✅' : '❌'}`, 
              step.replyToThread ? 'green' : 'red')
          log(`     Tracking Enabled: ${step.trackingEnabled !== false ? '✅' : '❌'}`)
          
          if (step.replyToThread && !step.email?.subject?.startsWith('Re:')) {
            log('     ⚠️ Subject should start with "Re:" for threading', 'yellow')
          }
        } else if (step.type === 'condition') {
          hasCondition = true
          log(`\n  🔀 Condition Step: ${step.id}`)
          log(`     Type: ${step.condition?.type || 'N/A'}`)
          
          if (step.condition?.trueBranch) {
            conditionBranches.push({
              type: 'true',
              target: step.condition.trueBranch[0],
              conditionId: step.id
            })
            log(`     True Branch → ${step.condition.trueBranch[0]}`, 'green')
          }
          
          if (step.condition?.falseBranch) {
            conditionBranches.push({
              type: 'false',
              target: step.condition.falseBranch[0],
              conditionId: step.id
            })
            log(`     False Branch → ${step.condition.falseBranch[0]}`, 'red')
          }
        }
      }
      
      // Check for condition branch issues
      if (hasCondition && conditionBranches.length > 0) {
        log('\n  🔍 Condition Branch Analysis:', 'magenta')
        
        // Check if both branches point to valid steps
        for (const branch of conditionBranches) {
          const targetStep = steps.find(s => s.id === branch.target)
          if (targetStep) {
            log(`     ${branch.type} branch → ${targetStep.type} step (${targetStep.id})`, 'green')
          } else {
            log(`     ${branch.type} branch → ❌ INVALID TARGET (${branch.target})`, 'red')
          }
        }
        
        // Check for execution logs
        const executions = await prisma.sequenceStepExecution.findMany({
          where: {
            enrollment: {
              sequenceId: sequence.id
            }
          },
          orderBy: { executedAt: 'desc' },
          take: 20,
          include: {
            enrollment: {
              include: {
                contact: true
              }
            }
          }
        })
        
        // Group executions by enrollment
        const executionsByEnrollment = {}
        for (const exec of executions) {
          const key = exec.enrollmentId
          if (!executionsByEnrollment[key]) {
            executionsByEnrollment[key] = []
          }
          executionsByEnrollment[key].push(exec)
        }
        
        // Check for both branches executing
        for (const [enrollmentId, execs] of Object.entries(executionsByEnrollment)) {
          const conditionExecs = execs.filter(e => 
            conditionBranches.some(b => b.target === e.stepId)
          )
          
          if (conditionExecs.length > 1) {
            log(`\n     ⚠️ BOTH BRANCHES EXECUTED for ${execs[0].enrollment.contact.email}!`, 'red')
            for (const exec of conditionExecs) {
              log(`        - Step ${exec.stepId} at ${exec.executedAt}`)
            }
          }
        }
      }
    }
    
    // 4. CHECK GMAIL SERVICE LOGS (if available)
    header('4. GMAIL SERVICE INVESTIGATION')
    
    // Read the gmail-service.ts file to check current implementation
    const gmailServicePath = path.join(__dirname, 'src', 'services', 'gmail-service.ts')
    if (fs.existsSync(gmailServicePath)) {
      const gmailContent = fs.readFileSync(gmailServicePath, 'utf8')
      const lines = gmailContent.split('\n')
      
      // Find the critical lines for threading
      log('\nChecking gmail-service.ts implementation:', 'cyan')
      
      // Check Message-ID validation
      const validationLine = lines.findIndex(l => l.includes('emailData.messageId'))
      if (validationLine > -1) {
        log(`\n  Line ${validationLine + 1}: Message-ID validation found`)
        const contextStart = Math.max(0, validationLine - 2)
        const contextEnd = Math.min(lines.length - 1, validationLine + 10)
        
        for (let i = contextStart; i <= contextEnd; i++) {
          if (i === validationLine) {
            log(`  > ${lines[i]}`, 'yellow')
          } else {
            log(`    ${lines[i]}`)
          }
        }
      }
      
      // Check if headers are being set
      const inReplyToLine = lines.findIndex(l => l.includes('mailOptions.inReplyTo'))
      if (inReplyToLine > -1) {
        log(`\n  Line ${inReplyToLine + 1}: In-Reply-To header being set`, 'green')
      } else {
        log('\n  ❌ No In-Reply-To header setting found!', 'red')
      }
      
      const referencesLine = lines.findIndex(l => l.includes('mailOptions.references'))
      if (referencesLine > -1) {
        log(`  Line ${referencesLine + 1}: References header being set`, 'green')
      } else {
        log('  ❌ No References header setting found!', 'red')
      }
    }
    
    // 5. GENERATE FIX RECOMMENDATIONS
    header('5. RECOMMENDED FIXES')
    
    log('\n🔧 FIX #1 - THREADING:', 'bright')
    log('  1. Verify Message-ID is stored WITHOUT angle brackets in database')
    log('  2. Add angle brackets ONLY when setting In-Reply-To/References headers')
    log('  3. Add logging to confirm headers are in the final MIME message')
    log('  4. Decode the base64 message to verify headers are present')
    
    log('\n🔧 FIX #2 - CONDITION BRANCHES:', 'bright')
    log('  1. Add mutex/lock to prevent both branches executing')
    log('  2. Ensure condition evaluation returns early after first match')
    log('  3. Add step execution check before processing')
    log('  4. Log condition result and branch taken')
    
    log('\n🔧 FIX #3 - TRACKING:', 'bright')
    log('  1. Verify addTrackingToEmail() is called for follow-ups')
    log('  2. Ensure tracked HTML replaces original HTML')
    log('  3. Check tracking pixel insertion in email content')
    log('  4. Verify BASE_URL is correct in tracking URLs')
    
    // 6. SQL QUERIES FOR MANUAL INVESTIGATION
    header('6. SQL QUERIES FOR MANUAL INVESTIGATION')
    
    console.log('\n-- Check enrollments with missing Message-IDs')
    console.log(`SELECT id, "contactId", "currentStep", "messageIdHeader", "gmailMessageId"`)
    console.log(`FROM "SequenceEnrollment"`)
    console.log(`WHERE "messageIdHeader" IS NULL`)
    console.log(`ORDER BY "createdAt" DESC`)
    console.log(`LIMIT 10;`)
    
    console.log('\n-- Check both branches executing')
    console.log(`SELECT e."contactId", s."stepId", s."executedAt", s."status"`)
    console.log(`FROM "SequenceStepExecution" s`)
    console.log(`JOIN "SequenceEnrollment" e ON s."enrollmentId" = e.id`)
    console.log(`WHERE s."stepId" IN (`)
    console.log(`  SELECT DISTINCT json_array_elements_text(`)
    console.log(`    COALESCE(steps::json->'condition'->'trueBranch', '[]'::json) || `)
    console.log(`    COALESCE(steps::json->'condition'->'falseBranch', '[]'::json)`)
    console.log(`  ) FROM "Sequence"`)
    console.log(`)`)
    console.log(`ORDER BY e."contactId", s."executedAt";`)
    
    log('\n✅ Debug analysis complete!', 'green')
    log('\nNext steps:', 'yellow')
    log('1. Review the findings above')
    log('2. Check the SQL queries in Prisma Studio')
    log('3. Add the recommended logging to the code')
    log('4. Test with a new sequence enrollment')
    log('5. Monitor the logs to identify the exact failure point')
    
  } catch (error) {
    log(`\n❌ Error during debugging: ${error.message}`, 'red')
    console.error(error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the debug script
debugSequenceIssues()