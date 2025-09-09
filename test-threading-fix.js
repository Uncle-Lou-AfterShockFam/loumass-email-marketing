const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testThreadingFix() {
  console.log('🧪 TESTING THREADING FIX FOR STANDALONE SEQUENCES')
  console.log('================================================\n')

  try {
    // Get the test sequence
    const sequenceId = 'cmfcxnr6g0001k004ok1p668d' // STAND ALONE (Copy)
    const sequence = await prisma.sequence.findUnique({
      where: { id: sequenceId },
      include: { enrollments: { orderBy: { createdAt: 'desc' }, take: 1 } }
    })

    if (!sequence) {
      console.error('❌ Test sequence not found!')
      return
    }

    console.log(`📧 Sequence: ${sequence.name}`)
    console.log(`📊 Total enrollments: ${sequence.enrollments.length}`)

    // Check the latest enrollment
    const latestEnrollment = sequence.enrollments[0]
    if (latestEnrollment) {
      console.log('\n📋 Latest Enrollment:')
      console.log(`  - ID: ${latestEnrollment.id}`)
      console.log(`  - Contact ID: ${latestEnrollment.contactId}`)
      console.log(`  - Current Step: ${latestEnrollment.currentStep}`)
      console.log(`  - Status: ${latestEnrollment.status}`)
      console.log(`  - Message-ID Header: ${latestEnrollment.messageIdHeader || 'NOT SET'}`)
      console.log(`  - Gmail Thread ID: ${latestEnrollment.gmailThreadId || 'NOT SET'}`)
      console.log(`  - Last Email Sent: ${latestEnrollment.lastEmailSentAt || 'Never'}`)

      // Check if Message-ID is properly formatted
      if (latestEnrollment.messageIdHeader) {
        const hasAtSymbol = latestEnrollment.messageIdHeader.includes('@')
        const hasAngleBrackets = latestEnrollment.messageIdHeader.startsWith('<') && 
                                 latestEnrollment.messageIdHeader.endsWith('>')
        
        console.log('\n🔍 Message-ID Validation:')
        console.log(`  - Contains @ symbol: ${hasAtSymbol ? '✅' : '❌'}`)
        console.log(`  - Has angle brackets: ${hasAngleBrackets ? '⚠️ Should NOT have brackets in DB' : '✅ Correctly stored without brackets'}`)
        
        if (!hasAtSymbol) {
          console.error('  ❌ CRITICAL: Message-ID is invalid! Threading will fail!')
        } else if (hasAngleBrackets) {
          console.warn('  ⚠️ WARNING: Message-ID has brackets in DB. Should be stored without them.')
        } else {
          console.log('  ✅ Message-ID is properly formatted for threading!')
        }
      } else {
        console.error('\n❌ CRITICAL: No Message-ID stored! Threading cannot work!')
      }

      // Check sequence events for replies
      const replyEvents = await prisma.sequenceEvent.findMany({
        where: { 
          enrollmentId: latestEnrollment.id,
          eventType: 'REPLIED'
        }
      })

      console.log(`\n📬 Reply Events: ${replyEvents.length} found`)
      replyEvents.forEach(event => {
        console.log(`  - Step ${event.stepIndex}: ${event.timestamp}`)
      })

      // Check the sequence steps configuration
      const steps = Array.isArray(sequence.steps) ? sequence.steps : JSON.parse(sequence.steps)
      console.log(`\n🔧 Sequence Configuration:`)
      console.log(`  - Total Steps: ${steps.length}`)
      
      steps.forEach((step, index) => {
        if (step.type === 'email') {
          console.log(`  - Step ${index}: Email "${step.subject?.substring(0, 50)}..."`)
          console.log(`    Reply to thread: ${step.replyToThread ? '✅' : '❌'}`)
        } else if (step.type === 'delay') {
          console.log(`  - Step ${index}: Wait ${step.value} ${step.unit}`)
        } else if (step.type === 'condition') {
          console.log(`  - Step ${index}: Condition (${step.condition?.type})`)
        }
      })

      // Test recommendation
      console.log('\n💡 RECOMMENDATIONS:')
      if (!latestEnrollment.messageIdHeader) {
        console.log('1. Create a NEW enrollment to test threading from scratch')
        console.log('2. The first email should store the Message-ID')
        console.log('3. Follow-up emails should use this Message-ID for threading')
      } else if (latestEnrollment.status === 'COMPLETED') {
        console.log('1. This enrollment is complete')
        console.log('2. Create a new enrollment to test the full flow')
      } else {
        console.log('1. Message-ID is stored properly')
        console.log('2. Run the cron job to process the next step')
        console.log('3. Check Gmail to verify threading works')
      }

    } else {
      console.log('❌ No enrollments found for this sequence')
      console.log('💡 Create a new enrollment to test threading')
    }

  } catch (error) {
    console.error('❌ Error testing threading fix:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testThreadingFix()