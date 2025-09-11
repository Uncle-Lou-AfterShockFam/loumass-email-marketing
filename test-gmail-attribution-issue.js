const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testGmailAttribution() {
  console.log('=== TESTING GMAIL ATTRIBUTION ISSUE ===')
  console.log('')
  
  try {
    // Find the specific sequence that's having issues
    const sequence = await prisma.sequence.findFirst({
      where: {
        user: {
          email: 'ljpiotti@aftershockfam.org'
        }
      },
      include: {
        user: true,
        enrollments: {
          where: {
            contact: {
              email: 'lou@soberafe.com'
            }
          },
          include: {
            contact: true
          }
        }
      }
    })
    
    if (!sequence) {
      console.log('❌ No sequence found for ljpiotti@aftershockfam.org')
      return
    }
    
    console.log(`Found sequence: ${sequence.name}`)
    console.log(`User: ${sequence.user.name} (${sequence.user.email})`)
    console.log(`Enrollments for lou@soberafe.com: ${sequence.enrollments.length}`)
    
    // Check what's being passed as fromName
    console.log('\n📧 EMAIL DATA THAT WOULD BE SENT:')
    console.log(`fromName: "${sequence.user.name || sequence.user.email}"`)
    console.log(`fromEmail: "${sequence.user.email}"`)
    console.log(`FROM header would be: "${sequence.user.name || sequence.user.email} <${sequence.user.email}>"`)
    
    // Parse the sequence steps to see what's configured
    const steps = typeof sequence.steps === 'string' ? 
      JSON.parse(sequence.steps) : sequence.steps
    
    console.log(`\n📋 SEQUENCE STEPS (${steps.length} total):`)
    steps.forEach((step, index) => {
      if (step.type === 'email') {
        console.log(`Step ${index}: Email - "${step.subject}"`)
        console.log(`  - Reply to thread: ${step.replyToThread || false}`)
        console.log(`  - Tracking enabled: ${step.trackingEnabled !== false}`)
      }
    })
    
    // Check an actual enrollment
    if (sequence.enrollments.length > 0) {
      const enrollment = sequence.enrollments[0]
      console.log(`\n🎯 ENROLLMENT DETAILS:`)
      console.log(`ID: ${enrollment.id}`)
      console.log(`Status: ${enrollment.status}`)
      console.log(`Current Step: ${enrollment.currentStep}`)
      console.log(`Gmail Thread ID: ${enrollment.gmailThreadId || 'none'}`)
      console.log(`Gmail Message ID: ${enrollment.gmailMessageId || 'none'}`)
      console.log(`Message ID Header: ${enrollment.messageIdHeader || 'none'}`)
    }
    
    // Test the tracking URL issue
    console.log('\n🔗 TESTING TRACKING URL NESTING:')
    const testUrl = 'https://aftershockfam.org'
    const trackingId = 'test123'
    const baseUrl = 'https://loumassbeta.vercel.app'
    
    // Simulate first tracking
    const trackedOnce = `${baseUrl}/api/track/click/${trackingId}?u=${encodeURIComponent(testUrl)}`
    console.log('Tracked once:', trackedOnce)
    
    // Simulate second tracking (what's happening in the bug)
    const trackedTwice = `${baseUrl}/api/track/click/${trackingId}?u=${encodeURIComponent(trackedOnce)}`
    console.log('Tracked twice (BUG):', trackedTwice.substring(0, 100) + '...')
    
    // The problem is clear - URLs are being tracked multiple times!
    
  } catch (error) {
    console.error('Test error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testGmailAttribution()