const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function testSequenceBugs() {
  try {
    console.log('🔍 TESTING SEQUENCE BUGS WITH CRON JOB')
    console.log('=====================================')
    
    const sequenceId = 'cmfc3h0zh0009la04ifdwmjzm'
    const userId = 'cmeuwk6x70000jj04gb20w4dk'
    
    // Create test contact
    const timestamp = Date.now()
    const testEmail = `bugtest-${timestamp}@example.com`
    
    console.log('1. Creating test contact:', testEmail)
    const testContact = await prisma.contact.create({
      data: {
        email: testEmail,
        userId: userId,
        firstName: 'BugTest',
        lastName: 'User'
      }
    })
    
    // Create test enrollment
    console.log('2. Creating test enrollment...')
    const testEnrollment = await prisma.sequenceEnrollment.create({
      data: {
        sequenceId: sequenceId,
        contactId: testContact.id,
        status: 'ACTIVE',
        currentStep: 0
      }
    })
    
    console.log(`✅ Created enrollment ${testEnrollment.id} for ${testEmail}`)
    
    // Trigger the cron job to process sequences
    console.log('3. Triggering cron job...')
    const https = require('https')
    
    const options = {
      hostname: 'loumassbeta.vercel.app',
      port: 443,
      path: '/api/cron/process-sequences',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'vercel-cron',
        'Authorization': 'Bearer debug'
      }
    }

    const cronResult = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let body = ''
        res.on('data', chunk => body += chunk)
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body)
            resolve({ status: res.statusCode, data: parsed })
          } catch (e) {
            resolve({ status: res.statusCode, data: body })
          }
        })
      })
      req.on('error', reject)
      req.end()
    })
    
    console.log('Cron job result:', JSON.stringify(cronResult, null, 2))
    
    // Wait and check final state
    console.log('4. Waiting for processing...')
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    const finalEnrollment = await prisma.sequenceEnrollment.findUnique({
      where: { id: testEnrollment.id },
      include: {
        contact: true,
        sequence: true
      }
    })
    
    console.log('5. Final enrollment state:')
    console.log(`   Status: ${finalEnrollment.status}`)
    console.log(`   Current Step: ${finalEnrollment.currentStep}`)
    console.log(`   Message-ID Header: ${finalEnrollment.messageIdHeader || 'None'}`)
    console.log(`   Gmail Thread ID: ${finalEnrollment.gmailThreadId || 'None'}`)
    console.log(`   Last Email Sent: ${finalEnrollment.lastEmailSentAt?.toISOString() || 'Never'}`)
    
    // Check sequence events to see what happened
    const sequenceEvents = await prisma.sequenceEvent.findMany({
      where: {
        enrollmentId: testEnrollment.id
      },
      orderBy: { createdAt: 'asc' }
    })
    
    console.log('6. Sequence events generated:')
    sequenceEvents.forEach((event, index) => {
      console.log(`   ${index + 1}. ${event.eventType} - Step ${event.stepIndex}`)
      console.log(`      Created: ${event.createdAt.toISOString()}`)
      if (event.metadata) {
        console.log(`      Metadata:`, JSON.stringify(event.metadata))
      }
    })
    
    // Diagnostic: Check tracking setting for each step
    const steps = Array.isArray(finalEnrollment.sequence.steps) ? 
      finalEnrollment.sequence.steps : JSON.parse(finalEnrollment.sequence.steps)
      
    console.log('7. Tracking analysis:')
    console.log(`   Sequence tracking enabled: ${finalEnrollment.sequence.trackingEnabled}`)
    steps.forEach((step, index) => {
      if (step.type === 'email') {
        console.log(`   Step ${index} (${step.subject}):`)
        console.log(`     trackingEnabled: ${step.trackingEnabled}`)
        console.log(`     Should track: ${finalEnrollment.sequence.trackingEnabled && (step.trackingEnabled !== false)}`)
      }
    })
    
  } catch (error) {
    console.error('❌ Test error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testSequenceBugs()