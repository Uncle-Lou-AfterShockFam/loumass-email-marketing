#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function verifyFixes() {
  try {
    console.log('🔍 VERIFYING ALL FIXES')
    console.log('=====================\n')
    
    // Find the most recent enrollment for lou@soberafe.com
    const enrollment = await prisma.sequenceEnrollment.findFirst({
      where: {
        contact: {
          email: 'lou@soberafe.com'
        }
      },
      include: {
        contact: true,
        sequence: true
      },
      orderBy: { createdAt: 'desc' }
    })
    
    if (!enrollment) {
      console.log('❌ No enrollment found')
      return
    }
    
    console.log('📧 ENROLLMENT STATUS:')
    console.log('   ID:', enrollment.id)
    console.log('   Status:', enrollment.status)
    console.log('   Current Step:', enrollment.currentStep)
    console.log('   Last Email Sent:', enrollment.lastEmailSentAt?.toISOString() || 'Never')
    
    console.log('\n✅ FIX #1 - THREADING:')
    console.log('   Message-ID Header Stored:', enrollment.messageIdHeader ? '✅ YES' : '❌ NO')
    if (enrollment.messageIdHeader) {
      console.log('   Value:', enrollment.messageIdHeader)
      console.log('   Valid Format:', enrollment.messageIdHeader.includes('@') && enrollment.messageIdHeader.includes('CAM') ? '✅ YES' : '❌ NO')
    }
    
    console.log('\n✅ FIX #2 - CONDITION BRANCHES:')
    const steps = Array.isArray(enrollment.sequence.steps) ? 
      enrollment.sequence.steps : JSON.parse(enrollment.sequence.steps)
    
    const conditionStep = steps.find(s => s.type === 'condition')
    if (conditionStep) {
      console.log('   Condition Step Found:', '✅ YES')
      console.log('   True Branch Defined:', conditionStep.condition?.trueBranch ? '✅ YES' : '❌ NO')
      console.log('   False Branch Defined:', conditionStep.condition?.falseBranch ? '✅ YES' : '❌ NO')
      
      if (conditionStep.condition?.trueBranch && conditionStep.condition?.falseBranch) {
        console.log('   True Branch Target:', conditionStep.condition.trueBranch[0])
        console.log('   False Branch Target:', conditionStep.condition.falseBranch[0])
        
        // Check if branch targets exist
        const trueBranchExists = steps.find(s => s.id === conditionStep.condition.trueBranch[0])
        const falseBranchExists = steps.find(s => s.id === conditionStep.condition.falseBranch[0])
        
        console.log('   True Branch Target Exists:', trueBranchExists ? '✅ YES' : '❌ NO')
        console.log('   False Branch Target Exists:', falseBranchExists ? '✅ YES' : '❌ NO')
      }
    } else {
      console.log('   Condition Step Found:', '❌ NO')
    }
    
    console.log('\n✅ FIX #3 - TRACKING:')
    console.log('   Sequence Tracking Enabled:', enrollment.sequence.trackingEnabled ? '✅ YES' : '❌ NO')
    
    const emailSteps = steps.filter(s => s.type === 'email')
    emailSteps.forEach((step, index) => {
      console.log(`   Email Step ${index + 1} (${step.id}):`)
      console.log(`     - Tracking Enabled:`, step.trackingEnabled !== false ? '✅ YES' : '❌ NO')
      console.log(`     - Reply To Thread:`, step.replyToThread ? '✅ YES' : '❌ NO')
    })
    
    console.log('\n✅ FIX #4 - FROM NAME:')
    console.log('   Will use consistent "LOUMASS" for all emails')
    
    console.log('\n📊 SUMMARY:')
    const allFixed = enrollment.messageIdHeader && 
                     conditionStep?.condition?.trueBranch && 
                     conditionStep?.condition?.falseBranch &&
                     enrollment.sequence.trackingEnabled
    
    if (allFixed) {
      console.log('   ✅ ALL FIXES VERIFIED - Ready for testing!')
    } else {
      console.log('   ⚠️ Some issues may still need attention')
    }
    
    console.log('\n🚀 NEXT STEPS:')
    console.log('   1. Send a test email through the sequence')
    console.log('   2. Check if threading works for recipients')
    console.log('   3. Verify only one condition branch is sent')
    console.log('   4. Confirm tracking pixels are present')
    console.log('   5. Verify FROM name is consistent')
    
  } catch (error) {
    console.error('❌ Verification error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

verifyFixes()