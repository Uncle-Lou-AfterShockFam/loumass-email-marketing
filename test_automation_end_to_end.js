const fetch = require('node-fetch')

const TEST_EMAIL = 'lou@soberafe.com'
const BASE_URL = 'https://loumassbeta.vercel.app'

async function testAutomationEndToEnd() {
  console.log('=== FULL END-TO-END AUTOMATION TEST ===')
  console.log(`Testing with: ${TEST_EMAIL}`)
  console.log(`Base URL: ${BASE_URL}`)
  console.log(`Time: ${new Date().toISOString()}`)
  
  let automationId = null
  
  try {
    // STEP 1: Create test automation
    console.log('\n🔨 STEP 1: Creating test automation...')
    
    const automationData = {
      name: 'FULL TEST AUTOMATION - Email Tracking',
      description: 'End-to-end test of automation email tracking system',
      triggerEvent: 'MANUAL',
      status: 'ACTIVE',
      trackingEnabled: true,
      nodes: {
        nodes: [
          {
            id: 'trigger-test-123',
            type: 'trigger', 
            name: 'Manual Trigger',
            position: { x: 50, y: 100 },
            data: { label: 'Start', triggerType: 'MANUAL' }
          },
          {
            id: 'email-test-123',
            type: 'email',
            name: 'Test Email',
            position: { x: 300, y: 100 },
            emailTemplate: {
              subject: 'TEST: Automation Email Tracking',
              content: `Hi {{firstName}},

This is a test email from the automation system.

Please click this link to test click tracking: [Test Link](${BASE_URL}/dashboard)

Best regards,
LOUMASS Team`,
              trackingEnabled: true
            }
          }
        ],
        edges: [
          {
            id: 'trigger-to-email',
            source: 'trigger-test-123',
            target: 'email-test-123',
            type: 'smoothstep'
          }
        ]
      }
    }
    
    const createResponse = await fetch(`${BASE_URL}/api/automations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(automationData)
    })
    
    console.log(`Create status: ${createResponse.status}`)
    const createResult = await createResponse.text()
    console.log(`Create response: ${createResult.substring(0, 200)}...`)
    
    if (createResponse.status === 401) {
      console.log('❌ FAILED: Authentication required')
      console.log('💡 This test needs to be run from the dashboard with proper auth')
      console.log('🎯 Manual test steps:')
      console.log('1. Go to https://loumassbeta.vercel.app/dashboard/automations/new')
      console.log('2. Create automation with:')
      console.log('   - Name: "TEST: End-to-End Email Tracking"')
      console.log('   - Trigger: Manual')
      console.log('   - Email: Subject "TEST Email", content with tracking link')
      console.log('3. Activate the automation')
      console.log(`4. Enroll contact: ${TEST_EMAIL}`)
      console.log('5. Check if email is received and tracked')
      return
    }
    
    if (createResponse.status !== 200) {
      throw new Error(`Failed to create automation: ${createResponse.status}`)
    }
    
    const automation = JSON.parse(createResult)
    automationId = automation.id
    console.log(`✅ Created automation: ${automationId}`)
    
    // STEP 2: Verify automation structure
    console.log('\n🔍 STEP 2: Verifying automation structure...')
    
    const getResponse = await fetch(`${BASE_URL}/api/automations/${automationId}`)
    const getResult = await getResponse.text()
    
    if (getResponse.status === 200) {
      const automationData = JSON.parse(getResult)
      console.log(`✅ Automation exists with ${automationData.nodes?.nodes?.length || 0} nodes`)
      console.log(`✅ Status: ${automationData.status}`)
      console.log(`✅ Tracking enabled: ${automationData.trackingEnabled}`)
    } else {
      console.log(`❌ Failed to get automation: ${getResponse.status}`)
    }
    
    // STEP 3: Enroll test contact
    console.log('\n👤 STEP 3: Enrolling test contact...')
    
    const enrollResponse = await fetch(`${BASE_URL}/api/automations/${automationId}/enroll`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contactEmails: [TEST_EMAIL]
      })
    })
    
    console.log(`Enroll status: ${enrollResponse.status}`)
    const enrollResult = await enrollResponse.text()
    console.log(`Enroll response: ${enrollResult}`)
    
    if (enrollResponse.status === 200) {
      console.log(`✅ Enrolled ${TEST_EMAIL}`)
    } else {
      console.log(`❌ Failed to enroll contact`)
    }
    
    // STEP 4: Trigger automation execution
    console.log('\n⚡ STEP 4: Triggering automation execution...')
    
    const executeResponse = await fetch(`${BASE_URL}/api/automations/trigger-manual`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        automationId: automationId
      })
    })
    
    console.log(`Execute status: ${executeResponse.status}`)
    const executeResult = await executeResponse.text()
    console.log(`Execute response: ${executeResult}`)
    
    // STEP 5: Check automation stats  
    console.log('\n📊 STEP 5: Checking automation stats...')
    
    const statsResponse = await fetch(`${BASE_URL}/api/automations/${automationId}/stats`)
    const statsResult = await statsResponse.text()
    
    if (statsResponse.status === 200) {
      console.log(`✅ Stats response: ${statsResult}`)
    } else {
      console.log(`❌ Failed to get stats: ${statsResponse.status}`)
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
  
  console.log(`\n🎯 SUMMARY:`)
  console.log(`Test automation ID: ${automationId || 'Not created'}`)
  console.log(`Test contact: ${TEST_EMAIL}`)
  console.log(`Next: Check email inbox and automation analytics`)
  console.log(`Manual cleanup: Delete test automation if needed`)
}

testAutomationEndToEnd().catch(console.error)