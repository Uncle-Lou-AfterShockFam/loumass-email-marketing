const { PrismaClient } = require('@prisma/client')

async function testStep5ThreadDebug() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔍 Debugging Step 5 thread history issue...')
    
    // Get the enrollment that had Step 5 without thread history
    const enrollment = await prisma.sequenceEnrollment.findUnique({
      where: {
        id: 'cmff99so70001k004hvuihsxe'
      },
      include: {
        sequence: {
          include: {
            user: true
          }
        },
        contact: true
      }
    })
    
    if (!enrollment) {
      console.error('❌ Enrollment not found')
      return
    }
    
    console.log(`\n📧 Enrollment Details:`)
    console.log(`   ID: ${enrollment.id}`)
    console.log(`   Contact: ${enrollment.contact.email}`)
    console.log(`   Current Step: ${enrollment.currentStep}`)
    console.log(`   Gmail Thread ID: ${enrollment.gmailThreadId}`)
    console.log(`   Last Email Sent: ${enrollment.lastEmailSentAt?.toISOString()}`)
    console.log(`   Created: ${enrollment.createdAt.toISOString()}`)
    console.log(`   Updated: ${enrollment.updatedAt.toISOString()}`)
    
    // Parse the sequence steps
    const steps = Array.isArray(enrollment.sequence.steps) 
      ? enrollment.sequence.steps 
      : JSON.parse(enrollment.sequence.steps)
    
    console.log(`\n📝 Sequence has ${steps.length} steps:`)
    steps.forEach((step, index) => {
      console.log(`   Step ${index + 1}: ${step.type} - ${step.subject || 'N/A'}`)
      if (step.type === 'email') {
        console.log(`      replyToThread: ${step.replyToThread}`)
      }
      if (step.type === 'delay') {
        console.log(`      delay: ${step.delay?.value} ${step.delay?.unit}`)
      }
      if (step.type === 'condition') {
        console.log(`      condition: ${step.condition?.field} ${step.condition?.operator} ${step.condition?.value}`)
      }
    })
    
    // Check what would happen if we were processing Step 5
    console.log(`\n🔄 Simulating Step 5 processing:`)
    const step5Index = 4 // 0-based index for Step 5
    const step5 = steps[step5Index]
    
    console.log(`   Step type: ${step5.type}`)
    console.log(`   Step subject: ${step5.subject}`)
    console.log(`   Step replyToThread: ${step5.replyToThread}`)
    
    // Check the condition for including thread history
    const wouldIncludeThreadHistory = (enrollment.currentStep > 0 && enrollment.gmailThreadId)
    console.log(`\n❓ Would include thread history?`)
    console.log(`   enrollment.currentStep (${enrollment.currentStep}) > 0: ${enrollment.currentStep > 0}`)
    console.log(`   enrollment.gmailThreadId exists: ${!!enrollment.gmailThreadId}`)
    console.log(`   Result: ${wouldIncludeThreadHistory ? 'YES' : 'NO'}`)
    
    // BUT WAIT! When Step 5 was being processed, currentStep would have been 4, not 5!
    console.log(`\n⚠️  IMPORTANT: When Step 5 was being processed:`)
    console.log(`   enrollment.currentStep would have been: 4 (not 5)`)
    console.log(`   Condition check: 4 > 0 && gmailThreadId exists = ${4 > 0 && enrollment.gmailThreadId ? 'TRUE' : 'FALSE'}`)
    
    // Skip thread history test since we can't import GmailService in CommonJS
    if (enrollment.gmailThreadId) {
      console.log(`\n🔍 Gmail Thread ID exists: ${enrollment.gmailThreadId}`)
      console.log(`   Would attempt to fetch thread history in production`)
    }
    
    // Check for any email events
    const emailEvents = await prisma.emailEvent.findMany({
      where: {
        contactId: enrollment.contact.id,
        sequenceId: enrollment.sequence.id,
        type: 'SENT'
      },
      orderBy: {
        createdAt: 'asc'
      }
    })
    
    console.log(`\n📊 Email Events for this enrollment:`)
    emailEvents.forEach((event, index) => {
      console.log(`   ${index + 1}. ${event.createdAt.toISOString()} - ${event.subject || 'No subject'}`)
    })
    
    console.log(`\n💡 HYPOTHESIS:`)
    console.log(`   The issue might be that Step 5 was processed BEFORE the gmailThreadId was properly set.`)
    console.log(`   Or the thread history fetch failed in production but not locally.`)
    console.log(`   Need to check production logs for errors during Step 5 processing.`)
    
  } catch (error) {
    console.error('💥 ERROR:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testStep5ThreadDebug()