const fetch = require('node-fetch')

async function testProductionCron() {
  try {
    console.log('🔍 Testing production cron endpoint...')
    
    const response = await fetch('https://loumassbeta.vercel.app/api/cron/sequences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    console.log(`Response status: ${response.status}`)
    
    const result = await response.text()
    console.log('Response:', result)
    
  } catch (error) {
    console.error('Error:', error)
  }
}

testProductionCron()