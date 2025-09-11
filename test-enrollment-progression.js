const { PrismaClient } = require('@prisma/client')

async function testEnrollmentProgression() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔍 Analyzing enrollment progression for Step 5 issue...')
    
    // Get all enrollments in this sequence
    const enrollments = await prisma.sequenceEnrollment.findMany({
      where: {
        sequenceId: 'cmff84sdu0001l504xpkstmrr'
      },
      include: {
        contact: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    console.log(`\n📊 Found ${enrollments.length} enrollments in this sequence:`)
    
    enrollments.forEach((enrollment, index) => {
      console.log(`\n${index + 1}. Enrollment ${enrollment.id}`)
      console.log(`   Contact: ${enrollment.contact.email}`)
      console.log(`   Status: ${enrollment.status}`)
      console.log(`   Current Step: ${enrollment.currentStep}`)
      console.log(`   Gmail Thread ID: ${enrollment.gmailThreadId || 'NONE'}`)
      console.log(`   Created: ${enrollment.createdAt.toISOString()}`)
      console.log(`   Last Email: ${enrollment.lastEmailSentAt?.toISOString() || 'NONE'}`)
      
      const timeDiff = enrollment.lastEmailSentAt 
        ? (enrollment.lastEmailSentAt.getTime() - enrollment.createdAt.getTime()) / 1000
        : 0
      console.log(`   Time from creation to last email: ${timeDiff} seconds`)
      
      if (!enrollment.gmailThreadId && enrollment.currentStep > 0) {
        console.log(`   ⚠️  WARNING: No thread ID but past Step 1!`)
      }
    })
    
    // Check if there's a pattern
    const noThreadEnrollments = enrollments.filter(e => !e.gmailThreadId && e.currentStep > 0)
    if (noThreadEnrollments.length > 0) {
      console.log(`\n⚠️  ISSUE FOUND: ${noThreadEnrollments.length} enrollments have progressed without thread IDs!`)
      console.log('This suggests Step 1 emails are not being sent properly.')
    }
    
    // Check the specific problematic enrollment
    const problemEnrollment = enrollments.find(e => e.id === 'cmff99so70001k004hvuihsxe')
    if (problemEnrollment) {
      console.log(`\n🔍 Problem enrollment analysis:`)
      console.log(`   This enrollment went from creation to Step 5 in ${(problemEnrollment.lastEmailSentAt.getTime() - problemEnrollment.createdAt.getTime()) / 1000} seconds`)
      console.log(`   That's only about 2 minutes - seems too fast for delays!`)
      
      // Check email events for this contact across ALL sequences
      const allEmailEvents = await prisma.emailEvent.findMany({
        where: {
          contactId: problemEnrollment.contactId
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 10
      })
      
      console.log(`\n📧 Recent email events for ${problemEnrollment.contact.email}:`)
      allEmailEvents.forEach((event, i) => {
        console.log(`   ${i + 1}. ${event.createdAt.toISOString()} - ${event.type} - ${event.subject || 'No subject'}`)
      })
    }
    
    console.log(`\n💡 THEORY:`)
    console.log(`   The enrollment started at Step 4 or 5 directly, skipping earlier steps.`)
    console.log(`   OR the delay/condition logic is bypassing steps incorrectly.`)
    console.log(`   Check if manual enrollment UI allows starting at a specific step.`)
    
  } catch (error) {
    console.error('💥 ERROR:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testEnrollmentProgression()