const fetch = require('node-fetch');

async function triggerSequenceProcessing() {
  console.log('Triggering sequence processing...');
  
  try {
    const response = await fetch('http://localhost:3000/api/sequences/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CRON_SECRET || 'test-key'
      },
      body: JSON.stringify({
        enrollmentId: 'cmfct1y7e0003jr047tlwar7k'
      })
    });
    
    const result = await response.json();
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

triggerSequenceProcessing();