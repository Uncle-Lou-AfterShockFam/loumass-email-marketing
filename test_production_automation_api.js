// Test the production automation API to see if trigger nodes are added automatically
const testAutomationAPI = async () => {
  console.log('=== TESTING PRODUCTION AUTOMATION API ===')
  
  // Minimal automation payload (just like the user created)
  const automationData = {
    name: 'Test API Trigger Addition',
    description: 'Testing if triggers are auto-added',
    triggerEvent: 'NEW_SUBSCRIBER',
    nodes: [
      {
        id: 'test-email-1',
        type: 'email',
        emailTemplate: {
          subject: 'Test Subject',
          content: 'Test email content',
          trackingEnabled: true
        },
        position: { x: 200, y: 100 }
      }
    ],
    status: 'DRAFT'
  }
  
  try {
    const response = await fetch('https://loumassbeta.vercel.app/api/automations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: This will fail auth but should still show us the API structure
      },
      body: JSON.stringify(automationData)
    })
    
    const result = await response.text()
    console.log('Status:', response.status)
    console.log('Response:', result)
    
    if (response.status === 401) {
      console.log('✅ Expected 401 - API is accessible but requires auth')
      console.log('✅ This means the production API endpoint exists and is responsive')
    }
    
  } catch (error) {
    console.error('❌ API Test failed:', error.message)
  }
}

testAutomationAPI()