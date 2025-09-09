const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_iwH3QAzNrfR5@ep-jolly-recipe-adekvs9j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
})

async function debugSequence() {
  try {
    console.log('🔍 DEBUGGING SEQUENCE AND ENROLLMENT ISSUES')
    console.log('===========================================')

    const targetSequenceId = 'cmfc3h0zh0009la04ifdwmjzm'
    console.log(`Inspecting sequence: ${targetSequenceId}`)

    // Get sequence details
    const sequence = await prisma.sequence.findUnique({
      where: { id: targetSequenceId },
      include: {
        enrollments: {
          include: {
            contact: true
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    })

    if (!sequence) {
      console.log('❌ Sequence not found!')
      return
    }

    console.log('✅ Sequence found:', sequence.name)
    console.log('   Status:', sequence.status)
    console.log('   Tracking Enabled:', sequence.trackingEnabled)
    console.log('   Steps count:', Array.isArray(sequence.steps) ? sequence.steps.length : JSON.parse(sequence.steps).length)

    const steps = Array.isArray(sequence.steps) ? sequence.steps : JSON.parse(sequence.steps)
    console.log('\n📋 SEQUENCE STEPS:')
    steps.forEach((step, index) => {
      console.log(`  ${index}: ${step.type} - ${step.subject || step.name || 'No title'}`)
      if (step.type === 'email') {
        console.log(`      Tracking Enabled: ${step.trackingEnabled !== false ? 'YES' : 'NO'}`)
        console.log(`      Reply to Thread: ${step.replyToThread ? 'YES' : 'NO'}`)
      }
      if (step.type === 'condition') {
        console.log(`      Condition: ${step.condition?.type} ${step.condition?.operator} ${step.condition?.value}`)
        console.log(`      True Branch: ${JSON.stringify(step.condition?.trueBranch)}`)
        console.log(`      False Branch: ${JSON.stringify(step.condition?.falseBranch)}`)
      }
    })

    console.log('\n👥 RECENT ENROLLMENTS:')
    sequence.enrollments.forEach((enrollment, index) => {
      console.log(`  ${index + 1}. Contact: ${enrollment.contact.email}`)
      console.log(`      Status: ${enrollment.status}`)
      console.log(`      Current Step: ${enrollment.currentStep}`)
      console.log(`      Message ID Header: ${enrollment.messageIdHeader || 'None'}`)
      console.log(`      Gmail Thread ID: ${enrollment.gmailThreadId || 'None'}`)
      console.log(`      Created: ${enrollment.createdAt.toISOString()}`)
      console.log(`      Last Email: ${enrollment.lastEmailSentAt?.toISOString() || 'Never'}`)
    })

    // Create a fresh test enrollment
    console.log('\n🆕 CREATING FRESH TEST ENROLLMENT...')
    const timestamp = Date.now()
    const testEmail = `debug-test-${timestamp}@example.com`

    const testContact = await prisma.contact.create({
      data: {
        email: testEmail,
        userId: sequence.userId,
        firstName: 'Debug',
        lastName: 'Test'
      }
    })

    const testEnrollment = await prisma.sequenceEnrollment.create({
      data: {
        sequenceId: targetSequenceId,
        contactId: testContact.id,
        status: 'ACTIVE',
        currentStep: 0
      }
    })

    console.log(`✅ Created test enrollment: ${testEnrollment.id}`)
    console.log(`   Contact: ${testContact.email}`)
    console.log(`   Starting at step: 0`)

    console.log('\n🔄 SIMULATING SEQUENCE PROCESSING...')
    console.log('(Check server logs for detailed sequence processing)')

    // Trigger processing via API
    try {
      const https = require('https')
      const data = JSON.stringify({ enrollmentId: testEnrollment.id })
      
      const options = {
        hostname: 'loumassbeta.vercel.app',
        port: 443,
        path: '/api/debug/force-test',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer debug'
        }
      }

      const req = https.request(options, (res) => {
        let body = ''
        res.on('data', chunk => body += chunk)
        res.on('end', () => {
          console.log(`API Response Status: ${res.statusCode}`)
          if (body) {
            try {
              const result = JSON.parse(body)
              console.log('Processing Result:', JSON.stringify(result, null, 2))
            } catch (e) {
              console.log('Raw Response:', body)
            }
          }
        })
      })

      req.on('error', (error) => {
        console.error('API Error:', error.message)
      })

      req.write(data)
      req.end()

      // Wait a moment for processing
      await new Promise(resolve => setTimeout(resolve, 3000))

    } catch (error) {
      console.error('Failed to trigger processing:', error.message)
    }

    // Check final state
    console.log('\n📊 FINAL ENROLLMENT STATE:')
    const finalEnrollment = await prisma.sequenceEnrollment.findUnique({
      where: { id: testEnrollment.id },
      include: {
        contact: true,
        sequence: true
      }
    })

    if (finalEnrollment) {
      console.log(`   Status: ${finalEnrollment.status}`)
      console.log(`   Current Step: ${finalEnrollment.currentStep}`)
      console.log(`   Message ID Header: ${finalEnrollment.messageIdHeader || 'None'}`)
      console.log(`   Gmail Thread ID: ${finalEnrollment.gmailThreadId || 'None'}`)
      console.log(`   Last Email Sent: ${finalEnrollment.lastEmailSentAt?.toISOString() || 'Never'}`)
    }

  } catch (error) {
    console.error('❌ Debug error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugSequence()